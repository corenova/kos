const path = require('path');

const imageQuery = {
  bypassOnDebug: true,
  mozjpeg: { progressive: true },
  gifsicle: { interlaced: false },
  optipng: { optimizationLevel: 7 }
}

module.exports = ({ config, mode }) => {
  config.resolve.extensions = ['.tsx', '.ts', '.js'];
  config.module.rules.push(
    //{ test: /\.css$/,  use: ['style-loader', 'css-loader' ] },
    { test: /\.scss$/,
      use: [
	'style-loader',
	'css-loader',
	{
	  loader: 'postcss-loader',
	  options: { config: { path: path.resolve(__dirname) } }
	}
      ]
    },
    { test: /\.js$/,
      loader: 'source-map-loader',
      enforce: 'pre',
      exclude: /node_modules/,
    },
    { test: /\.tsx?$/,
      loader: 'ts-loader',
      exclude: /node_modules/,
      options: {
	transpileOnly: true
      }
    },
    { test: /\.ya?ml$/, use: ['json-loader', 'yaml-loader'] },
    { test: /\.yang$/,  use: 'yang-loader' },
    { test: /\.(woff2?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/, use: 'url-loader' },
    { test: /\.(jpe?g|png|gif)$/i,
      use: [
	'url-loader?limit=100000&hash=sha512&digest=hex&name=images/[name].[ext]',
	`image-webpack-loader?${JSON.stringify(imageQuery)}`
      ]
    },
  );
  return config;
};
