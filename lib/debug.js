function log(...msg) {
   console.log(new Date().toString(), ...msg);
}

module.exports = {
  log,
  isDebug:
    process.env['NODE_DEBUG'] && /wstunnel/.test(process.env['NODE_DEBUG']),
};

if (module.exports.isDebug) {
  module.exports.log = log;
} else {
  module.exports.log = function () {};
}
