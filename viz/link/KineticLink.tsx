import * as React from 'react';
import {
    DefaultLinkFactory,
    DefaultLinkModel
} from '@projectstorm/react-diagrams-defaults';

export class KineticLinkModel extends DefaultLinkModel {
    constructor() {
	super({ type: 'kinetic', width: 3, color: 'rgba(30, 167, 253, 1)' });
    }
}

export interface KineticLinkSegmentProps {
    model: KineticLinkModel;
    path: string;
    selected: boolean;
}

export class KineticLinkSegment extends React.Component<KineticLinkSegmentProps> {
    path: SVGPathElement;
    circle: SVGCircleElement;
    callback: () => any;
    percent: number;
    handle: any;
    mounted: boolean;

    constructor(props: any) {
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
		stroke={this.props.model.getOptions().color}
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

export class KineticLinkFactory extends DefaultLinkFactory {
    constructor() {
	super('kinetic');
    }
    generateModel(): KineticLinkModel {
	return new KineticLinkModel();
    }
    generateLinkSegment(model: KineticLinkModel, selected: boolean, path: string) {
	return (
	    <g>
		<KineticLinkSegment model={model} path={path} selected={selected}/>
	    </g>
	);
    }
}
