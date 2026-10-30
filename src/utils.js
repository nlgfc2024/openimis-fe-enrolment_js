import { decodeId } from '@openimis/fe-core';

export function districtLocationId(value) {
  if (value === '' || value === null || value === undefined) return null;
  const text = String(value);
  let decoded = text;
  if (!/^[1-9][0-9]*$/.test(text)) {
    try { decoded = String(decodeId(text)); } catch (error) { return null; }
  }
  const id = Number(decoded);
  return /^[1-9][0-9]*$/.test(decoded) && Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

export function isBase64Encoded(value) {
  return /^[A-Za-z0-9+/=]+$/.test(value);
}

export function isEmptyObject(value) {
  return Object.keys(value).length === 0;
}

export function safeParseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

export function normalizeCriterion(criterion) {
  if (!criterion || typeof criterion !== 'object') return null;
  if (criterion.field && criterion.filter && criterion.type) return { ...criterion };
  const condition = criterion.custom_filter_condition;
  if (typeof condition !== 'string') return null;
  const valueSeparator = condition.indexOf('=');
  if (valueSeparator < 0) return null;
  const parts = condition.slice(0, valueSeparator).split('__');
  if (parts.length < 2) return null;
  const type = parts.pop();
  const filter = parts.length > 1 ? parts.pop() : 'exact';
  const field = parts.join('__');
  if (!field || !filter || !type) return null;
  let value = condition.slice(valueSeparator + 1);
  if (type === 'string' && value.startsWith('"')) {
    try {
      const decoded = JSON.parse(value);
      if (typeof decoded === 'string') value = decoded;
    } catch (error) {
      // Keep malformed legacy values visible so the operator can correct them.
    }
  }
  return { ...criterion, field, filter, type, value };
}

export function normalizeAdvancedCriteria(value) {
  let criteria = value;
  if (typeof criteria === 'string') {
    try { criteria = JSON.parse(criteria); } catch (error) { return {}; }
  }
  if (Array.isArray(criteria)) criteria = { POTENTIAL: criteria };
  if (!criteria || typeof criteria !== 'object') return {};
  return Object.keys(criteria).reduce((result, status) => ({
    ...result,
    [status]: Array.isArray(criteria[status])
      ? criteria[status].map(normalizeCriterion).filter(Boolean)
      : [],
  }), {});
}

export function toCustomFilterConditions(filters = []) {
  return filters
    .filter((filter) => !filter.locked && filter.field && filter.filter && filter.type)
    .filter((filter) => filter.field !== 'district_id' || districtLocationId(filter.value) !== null)
    .map((filter) => {
      if (filter.field === 'district_id') return `district_id__exact__integer=${districtLocationId(filter.value)}`;
      const value = filter.type === 'string'
        ? JSON.stringify(String(filter.value ?? ''))
        : filter.value;
      return `${filter.field}__${filter.filter}__${filter.type}=${value}`;
    });
}

export function createEnrollmentCriteriaState(phaseCriteria = [], savedOperatorFilters = []) {
  const lockedPhaseCriteria = phaseCriteria.map((criterion) => ({ ...criterion, locked: true }));
  const phaseKeys = new Set(lockedPhaseCriteria.map(
    (criterion) => `${criterion.field}__${criterion.filter}__${criterion.type}=${criterion.value}`,
  ));
  const operatorFilters = savedOperatorFilters
    .filter((criterion) => !criterion.locked)
    .filter((criterion) => !phaseKeys.has(
      `${criterion.field}__${criterion.filter}__${criterion.type}=${criterion.value}`,
    ))
    .map((criterion) => ({ ...criterion, locked: false }));
  return { phaseCriteria: lockedPhaseCriteria, operatorFilters };
}

export function toGraphQLStringLiterals(conditions = []) {
  return conditions.map((condition) => JSON.stringify(condition));
}

export function updateEnrollmentJsonExt(inputJsonExt, status, conditions) {
  const existingData = safeParseJsonObject(inputJsonExt);
  existingData.advanced_criteria = {
    ...normalizeAdvancedCriteria(existingData.advanced_criteria),
    // eslint-disable-next-line camelcase
    [status]: conditions.map((custom_filter_condition) => ({ custom_filter_condition })),
  };
  return JSON.stringify(existingData);
}

export function createPreviewSelectionKey(benefitPlanId, status, conditions = []) {
  return JSON.stringify([benefitPlanId || null, status || null, conditions]);
}

export function createPreviewSnapshot(benefitPlanId, status, conditions = []) {
  const immutableConditions = Object.freeze([...conditions]);
  return Object.freeze({
    benefitPlanId,
    status,
    conditions: immutableConditions,
    selectionKey: createPreviewSelectionKey(benefitPlanId, status, immutableConditions),
  });
}

export function previewMatchesSelection(snapshot, benefitPlanId, status, conditions = []) {
  return Boolean(snapshot)
    && snapshot.selectionKey === createPreviewSelectionKey(benefitPlanId, status, conditions);
}
