import React from 'react';
import { MenuItem } from '@material-ui/core';
import { styled } from '@material-ui/core/styles';
import { injectIntl } from 'react-intl';
import {
  formatMessage,
  historyPush,
  useModulesManager,
  withHistory,
} from '@openimis/fe-core';

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  ...theme?.paper?.item,
}));

function IndividualEnrolmentMenu({ intl, history }) {
  const modulesManager = useModulesManager();
  return (
    <StyledMenuItem
      onClick={() => historyPush(modulesManager, history, 'enrolment.route.individual')}
    >
      {formatMessage(intl, 'enrolment', 'enrolment.buttonLabel')}
    </StyledMenuItem>
  );
}

export default injectIntl(withHistory(IndividualEnrolmentMenu));
