const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      "events": require.resolve("events/"),
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
      "stream": false,
      "util": false,
      "assert": false,
      "http": false,
      "https": false,
      "os": false,
      "url": false,
      "zlib": false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ]
};
