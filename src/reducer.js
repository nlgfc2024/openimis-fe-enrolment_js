import {
  dispatchMutationErr,
  dispatchMutationReq,
  dispatchMutationResp,
  formatGraphQLError,
  formatServerError,
} from '@openimis/fe-core';
import { ERROR, REQUEST, SUCCESS } from './util/action-type';

export const ACTION_TYPE = {
  MUTATION: 'ENROLMENT_MUTATION',
  INDIVIDUAL_SUMMARY: 'ENROLMENT_INDIVIDUAL_SUMMARY',
  GROUP_SUMMARY: 'ENROLMENT_GROUP_SUMMARY',
  CONFIRM_INDIVIDUAL: 'ENROLMENT_CONFIRM_INDIVIDUAL',
  CONFIRM_GROUP: 'ENROLMENT_CONFIRM_GROUP',
};

const initialState = {
  submittingMutation: false,
  mutation: {},
  fetchingEnrollmentSummary: false,
  fetchedEnrollmentSummary: false,
  enrollmentSummary: null,
  enrollmentSummaryError: null,
  fetchingEnrollmentGroupSummary: false,
  fetchedEnrollmentGroupSummary: false,
  enrollmentGroupSummary: null,
  enrollmentGroupSummaryError: null,
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case REQUEST(ACTION_TYPE.INDIVIDUAL_SUMMARY):
      return {
        ...state,
        fetchingEnrollmentSummary: true,
        fetchedEnrollmentSummary: false,
        enrollmentSummary: null,
        enrollmentSummaryError: null,
      };
    case SUCCESS(ACTION_TYPE.INDIVIDUAL_SUMMARY):
      return {
        ...state,
        fetchingEnrollmentSummary: false,
        fetchedEnrollmentSummary: true,
        enrollmentSummary: action.payload.data.individualEnrollmentSummary,
        enrollmentSummaryError: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.INDIVIDUAL_SUMMARY):
      return {
        ...state,
        fetchingEnrollmentSummary: false,
        enrollmentSummaryError: formatServerError(action.payload),
      };
    case REQUEST(ACTION_TYPE.GROUP_SUMMARY):
      return {
        ...state,
        fetchingEnrollmentGroupSummary: true,
        fetchedEnrollmentGroupSummary: false,
        enrollmentGroupSummary: null,
        enrollmentGroupSummaryError: null,
      };
    case SUCCESS(ACTION_TYPE.GROUP_SUMMARY):
      return {
        ...state,
        fetchingEnrollmentGroupSummary: false,
        fetchedEnrollmentGroupSummary: true,
        enrollmentGroupSummary: action.payload.data.groupEnrollmentSummary,
        enrollmentGroupSummaryError: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.GROUP_SUMMARY):
      return {
        ...state,
        fetchingEnrollmentGroupSummary: false,
        enrollmentGroupSummaryError: formatServerError(action.payload),
      };
    case REQUEST(ACTION_TYPE.MUTATION):
      return dispatchMutationReq(state, action);
    case ERROR(ACTION_TYPE.MUTATION):
      return dispatchMutationErr(state, action);
    case SUCCESS(ACTION_TYPE.CONFIRM_INDIVIDUAL):
      return dispatchMutationResp(state, 'confirmIndividualEnrollment', action);
    case SUCCESS(ACTION_TYPE.CONFIRM_GROUP):
      return dispatchMutationResp(state, 'confirmGroupEnrollment', action);
    default:
      return state;
  }
}
