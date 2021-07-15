import { Toolkit } from '@projectstorm/react-canvas-core';
Toolkit.TESTING = true;

import { MissionApp } from './mission';

import * as Schema from './schema/gaps-mission-application.yang';
import * as Config from './mission.yaml';

import greenData from './WS_MA_Green.json';
import orangeData from './WS_MA_Orange.json';

const sourceMap = {
  'WS_MA_Green': greenData, // should be 'ws://localhost:12345/ws-ma-green.pcapng'
  'WS_MA_Orange': orangeData, // should be 'ws://localhost:12345/ws-ma-orange.pcapng'
};

export default {
  title: 'DARPA GAPS/Mission',
  component: MissionApp,
  argTypes: {
    speed: {
      control: {
        type: 'range',
        min: 0,
        max: 10,
        step: 0.5,
      }
    },
    source: {
      control: {
        type: 'inline-radio',
        options: Object.keys(sourceMap),
      }
    },
    enabled: {
      control: {
        type: 'boolean',
      }
    },
    schema: {
      table: {
        disable: true,
      }
    },
    config: {
      table: {
        disable: true,
      }
    }
  }
};

const Template = ({ source, ...rest }) => {
  const selectedSource = sourceMap[source];
  return <MissionApp source={selectedSource} {...rest} />;
}

export const Application = Template.bind({});
Application.args = {
  speed: 1,
  source: 'WS_MA_Green',
  enabled: false,
  schema: Schema,
  config: Config,
};
