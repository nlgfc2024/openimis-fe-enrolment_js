/* eslint-disable max-len */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { injectIntl } from 'react-intl';
import {
  Backdrop, Button, CircularProgress, Divider, Typography,
} from '@material-ui/core';
import AddCircle from '@material-ui/icons/AddCircle';
import Alert from '@material-ui/lab/Alert';
import { styled } from '@material-ui/core/styles';
import {
  clearConfirm, coreAlert, coreConfirm, decodeId, fetchCustomFilter, formatMessage,
  formatMessageWithValues,
} from '@openimis/fe-core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import AdvancedCriteriaRowValue from './AdvancedCriteriaRowValue';
import EnrollmentSummary from '../EnrollmentSummary';
import IndividualPreviewEnrollmentDialog from './IndividualPreviewEnrollmentDialog';
import GroupPreviewEnrollmentDialog from './GroupPreviewEnrollmentDialog';
import { CLEARED_STATE_FILTER, INDIVIDUAL } from '../../constants';
import {
  createEnrollmentCriteriaState, createPreviewSelectionKey, createPreviewSnapshot,
  enrolmentFilterDefinitions, enabledOperatorFilters,
  isBase64Encoded, isEmptyObject, normalizeAdvancedCriteria, previewMatchesSelection,
  safeParseJsonObject, toCustomFilterConditions, toGraphQLStringLiterals, updateEnrollmentJsonExt,
} from '../../utils';
import {
  clearEnrollmentSummary, confirmEnrollment, confirmGroupEnrollment,
  fetchGroupEnrollmentSummary, fetchIndividualEnrollmentSummary,
} from '../../actions';

const Actions = styled('div')(({ theme }) => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing(1.5),
  width: '100%', padding: theme.spacing(1.5, 0, 2.5),
}));
const SummaryActions = styled('div')(({ theme }) => ({
  display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: theme.spacing(2),
  padding: theme.spacing(3, 0),
}));
const LoadingBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.modal + 1,
  color: theme.palette.common.white,
}));

function responseError(response) {
  if (response?.error) return response.error;
  const errors = response?.payload?.errors || response?.payload?.data?.errors || response?.errors;
  return errors?.length ? errors[0] : null;
}

function errorMessage(error, fallback) {
  return error?.message || (typeof error === 'string' ? error : fallback);
}

