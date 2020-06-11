import * as React from 'react';
import { DemoCanvasWidget } from './helpers/DemoCanvasWidget';
import createEngine, {
    CanvasWidget,
    DiagramModel,
    KineticNodeModel
} from '../viz'

import * as Schema from './demo.yang';

export default () => {

    var engine = createEngine();

    //2) setup the diagram model
    var model = new DiagramModel();

    let offset = 250;
    let [ x, y ] = [ 100, 100 ];
    let blueprint = Schema.at('/demo:simple');
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
