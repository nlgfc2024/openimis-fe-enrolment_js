/* eslint-disable max-len */
/* eslint-disable camelcase */
import React from 'react';
import { injectIntl } from 'react-intl';

import { Grid, Divider } from '@material-ui/core';
import { styled } from '@material-ui/core/styles';

import {
  decodeId,
  FormPanel,
  PublishedComponent,
  formatMessage,
  withModulesManager,
} from '@openimis/fe-core';
import AdvancedCriteriaForm from './dialogs/AdvancedCriteriaForm';
import { CLEARED_STATE_FILTER } from '../constants';

const StyledGrid = styled(Grid)(({ theme }) => ({
  width: '100%',
  '& .item': theme?.paper?.item,
  '& .fullHeight': {
    height: '100%',
  },
}));

class EnrollmentHeadPanel extends FormPanel {
  constructor(props) {
    super(props);
    this.state = {
      appliedCustomFilters: [CLEARED_STATE_FILTER],
      appliedFiltersRowStructure: [CLEARED_STATE_FILTER],
    };
  }

  updateJsonExt = (value) => {
    this.updateAttributes({
      jsonExt: value,
    });
  };

  setAppliedCustomFilters = (appliedCustomFilters) => {
    this.setState({ appliedCustomFilters });
  };

  setAppliedFiltersRowStructure = (appliedFiltersRowStructure) => {
    this.setState({ appliedFiltersRowStructure });
  };

  render() {
    // eslint-disable-next-line no-unused-vars
    const { edited, intl } = this.props;
    const { appliedCustomFilters, appliedFiltersRowStructure } = this.state;
    const enrollmentUi = this.props.modulesManager?.getRef('enrolment.enrollmentUiConfig')
      || this.props.modulesManager?.getRef('individual.enrollmentUiConfig');
    return (
      <>
        <StyledGrid container className="item">
          <StyledGrid item xs={12} md={3} className="item">
            <PublishedComponent
              pubRef="socialProtection.BenefitPlanPicker"
              withNull
              required
              filterLabels={false}
              onChange={(benefitPlan) => this.updateAttribute('benefitPlan', benefitPlan)}
              value={edited?.benefitPlan}
            />
          </StyledGrid>
          <StyledGrid item xs={12} md={3} className="item">
            <PublishedComponent
              pubRef="socialProtection.BeneficiaryStatusPicker"
              required
              withNull={false}
              filterLabels={false}
              onChange={(status) => this.updateAttribute('status', status)}
              value={edited?.status}
            />
          </StyledGrid>
        </StyledGrid>
        <Divider />
        <StyledGrid>
          <>
            <div className="item">
              {formatMessage(intl, 'enrolment', 'enrolment.criteria')}
            </div>
            <Divider />
            <StyledGrid container className="item">
              <AdvancedCriteriaForm
                object={edited.benefitPlan}
                objectToSave={edited}
                moduleName="individual"
                objectType="Individual"
                setAppliedCustomFilters={this.setAppliedCustomFilters}
                appliedCustomFilters={appliedCustomFilters}
                appliedFiltersRowStructure={appliedFiltersRowStructure}
                setAppliedFiltersRowStructure={this.setAppliedFiltersRowStructure}
                updateAttributes={this.updateJsonExt}
                additionalParams={edited?.benefitPlan ? { benefitPlan: `${decodeId(edited.benefitPlan.id)}` } : null}
                edited={edited}
                enrollmentUi={enrollmentUi}
              />
            </StyledGrid>
          </>
        </StyledGrid>
      </>
    );
  }
}

export { StyledGrid };
export default withModulesManager(injectIntl(EnrollmentHeadPanel));
