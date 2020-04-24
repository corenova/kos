import { configure, addParameters } from '@storybook/react';
import { create } from '@storybook/theming';
import './index.css';

addParameters({
  options: {
    name: 'Kinetic Object Stream',
    url: 'https://github.com/corenova/kos',
    theme: create({
      base: 'dark',
    }),
  }
});

function loadStories() {
  require('../demos');
  // You can require as many demos as you need.
}

configure(loadStories, module);
