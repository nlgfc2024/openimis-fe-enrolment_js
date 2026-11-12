import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import { styled } from '@material-ui/core/styles';
import { describeOrderBy, parseJsonValue, ruleLabeller } from '../utils';

const SummaryTitle = styled(Typography)(({ theme }) => ({ margin: theme.spacing(1.5, 0, 1) }));
const SummaryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5), height: '100%', boxSizing: 'border-box',
}));
const EmptyPool = styled(Typography)(({ theme }) => ({ marginTop: theme.spacing(1.5) }));

// rulesShown: the enrolment profile rules are on screen, so the summary shows
// only results and leaves the profile and sort order to the rules.
export default function EnrollmentSummary({ summary, household, rulesShown = false }) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations('enrolment', modulesManager);
  const entity = household ? 'Groups' : 'Individuals';
  const label = household ? 'households' : 'individuals';
  const matching = Number(summary[`numberOfSelected${entity}`] || 0);
  const assigned = Number(summary[`numberOf${entity}AssignedToSelectedProgramme`] || 0);
  const pool = summary.poolSize ?? Math.max(0, matching - assigned);
  const selected = summary.willEnrol ?? summary[`numberOf${entity}ToUpload`] ?? 0;
  const ranking = parseJsonValue(summary.enrolmentRanking, {});
  const order = rulesShown ? '' : describeOrderBy(ranking.order_by, ruleLabeller(formatMessage));
  const minimumScore = ranking.minimum_score;
  const quotaFill = parseJsonValue(summary.quotaFill);
  const total = Number(selected);
  // Places filled through each quota, then the rest of the ranked list (Others),
  // each as a share of the records to be enrolled.
  const allocation = Array.isArray(quotaFill?.buckets) && total > 0 ? [
    ...quotaFill.buckets.map((bucket) => [
      ['female', 'youth'].includes(bucket.key) ? formatMessage(`enrolment.quotaFill.${bucket.key}`) : bucket.key,
      bucket.filled,
    ]),
    [formatMessage('enrolment.quotaFill.others'), quotaFill.unreserved ?? 0],
  ].map(([name, count]) => ({ name, count, percentage: Math.round((Number(count) * 100) / total) })) : [];
  const cards = household ? [
    ['phaseTarget', summary.phaseTarget ?? formatMessage('enrolment.targetNotConfigured'), 3],
    ['enrolledHouseholds', summary.enrolledHouseholds, 3],
    ['verifiedUnenrolledHouseholds', summary.verifiedUnenrolledHouseholds, 3],
    ['selected', selected, 3],
  ] : [
    ['eligible', pool, 4],
    ['maximum', summary.capApplied ?? formatMessage('enrolment.noLimit'), 4],
    ['selected', selected, 4],
    ['registry', summary[`totalNumberOf${entity}`], 6],
    ['matching', matching, 6],
    ['assignedAny', summary[`numberOf${entity}AssignedToProgramme`], 6],
    ['unassigned', summary[`numberOf${entity}NotAssignedToProgramme`], 6],
    ['assignedPhase', assigned, 6],
  ];
  if (!rulesShown) {
    cards.push([
      'programmeProfile', summary.programmeProfile ?? formatMessage('enrolment.noProgrammeProfile'), 6,
      formatMessage('enrolment.cards.programmeProfile'),
    ]);
  }
  if (minimumScore !== undefined && minimumScore !== null) {
    cards.push([
      'belowMinimumScore', summary.belowMinimumScore, 6,
      formatMessageWithValues('enrolment.cards.belowMinimumScore', { minimumScore }),
    ]);
  }

  return (
    <section aria-label={formatMessage('enrolment.summary')}>
      <SummaryTitle>{formatMessage('enrolment.summary')}</SummaryTitle>
      <Grid container spacing={2}>
        {cards.map(([key, value, width, title]) => (
          <Grid item xs={12} md={width} key={key}>
            <SummaryCard elevation={3}>
              <Typography variant="h6" gutterBottom>{title ?? formatMessage(`enrolment.cards.${label}.${key}`)}</Typography>
              <Typography>{value ?? 0}</Typography>
            </SummaryCard>
          </Grid>
        ))}
        {order && (
          <Grid item xs={12} md={6}>
            <SummaryCard elevation={3}>
              <Typography variant="h6" gutterBottom>{formatMessage('enrolment.rankingOrder')}</Typography>
              <Typography>{order}</Typography>
            </SummaryCard>
          </Grid>
        )}
        {allocation.length > 0 && (
          <Grid item xs={12} md={6}>
            <SummaryCard elevation={3}>
              <Typography variant="h6" gutterBottom>{formatMessage('enrolment.quotaFill')}</Typography>
              {allocation.map((share) => (
                <Typography key={share.name}>{formatMessageWithValues('enrolment.quotaFill.share', share)}</Typography>
              ))}
            </SummaryCard>
          </Grid>
        )}
      </Grid>
      {Number(pool) === 0 && (
        <EmptyPool>
          {formatMessage(household ? 'enrolment.emptyPool.households' : 'enrolment.emptyPool.individuals')}
        </EmptyPool>
      )}
      {!rulesShown && (
        <SummaryCard elevation={1}>
          <Typography variant="h6" gutterBottom>{formatMessage('enrolment.membershipRule')}</Typography>
          <Typography>{formatMessage(household ? 'enrolment.membershipRule.groups' : 'enrolment.membershipRule.individuals')}</Typography>
        </SummaryCard>
      )}
    </section>
  );
}
