const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-es-module.cjs');
const messages = require('../src/translations/en.json');
const plain = ({ children }) => React.createElement('span', null, children);
const Summary = load(path.join(__dirname, '../src/components/EnrollmentSummary.jsx'), {
  '@material-ui/core': { Grid: plain, Paper: plain, Typography: plain },
  '@material-ui/core/styles': { styled: (component) => () => component },
  '@openimis/fe-core': {
    useModulesManager: () => ({}),
    useTranslations: () => ({ formatMessage: (key) => messages[key] || key, formatMessageWithValues: () => 'Selection' }),
  },
}).default;
const render = (summary, household = true) => renderToStaticMarkup(React.createElement(Summary, { summary, household }));
test('household cards show stock, target and eligible pool without old registry cards', () => {
  const html = render({ verifiedUnenrolledHouseholds: 39, phaseTarget: 500, enrolledHouseholds: 12 });
  for (const label of ['Verified unenrolled households', 'Phase target', 'Enrolled households']) assert.ok(html.includes(label));
  for (const value of [39, 500, 12]) assert.ok(html.includes(`>${value}<`));
  assert.ok(!html.includes('All groups in the registry'));
});
test('target zero remains numeric while absent target is explicit', () => {
  assert.ok(!render({ phaseTarget: 0 }).includes('Not configured'));
  assert.ok(render({ phaseTarget: null }).includes('Not configured'));
  assert.ok(render({}, false).includes(messages['enrolment.cards.individuals.eligible']));
});
