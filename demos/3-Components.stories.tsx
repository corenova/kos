import * as React from 'react';
import { action } from '@storybook/addon-actions';
import { Toolkit } from '@projectstorm/react-canvas-core';
Toolkit.TESTING = true;

import { DemoCanvasWidget } from './helpers/DemoCanvasWidget';
import createEngine, {
  CanvasWidget,
  DiagramModel,
  KineticNodeModel,
} from './../viz'

import * as Schema from './schema/gaps-mission-application.yang';
import * as Config from './mission.yaml';

export default {
  title: 'DARPA GAPS/Components',
  component: KineticNodeModel,
  argTypes: {
    schema: {
      table: { disable: true }
    },
    name: {
      control: { type: 'text' }
    },
    render: {
      table: { disable: true }
    },
    color: {
      control: { type: 'color' }
    },
    x: {
      control: { type: 'range', min: 0, max: 1000, step: 20 }
    },
    y: {
      control: { type: 'range', min: 0, max: 1000, step: 20 }
    },
  }
};

const Template = ({ schema, ...options }) => {
  const engine = createEngine();
  const model = new DiagramModel();
  const node = new KineticNodeModel(schema, options)
  node.setPosition(options.x, options.y);
  node.registerListener({
    selectionChanged: ({ isSelected }) => {
      if (isSelected) action(node.name)({ schema: node.schema.toString() });
    }
  });
  model.addAll(node);
  engine.setModel(model);
  return (
    <DemoCanvasWidget background="rgb(60,60,60)">
      <CanvasWidget engine={engine} />
    </DemoCanvasWidget>
  )
};

const store = Schema.eval(Config);

const extractNodeArgs = (id) => {
  const n = store.get(`/kos:topology/node/${id}`);
  return { schema: n.schema, ...n.render, x: 500, y: 300 }
};

export const MPX = Template.bind({});
MPX.args = extractNodeArgs(1);

export const MPU = Template.bind({});
MPU.args = extractNodeArgs(2);

export const ISRM = Template.bind({});
ISRM.args = extractNodeArgs(3);

export const EOIR = Template.bind({});
EOIR.args = extractNodeArgs(4);

export const RDR = Template.bind({});
RDR.args = extractNodeArgs(5);

export const EOIRSensor = Template.bind({});
EOIRSensor.args = extractNodeArgs(6);

export const RDRSensor = Template.bind({});
RDRSensor.args = extractNodeArgs(7);

