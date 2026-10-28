import React from 'react';
import EnrollmentCriteriaForm from './EnrollmentCriteriaForm';

export default function AdvancedCriteriaForm(props) {
  return <EnrollmentCriteriaForm {...props} household={false} />;
}
