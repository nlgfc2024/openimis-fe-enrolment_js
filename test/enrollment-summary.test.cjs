const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-es-module.cjs');
const messages = require('../src/translations/en.json');
const plain = ({ children }) => React.createElement('span', null, children);
const utils = load(path.join(__dirname, '../src/util/enrolment-utils.js'), { '@openimis/fe-core': { decodeId: (id) => id } });
const fill = (key, values) => (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name]);
const Summary = load(path.join(__dirname, '../src/components/EnrollmentSummary.jsx'), {
  '@material-ui/core': { Grid: plain, Paper: plain, Typography: plain },
  '@material-ui/core/styles': { styled: (component) => () => component },
  '@openimis/fe-core': {
    useModulesManager: () => ({}),
    useTranslations: () => ({ formatMessage: (key) => messages[key] || key, formatMessageWithValues: fill }),
  },
  '../util/enrolment-utils': utils,
}).default;
const render = (summary, household = true) => renderToStaticMarkup(React.createElement(Summary, { summary, household }));
test('household cards show stock, target and eligible pool without old registry cards', () => {
  const html = render({ verifiedUnenrolledHouseholds: 39, phaseTarget: 500, enrolledHouseholds: 12 });
  for (const label of ['Verified unenrolled households', 'Phase target', 'Enrolled households']) assert.ok(html.includes(label));
  for (const value of [39, 500, 12]) assert.ok(html.includes(`>${value}<`));
  assert.ok(!html.includes('All groups in the registry'));
});
test('target zero remains numeric while absent target is explicit', () => {
  assert.ok(!render({ phaseTarget: 0 }).includes('Not configured'));
  assert.ok(render({ phaseTarget: null }).includes('Not configured'));
  assert.ok(render({}, false).includes(messages['enrolment.cards.individuals.eligible']));
});
test('the summary names the profile, the minimum score cut, the quota fill and the member each sort reads', () => {
  const html = render({
    programmeProfile: 'umep',
    belowMinimumScore: 7,
    quotaFill: JSON.stringify({ buckets: [{ key: 'female', reserved: 3, filled: 2 }], unreserved: 4 }),
    enrolmentRanking: JSON.stringify({
      minimum_score: 60,
      order_by: [{ field: '_weighted_score', direction: 'desc' }, { subject: 'head', field: 'household_pmt_score', direction: 'asc' }],
    }),
  });
  for (const text of [
    'Enrolment profile applied', '>umep<', 'Eligible but below the minimum score of 60', '>7<',
    'female: 2 of 3 reserved places filled', '4 places filled by the next ranked candidates',
    'weighted score desc, head: household_pmt_score asc',
  ]) assert.ok(html.includes(text), text);
});
test('without a profile or minimum score the summary says so and leaves the cut out', () => {
  const html = render({ programmeProfile: null, enrolmentRanking: null }, false);
  assert.ok(html.includes('>None<'));
  assert.ok(!html.includes('minimum score'));
  assert.ok(!html.includes('Reserved places'));
});
