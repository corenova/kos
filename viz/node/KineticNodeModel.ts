import { NodeModel, NodeModelGenerics } from '@projectstorm/react-diagrams-core';
import { BasePositionModelOptions, DeserializeEvent } from '@projectstorm/react-canvas-core';
import { KineticPortModel } from '../port/KineticPortModel';

export interface KineticNodeModelOptions extends BasePositionModelOptions {
    icon?: any;
    name?: string;
    color?: string;
    title?: string;
}

export interface KineticNodeModelGenerics extends NodeModelGenerics {
    OPTIONS: KineticNodeModelOptions;
}

export class KineticNodeModel extends NodeModel<KineticNodeModelGenerics> {
    protected schema: any;
    protected ports: { [s: string]: KineticPortModel };

    public get icon():  any    { return this.options.icon; }
    public get name():  string { return this.options.name; }
    public get title(): string { return this.options.title || this.options.name; }
    public get color(): string { return this.options.color; }
    
    public get portsIn(): KineticPortModel[] {
	return Object.values(this.ports).filter(p => p.role === 'input');
    }
    public get portsOut(): KineticPortModel[] {
	return Object.values(this.ports).filter(p => p.role === 'output');
    }

    constructor(schema: any = {}, options?: KineticNodeModelOptions) {
	let nodeType: string;

	if (schema.input && schema.output) {
	    nodeType = 'kos-processor-node';
	} else if (schema.output) {
	    nodeType = 'kos-generator-node';
	} else if (schema.input) {
	    nodeType = 'kos-terminator-node';
	} else {
	    nodeType = 'kos-controller-node';
	}
	
	super({
	    type: nodeType,
	    name: schema.datakey || 'unknown',
	    //color: 'rgb(30,30,30,0.4)',
	    //color: 'rgb(30, 30, 30, 0.4)',
	    color: 'rgb(12, 35, 64, 0.8)',
	    //color: 'rgb(23, 143, 22, 0.8)',
	    ...options,
	});
	this.schema = schema;
	this.ports = {}; // why???
	if (schema.input)  this.addPorts(schema.input);
	if (schema.output) this.addPorts(schema.output);
    }

    addPorts(schema: any): void {
	this.addPort(new KineticPortModel(schema, schema.kind));
	schema.nodes.forEach(ns => this.addPort(new KineticPortModel(ns, schema.kind)));
    }

    addPort<T extends KineticPortModel>(port: T): T {
	console.warn(this.ports, port);
	super.addPort(port);
	return port;
    }

    removePort(port: KineticPortModel): void {
	super.removePort(port);
    }
    
    serialize() {
	const { icon, name, color, title } = this.options;
	return {
	    ...super.serialize(),
	    icon, name, color, title
	};
    }

    deserialize(event: DeserializeEvent<this>): void {
	const { icon, name, color, title } = event.data;
	super.deserialize(event);
	Object.assign(this.options, {
	    icon, name, color, title
	});
    }
}

export interface GeneratorNodeModelOptions extends KineticNodeModelOptions {
    source?: string;
}

export class GeneratorNodeModel extends KineticNodeModel {
    
    constructor(schema: any, options: GeneratorNodeModelOptions = {}) {
	super(schema, options);
	// do something interesting...
    }
}

export interface ProcessorNodeModelOptions extends KineticNodeModelOptions {
    core?: string;
}

export class ProcessorNodeModel extends KineticNodeModel {
    constructor(schema: any, options: ProcessorNodeModelOptions = {}) {
	super(schema, options);
	// do something interesting...
    }
}

export interface TerminatorNodeModelOptions extends KineticNodeModelOptions {
    target?: string;
}

export class TerminatorNodeModel extends KineticNodeModel {
    constructor(schema: any, options: TerminatorNodeModelOptions = {}) {
	super(schema, options);
	// do something interesting...
    }
}

