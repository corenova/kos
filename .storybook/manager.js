import { addons } from '@storybook/addons';
import { create } from '@storybook/theming';

const kosTheme = create({
  base: 'dark',
  brandTitle: 'KOS Mission Application',
  brandUrl: 'http://github.com/corenova/kos'
});

addons.setConfig({
  theme: kosTheme,
});
