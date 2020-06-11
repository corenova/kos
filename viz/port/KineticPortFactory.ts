import { AbstractModelFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { KineticPortModel } from './KineticPortModel';

export class KineticPortFactory extends AbstractModelFactory<KineticPortModel, DiagramEngine> {
    constructor() {
	super('kinetic');
    }
    generateModel(): KineticPortModel {
	return new KineticPortModel({
	    name: 'unknown'
	});
    }
}
