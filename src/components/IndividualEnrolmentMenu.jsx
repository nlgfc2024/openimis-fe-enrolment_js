import React from 'react';
import { Button } from '@material-ui/core';
import PersonAdd from '@material-ui/icons/PersonAdd';
import { injectIntl } from 'react-intl';
import {
  useModulesManager,
  formatMessage,
  withHistory,
  historyPush,
} from '@openimis/fe-core';

function IndividualEnrolmentMenu({ intl, history }) {
  const modulesManager = useModulesManager();
  return (
    <Button
      variant="contained"
      color="primary"
      size="medium"
      startIcon={<PersonAdd />}
      onClick={() => historyPush(modulesManager, history, 'enrolment.route.individual')}
    >
      {formatMessage(intl, 'enrolment', 'enrolment.buttonLabel')}
    </Button>
  );
}

export default injectIntl(withHistory(IndividualEnrolmentMenu));
