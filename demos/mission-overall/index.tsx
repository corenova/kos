//import { action } from '@storybook/addon-actions';
import * as React from 'react';
import { DemoCanvasWidget } from '../helpers/DemoCanvasWidget';
import createEngine, {
    CanvasWidget,
    DiagramModel,
    KineticNodeModel
} from '../../viz'

import * as Schema from '../gaps-mission-application.yang';
import * as Config from '../demo.yaml';

export default () => {
    console.warn('MA OVERALL');
    const kos = Schema.eval(Config);
    const engine = createEngine();
    const model = new DiagramModel();

    const topology = kos.get('/kos:topology');
    const nodes = new Map;
    const flows = new Map;
    for (const node of topology.node) {
        const m = new KineticNodeModel(node.schema, node);
        const { x = 0, y = 0 } = node;
        m.setPosition(x, y);
        nodes.set(node.id, m);
    }
    for (const flow of topology.flow) {
        if (flow.mode === 'mesh') continue;
        // here it is unicast
        for (let idx = 0; idx < flow.nodes.length - 1; idx++) {
            const [ src, dst ] = [ nodes.get(flow.nodes[idx]), nodes.get(flow.nodes[idx+1]) ];
            if (flow.mode === 'duplex') {

            }
            //nodes[0].portsOut[1].link(nodes[1].portsIn[1]),
        }
    }
    
    //4) add the models to the root graph
    model.addAll(...Array.from(nodes.values()), ...Array.from(flows.values())); 

    //5) load model into engine
    engine.setModel(model);

    //6) render the diagram!
    return (
        <DemoCanvasWidget background="rgb(60,60,60)">
          <CanvasWidget engine={engine} />
        </DemoCanvasWidget>
    );
};
