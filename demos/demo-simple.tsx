import createEngine, {
    DiagramModel,
    DefaultNodeModel,
    DefaultPortModel,
    DefaultLinkFactory,
    DefaultLinkModel,
} from '@projectstorm/react-diagrams';
import * as React from 'react';
//import { action } from '@storybook/addon-actions';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { DemoCanvasWidget } from './helpers/DemoCanvasWidget';
import * as Schema from './demo.yang';

export class AdvancedLinkModel extends DefaultLinkModel {
    constructor() {
	super({
	    type: 'advanced',
	    width: 5
	});
    }
}

export class AdvancedPortModel extends DefaultPortModel {
    createLinkModel(): AdvancedLinkModel | null {
	return new AdvancedLinkModel();
    }
}

export class AdvancedLinkSegment extends React.Component<{ model: AdvancedLinkModel; path: string }> {
    path: SVGPathElement;
    circle: SVGCircleElement;
    callback: () => any;
    percent: number;
    handle: any;
    mounted: boolean;

    constructor(props) {
	super(props);
	this.percent = 0;
    }

    componentDidMount() {
	this.mounted = true;
	this.callback = () => {
	    if (!this.circle || !this.path) {
		return;
	    }

	    this.percent += 2;
	    if (this.percent > 100) {
		this.percent = 0;
	    }

	    let point = this.path.getPointAtLength(this.path.getTotalLength() * (this.percent / 100.0));

	    this.circle.setAttribute('cx', '' + point.x);
	    this.circle.setAttribute('cy', '' + point.y);

	    if (this.mounted) {
		requestAnimationFrame(this.callback);
	    }
	};
	requestAnimationFrame(this.callback);
    }

    componentWillUnmount() {
	this.mounted = false;
    }

    render() {
	return (
	    <>
		<path
		fill="none"
		ref={ref => {
		    this.path = ref;
		}}
		strokeWidth={this.props.model.getOptions().width}
		stroke="rgba(255,0,0,0.5)"
		d={this.props.path}
		/>
		<circle
		ref={ref => {
		    this.circle = ref;
		}}
		r={5}
		fill="orange"
		/>
	    </>
	);
    }
}

export class AdvancedLinkFactory extends DefaultLinkFactory {
    constructor() {
	super('advanced');
    }

    generateModel(): AdvancedLinkModel {
	return new AdvancedLinkModel();
    }

    generateLinkSegment(model: AdvancedLinkModel, selected: boolean, path: string) {
	return (
	    <g>
		<AdvancedLinkSegment model={model} path={path} />
	    </g>
	);
    }
}

export default () => {
    //1) setup the diagram engine
    var engine = createEngine();
    engine.getLinkFactories().registerFactory(new AdvancedLinkFactory());

    //2) setup the diagram model
    var model = new DiagramModel();

    let offset = 250;
    let [ x, y ] = [ 100, 100 ];
    let blueprint = Schema.at('/demo:simple').apply({});
    let ports = [];
    let nodes = Object.entries(blueprint).map(([name, n], idx) => {
	let { input, output } = n;
	let node = new DefaultNodeModel(name, idx === 3 ? 'rgb(23,143,22)': 'rgb(0,192,255)');
	node.setPosition(x, y);
	if (input) {
	    node.addPort(new AdvancedPortModel(true, `in-any`, `input/*`));
	    ports.push(input.in('.').props.map( (p, i) => (
		node.addPort(new AdvancedPortModel(true, `i-${i+1}`, `input/${p.name}`))
	    )));
	}
	if (output) {
	    node.addPort(new AdvancedPortModel(false, `out-any`, `output/*`));
	    ports.push(output.in('.').props.map( (p, i) => (
		node.addPort(new AdvancedPortModel(false, `o-${i+1}`, `output/${p.name}`))
	    )));
	}
	x += offset
	if (idx === 2) {
	    x = 100;
	    y += 150;
	}
	return node
    });
    console.warn(`got ${nodes.length} nodes in the blueprint`, nodes, ports);
    model.addAll(ports[0][0].link(ports[1][0]),
		 ports[0][1].link(ports[1][1]),
		 ports[0][2].link(ports[1][2]));
    model.addAll(ports[2][0].link(ports[3][0]),
		 ports[2][1].link(ports[3][1]),
		 ports[2][2].link(ports[3][2]));

    model.addAll(ports[4][0].link(ports[8][0])); // global fix link

    model.addAll(ports[0][3].link(ports[6][0])); // time link

    model.addAll(ports[7][1].link(ports[8][1])); // time link


    
    //4) add the models to the root graph
    model.addAll(...nodes); // and links...

    //5) load model into engine
    engine.setModel(model);

    //6) render the diagram!
    return (
	<DemoCanvasWidget>
	    <CanvasWidget engine={engine} />
	</DemoCanvasWidget>
    );
};
