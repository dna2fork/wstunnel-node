module.exports = {
  isDebug:
    process.env['NODE_DEBUG'] && /wstunnel/.test(process.env['NODE_DEBUG']),
};

if (module.exports.isDebug) {
  module.exports.log = (...msg) => console.log(new Date().toString(), ...msg);
} else {
  module.exports.log = function () {};
}
