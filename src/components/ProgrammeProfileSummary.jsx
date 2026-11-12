import React from 'react';
import { CircularProgress, Typography } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { styled } from '@material-ui/core/styles';
import {
  decodeId, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import {
  describeCriterion, describeOrderBy, describeTarget, filterSymbol, isBase64Encoded, parseJsonValue, ruleLabeller,
} from '../util/enrolment-utils';

export const PROGRAMME_PROFILE_QUERY = `
  query EnrolmentProgrammeProfile($benefitPlanId: String!, $status: String!) {
    enrolmentProgrammeProfile(benefitPlanId: $benefitPlanId, status: $status) {
      key description criteria ranking rankingStatus unsuitableReasons profileRequired
    }
  }
`;

// Full width, and styled like the read-only Phase criteria rows above it.
const Root = styled('div')(({ theme }) => ({ width: '100%', marginBottom: theme.spacing(1) }));
const Rules = styled('div')(({ theme }) => ({
  ...theme?.paper?.item, backgroundColor: theme.palette.action.hover, width: '100%', boxSizing: 'border-box',
}));
const Heading = styled(Typography)(({ theme }) => ({ marginTop: theme.spacing(1) }));

// One line per rule in the profile ranking, in the order they are applied.
export function rankingLines(ranking, formatMessage, formatMessageWithValues) {
  const label = ruleLabeller(formatMessage);
  const lines = [];
  const weighted = ranking.weighted_score;
  if (weighted) {
    lines.push(formatMessageWithValues('enrolment.profile.score', { total: weighted.normalise_to ?? 100 }));
    (weighted.components || []).forEach((component) => {
      lines.push(formatMessageWithValues('enrolment.profile.scoreItem', {
        name: component.label || describeTarget(component, label),
        weight: component.weight,
      }));
    });
  }
  if (ranking.minimum_score !== undefined && ranking.minimum_score !== null) {
    lines.push(formatMessageWithValues('enrolment.profile.minimumScore', { minimumScore: ranking.minimum_score }));
  }
  const order = describeOrderBy(ranking.order_by, label);
  if (order) lines.push(formatMessageWithValues('enrolment.profile.order', { order }));
  const strategy = ranking.selection_strategy;
  if (strategy) {
    (strategy.quotas || []).forEach((quota) => {
      const condition = (quota.when || []).map((criterion) => describeCriterion(criterion, label)).join(', ');
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
    if (strategy.source) {
      lines.push(formatMessageWithValues('enrolment.profile.quotaSource', { source: label('source', strategy.source) }));
    }
  }
  const limit = ranking.limit || {};
  if (limit.percentage !== undefined && limit.percentage !== null) {
    lines.push(formatMessageWithValues('enrolment.profile.limitPercentage', { percentage: limit.percentage }));
  }
  if (limit.respect_max_beneficiaries === false) lines.push(formatMessage('enrolment.profile.ignoresMaxBeneficiaries'));
  return lines;
}

const FLAG_VALUES = [1, true, '1', 'true'];
const words = (name) => String(name).replace(/_/g, ' ');
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// A profile criterion as a short phrase: "fit for work" for a yes/no flag,
// "age ≥ 18" otherwise, led by the member it reads unless that member is
// already named in the list (the primary worker of a household).
export function eligibilityText(criterion, formatMessageWithValues, label, impliedSubject = null) {
  const name = words(criterion.field || criterion.derived);
  const subject = criterion.subject && !['self', impliedSubject].includes(criterion.subject)
    ? label('subject', criterion.subject) : null;
  const flag = criterion.filter === 'exact' && FLAG_VALUES.includes(criterion.value);
  const condition = flag ? name : `${name} ${filterSymbol(criterion.filter)} ${criterion.value}`;
  if (!subject) return condition;
  return flag ? formatMessageWithValues('enrolment.rule.flag', { subject, name }) : `${subject} ${condition}`;
}

// "A, B, and C", as in the eligibility line.
export function joinList(items, and) {
  if (items.length < 3) return items.join(` ${and} `);
  return `${items.slice(0, -1).join(', ')}, ${and} ${items[items.length - 1]}`;
}

// The fixed backend rules, in the same short form as the profile criteria.
function builtInRules(household, formatMessage) {
  if (household === undefined) return [];
  return household
    ? [formatMessage('enrolment.rule.builtIn.verified'), formatMessage('enrolment.rule.builtIn.primaryWorker')]
    : [formatMessage('enrolment.rule.builtIn.verified'), formatMessage('enrolment.rule.builtIn.noHousehold')];
}

function ProfileRules({ benefitPlanId, status, household }) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations('enrolment', modulesManager);
  const { isLoading, error, data } = useGraphqlQuery(PROGRAMME_PROFILE_QUERY, { benefitPlanId, status });
  const profile = data?.enrolmentProgrammeProfile;
  if (isLoading) {
    return <Root><CircularProgress size={24} aria-label={formatMessage('enrolment.profile.loading')} /></Root>;
  }
  if (error) return <Root><Alert severity="error">{formatMessage('enrolment.profile.loadFailed')}</Alert></Root>;
  if (!profile) return null;
  const label = ruleLabeller(formatMessage);
  const criteria = parseJsonValue(profile.criteria, []);
  const ranking = parseJsonValue(profile.ranking);
  const reasons = profile.unsuitableReasons || [];
  const impliedSubject = household ? 'primary_worker' : null;
  const items = [
    ...builtInRules(household, formatMessage),
    ...(Array.isArray(criteria) ? criteria : []).map(
      (criterion) => eligibilityText(criterion, formatMessageWithValues, label, impliedSubject),
    ),
  ];
  const eligibility = items.length
    ? capitalise(joinList(items, formatMessage('enrolment.rule.and')))
    : formatMessage('enrolment.profile.noCriteria');
  return (
    <Root>
      <Rules>
        {!profile.key && (
          <Alert severity={profile.profileRequired ? 'warning' : 'info'}>
            {formatMessage(profile.profileRequired ? 'enrolment.profile.requiredMissing' : 'enrolment.profile.none')}
          </Alert>
        )}
        {reasons.length > 0 && (
          <Alert severity="error">
            {formatMessage('enrolment.profile.unsuitable')}
            {reasons.map((reason) => <div key={reason}>{reason}</div>)}
          </Alert>
        )}
        <Typography variant="body2">
          <strong>{`${formatMessage('enrolment.profile.criteria')}: `}</strong>
          {eligibility}
        </Typography>
        {profile.key && (
          <>
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
          </>
        )}
      </Rules>
    </Root>
  );
}

// The enrolment rules that apply to a Phase and beneficiary status. Published
// as enrolment.ProgrammeProfileSummary for the Phase page. Pass household (true
// or false) to list the fixed backend rules with the profile criteria.
export default function ProgrammeProfileSummary({ benefitPlanId, status, household }) {
  const id = benefitPlanId && isBase64Encoded(benefitPlanId) ? decodeId(benefitPlanId) : benefitPlanId;
  if (!id || !status) return null;
  return <ProfileRules benefitPlanId={id} status={status} household={household} />;
}
