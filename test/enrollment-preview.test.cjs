const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<html><body></body></html>');
global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0); global.cancelAnimationFrame = clearTimeout;
global.MessageChannel = undefined;
const React = require('react');
const ReactDOM = require('react-dom');
const { act } = require('react-dom/test-utils');
const load = require('./load-es-module.cjs');
const utils = load(path.join(__dirname, '../src/utils.js'), { '@openimis/fe-core': { decodeId: (id) => id } });
const plain = ({ children, ...props }) => React.createElement('div', null, children);
const button = ({ children, onClick, disabled }) => React.createElement('button', { onClick, disabled }, children);
const noop = () => {};
const Form = load(path.join(__dirname, '../src/components/dialogs/EnrollmentCriteriaForm.jsx'), {
  '@material-ui/core': { Backdrop: plain, Button: button, CircularProgress: plain, Divider: plain, Typography: plain },
  '@material-ui/core/styles': { styled: (component) => () => component },
  '@material-ui/icons/AddCircle': { __esModule: true, default: plain }, '@material-ui/lab/Alert': { __esModule: true, default: plain },
  '@openimis/fe-core': { decodeId: (id) => id, formatMessage: (_intl, _module, key) => key, formatMessageWithValues: (_intl, _module, key) => key },
  'react-intl': { injectIntl: (component) => component }, 'react-redux': { connect: () => (component) => component },
  './AdvancedCriteriaRowValue': { __esModule: true, default: plain }, '../EnrollmentSummary': { __esModule: true, default: ({ summary }) => React.createElement('output', null, summary.willEnrol) },
  './IndividualPreviewEnrollmentDialog': { __esModule: true, default: plain }, './GroupPreviewEnrollmentDialog': { __esModule: true, default: plain },
  '../../constants': { CLEARED_STATE_FILTER: { field: '', filter: '', type: '', value: '' }, INDIVIDUAL: 'Individual' },
  'redux': { bindActionCreators: (actions) => actions }, '../../utils': utils, '../../actions': {},
}).EnrollmentCriteriaForm;

test('shared form ignores late results, rejects errors and requires preview for current phase/status', async () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const requests = []; const submitted = [];
  let props = {
    intl: {}, household: true, object: { id: 'phase-a', name: 'A' }, objectToSave: {}, customFilters: [],
    moduleName: 'individual', objectType: 'Group', edited: { status: 'ACTIVE', benefitPlan: { id: 'phase-a' } },
    fetchCustomFilter: noop, setAppliedCustomFilters: noop, setAppliedFiltersRowStructure: noop,
    updateAttributes: noop, fetchGroupEnrollmentSummary: () => new Promise((resolve) => requests.push(resolve)),
    clearEnrollmentSummary: noop, clearConfirm: noop, coreAlert: noop, coreConfirm: noop, rights: [],
    confirmGroupEnrollment: (args) => { submitted.push(args); return Promise.resolve({}); },
  };
  const render = async () => { await act(async () => { ReactDOM.render(React.createElement(Form, props), container); }); };
  const find = (key) => [...container.querySelectorAll('button')].find((b) => b.textContent === key);
  const preview = async () => { await act(async () => { find('enrolment.previewEnrollment').click(); }); };
  await render(); await preview();
  props = { ...props, edited: { ...props.edited, status: 'POTENTIAL' } }; await render();
  await preview();
  await act(async () => requests[1]({ payload: { data: { groupEnrollmentSummary: { willEnrol: 2 } } } }));
  await act(async () => requests[0]({ payload: { data: { groupEnrollmentSummary: { willEnrol: 99 } } } }));
  assert.equal(container.querySelector('output').textContent, '2');
  await preview();
  await act(async () => requests[2]({ payload: { errors: [{ message: 'Failed preview' }] } }));
  assert.equal(container.querySelector('output'), null);
  assert.equal(find('enrolment.confirmEnrollment'), undefined);
  await preview();
  await act(async () => requests[3]({ payload: { data: { groupEnrollmentSummary: { willEnrol: 3 } } } }));
  assert.equal(container.querySelector('output').textContent, '3');
  props = { ...props, object: { id: 'phase-b' }, edited: { status: 'ACTIVE', benefitPlan: { id: 'phase-b' } } }; await render();
  assert.equal(container.querySelector('output'), null);
  assert.equal(submitted.length, 0);
  await act(async () => ReactDOM.unmountComponentAtNode(container)); container.remove();
});
