const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

function getEntrySources(sources) {
  if (process.env.NODE_ENV !== 'production') {
	sources.push('webpack-dev-server/client?http://localhost:8080');
	sources.push('webpack/hot/only-dev-server');
  }
  return sources;
}

module.exports = {
  entry: {
	corenova: getEntrySources([
	  './app/index.js'
	])
  },
  output: {
	path: path.resolve(__dirname, "dist"),
	filename: '[name].js',
	publicPath: '/assets/'
  },
  devtool: 'cheap-module-source-map',
  devServer: {
	historyApiFallback: true,
	hot: true,
	progress: true,
	inline: true,
	proxy: {
	  '/*:*/**': {
		target: 'http://localhost:3000'
	  }
	}
  },
  resolve: {
	extensions: ['', '.js', '.jsx', '.ts', '.tsx', '.json'],
	root: path.join(__dirname, 'app')
  },
  module: {
	loaders: [
      { test: /\.tsx?$/, loaders: ['ts-loader', 'babel'], exclude: /node_modules/ },
	  { test: /\.jsx?$/, loaders: ['react-hot', 'babel'], exclude: /node_modules/ },
	  { test: /\.scss$/, loaders: ['style', 'css', 'sass'] },
	  { test: /\.sass$/, loaders: ['raw', 'sass'] },
	  { test: /\.(woff2?|ttf|eot|svg)$/, loader: 'url?limit=10000' },
	  { test: /bootstrap\/dist\/js\/umd\//, loader: 'imports?jQuery=jquery' }
	]
  },
  plugins: [
	new ExtractTextPlugin("styles.css"),
	new webpack.ProvidePlugin({
	  jQuery: 'jquery',
	  $: 'jquery',
	  jquery: 'jquery'
	})
  ]
};
