const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = clearTimeout;
window.requestAnimationFrame = global.requestAnimationFrame;
window.cancelAnimationFrame = global.cancelAnimationFrame;
global.MessageChannel = undefined;
const React = require('react');
const ReactDOM = require('react-dom');
const { act } = require('react-dom/test-utils');
const load = require('./load-es-module.cjs');
const { districtLocationId } = load(path.join(__dirname, '../src/utils.js'), {
  '@openimis/fe-core': { decodeId: (v) => Buffer.from(v, 'base64').toString().split(':')[1] },
});

test('district IDs accept numeric and Relay IDs and reject invalid input', () => {
  assert.equal(districtLocationId(123), 123);
  assert.equal(districtLocationId(Buffer.from('LocationGQLType:123').toString('base64')), 123);
  for (const value of ['', null, undefined, 0, -1, '1.5', 'abc', 2147483648]) {
    assert.equal(districtLocationId(value), null);
  }
});

test('picker restores saved labels, emits numeric IDs, clears, and respects readOnly', async () => {
  let props;
  const queries = [];
  const district = { id: Buffer.from('LocationGQLType:123').toString('base64'), code: 'A', name: 'District A' };
  const dispatch = async (query) => {
    queries.push(query);
    return { payload: { data: { locations: { edges: [{ node: district }] } } } };
  };
  const Picker = load(path.join(__dirname, '../src/components/dialogs/EnrollmentDistrictPicker.jsx'), {
    'react-redux': { useDispatch: () => dispatch },
    '@openimis/fe-core': {
      graphql: (q) => q,
      useTranslations: () => ({ formatMessage: (k) => k }),
      PublishedComponent: (p) => { props = p; return null; },
    },
    '../../utils': { districtLocationId },
  }).default;
  const container = document.createElement('div');
  const values = [];
  await act(async () => ReactDOM.render(React.createElement(Picker, {
    value: '123', onChange: (v) => values.push(v), readOnly: true,
  }), container));
  assert.equal(props.pubRef, 'location.MwDistrictPicker');
  assert.equal(Object.hasOwn(props, 'locationLevel'), false);
  assert.equal(props.multiple, false);
  assert.equal(props.readOnly, true);
  assert.equal(props.value.name, 'District A');
  assert.match(queries[0], /id: 123, type: "R"/);
  act(() => props.onChange(district));
  act(() => props.onChange(null));
  assert.deepEqual(values, [123, '']);
  act(() => { ReactDOM.unmountComponentAtNode(container); });
});
test.after(() => dom.window.close());