export function EnrollmentCriteriaForm({
  intl, household, object, objectToSave, fetchCustomFilter: loadCustomFilters, customFilters,
  moduleName, objectType, setAppliedCustomFilters, setAppliedFiltersRowStructure,
  updateAttributes, additionalParams, fetchIndividualEnrollmentSummary: fetchIndividualSummary,
  fetchGroupEnrollmentSummary: fetchGroupSummary, confirmEnrollment: submitIndividuals,
  confirmGroupEnrollment: submitGroups, clearEnrollmentSummary: clearSummary, confirmed,
  clearConfirm: resetConfirm, coreAlert: showAlert, coreConfirm: showConfirm, rights, edited,
  enrollmentUi,
}) {
  const [currentFilter, setCurrentFilter] = useState(CLEARED_STATE_FILTER);
  const [phaseCriteria, setPhaseCriteria] = useState([]);
  const [operatorFilters, setOperatorFilters] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewSummary, setPreviewSummary] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestSequence = useRef(0);
  const awaitingConfirmation = useRef(false);
  const isSubmittingRef = useRef(false);
  const selectionKeyRef = useRef('');
  const previousSelectionKeyRef = useRef(null);
  const mountedRef = useRef(true);
  const status = edited?.status;
  const benefitPlanId = object?.id ? decodeId(object.id) : null;
  const showMandatoryCriteria = enrollmentUi?.show_mandatory_criteria_summary ?? true;
  const showOperatorFilters = enrollmentUi?.show_advanced_operator_filters ?? true;
  const districtEnabled = household && enrollmentUi?.enable_household_district_filter === true;
  const availableFilters = enrolmentFilterDefinitions(customFilters, household, districtEnabled);
  const visibleOperators = enabledOperatorFilters(operatorFilters, household, districtEnabled);
  const operatorConditions = useMemo(
    () => (showOperatorFilters ? toCustomFilterConditions(enabledOperatorFilters(operatorFilters, household, districtEnabled)) : []),
    [operatorFilters, showOperatorFilters, household, districtEnabled],
  );
  const selectionKey = createPreviewSelectionKey(benefitPlanId, status, operatorConditions);
  selectionKeyRef.current = selectionKey;
  const filters = [...phaseCriteria, ...visibleOperators];
  const summaryKey = household ? 'groupEnrollmentSummary' : 'individualEnrollmentSummary';
  const fetchSummary = household ? fetchGroupSummary : fetchIndividualSummary;
  const submitEnrollment = household ? submitGroups : submitIndividuals;

  const invalidatePreview = () => {
    requestSequence.current += 1;
    setPreview(null);
    setPreviewSummary(null);
    setPreviewError(null);
    setIsPreviewing(false);
    clearSummary(household);
  };

  useEffect(() => {
    const phaseJson = safeParseJsonObject(edited?.benefitPlan?.jsonExt);
    const phase = normalizeAdvancedCriteria(
      edited?.benefitPlan?.advancedCriteria ?? phaseJson.advanced_criteria,
    )[status] || [];
    const savedJson = safeParseJsonObject(objectToSave?.jsonExt);
    const saved = normalizeAdvancedCriteria(savedJson.advanced_criteria)[status] || [];
    const nextState = createEnrollmentCriteriaState(phase, saved);
    setPhaseCriteria(nextState.phaseCriteria);
    setOperatorFilters(nextState.operatorFilters);
  }, [edited?.benefitPlan?.id, status]);

  useEffect(() => {
    if (previousSelectionKeyRef.current !== null && previousSelectionKeyRef.current !== selectionKey) {
      invalidatePreview();
    }
    previousSelectionKeyRef.current = selectionKey;
  }, [selectionKey]);

  useEffect(() => {
    if (object && !isEmptyObject(object)) {
      const params = [`moduleName: "${moduleName}"`, `objectTypeName: "${objectType}"`];
      if (objectType === INDIVIDUAL) {
        params.push(`uuidOfObject: "${isBase64Encoded(object.id) ? decodeId(object.id) : object.id}"`);
      }
      if (additionalParams) params.push(`additionalParams: ${JSON.stringify(JSON.stringify(additionalParams))}`);
      loadCustomFilters(params);
    }
  }, [object?.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSequence.current += 1;
      awaitingConfirmation.current = false;
      resetConfirm(false);
      clearSummary(household);
    };
  }, []);

  const updateOperatorFilters = (nextFilters) => {
    const combined = typeof nextFilters === 'function' ? nextFilters(filters) : nextFilters;
    setOperatorFilters(combined.filter((filter) => !filter.locked));
  };

  const addFilter = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
    setOperatorFilters((previous) => [...previous, { ...CLEARED_STATE_FILTER }]);
  };

  const clearFilters = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
    setAppliedFiltersRowStructure(phaseCriteria);
    setOperatorFilters([]);
  };

  const previewEnrollment = async () => {
    if (!benefitPlanId || !status || isPreviewing || isSubmittingRef.current) return;
    const conditions = [...operatorConditions];
    const snapshot = createPreviewSnapshot(benefitPlanId, status, conditions);
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setPreview(null); setPreviewSummary(null); setPreviewError(null); setIsPreviewing(true);
    clearSummary(household);

    const jsonExt = updateEnrollmentJsonExt(objectToSave?.jsonExt, status, conditions);
    const serialized = JSON.stringify(conditions.map((custom_filter_condition) => ({ custom_filter_condition })));
    setAppliedFiltersRowStructure(filters);
    setAppliedCustomFilters(serialized);
    updateAttributes(jsonExt);
    const literals = toGraphQLStringLiterals(conditions);
    const params = [
      `customFilters: [${literals}]`, `benefitPlanId: ${JSON.stringify(benefitPlanId)}`,
      `status: ${JSON.stringify(status)}`,
    ];
    try {
      const response = await fetchSummary(params);
      if (!mountedRef.current || requestId !== requestSequence.current || selectionKeyRef.current !== snapshot.selectionKey) return;
      const error = responseError(response);
      const summary = response?.payload?.data?.[summaryKey] ?? response?.data?.[summaryKey];
      if (error || !summary) {
        setPreviewError(error || new Error(formatMessage(intl, 'enrolment', 'enrolment.previewFailed')));
        return;
      }
      setPreview(snapshot);
      setPreviewSummary(summary);
    } catch (error) {
      if (mountedRef.current && requestId === requestSequence.current) setPreviewError(error);
    } finally {
      if (mountedRef.current && requestId === requestSequence.current) setIsPreviewing(false);
    }
  };

  const openConfirmation = () => {
    if (!preview || !previewMatchesSelection(preview, benefitPlanId, status, operatorConditions)) return;
    awaitingConfirmation.current = true;
    showConfirm(
      formatMessage(intl, 'enrolment', 'enrolment.confirmTitle'),
      formatMessageWithValues(intl, 'enrolment', household ? 'enrolment.confirmGroupMessageDialog' : 'enrolment.confirmMessageDialog', { benefitPlanName: object.name }),
      null, 'info',
    );
  };

  useEffect(() => {
    if (!confirmed || !awaitingConfirmation.current || !preview || isSubmittingRef.current) return;
    awaitingConfirmation.current = false;
    resetConfirm(false);
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const literals = toGraphQLStringLiterals(preview.conditions);
    const params = {
      customFilters: `[${literals}]`, benefitPlanId: JSON.stringify(preview.benefitPlanId),
      status: JSON.stringify(preview.status),
    };
    const submit = async () => {
      try {
        const response = await submitEnrollment(params, formatMessage(intl, 'enrolment', 'enrolment.mutationLabel'));
        const error = responseError(response);
        if (!response || error) throw error || new Error(formatMessage(intl, 'enrolment', 'enrolment.errorMessage'));
        if (!mountedRef.current) return;
        showAlert({
          title: formatMessage(intl, 'enrolment', household ? 'enrolment.successGroupTitle' : 'enrolment.successIndividualTitle'),
          message: formatMessage(intl, 'enrolment', household ? 'enrolment.successGroupMessage' : 'enrolment.successIndividualMessage'),
          severity: 'success',
        });
        invalidatePreview();
      } catch (error) {
        if (mountedRef.current) showAlert({
          title: formatMessage(intl, 'enrolment', 'enrolment.errorTitle'),
          message: errorMessage(error, formatMessage(intl, 'enrolment', 'enrolment.errorMessage')),
          severity: 'error',
        });
      } finally {
        isSubmittingRef.current = false;
        if (mountedRef.current) setIsSubmitting(false);
      }
    };
    submit();
  }, [confirmed]);

  const validPreview = previewMatchesSelection(preview, benefitPlanId, status, operatorConditions);
  const selectedCount = Number(previewSummary?.willEnrol
    ?? previewSummary?.[household ? 'numberOfGroupsToUpload' : 'numberOfIndividualsToUpload'] ?? 0);
  const PreviewDialog = household ? GroupPreviewEnrollmentDialog : IndividualPreviewEnrollmentDialog;

  return (
    <>
      <LoadingBackdrop open={isSubmitting || isPreviewing} aria-label={formatMessage(intl, 'core', 'loading')}>
        <CircularProgress color="inherit" />
      </LoadingBackdrop>
      {showMandatoryCriteria && phaseCriteria.length > 0 && <Typography variant="subtitle1">{formatMessage(intl, 'enrolment', 'enrolment.mandatoryCriteria')}</Typography>}
      {showMandatoryCriteria && phaseCriteria.map((filter, index) => (
        <AdvancedCriteriaRowValue key={`mandatory-${filter.custom_filter_condition || index}`} customFilters={availableFilters}
          currentFilter={filter} setCurrentFilter={setCurrentFilter} index={index} filters={filters}
          setFilters={updateOperatorFilters} readOnly />
      ))}
      {showOperatorFilters && <Typography variant="subtitle1">{formatMessage(intl, 'enrolment', 'enrolment.additionalFilters')}</Typography>}
      {showOperatorFilters && visibleOperators.map((filter, index) => (
        <AdvancedCriteriaRowValue key={`operator-${index}`} customFilters={availableFilters} currentFilter={filter}
          setCurrentFilter={setCurrentFilter} index={phaseCriteria.length + index} filters={filters}
          setFilters={updateOperatorFilters} readOnly={isSubmitting} />
      ))}
      <Actions>
        {showOperatorFilters && <>
          <Button startIcon={<AddCircle />} onClick={addFilter} disabled={isSubmitting} color="primary">{formatMessage(intl, 'enrolment', 'enrolment.addFilters')}</Button>
          <Button onClick={clearFilters} disabled={isSubmitting || operatorFilters.length === 0} color="primary">{formatMessage(intl, 'enrolment', 'enrolment.clearAllFilters')}</Button>
        </>}
        <Button onClick={previewEnrollment} variant="contained" color="primary" disabled={!object || !status || isPreviewing || isSubmitting}>{formatMessage(intl, 'enrolment', 'enrolment.previewEnrollment')}</Button>
      </Actions>
      <Divider />
      {previewError && <Alert severity="error">{errorMessage(previewError, formatMessage(intl, 'enrolment', 'enrolment.previewFailed'))}</Alert>}
      {validPreview && previewSummary && <div>
        <EnrollmentSummary summary={previewSummary} household={household} />
        <SummaryActions>
          <Button onClick={openConfirmation} variant="contained" color="primary" disabled={isSubmitting || selectedCount === 0}>{formatMessage(intl, 'enrolment', 'enrolment.confirmEnrollment')}</Button>
          <PreviewDialog rights={rights} advancedCriteria={toGraphQLStringLiterals(preview.conditions)}
            benefitPlanToEnroll={object?.id} status={preview.status} enrollmentSummary={previewSummary}
            confirmed={isSubmitting} />
        </SummaryActions>
      </div>}
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [], confirmed: state.core?.confirmed,
  customFilters: state.core?.customFilters || [],
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchCustomFilter, fetchIndividualEnrollmentSummary, fetchGroupEnrollmentSummary,
  confirmEnrollment, confirmGroupEnrollment, clearEnrollmentSummary, clearConfirm, coreAlert, coreConfirm,
}, dispatch);

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(EnrollmentCriteriaForm));
