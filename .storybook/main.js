const path = require('path');

module.exports = {
  //stories: ['../demos/*.story.(tsx?|js|mdx)'],
  addons: [
    // { name: '@storybook/preset-typescript',
    //   options: {
    // 	include: [path.resolve(__dirname, '../demos')]
    //   }
    // },
    '@storybook/addon-actions',
    //'@storybook/addon-docs',
    { name: '@storybook/addon-storysource',
      options: {
    	rule: {
    	  include: [
	    path.resolve(__dirname, '../demos'),
	    path.resolve(__dirname, '../viz')
	  ],
    	}
      },
    },
  ],
};
