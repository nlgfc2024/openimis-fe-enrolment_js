import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import { styled } from '@material-ui/core/styles';

const SummaryTitle = styled(Typography)(({ theme }) => ({ margin: theme.spacing(1.5, 0, 1) }));
const SummaryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5), height: '100%', boxSizing: 'border-box',
}));
const SelectionCount = styled(Typography)(({ theme }) => ({ marginTop: theme.spacing(1.5) }));

function parseRanking(value) {
  if (typeof value !== 'string') return value || {};
  try {
    return JSON.parse(value) || {};
  } catch (error) {
    return {};
  }
}

export default function EnrollmentSummary({ summary, household }) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations('enrolment', modulesManager);
  const entity = household ? 'Groups' : 'Individuals';
  const label = household ? 'households' : 'individuals';
  const matching = Number(summary[`numberOfSelected${entity}`] || 0);
  const assigned = Number(summary[`numberOf${entity}AssignedToSelectedProgramme`] || 0);
  const pool = summary.poolSize ?? Math.max(0, matching - assigned);
  const selected = summary.willEnrol ?? summary[`numberOf${entity}ToUpload`] ?? 0;
  const ranking = parseRanking(summary.enrolmentRanking);
  const order = (ranking.order_by || []).map((entry) => (
    typeof entry === 'string' ? entry : `${entry.field} ${entry.direction || 'asc'}`
  )).join(', ');
  const cards = household ? [
    ['verifiedUnenrolledHouseholds', summary.verifiedUnenrolledHouseholds, 4],
    ['phaseTarget', summary.phaseTarget ?? formatMessage('enrolment.targetNotConfigured'), 4],
    ['enrolledHouseholds', summary.enrolledHouseholds, 4],
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

  return (
    <section aria-label={formatMessage('enrolment.summary')}>
      <SummaryTitle>{formatMessage('enrolment.summary')}</SummaryTitle>
      <Grid container spacing={2}>
        {cards.map(([key, value, width]) => (
          <Grid item xs={12} md={width} key={key}>
            <SummaryCard elevation={3}>
              <Typography variant="h6" gutterBottom>{formatMessage(`enrolment.cards.${label}.${key}`)}</Typography>
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
      </Grid>
      <SelectionCount>
        {formatMessageWithValues('enrolment.selectionCount', { selected, pool })}
      </SelectionCount>
      <SummaryCard elevation={1}>
        <Typography variant="h6" gutterBottom>{formatMessage('enrolment.membershipRule')}</Typography>
        <Typography>{formatMessage(household ? 'enrolment.membershipRule.groups' : 'enrolment.membershipRule.individuals')}</Typography>
      </SummaryCard>
    </section>
  );
}
