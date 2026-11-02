import {
  formatMutation,
  formatQuery,
  graphql,
} from '@openimis/fe-core';
import { ACTION_TYPE } from './reducer';
import { ERROR, REQUEST, SUCCESS } from './util/action-type';

const INDIVIDUAL_SUMMARY_PROJECTION = [
  'totalNumberOfIndividuals',
  'numberOfSelectedIndividuals',
  'numberOfIndividualsAssignedToProgramme',
  'numberOfIndividualsNotAssignedToProgramme',
  'numberOfIndividualsAssignedToSelectedProgramme',
  'numberOfIndividualsToUpload',
  'poolSize', 'capApplied', 'willEnrol', 'enrolmentRanking', 'percentage',
];

const GROUP_SUMMARY_PROJECTION = [
  'verifiedUnenrolledHouseholds', 'phaseTarget', 'enrolledHouseholds',
  'totalNumberOfGroups',
  'numberOfSelectedGroups',
  'numberOfGroupsAssignedToProgramme',
  'numberOfGroupsNotAssignedToProgramme',
  'numberOfGroupsAssignedToSelectedProgramme',
  'numberOfGroupsToUpload',
  'poolSize', 'capApplied', 'willEnrol', 'enrolmentRanking', 'percentage',
];

export function fetchIndividualEnrollmentSummary(params) {
  return graphql(
    formatQuery('individualEnrollmentSummary', params, INDIVIDUAL_SUMMARY_PROJECTION),
    ACTION_TYPE.INDIVIDUAL_SUMMARY,
  );
}

export function fetchGroupEnrollmentSummary(params) {
  return graphql(
    formatQuery('groupEnrollmentSummary', params, GROUP_SUMMARY_PROJECTION),
    ACTION_TYPE.GROUP_SUMMARY,
  );
}

export function clearEnrollmentSummary(household = false) {
  return { type: household ? ACTION_TYPE.CLEAR_GROUP_SUMMARY : ACTION_TYPE.CLEAR_INDIVIDUAL_SUMMARY };
}

function formatConfirmation(params) {
  return `
    ${params?.customFilters ? `customFilters: ${params.customFilters}` : ''}
    ${params?.benefitPlanId ? `benefitPlanId: ${params.benefitPlanId}` : ''}
    ${params?.status ? `status: ${params.status}` : ''}`;
}

function confirm(mutationName, successType, params, clientMutationLabel) {
  const mutation = formatMutation(mutationName, formatConfirmation(params), clientMutationLabel);
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(successType), ERROR(ACTION_TYPE.MUTATION)],
    {
      actionType: successType,
      clientMutationId: mutation.clientMutationId,
      clientMutationLabel,
      requestedDateTime: new Date(),
    },
  );
}

export function confirmEnrollment(params, clientMutationLabel) {
  return confirm(
    'confirmIndividualEnrollment',
    ACTION_TYPE.CONFIRM_INDIVIDUAL,
    params,
    clientMutationLabel,
  );
}

export function confirmGroupEnrollment(params, clientMutationLabel) {
  return confirm(
    'confirmGroupEnrollment',
    ACTION_TYPE.CONFIRM_GROUP,
    params,
    clientMutationLabel,
  );
}
