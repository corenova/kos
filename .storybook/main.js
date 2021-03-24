const path = require('path');

module.exports = {
  stories: ['../demos/*.stories.tsx'],
  addons: [ '@storybook/essentials' ],
  core: {
    builder: 'webpack5',
  },
  webpackFinal: (config) => {
    config.module.rules.push(
      { test: /\.scss$/, use: [	'style-loader',	'css-loader', 'sass-loader' ] },
      { test: /\.ya?ml$/, use: ['json-loader', 'yaml-loader'] },
      { test: /\.yang$/,  use: 'yang-loader' },
    );
    return config;
  },
};
