import React from 'react';
import { CircularProgress, Paper, Typography } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { styled } from '@material-ui/core/styles';
import {
  decodeId, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import {
  describeCriterion, describeOrderBy, isBase64Encoded, parseJsonValue,
} from '../util/enrolment-utils';

export const PROGRAMME_PROFILE_QUERY = `
  query EnrolmentProgrammeProfile($benefitPlanId: String!, $status: String!) {
    enrolmentProgrammeProfile(benefitPlanId: $benefitPlanId, status: $status) {
      key description criteria ranking rankingStatus unsuitableReasons profileRequired
    }
  }
`;

const Section = styled(Paper)(({ theme }) => ({ padding: theme.spacing(2), margin: theme.spacing(1, 0, 2) }));
const Heading = styled(Typography)(({ theme }) => ({ marginTop: theme.spacing(1.5) }));

// One line per rule in the profile ranking, in the order they are applied.
export function rankingLines(ranking, formatMessage, formatMessageWithValues) {
  const lines = [];
  const weighted = ranking.weighted_score;
  if (weighted) {
    lines.push(formatMessageWithValues('enrolment.profile.score', { total: weighted.normalise_to ?? 100 }));
    (weighted.components || []).forEach((component) => {
      lines.push(formatMessageWithValues('enrolment.profile.scoreItem', {
        name: component.label
          || [component.subject, component.field || component.derived].filter(Boolean).join(': '),
        weight: component.weight,
      }));
    });
  }
  if (ranking.minimum_score !== undefined && ranking.minimum_score !== null) {
    lines.push(formatMessageWithValues('enrolment.profile.minimumScore', { minimumScore: ranking.minimum_score }));
  }
  const order = describeOrderBy(ranking.order_by, formatMessage('enrolment.weightedScore'));
  if (order) lines.push(formatMessageWithValues('enrolment.profile.order', { order }));
  const strategy = ranking.selection_strategy;
  if (strategy) {
    (strategy.quotas || []).forEach((quota) => {
      const condition = (quota.when || []).map(describeCriterion).join(', ');
      lines.push(quota.count !== undefined && quota.count !== null
        ? formatMessageWithValues('enrolment.profile.quotaCount', { key: quota.key, count: quota.count, condition })
        : formatMessageWithValues('enrolment.profile.quotaPercentage', { key: quota.key, percentage: quota.percentage, condition }));
    });
    if (strategy.female_percentage) {
      lines.push(formatMessageWithValues('enrolment.profile.femaleShare', {
        percentage: strategy.female_percentage, value: strategy.female_value,
      }));
    }
    if (strategy.youth_percentage) {
      lines.push(formatMessageWithValues('enrolment.profile.youthShare', {
        percentage: strategy.youth_percentage, min: strategy.youth_min_age, max: strategy.youth_max_age,
      }));
    }
    if (strategy.source) lines.push(formatMessageWithValues('enrolment.profile.quotaSource', { source: strategy.source }));
  }
  const limit = ranking.limit || {};
  if (limit.percentage !== undefined && limit.percentage !== null) {
    lines.push(formatMessageWithValues('enrolment.profile.limitPercentage', { percentage: limit.percentage }));
  }
  if (limit.respect_max_beneficiaries === false) lines.push(formatMessage('enrolment.profile.ignoresMaxBeneficiaries'));
  return lines;
}

function ProfileRules({ benefitPlanId, status }) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations('enrolment', modulesManager);
  const { isLoading, error, data } = useGraphqlQuery(PROGRAMME_PROFILE_QUERY, { benefitPlanId, status });

  if (isLoading) return <CircularProgress size={24} aria-label={formatMessage('enrolment.profile.loading')} />;
  if (error) return <Alert severity="error">{formatMessage('enrolment.profile.loadFailed')}</Alert>;
  const profile = data?.enrolmentProgrammeProfile;
  if (!profile) return null;
  if (!profile.key) {
    return (
      <Alert severity={profile.profileRequired ? 'warning' : 'info'}>
        {formatMessage(profile.profileRequired ? 'enrolment.profile.requiredMissing' : 'enrolment.profile.none')}
      </Alert>
    );
  }
  const criteria = parseJsonValue(profile.criteria, []);
  const ranking = parseJsonValue(profile.ranking);
  const reasons = profile.unsuitableReasons || [];

  return (
    <Section elevation={1}>
      <Typography variant="subtitle1">{formatMessageWithValues('enrolment.profile.title', { key: profile.key })}</Typography>
      {profile.description && <Typography variant="body2">{profile.description}</Typography>}
      {reasons.length > 0 && (
        <Alert severity="error">
          {formatMessage('enrolment.profile.unsuitable')}
          {reasons.map((reason) => <div key={reason}>{reason}</div>)}
        </Alert>
      )}
      <Heading variant="subtitle2">{formatMessage('enrolment.profile.criteria')}</Heading>
      {Array.isArray(criteria) && criteria.length
        ? criteria.map((criterion) => (
          <Typography variant="body2" key={describeCriterion(criterion)}>{describeCriterion(criterion)}</Typography>
        ))
        : <Typography variant="body2">{formatMessage('enrolment.profile.noCriteria')}</Typography>}
      <Heading variant="subtitle2">
        {profile.rankingStatus === '*' || !ranking
          ? formatMessage('enrolment.profile.ranking')
          : formatMessageWithValues('enrolment.profile.rankingForStatus', { status: profile.rankingStatus })}
      </Heading>
      {ranking
        ? rankingLines(ranking, formatMessage, formatMessageWithValues).map((line) => (
          <Typography variant="body2" key={line}>{line}</Typography>
        ))
        : <Typography variant="body2">{formatMessageWithValues('enrolment.profile.noRanking', { status })}</Typography>}
    </Section>
  );
}

// The programme profile rules that apply to a Phase and beneficiary status,
// read-only. Published as enrolment.ProgrammeProfileSummary for the Phase page.
export default function ProgrammeProfileSummary({ benefitPlanId, status }) {
  const id = benefitPlanId && isBase64Encoded(benefitPlanId) ? decodeId(benefitPlanId) : benefitPlanId;
  if (!id || !status) return null;
  return <ProfileRules benefitPlanId={id} status={status} />;
}
