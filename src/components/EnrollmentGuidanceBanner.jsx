import React from 'react';
import {
  InfoBanner,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

function EnrollmentGuidanceBanner({ household = false }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('enrolment', modulesManager);
  const enrollmentUi = modulesManager.getRef('enrolment.enrollmentUiConfig') || {};

  if (!(enrollmentUi.show_enrollment_guidance ?? true)) return null;

  const message = household ? 'enrolment.guidance.household' : 'enrolment.guidance.individual';
  return (
    <InfoBanner title={formatMessage('enrolment.guidance.title')}>
      {formatMessage(message)}
    </InfoBanner>
  );
}

export default EnrollmentGuidanceBanner;
