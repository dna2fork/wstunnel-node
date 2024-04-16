const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './bin/wstt.js',
  optimization: {
    minimize: true,
  },
  output: {
    filename: 'wstunnel.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
