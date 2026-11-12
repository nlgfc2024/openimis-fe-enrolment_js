const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-es-module.cjs');
const messages = require('../src/translations/en.json');
const plain = ({ children }) => React.createElement('span', null, children);
const utils = load(path.join(__dirname, '../src/utils.js'), { '@openimis/fe-core': { decodeId: (id) => id } });
const fill = (key, values) => (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name]);
const Summary = load(path.join(__dirname, '../src/components/EnrollmentSummary.jsx'), {
  '@material-ui/core': { Grid: plain, Paper: plain, Typography: plain },
  '@material-ui/core/styles': { styled: (component) => () => component },
  '@openimis/fe-core': {
    useModulesManager: () => ({}),
    useTranslations: () => ({ formatMessage: (key) => messages[key] || key, formatMessageWithValues: fill }),
  },
  '../utils': utils,
}).default;
const render = (summary, household = true, rulesShown = false) => renderToStaticMarkup(
  React.createElement(Summary, { summary, household, rulesShown }),
);
test('household cards show the target, already enrolled, eligible and to be enrolled counts', () => {
  const html = render({
    verifiedUnenrolledHouseholds: 39, phaseTarget: 500, enrolledHouseholds: 12, willEnrol: 25, poolSize: 39,
  });
  for (const label of [
    'Maximum Target Beneficiaries', 'Beneficiaries Already Enrolled', 'Eligible and not yet enrolled', 'Selected Beneficiaries',
  ]) assert.ok(html.includes(label), label);
  for (const value of [39, 500, 12, 25]) assert.ok(html.includes(`>${value}<`));
  assert.ok(!html.includes('All groups in the registry'));
});
test('target zero remains numeric while absent target is explicit', () => {
  assert.ok(!render({ phaseTarget: 0 }).includes('Not configured'));
  assert.ok(render({ phaseTarget: null }).includes('Not configured'));
  assert.ok(render({}, false).includes(messages['enrolment.cards.individuals.eligible']));
});
const rankedSummary = {
  programmeProfile: 'pwp',
  belowMinimumScore: 7,
  willEnrol: 12,
  poolSize: 20,
  quotaFill: JSON.stringify({
    buckets: [{ key: 'female', reserved: 4, filled: 4 }, { key: 'youth', reserved: 4, filled: 2 }, { key: 'blantyre', reserved: 1, filled: 0 }],
    unreserved: 6,
  }),
  enrolmentRanking: JSON.stringify({
    minimum_score: 60,
    order_by: [{ field: '_weighted_score', direction: 'desc' }, { subject: 'head', field: 'household_pmt_score', direction: 'asc' }],
    selection_strategy: { youth_min_age: 18, youth_max_age: 35 },
  }),
};
test('the summary names the profile, the minimum score cut, the quota fill and the member each sort reads', () => {
  const html = render(rankedSummary);
  for (const text of [
    'Enrolment profile applied', '>pwp<', 'Eligible but below the minimum score of 60', '>7<',
    'Quota allocation', 'Female: 4, representing 33%', 'Youth: 2, representing 17%', 'blantyre: 0, representing 0%',
    'Others: 6, representing 50%',
    'Score (highest first), Household head: household_pmt_score (lowest first)',
  ]) assert.ok(html.includes(text), text);
});
test('with the profile rules on screen the summary shows results only', () => {
  const html = render(rankedSummary, true, true);
  assert.ok(!html.includes('Enrolment profile applied'));
  assert.ok(!html.includes(messages['enrolment.rankingOrder']));
  assert.ok(!html.includes(messages['enrolment.membershipRule']));
  assert.ok(!html.includes('eligible records will be enrolled'));
  assert.ok(html.includes('Quota allocation'));
  for (const text of ['Eligible but below the minimum score of 60', 'Female: 4, representing 33%']) {
    assert.ok(html.includes(text), text);
  }
});
test('an empty pool is explained and reserved places are left out', () => {
  const html = render({ ...rankedSummary, willEnrol: 0, poolSize: 0 });
  assert.ok(html.includes(messages['enrolment.emptyPool.households']));
  assert.ok(!html.includes('Reserved places'));
  assert.ok(render({ poolSize: 0 }, false).includes(messages['enrolment.emptyPool.individuals']));
});
test('without a profile or minimum score the summary says so and leaves the cut out', () => {
  const html = render({ programmeProfile: null, enrolmentRanking: null }, false);
  assert.ok(html.includes('>None<'));
  assert.ok(!html.includes('minimum score'));
  assert.ok(!html.includes('Reserved places'));
});
