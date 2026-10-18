/* eslint-disable max-len */
import React, { useState } from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {
  useModulesManager,
  useTranslations,
  decodeId,
  PublishedComponent,
} from '@openimis/fe-core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ENROLMENT_MODULE_NAME } from '../../constants';

function GroupPreviewEnrollmentDialog({
  classes,
  rights,
  advancedCriteria,
  benefitPlanToEnroll,
  status,
  enrollmentSummary,
  confirmed,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(ENROLMENT_MODULE_NAME, modulesManager);

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="contained"
        color="primary"
        className={classes?.button}
        style={{ marginLeft: '16px' }}
        disabled={Number(enrollmentSummary?.numberOfGroupsToUpload ?? 0) === 0 || confirmed}
      >
        {formatMessage('enrolment.previewGroups')}
      </Button>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          style: {
            width: '90vw',
            maxWidth: 1440,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle
          style={{
            marginTop: '10px',
          }}
        >
          {formatMessage('enrolment.previewGroups')}
        </DialogTitle>
        <DialogContent>
          <div
            style={{ backgroundColor: '#DFEDEF' }}
          >
            <PublishedComponent
              pubRef="individual.GroupSearcher"
              rights={rights}
              readOnly
              preserveBackendOrder
              queryName="group: enrolmentGroupCandidate"
              additionalQueryFilters={{
                customFilters: {
                  value: advancedCriteria,
                  filter: `customFilters: [${advancedCriteria}]`,
                },
                benefitPlanId: {
                  value: benefitPlanToEnroll,
                  filter: `benefitPlanId: "${decodeId(benefitPlanToEnroll)}"`,
                },
                status: {
                  value: status,
                  filter: `status: "${status}"`,
                },
              }}
            />
          </div>
        </DialogContent>
        <DialogActions
          style={{
            display: 'inline',
            paddingLeft: '10px',
            marginTop: '25px',
            marginBottom: '15px',
            width: '100%',
          }}
        >
          <div style={{ maxWidth: '3000px' }}>
            <div style={{ float: 'left' }} />
            <div style={{
              float: 'right',
              paddingRight: '16px',
            }}
            >
              <Button
                onClick={handleClose}
                variant="outlined"
                autoFocus
                style={{ margin: '0 16px' }}
              >
                {formatMessage('enrolment.close')}
              </Button>
            </div>
          </div>
        </DialogActions>
      </Dialog>
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
}, dispatch);

export { GroupPreviewEnrollmentDialog };
export default connect(mapStateToProps, mapDispatchToProps)(GroupPreviewEnrollmentDialog);
