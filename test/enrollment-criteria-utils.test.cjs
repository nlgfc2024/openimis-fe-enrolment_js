const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/utils.js'), 'utf8')
  .replace(/import .*?;\n/g, '')
  .replaceAll('export function ', 'function ');
const names = [
  'enrolmentFilterDefinitions', 'enabledOperatorFilters', 'createEnrollmentCriteriaState', 'createPreviewSnapshot', 'normalizeAdvancedCriteria',
  'normalizeCriterion', 'previewMatchesSelection', 'safeParseJsonObject',
  'toCustomFilterConditions', 'toGraphQLStringLiterals', 'updateEnrollmentJsonExt',
];
const load = new Function(`const decodeId = (v) => Buffer.from(v, 'base64').toString().split(':')[1];\n${source}\nreturn { ${names.join(', ')} };`);
const {
  createEnrollmentCriteriaState, createPreviewSnapshot, normalizeAdvancedCriteria,
  normalizeCriterion, previewMatchesSelection, safeParseJsonObject,
  toCustomFilterConditions, toGraphQLStringLiterals, updateEnrollmentJsonExt,
} = load();

test('normalizes saved and legacy criteria without undefined conditions', () => {
  assert.deepEqual(normalizeAdvancedCriteria([{
    custom_filter_condition: 'age__gte__integer=18',
  }]), {
    POTENTIAL: [{
      custom_filter_condition: 'age__gte__integer=18', field: 'age', filter: 'gte', type: 'integer', value: '18',
    }],
  });
  assert.equal(normalizeCriterion({ custom_filter_condition: 'invalid' }), null);
  assert.deepEqual(toCustomFilterConditions(normalizeAdvancedCriteria('[{"custom_filter_condition":"age__gte__integer=18"}]').POTENTIAL), ['age__gte__integer=18']);
});

test('string criteria and GraphQL literals round-trip with escaping', () => {
  const original = { field: 'name', filter: 'exact', type: 'string', value: 'A "quoted" name' };
  const condition = toCustomFilterConditions([original])[0];
  assert.equal(normalizeCriterion({ custom_filter_condition: condition }).value, original.value);
  assert.deepEqual(toGraphQLStringLiterals([condition]), [JSON.stringify(condition)]);
});

test('legacy two-part conditions use exact and unquoted strings remain usable', () => {
  assert.deepEqual(normalizeCriterion({ custom_filter_condition: 'district__string=North' }), {
    custom_filter_condition: 'district__string=North', field: 'district', filter: 'exact', type: 'string', value: 'North',
  });
});

test('mandatory plan criteria stay locked and are not emitted as operator filters', () => {
  const mandatory = { field: 'status', filter: 'exact', type: 'string', value: 'VERIFIED' };
  const extra = { field: 'age', filter: 'gte', type: 'integer', value: 18 };
  const state = createEnrollmentCriteriaState([mandatory], [mandatory, extra]);
  assert.deepEqual(state.phaseCriteria, [{ ...mandatory, locked: true }]);
  assert.deepEqual(state.operatorFilters, [{ ...extra, locked: false }]);
  assert.deepEqual(toCustomFilterConditions([...state.phaseCriteria, ...state.operatorFilters]), ['age__gte__integer=18']);
});

test('preview snapshot is immutable and becomes invalid after filter, status, or plan changes', () => {
  const conditions = ['age__gte__integer=18'];
  const snapshot = createPreviewSnapshot('plan-a', 'POTENTIAL', conditions);
  conditions.push('district__exact__string="North"');
  assert.deepEqual(snapshot.conditions, ['age__gte__integer=18']);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.conditions), true);
  assert.equal(previewMatchesSelection(snapshot, 'plan-a', 'POTENTIAL', ['age__gte__integer=18']), true);
  assert.equal(previewMatchesSelection(snapshot, 'plan-a', 'ACTIVE', ['age__gte__integer=18']), false);
  assert.equal(previewMatchesSelection(snapshot, 'plan-b', 'POTENTIAL', ['age__gte__integer=18']), false);
  assert.equal(previewMatchesSelection(snapshot, 'plan-a', 'POTENTIAL', []), false);
});

test('updating operator criteria preserves unrelated JSON and status entries', () => {
  assert.deepEqual(safeParseJsonObject('{bad'), {});
  const updated = JSON.parse(updateEnrollmentJsonExt(
    '{"keep":true,"advanced_criteria":{"ACTIVE":[]}}', 'POTENTIAL', ['age__gte__integer=18'],
  ));
  assert.equal(updated.keep, true);
  assert.deepEqual(updated.advanced_criteria.ACTIVE, []);
  assert.deepEqual(updated.advanced_criteria.POTENTIAL, [{ custom_filter_condition: 'age__gte__integer=18' }]);
});

test('district conditions omit empty selection and serialize numeric and Relay IDs', () => {
  const row = { field: 'district_id', filter: 'exact', type: 'integer' };
  for (const value of ['', null, undefined]) assert.deepEqual(toCustomFilterConditions([{ ...row, value }]), []);
  for (const value of [123, Buffer.from('LocationGQLType:123').toString('base64')]) {
    assert.deepEqual(toCustomFilterConditions([{ ...row, value }]), ['district_id__exact__integer=123']);
  }
});


test('district discovery is configuration-based, household-only, and overrides legacy schema discovery', () => {
  const { enrolmentFilterDefinitions, enabledOperatorFilters } = load();
  const ordinary = { field: 'score', type: 'integer', filter: ['exact', 'gte'] };
  const district = { field: 'district_id', type: 'string', filter: ['contains'] };
  assert.deepEqual(enrolmentFilterDefinitions([ordinary], true, true), [ordinary, { field: 'district_id', type: 'integer', filter: ['exact'] }]);
  for (const enabled of [false, undefined, 'true']) {
    assert.deepEqual(enrolmentFilterDefinitions([ordinary, district], true, enabled), [ordinary]);
    assert.deepEqual(enabledOperatorFilters([ordinary, district], true, enabled), [ordinary]);
  }
  assert.deepEqual(enrolmentFilterDefinitions([ordinary, district], false, true), [ordinary]);
  assert.deepEqual(enabledOperatorFilters([district], true, true), [district]);
});
