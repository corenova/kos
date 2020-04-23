const path = require('path');

module.exports = (dir) => ({
  mode: process.env.NODE_ENV,
  entry: {
    kos: [
      './index.js'
    ]
  },
  output: {
    filename: '[name].js',
    path: path.resolve(dir, "dist"),
  },
  node: {
    fs: 'empty'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    modules: [ 'app', 'node_modules' ],
    alias: {
      config: path.resolve(__dirname, 'config'),
      schema: path.resolve(__dirname, 'schema'),
    },
  },
  module: {
    rules: [
      { test: /\.js$/,
	enforce: 'pre',
	loader: 'source-map-loader',
      },
      { test: /\.tsx?$/,
	loader: 'ts-loader',
      },
      { test: /\.json$/,
	loader: 'json-loader',
      },
      { test: /\.ya?ml$/,
	loaders: ['json-loader', 'yaml-loader'],
      },
      { test: /\.yang$/,
	loader: 'yang-loader',
      },
    ]
  }
});
