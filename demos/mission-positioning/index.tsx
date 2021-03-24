//import { action } from '@storybook/addon-actions';
import * as React from 'react';
import { DemoCanvasWidget } from './helpers/DemoCanvasWidget';
// import { CanvasWidget } from '@projectstorm/react-canvas-core';
//import { DiagramModel } from '@projectstorm/react-diagrams';
import createEngine, {
    CanvasWidget,
    DiagramModel,
    KineticNodeModel
} from '../viz'

import * as Schema from './demo.yang';

export default () => {
    const blueprint = Schema.at('/demo:positioning');
    //1) setup the diagram engine
    var engine = createEngine();

    //2) setup the diagram model
    var model = new DiagramModel();

    let offset = 250;
    let [ x, y ] = [ 100, 100 ];
    let nodes: [] = blueprint.nodes.map((schema,idx) => {
	let node = new KineticNodeModel(schema);
	node.setPosition(x, y);
	x += offset
	if (idx === 2) {
	    x = 100;
	    y += 200;
	}
	return node;
    });
    //console.warn(`got ${nodes.length} nodes in the blueprint`, nodes, ports);
	/* model.addAll(ports[0][0].link(ports[1][0]),
	   ports[0][1].link(ports[1][1]),
	   ports[0][2].link(ports[1][2]));
	 * model.addAll(ports[2][0].link(ports[3][0]),
	   ports[2][1].link(ports[3][1]),
	   ports[2][2].link(ports[3][2]));

	 * model.addAll(ports[4][0].link(ports[8][0])); // global fix link

	 * model.addAll(ports[0][3].link(ports[6][0])); // time link

	 * model.addAll(ports[7][1].link(ports[8][1])); // time link
	 */
    
    //4) add the models to the root graph
    model.addAll(...nodes); // and links...

    //5) load model into engine
    engine.setModel(model);

    //6) render the diagram!
    return (
	<DemoCanvasWidget background="rgb(60,60,60)">
	    <CanvasWidget engine={engine} />
	</DemoCanvasWidget>
    );
};
