import React, { useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import { styled } from '@material-ui/core/styles';

import {
  Form,
  InfoBanner,
  useHistory,
  useModulesManager,
  useTranslations,
  coreConfirm,
  clearConfirm,
  journalize,
} from '@openimis/fe-core';
import EnrollmentHeadPanel from '../components/EnrollmentHeadPanel';
import { DEFAULT_BENEFICIARY_STATUS } from '../constants';

const StyledDiv = styled('div')(({ theme }) => ({
  ...theme?.page,
}));

function EnrollmentPage({
  rights,
}) {
  const modulesManager = useModulesManager();
  const history = useHistory();
  const { formatMessage } = useTranslations('enrolment', modulesManager);
  const { formatMessage: formatIndividualMessage } = useTranslations('individual', modulesManager);
  const enrollmentUi = modulesManager.getRef('enrolment.enrollmentUiConfig')
    || modulesManager.getRef('individual.enrollmentUiConfig')
    || {};
  const showEnrollmentGuidance = enrollmentUi.show_enrollment_guidance ?? true;

  const [editedEnrollment, setEditedEnrollment] = useState({
    status: DEFAULT_BENEFICIARY_STATUS,
  });

  const back = () => history.goBack();

  const actions = [];

  return (
    <StyledDiv>
      {showEnrollmentGuidance && (
        <InfoBanner title={formatIndividualMessage('individual.enrollment.guidance.title')}>
          {formatIndividualMessage('individual.enrollment.guidance.individual')}
        </InfoBanner>
      )}
      <Form
        key=""
        module="enrolment"
        title={formatMessage('enrolment.title')}
        titleParams="Enrollment"
        edited={editedEnrollment}
        onEditedChanged={setEditedEnrollment}
        back={back}
        mandatoryFieldsEmpty={null}
        canSave={() => { }}
        save={null}
        HeadPanel={EnrollmentHeadPanel}
        rights={rights}
        actions={actions}
      />
    </StyledDiv>
  );
}

const mapDispatchToProps = (dispatch) => bindActionCreators({
  coreConfirm,
  clearConfirm,
  journalize,
}, dispatch);

// eslint-disable-next-line no-unused-vars
const mapStateToProps = (state, props) => ({
  rights: state.core?.user?.i_user?.rights ?? [],
  confirmed: state.core.confirmed,
  submittingMutation: state.enrolment?.submittingMutation,
});

export { StyledDiv };
export default connect(mapStateToProps, mapDispatchToProps)(EnrollmentPage);
