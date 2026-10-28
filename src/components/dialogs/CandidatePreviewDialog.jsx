import React, { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
} from '@material-ui/core';
import { styled } from '@material-ui/core/styles';
import {
  decodeId, PublishedComponent, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { ENROLMENT_MODULE_NAME } from '../../constants';

const PreviewContent = styled(DialogContent)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
}));
const PreviewActions = styled(DialogActions)(({ theme }) => ({ padding: theme.spacing(2) }));
const PreviewButton = styled(Button)(({ theme }) => ({ marginLeft: theme.spacing(2) }));

export default function CandidatePreviewDialog({
  household, rights, advancedCriteria, benefitPlanToEnroll, status, enrollmentSummary, confirmed,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(ENROLMENT_MODULE_NAME, modulesManager);
  const count = Number(enrollmentSummary?.[household ? 'numberOfGroupsToUpload' : 'numberOfIndividualsToUpload']
    ?? enrollmentSummary?.willEnrol ?? 0);
  const title = household ? 'enrolment.previewGroups' : 'enrolment.previewIndividuals';

  return <>
    <PreviewButton onClick={() => setIsOpen(true)} variant="contained" color="primary" disabled={count === 0 || confirmed}>
      {formatMessage(title)}
    </PreviewButton>
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} maxWidth="xl" fullWidth>
      <DialogTitle>{formatMessage(title)}</DialogTitle>
      <PreviewContent>
        <PublishedComponent
          pubRef={household ? 'individual.GroupSearcher' : 'individual.IndividualSearcher'}
          rights={rights}
          readOnly
          preserveBackendOrder
          queryName={household ? 'group: enrolmentGroupCandidate' : 'individual: enrolmentIndividualCandidate'}
          additionalQueryFilters={{
            customFilters: { value: advancedCriteria, filter: `customFilters: [${advancedCriteria}]` },
            benefitPlanId: {
              value: benefitPlanToEnroll,
              filter: `benefitPlanId: ${JSON.stringify(decodeId(benefitPlanToEnroll))}`,
            },
            status: { value: status, filter: `status: ${JSON.stringify(status)}` },
          }}
        />
      </PreviewContent>
      <PreviewActions>
        <Button onClick={() => setIsOpen(false)} variant="outlined" autoFocus>{formatMessage('enrolment.close')}</Button>
      </PreviewActions>
    </Dialog>
  </>;
}
