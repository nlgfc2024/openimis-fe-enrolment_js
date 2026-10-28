import React from 'react';
import CandidatePreviewDialog from './CandidatePreviewDialog';

export default function IndividualPreviewEnrollmentDialog(props) {
  return <CandidatePreviewDialog {...props} household={false} />;
}
