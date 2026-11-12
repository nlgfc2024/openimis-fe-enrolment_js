const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-es-module.cjs');
const messages = require('../src/translations/en.json');

const relayId = (id) => Buffer.from(`BenefitPlanGQLType:${id}`).toString('base64');
const decodeId = (value) => Buffer.from(value, 'base64').toString().split(':')[1];
const utils = load(path.join(__dirname, '../src/util/enrolment-utils.js'), { '@openimis/fe-core': { decodeId } });
const message = (key) => messages[key] || key;
const fill = (key, values = {}) => message(key).replace(/\{(\w+)\}/g, (_, name) => values[name]);
const plain = ({ children }) => React.createElement('span', null, children);
let queries;
let response;
const { default: ProgrammeProfileSummary, eligibilityText, joinList } = load(path.join(__dirname, '../src/components/ProgrammeProfileSummary.jsx'), {
  '@material-ui/core': { CircularProgress: plain, Paper: plain, Typography: plain },
  '@material-ui/core/styles': { styled: (component) => () => component },
  '@material-ui/lab/Alert': { __esModule: true, default: plain },
  '@openimis/fe-core': {
    decodeId,
    useModulesManager: () => ({}),
    useTranslations: () => ({ formatMessage: (key) => messages[key] || key, formatMessageWithValues: fill }),
    useGraphqlQuery: (query, variables) => { queries.push(variables); return response; },
  },
  '../util/enrolment-utils': utils,
});
const render = (props, profile) => {
  queries = [];
  response = { isLoading: false, error: null, data: { enrolmentProgrammeProfile: profile } };
  return renderToStaticMarkup(React.createElement(ProgrammeProfileSummary, props));
};

test('sort keys name the member they read and criteria their subject', () => {
  const label = utils.ruleLabeller(message);
  assert.equal(
    utils.describeOrderBy([{ subject: 'head', field: 'household_pmt_score', direction: 'asc' }, '-code', { field: '_weighted_score', direction: 'desc' }], label),
    'Household head: household_pmt_score (lowest first), code (highest first), Score (highest first)',
  );
  assert.equal(utils.describeOrderBy([{ subject: 'head', field: 'x' }]), 'head: x (asc)');
  assert.equal(utils.describeOrderBy(undefined), '');
  assert.equal(utils.describeCriterion({ subject: 'primary_worker', derived: 'age', filter: 'gte', value: 18 }, label), 'Primary worker: age ≥ 18');
  assert.equal(utils.describeCriterion({ subject: 'self', derived: 'district', filter: 'iexact', value: 'Zomba' }, label), 'district = Zomba');
  assert.equal(utils.describeTarget({ subject: 'any_member', field: 'sex' }, label), 'Any member: sex');
  assert.equal(utils.describeCriterion({ field: 'name', filter: 'icontains', value: 'ab' }), 'name icontains ab');
  assert.deepEqual(utils.parseJsonValue('{"a":1}'), { a: 1 });
  assert.deepEqual(utils.parseJsonValue('not json', []), []);
  assert.equal(utils.parseJsonValue(null), null);
});

test('the profile view queries by raw Phase id and lists criteria and ranking rules', () => {
  const html = render({ benefitPlanId: relayId('plan-uuid'), status: 'POTENTIAL' }, {
    key: 'RMEP',
    description: 'Jobs Now RMEP',
    criteria: JSON.stringify([
      { subject: 'primary_worker', field: 'business_experience', filter: 'exact', value: 'Yes' },
      { subject: 'primary_worker', field: 'fit_for_work', filter: 'exact', type: 'integer', value: 1 },
      { subject: 'primary_worker', derived: 'age', filter: 'gte', value: 18 },
    ]),
    ranking: JSON.stringify({
      weighted_score: { components: [{ label: 'Turnover', weight: 7 }, { subject: 'head', derived: 'age', weight: 3 }] },
      minimum_score: 60,
      order_by: [{ field: '_weighted_score', direction: 'desc' }],
      selection_strategy: {
        source: 'PRIMARY_WORKER', female_percentage: 60, female_value: 'Female', youth_percentage: 40, youth_min_age: 18, youth_max_age: 35,
      },
      limit: { percentage: 50, respect_max_beneficiaries: false },
    }),
    rankingStatus: '*',
    unsuitableReasons: [],
    profileRequired: true,
  });
  assert.deepEqual(queries, [{ benefitPlanId: 'plan-uuid', status: 'POTENTIAL' }]);
  for (const text of [
    'Eligibility criteria: </strong>Primary worker business experience = Yes, Primary worker is fit for work, and Primary worker age ≥ 18',
    'Score out of 100, weighted from:', 'Turnover (weight 7)', 'Household head: age (weight 3)',
    'A score of at least 60 is needed', 'Ranked by Score (highest first)',
    '60% of places reserved for Female candidates', '40% of places reserved for candidates aged 18 to 35',
    'Reserved places are checked against the primary worker',
    'At most 50% of the eligible records are enrolled', 'maximum number of beneficiaries is not applied',
  ]) assert.ok(html.includes(text), text);
});

