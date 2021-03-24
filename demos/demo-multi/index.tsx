import * as React from 'react';
import { DemoCanvasWidget } from './helpers/DemoCanvasWidget';
import createEngine, {
    CanvasWidget,
    DiagramModel,
    KineticNodeModel
} from '../viz'

import * as Schema from './demo.yang';

export default () => {
    const blueprint = Schema.at('/demo:multi-io');

    var engine = createEngine();
    var model = new DiagramModel();

    let offset = 250;
    let [ x, y ] = [ 100, 100 ];
    let nodes: [] = blueprint.nodes.map((schema,idx) => {
	let node = new KineticNodeModel(schema);
	node.setPosition(x, y);
	x += offset
	if (idx === 3) {
	    x = 100;
	    y += 200;
	}
	return node;
    });

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
