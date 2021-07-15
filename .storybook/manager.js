import { addons } from '@storybook/addons';
import { create } from '@storybook/theming';

const kosTheme = create({
  base: 'dark',
  brandTitle: 'KOS Dashboard',
  brandUrl: 'http://github.com/corenova/kos'
});

addons.setConfig({
  theme: kosTheme,
});
