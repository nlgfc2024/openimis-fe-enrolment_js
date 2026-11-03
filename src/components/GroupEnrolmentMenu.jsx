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

function GroupEnrolmentMenu({
  intl,
  history,
}) {
  const modulesManager = useModulesManager();

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<PersonAdd />}
      style={{ minHeight: 42, padding: '6px 16px' }}
      onClick={() => historyPush(modulesManager, history, 'enrolment.route.group')}
    >
      {formatMessage(intl, 'enrolment', 'enrolment.buttonLabel')}
    </Button>
  );
}

export default injectIntl(withHistory(GroupEnrolmentMenu));
