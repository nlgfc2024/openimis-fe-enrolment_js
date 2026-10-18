import React from 'react';
import { MenuItem } from '@material-ui/core';
import { injectIntl } from 'react-intl';
import {
  useModulesManager,
  formatMessage,
  withHistory,
  historyPush,
} from '@openimis/fe-core';
import { styled } from '@material-ui/core/styles';

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  ...theme?.paper?.item,
}));

function GroupEnrolmentMenu({
  intl,
  history,
}) {
  const modulesManager = useModulesManager();

  return (
    <StyledMenuItem
      onClick={() => historyPush(modulesManager, history, 'enrolment.route.group')}
    >
      {formatMessage(intl, 'enrolment', 'enrolment.buttonLabel')}
    </StyledMenuItem>
  );
}

export { StyledMenuItem };
export default injectIntl(withHistory(GroupEnrolmentMenu));
