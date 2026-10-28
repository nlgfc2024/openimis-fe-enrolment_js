import EnrollmentPage from './pages/EnrollmentPage';
import EnrollmentGroupPage from './pages/EnrollmentGroupPage';
import reducer from './reducer';
import messagesEn from './translations/en.json';
import { RIGHT_GROUP_CREATE, RIGHT_INDIVIDUAL_CREATE } from './constants';
import GroupEnrolmentMenu from './components/GroupEnrolmentMenu';
import IndividualEnrolmentMenu from './components/IndividualEnrolmentMenu';
import EnrolmentMainMenu from './components/EnrolmentMainMenu';
import AdvancedCriteriaRowValue from './components/dialogs/AdvancedCriteriaRowValue';

const ROUTE_INDIVIDUAL_ENROLMENT = 'enrolment/individuals';
const ROUTE_GROUP_ENROLMENT = 'enrolment/groups';

const DEFAULT_ENROLLMENT_UI = {
  show_mandatory_criteria_summary: true,
  show_advanced_operator_filters: true,
  show_enrollment_guidance: true,
};

const DEFAULT_CONFIG = {
  translations: [{ key: 'en', messages: messagesEn }],
  reducers: [{ key: 'enrolment', reducer }],
  'core.Router': [
    {
      path: ROUTE_INDIVIDUAL_ENROLMENT,
      text: 'enrolment.menu.individuals',
      id: 'enrolment.individualEnrolment',
      component: EnrollmentPage,
      requiredRights: [RIGHT_INDIVIDUAL_CREATE],
      icon: 'Person',
    },
    {
      path: ROUTE_GROUP_ENROLMENT,
      text: 'enrolment.menu.groups',
      id: 'enrolment.groupEnrolment',
      component: EnrollmentGroupPage,
      requiredRights: [RIGHT_GROUP_CREATE],
      icon: 'People',
    },
    // Preserve bookmarked links while route ownership moves out of Individual.
    {
      path: 'individuals/enrollment',
      component: EnrollmentPage,
      requiredRights: [RIGHT_INDIVIDUAL_CREATE],
    },
    {
      path: 'groups/enrollment',
      component: EnrollmentGroupPage,
      requiredRights: [RIGHT_GROUP_CREATE],
    },
  ],
  'core.MainMenu': [{ name: 'EnrolmentMainMenu', component: EnrolmentMainMenu }],
  'individual.IndividualsUploadDialog': IndividualEnrolmentMenu,
  'individual.group.GroupMenu': GroupEnrolmentMenu,
  refs: [
    { key: 'enrolment.route.individual', ref: ROUTE_INDIVIDUAL_ENROLMENT },
    { key: 'enrolment.route.group', ref: ROUTE_GROUP_ENROLMENT },
    { key: 'enrolment.AdvancedCriteriaRowValue', ref: AdvancedCriteriaRowValue },
    { key: 'individual.route.enrollment', ref: ROUTE_INDIVIDUAL_ENROLMENT },
    { key: 'individual.route.groupEnrollment', ref: ROUTE_GROUP_ENROLMENT },
  ],
};

export const EnrolmentModule = (cfg = {}) => {
  const enrollmentUi = { ...DEFAULT_ENROLLMENT_UI, ...(cfg.enrollment_ui || {}) };
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    refs: [
      ...DEFAULT_CONFIG.refs,
      { key: 'enrolment.enrollmentUiConfig', ref: enrollmentUi },
      // Temporary compatibility alias. Remove with the legacy routes after Individual FE #22 is deployed.
      { key: 'individual.enrollmentUiConfig', ref: enrollmentUi },
    ],
  };
};