test('quotas, unsuitable profiles and a status without a ranking are explained', () => {
  const html = render({ benefitPlanId: 'plan-uuid', status: 'ACTIVE' }, {
    key: 'umep',
    criteria: '[]',
    ranking: JSON.stringify({
      selection_strategy: { quotas: [
        { key: 'blantyre', count: 438, when: [{ subject: 'self', derived: 'district', filter: 'iexact', value: 'Blantyre' }] },
        { key: 'other', percentage: 10, when: [{ field: 'sex', filter: 'exact', value: 'Male' }] },
      ] },
    }),
    rankingStatus: 'ACTIVE',
    unsuitableReasons: ['The profile needs a GROUP Phase.'],
  });
  assert.deepEqual(queries, [{ benefitPlanId: 'plan-uuid', status: 'ACTIVE' }]);
  for (const text of [
    'Eligibility criteria: </strong>none beyond the fixed rules', 'Ranking for ACTIVE',
    'The profile needs a GROUP Phase.',
    'blantyre: 438 places reserved for district = Blantyre', 'other: 10% of places reserved for sex = Male',
  ]) assert.ok(html.includes(text), text);
  assert.ok(render({ benefitPlanId: 'plan-uuid', status: 'ACTIVE' }, { key: 'umep', ranking: null, rankingStatus: null })
    .includes('The profile has no ranking for ACTIVE, so every eligible record is enrolled.'));
});

test('a Phase without a profile says whether enrolment can go ahead', () => {
  assert.ok(render({ benefitPlanId: 'plan-uuid', status: 'POTENTIAL' }, { key: null, profileRequired: false })
    .includes(messages['enrolment.profile.none']));
  assert.ok(render({ benefitPlanId: 'plan-uuid', status: 'POTENTIAL' }, { key: null, profileRequired: true })
    .includes(messages['enrolment.profile.requiredMissing']));
});

test('nothing is queried until both the Phase and the status are known', () => {
  assert.equal(render({ benefitPlanId: 'plan-uuid' }, null), '');
  assert.equal(render({ status: 'POTENTIAL' }, null), '');
  assert.deepEqual(queries, []);
});

test('on the enrolment form the fixed rules lead the eligibility line, with no title or description', () => {
  const profile = {
    key: 'default',
    description: 'PWP: every Phase shares these rules.',
    criteria: JSON.stringify([{ subject: 'primary_worker', field: 'fit_for_work', filter: 'exact', type: 'integer', value: 1 }]),
    ranking: null,
    rankingStatus: null,
  };
  const html = render({ benefitPlanId: 'plan-uuid', status: 'ACTIVE', household: true }, profile);
  assert.ok(html.includes('Eligibility criteria: </strong>Verified, primary worker, and fit for work'));
  for (const text of ['Rules Applied', 'every Phase shares', 'read-only', messages['enrolment.membershipRule.groups']]) {
    assert.ok(!html.includes(text), text);
  }
  assert.ok(render({ benefitPlanId: 'plan-uuid', status: 'ACTIVE', household: false }, { ...profile, criteria: '[]' })
    .includes('Eligibility criteria: </strong>Verified and not in an active household'));
  assert.ok(render({ benefitPlanId: 'plan-uuid', status: 'ACTIVE' }, profile)
    .includes('Eligibility criteria: </strong>Primary worker is fit for work'));
});

test('criteria phrases name the member only when the list does not already', () => {
  const label = utils.ruleLabeller(message);
  assert.equal(eligibilityText({ subject: 'self', field: 'fit_for_work', filter: 'exact', value: '1' }, fill, label), 'fit for work');
  assert.equal(eligibilityText({ derived: 'age', filter: 'lte', value: 60 }, fill, label), 'age ≤ 60');
  assert.equal(eligibilityText({ subject: 'head', derived: 'age', filter: 'gte', value: 18 }, fill, label, 'primary_worker'), 'Household head age ≥ 18');
  assert.equal(joinList(['a'], 'and'), 'a');
  assert.equal(joinList(['a', 'b'], 'and'), 'a and b');
  assert.equal(joinList(['a', 'b', 'c'], 'and'), 'a, b, and c');
});
