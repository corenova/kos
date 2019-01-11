const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV,
  entry: {
    kos: [
      './index.js'
    ]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: '[name].js'
  },
  node: {
    fs: 'empty'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    modules: [ 'app', 'node_modules' ],
    alias: {
      config:  path.resolve(__dirname, 'config'),
      schemas: path.resolve(__dirname, 'schemas')
    }
  },
  module: {
    rules: [
      { test: /\.jsx?$/, 
        include: [
          path.resolve(__dirname, 'lib'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      { test: /\.json$/, use: 'json-loader' },
      { test: /\.ya?ml$/, use: ['json-loader', 'yaml-loader'] },
      { test: /\.yang$/, use: 'yang-loader' }
    ]
  }
};
