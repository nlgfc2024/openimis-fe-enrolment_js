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
const fill = (key, values = {}) => (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name]);
const plain = ({ children }) => React.createElement('span', null, children);
let queries;
let response;
const { default: ProgrammeProfileSummary } = load(path.join(__dirname, '../src/components/ProgrammeProfileSummary.jsx'), {
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
  assert.equal(
    utils.describeOrderBy([{ subject: 'head', field: 'household_pmt_score', direction: 'asc' }, '-code', { field: '_weighted_score', direction: 'desc' }], 'weighted score'),
    'head: household_pmt_score asc, code desc, weighted score desc',
  );
  assert.equal(utils.describeOrderBy(undefined), '');
  assert.equal(utils.describeCriterion({ subject: 'primary_worker', derived: 'age', filter: 'gte', value: 18 }), 'primary_worker: age ≥ 18');
  assert.equal(utils.describeCriterion({ field: 'name', filter: 'icontains', value: 'ab' }), 'name icontains ab');
  assert.deepEqual(utils.parseJsonValue('{"a":1}'), { a: 1 });
  assert.deepEqual(utils.parseJsonValue('not json', []), []);
  assert.equal(utils.parseJsonValue(null), null);
});

test('the profile view queries by raw Phase id and lists criteria and ranking rules', () => {
  const html = render({ benefitPlanId: relayId('plan-uuid'), status: 'POTENTIAL' }, {
    key: 'RMEP',
    description: 'Jobs Now RMEP',
    criteria: JSON.stringify([{ subject: 'primary_worker', field: 'business_experience', filter: 'exact', value: 'Yes' }]),
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
    'Enrolment profile: RMEP', 'Jobs Now RMEP', 'primary_worker: business_experience = Yes',
    'Score out of 100, weighted from:', 'Turnover (weight 7)', 'head: age (weight 3)',
    'A score of at least 60 is needed', 'Ranked by weighted score desc',
    '60% of places reserved for Female candidates', '40% of places reserved for candidates aged 18 to 35',
    'Reserved places are matched on the PRIMARY_WORKER record',
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
    'The profile adds no eligibility criteria.', 'Ranking for ACTIVE', 'The profile needs a GROUP Phase.',
    'blantyre: 438 places reserved for self: district = Blantyre', 'other: 10% of places reserved for sex = Male',
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
