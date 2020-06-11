//import { action } from '@storybook/addon-actions';
import * as React from 'react';
import { DemoCanvasWidget } from './helpers/DemoCanvasWidget';
import createEngine, {
    CanvasWidget,
    DiagramModel,
    KineticNodeModel
} from '../viz'

import * as Schema from './demo.yang';

export default () => {
    const blueprint = Schema.at('/demo:mission');
    const engine = createEngine();
    const model = new DiagramModel();

    let offset = 250;
    let [ x, y ] = [ 100, 100 ];
    let nodes: [] = blueprint.nodes.map((schema, idx) => {
	let node = new KineticNodeModel(schema);
	node.setPosition(x, y);
	x += offset
	if (idx === 2) {
	    x = 100;
	    y += 200;
	}
	return node;
    });

    let links = [
	nodes[0].portsOut[1].link(nodes[1].portsIn[1]),
	nodes[0].portsOut[2].link(nodes[1].portsIn[2]),
	nodes[0].portsOut[3].link(nodes[1].portsIn[3]),
	nodes[1].portsOut[1].link(nodes[2].portsIn[1]),
	nodes[1].portsOut[2].link(nodes[2].portsIn[2]),
	nodes[1].portsOut[3].link(nodes[2].portsIn[3]),
	nodes[0].portsOut[4].link(nodes[4].portsIn[1]),
    ];

    //4) add the models to the root graph
    model.addAll(...nodes, ...links); 

    //5) load model into engine
    engine.setModel(model);

    //6) render the diagram!
    return (
	<DemoCanvasWidget background="rgb(60,60,60)">
	    <CanvasWidget engine={engine} />
	</DemoCanvasWidget>
    );
};
