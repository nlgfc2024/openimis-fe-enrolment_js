const fs = require('fs');
const babel = require('@babel/core');

module.exports = function loadEsModule(path, mocks = {}) {
  const source = fs.readFileSync(path, 'utf8');
  const { code } = babel.transformSync(source, {
    presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-react'],
  });
  const module = { exports: {} };
  const evaluate = new Function('module', 'exports', 'require', `${code}\n//# sourceURL=${path}`);
  const testRequire = (name) => (Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : require(name));
  evaluate(module, module.exports, testRequire);
  return module.exports;
};
