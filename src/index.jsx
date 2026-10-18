import React from 'react';
import { FormattedMessage } from '@openimis/fe-core';
import Person from '@material-ui/icons/Person';
import People from '@material-ui/icons/People';
import AssignmentInd from '@material-ui/icons/AssignmentInd';
import EnrollmentPage from './pages/EnrollmentPage';
import EnrollmentGroupPage from './pages/EnrollmentGroupPage';
import reducer from './reducer';
import messagesEn from './translations/en.json';
import { RIGHT_GROUP_CREATE, RIGHT_INDIVIDUAL_CREATE } from './constants';
import GroupEnrolmentMenu from './components/GroupEnrolmentMenu';
import IndividualEnrolmentMenu from './components/IndividualEnrolmentMenu';
import AdvancedCriteriaRowValue from './components/dialogs/AdvancedCriteriaRowValue';

const ROUTE_INDIVIDUAL_ENROLMENT = 'enrolment/individuals';
const ROUTE_GROUP_ENROLMENT = 'enrolment/groups';

const DEFAULT_CONFIG = {
  translations: [{ key: 'en', messages: messagesEn }],
  reducers: [{ key: 'enrolment', reducer }],
  'core.Router': [
    {
      path: ROUTE_INDIVIDUAL_ENROLMENT,
      text: 'enrolment.menu.individuals',
      id: 'enrolment.individualEnrolment',
      component: EnrollmentPage,
      rights: [RIGHT_INDIVIDUAL_CREATE],
      icon: 'Person',
    },
    {
      path: ROUTE_GROUP_ENROLMENT,
      text: 'enrolment.menu.groups',
      id: 'enrolment.groupEnrolment',
      component: EnrollmentGroupPage,
      rights: [RIGHT_GROUP_CREATE],
      icon: 'People',
    },
    // Preserve bookmarked links while route ownership moves out of Individual.
    {
      path: 'individuals/enrollment',
      component: EnrollmentPage,
      rights: [RIGHT_INDIVIDUAL_CREATE],
    },
    {
      path: 'groups/enrollment',
      component: EnrollmentGroupPage,
      rights: [RIGHT_GROUP_CREATE],
    },
  ],
  'socialProtection.MainMenu': [
    {
      id: 'enrolment.menu',
      text: <FormattedMessage module="enrolment" id="menu.title" />,
      icon: <AssignmentInd />,
      children: [
        {
          id: 'enrolment.individualEnrolment',
          text: <FormattedMessage module="enrolment" id="menu.individuals" />,
          icon: <Person />,
          route: `/${ROUTE_INDIVIDUAL_ENROLMENT}`,
          filter: (rights) => rights.includes(RIGHT_INDIVIDUAL_CREATE),
        },
        {
          id: 'enrolment.groupEnrolment',
          text: <FormattedMessage module="enrolment" id="menu.groups" />,
          icon: <People />,
          route: `/${ROUTE_GROUP_ENROLMENT}`,
          filter: (rights) => rights.includes(RIGHT_GROUP_CREATE),
        },
      ],
    },
  ],
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

export const EnrolmentModule = (cfg) => ({ ...DEFAULT_CONFIG, ...cfg });
