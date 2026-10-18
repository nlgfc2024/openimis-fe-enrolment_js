/* eslint-disable max-len */
import React, { useEffect, useState } from 'react';
import { injectIntl } from 'react-intl';
import {
  Button, Divider, Grid, Paper, Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { useTheme, styled } from '@material-ui/core/styles';
import {
  decodeId,
  formatMessage,
  formatMessageWithValues,
  fetchCustomFilter,
  coreConfirm,
  clearConfirm,
} from '@openimis/fe-core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import GetIconComponent from '../../util/get-icon-component';
const AddCircle = GetIconComponent("Add");
import AdvancedCriteriaRowValue from './AdvancedCriteriaRowValue';
import EnrollmentSummary from '../EnrollmentSummary';
import {
  CLEARED_STATE_FILTER,
  INDIVIDUAL,
  DEFAULT_BENEFICIARY_STATUS,
} from '../../constants';
import { isBase64Encoded, isEmptyObject } from '../../utils';
import { confirmEnrollment, fetchIndividualEnrollmentSummary } from '../../actions';
import IndividualPreviewEnrollmentDialog from './IndividualPreviewEnrollmentDialog';

// Styled component replacing withStyles/styles object
const StyledPaper = styled(Paper)(({ theme }) => ({
  ...theme?.paper?.paper,
  '& .title': theme?.paper?.title,
  '& .item': theme?.paper?.item,
}));

function AdvancedCriteriaForm({
  intl,
  object,
  objectToSave,
  fetchCustomFilter,
  customFilters,
  moduleName,
  objectType,
  setAppliedCustomFilters,
  // eslint-disable-next-line no-unused-vars
  appliedFiltersRowStructure,
  setAppliedFiltersRowStructure,
  updateAttributes,
  getDefaultAppliedCustomFilters,
  additionalParams,
  fetchIndividualEnrollmentSummary,
  enrollmentSummary,
  fetchedEnrollmentSummary,
  errorEnrollmentSummary,
  confirmEnrollment,
  confirmed,
  clearConfirm,
  coreConfirm,
  rights,
  edited,
}) {
  const theme = useTheme();
  // eslint-disable-next-line no-unused-vars
  const [currentFilter, setCurrentFilter] = useState({
    field: '', filter: '', type: '', value: '', amount: '',
  });
  const [filters, setFilters] = useState(getDefaultAppliedCustomFilters());
  const [filtersToApply, setFiltersToApply] = useState(null);
  const status = edited?.status;

  const getBenefitPlanDefaultCriteria = () => {
    const jsonExt = edited?.benefitPlan?.jsonExt ?? '{}';
    const jsonData = JSON.parse(jsonExt);

    // Note: advanced_criteria is migrated from [filters] to {status: filters}
    // For backward compatibility default status take on the old filters
    let criteria = jsonData?.advanced_criteria || {};
    if (Array.isArray(criteria)) {
      criteria = { [DEFAULT_BENEFICIARY_STATUS]: criteria };
    }

    return criteria[status] || [];
  };

  useEffect(() => {
    const defaultAppliedCustomFilters = getDefaultAppliedCustomFilters();
    if (!defaultAppliedCustomFilters.length) {
      setFilters(getBenefitPlanDefaultCriteria());
    } else {
      setFilters(defaultAppliedCustomFilters);
    }
  }, [edited]);

  const createParams = (moduleName, objectTypeName, uuidOfObject = null, additionalParams = null) => {
    const params = [
      `moduleName: "${moduleName}"`,
      `objectTypeName: "${objectTypeName}"`,
    ];
    if (uuidOfObject) {
      params.push(`uuidOfObject: "${uuidOfObject}"`);
    }
    if (additionalParams) {
      params.push(`additionalParams: ${JSON.stringify(JSON.stringify(additionalParams))}`);
    }
    return params;
  };

  const fetchFilters = (params) => {
    fetchCustomFilter(params);
  };

  const handleClose = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
  };

  const handleAddFilter = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
    setFilters([...filters, CLEARED_STATE_FILTER]);
  };

  function updateJsonExt(inputJsonExt, outputFilters) {
    const existingData = JSON.parse(inputJsonExt || '{}');
    const filterData = JSON.parse(outputFilters);

    const advancedCriteria = existingData?.advanced_criteria || {};
    const updatedAdvancedCriteria = { ...advancedCriteria, [status]: filterData };
    existingData.advanced_criteria = updatedAdvancedCriteria;

    const updatedJsonExt = JSON.stringify(existingData);
    return updatedJsonExt;
  }

  const handleRemoveFilter = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
    setAppliedFiltersRowStructure([CLEARED_STATE_FILTER]);
    setFilters([CLEARED_STATE_FILTER]);
  };

  const saveCriteria = () => {
    setAppliedFiltersRowStructure(filters);
    const outputFilters = JSON.stringify(
      filters.map(({
        filter, value, field, type,
      }) => ({
        custom_filter_condition: `${field}__${filter}__${type}=${value}`,
      })),
    );
    const jsonExt = updateJsonExt(objectToSave.jsonExt, outputFilters);
    updateAttributes(jsonExt);
    setAppliedCustomFilters(outputFilters);

    // Parse the jsonExt string to extract advanced_criteria
    const jsonData = JSON.parse(jsonExt);
    const advancedCriteria = jsonData.advanced_criteria?.[status] || [];

    // Extract custom_filter_condition values and construct customFilters array
    const customFilters = advancedCriteria.map((criterion) => `"${criterion.custom_filter_condition}"`);
    setFiltersToApply(customFilters);
    const params = [
      `customFilters: [${customFilters}]`,
      `benefitPlanId: "${decodeId(object.id)}"`,
      `status: "${status}"`,
    ];
    fetchIndividualEnrollmentSummary(params);
    handleClose();
  };

  useEffect(() => {
    if (object && isEmptyObject(object) === false) {
      let paramsToFetchFilters = [];
      if (objectType === INDIVIDUAL) {
        paramsToFetchFilters = createParams(
          moduleName,
          objectType,
          isBase64Encoded(object.id) ? decodeId(object.id) : object.id,
          additionalParams,
        );
      } else {
        paramsToFetchFilters = createParams(
          moduleName,
          objectType,
          additionalParams,
        );
      }
      fetchFilters(paramsToFetchFilters);
    }
  }, [object]);

  useEffect(() => { }, [filters]);

  const openConfirmEnrollmentDialog = () => {
    coreConfirm(
      formatMessage(intl, 'enrolment', 'enrolment.confirmTitle'),
      formatMessageWithValues(intl, 'enrolment', 'enrolment.confirmMessageDialog', { benefitPlanName: object.name }),
    );
  };

  useEffect(() => {
    if (confirmed) {
      const outputFilters = JSON.stringify(
        filters.map(({
          filter, value, field, type,
        }) => ({
          custom_filter_condition: `${field}__${filter}__${type}=${value}`,
        })),
      );
      const jsonExt = updateJsonExt(objectToSave.jsonExt, outputFilters);
      const jsonData = JSON.parse(jsonExt);
      const advancedCriteria = jsonData.advanced_criteria?.[status] || [];

      // Extract custom_filter_condition values and construct customFilters array
      const customFilters = advancedCriteria.map((criterion) => `"${criterion.custom_filter_condition}"`);
      setFiltersToApply(customFilters);
      const params = {
        customFilters: `[${customFilters}]`,
        benefitPlanId: `"${decodeId(object?.id)}"`,
        status: `"${status}"`,
      };
      confirmEnrollment(
        params,
        formatMessage(intl, 'enrolment', 'enrolment.mutationLabel'),
      );
    }
  }, [confirmed]);

  return (
    <>
      {filters.map((filter, index) => (
        <AdvancedCriteriaRowValue
          key={index}
          customFilters={customFilters}
          currentFilter={filter}
          setCurrentFilter={setCurrentFilter}
          index={index}
          filters={filters}
          setFilters={setFilters}
          readOnly={confirmed}
        />
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, width: '100%', padding: '12px 0 20px' }}>
        <Button startIcon={<AddCircle />} onClick={handleAddFilter} disabled={confirmed} color="primary">
          {formatMessage(intl, 'enrolment', 'enrolment.addFilters')}
        </Button>
        <Button onClick={handleRemoveFilter} disabled={confirmed} color="primary">
          {formatMessage(intl, 'enrolment', 'enrolment.clearAllFilters')}
        </Button>
        <Button onClick={saveCriteria} variant="contained" color="primary" disabled={!object || !status || confirmed}>
          {formatMessage(intl, 'enrolment', 'enrolment.previewEnrollment')}
        </Button>
      </div>
      <Divider />
      {fetchedEnrollmentSummary && errorEnrollmentSummary && (
        <Alert severity="error" style={{ marginTop: 16 }}>
          {errorEnrollmentSummary?.message
            || (typeof errorEnrollmentSummary === 'string'
              ? errorEnrollmentSummary
              : JSON.stringify(errorEnrollmentSummary))}
        </Alert>
      )}
      {fetchedEnrollmentSummary && enrollmentSummary && !errorEnrollmentSummary && (
        <div style={{ width: '100%' }}>
          <EnrollmentSummary summary={enrollmentSummary} household={false} />
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, padding: '24px 0' }}>
            <Button onClick={openConfirmEnrollmentDialog} variant="contained" color="primary"
              disabled={!object || confirmed || Number(enrollmentSummary.willEnrol ?? enrollmentSummary.numberOfIndividualsToUpload ?? 0) === 0}>
              {formatMessage(intl, 'enrolment', 'enrolment.confirmEnrollment')}
            </Button>
            <IndividualPreviewEnrollmentDialog rights={rights} advancedCriteria={filtersToApply}
              benefitPlanToEnroll={object?.id} status={status} enrollmentSummary={enrollmentSummary} confirmed={confirmed} />
          </div>
        </div>
      )}
    </>
  );
}

// eslint-disable-next-line no-unused-vars
const mapStateToProps = (state, props) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  confirmed: state.core.confirmed,
  fetchingCustomFilters: state.core.fetchingCustomFilters,
  errorCustomFilters: state.core.errorCustomFilters,
  fetchedCustomFilters: state.core.fetchedCustomFilters,
  customFilters: state.core.customFilters,
  fetchingEnrollmentSummary: state.enrolment.fetchingEnrollmentSummary,
  errorEnrollmentSummary: state.enrolment.enrollmentSummaryError,
  fetchedEnrollmentSummary: state.enrolment.fetchedEnrollmentSummary,
  enrollmentSummary: state.enrolment.enrollmentSummary,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchCustomFilter,
  fetchIndividualEnrollmentSummary,
  confirmEnrollment,
  clearConfirm,
  coreConfirm,
}, dispatch);

export { StyledPaper };
export default injectIntl(
  connect(mapStateToProps, mapDispatchToProps)(AdvancedCriteriaForm)
);
