import { configure } from '@storybook/react';

function loadStories() {
  require('../storybook');
  // You can require as many demos as you need.
}

configure(loadStories, module);
