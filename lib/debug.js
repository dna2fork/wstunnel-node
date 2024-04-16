function log(...msg) {
   console.log(new Date().toString(), ...msg);
}

module.exports = {
  log,
  isDebug:
    process.env['NODE_DEBUG'] && /wstunnel/.test(process.env['NODE_DEBUG']),
};

if (module.exports.isDebug) {
  module.exports.debug_log = log;
} else {
  module.exports.debug_log = function () {};
}
