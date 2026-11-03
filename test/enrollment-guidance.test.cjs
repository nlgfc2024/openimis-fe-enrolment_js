const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-es-module.cjs');
const messages = require('../src/translations/en.json');

let showGuidance = true;
const Banner = ({ title, children }) => React.createElement(
  'aside',
  null,
  React.createElement('strong', null, title),
  children,
);
const EnrollmentGuidanceBanner = load(
  path.join(__dirname, '../src/components/EnrollmentGuidanceBanner.jsx'),
  {
    '@openimis/fe-core': {
      InfoBanner: Banner,
      useModulesManager: () => ({
        getRef: () => ({ show_enrollment_guidance: showGuidance }),
      }),
      useTranslations: () => ({
        formatMessage: (key) => messages[key] || key,
      }),
    },
  },
).default;

test('individual and household banners use enrolment module messages', () => {
  showGuidance = true;
  const individual = renderToStaticMarkup(React.createElement(EnrollmentGuidanceBanner));
  const household = renderToStaticMarkup(React.createElement(EnrollmentGuidanceBanner, { household: true }));

  assert.ok(individual.includes(messages['enrolment.guidance.title']));
  assert.ok(individual.includes(messages['enrolment.guidance.individual']));
  assert.ok(household.includes(messages['enrolment.guidance.household']));
  assert.ok(!individual.includes('individual.enrollment.guidance'));
});

test('guidance banner can be disabled through module configuration', () => {
  showGuidance = false;
  const html = renderToStaticMarkup(React.createElement(EnrollmentGuidanceBanner));
  assert.equal(html, '');
  showGuidance = true;
});
