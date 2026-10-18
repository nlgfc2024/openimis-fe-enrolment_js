import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { useModulesManager, useTranslations } from '@openimis/fe-core';

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
  const cards = [
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
      <Typography style={{ margin: '12px 0 8px' }}>{formatMessage('enrolment.summary')}</Typography>
      <Grid container spacing={2}>
        {cards.map(([key, value, width]) => (
          <Grid item xs={12} md={width} key={key}>
            <Paper elevation={3} style={{ padding: 20, height: '100%', boxSizing: 'border-box' }}>
              <Typography variant="h6" gutterBottom>{formatMessage(`enrolment.cards.${label}.${key}`)}</Typography>
              <Typography>{value ?? 0}</Typography>
            </Paper>
          </Grid>
        ))}
        {order && (
          <Grid item xs={12} md={6}>
            <Paper elevation={3} style={{ padding: 20 }}>
              <Typography variant="h6" gutterBottom>{formatMessage('enrolment.rankingOrder')}</Typography>
              <Typography>{order}</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
      <Typography style={{ marginTop: 12 }}>
        {formatMessageWithValues('enrolment.selectionCount', { selected, pool })}
      </Typography>
    </section>
  );
}
