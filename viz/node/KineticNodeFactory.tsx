import * as React from 'react';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { KineticNodeModel } from './KineticNodeModel';
import {
    KineticNodeWidget,
    GeneratorNodeWidget,
    ProcessorNodeWidget,
    TerminatorNodeWidget,
} from './KineticNodeWidget';


export class GeneratorNodeFactory extends AbstractReactFactory<KineticNodeModel, DiagramEngine> {
    constructor() {
	super('kos-generator-node');
    }
    generateModel(event): KineticNodeModel {
	return new KineticNodeModel(event);
    }
    generateReactWidget(event): JSX.Element {
	return <GeneratorNodeWidget engine={this.engine as DiagramEngine} node={event.model} />;
    }
}

export class ProcessorNodeFactory extends AbstractReactFactory<KineticNodeModel, DiagramEngine> {
    constructor() {
	super('kos-processor-node');
    }
    generateModel(event): KineticNodeModel {
	return new KineticNodeModel(event);
    }
    generateReactWidget(event): JSX.Element {
	return <ProcessorNodeWidget engine={this.engine as DiagramEngine} node={event.model} />;
    }
}

export class TerminatorNodeFactory extends AbstractReactFactory<KineticNodeModel, DiagramEngine> {
    constructor() {
	super('kos-terminator-node');
    }
    generateModel(event): KineticNodeModel {
	return new KineticNodeModel(event);
    }
    generateReactWidget(event): JSX.Element {
	return <TerminatorNodeWidget engine={this.engine as DiagramEngine} node={event.model} />;
    }
}
