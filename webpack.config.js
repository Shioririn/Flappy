const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.(mp3|wav)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'sounds/'
            }
          }
        ]
      }
    ]
  }
}; 