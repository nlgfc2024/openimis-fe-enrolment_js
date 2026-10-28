import React from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import Person from '@material-ui/icons/Person';
import People from '@material-ui/icons/People';
import AssignmentInd from '@material-ui/icons/AssignmentInd';
import {
  formatMessage,
  MainMenuContribution,
  withModulesManager,
} from '@openimis/fe-core';
import { RIGHT_GROUP_CREATE, RIGHT_INDIVIDUAL_CREATE } from '../constants';

function EnrolmentMainMenu(props) {
  const entries = [
    {
      id: 'enrolment.individualEnrolment',
      text: formatMessage(props.intl, 'enrolment', 'menu.individuals'),
      icon: <Person />,
      route: '/enrolment/individuals',
      filter: (rights) => rights.includes(RIGHT_INDIVIDUAL_CREATE),
    },
    {
      id: 'enrolment.groupEnrolment',
      text: formatMessage(props.intl, 'enrolment', 'menu.groups'),
      icon: <People />,
      route: '/enrolment/groups',
      filter: (rights) => rights.includes(RIGHT_GROUP_CREATE),
    },
  ];

  return (
    <MainMenuContribution
      {...props}
      header={formatMessage(props.intl, 'enrolment', 'menu.title')}
      icon={<AssignmentInd />}
      entries={entries}
      menuId="EnrolmentMainMenu"
    />
  );
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
});

export default injectIntl(withModulesManager(connect(mapStateToProps)(EnrolmentMainMenu)));
