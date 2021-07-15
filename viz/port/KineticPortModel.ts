import { AbstractModelFactory, DeserializeEvent } from '@projectstorm/react-canvas-core';
import {
  LinkModel,
  PortModel,
  PortModelAlignment,
  PortModelGenerics,
  PortModelOptions
} from '@projectstorm/react-diagrams-core';
import { DefaultLinkModel } from '@projectstorm/react-diagrams'
import { KineticLinkModel } from '../link/KineticLink';

export interface KineticPortModelOptions extends PortModelOptions {
  role?: string; // input, output, etc.
  label?: string;
  color?: string;
  background?: string;
  flip?: boolean;
}

export interface KineticPortModelGenerics extends PortModelGenerics {
  OPTIONS: KineticPortModelOptions;
}

export class KineticPortModel extends PortModel<KineticPortModelGenerics> {
  protected schema: any;

  public get id(): any      { return this.options.id; }
  public get role(): string { return this.options.role; }
  public get label(): string { return this.options.label; }
  public get color(): string { return this.options.color; }
  public get background(): string { return this.options.background; }
  public get kind(): string { return this.schema.kind; }

  constructor(schema: any = {}, role: string, options?: KineticPortModelOptions) {
    const { LEFT, RIGHT, BOTTOM } = PortModelAlignment;
    let alignment: any;
    switch (role) {
      case 'input':
	alignment = (options && options.flip) ? RIGHT : LEFT;
	break;
      case 'output':
	alignment = (options && options.flip) ? LEFT: RIGHT;
	break;
      default:
	alignment = BOTTOM;
	break;
    }
    super({
      type: 'kinetic',
      role: role || schema.kind,
      name: schema.uri,
      label: schema.datakey,
      //color: 'rgb(255,174,66)',
      color: 'rgb(255,255,255)',
      background: 'rgb(50,50,50,0.7)',
      alignment,
      ...options,
    });
    this.schema = schema;
  }

  deserialize(event: DeserializeEvent<this>) {
    const { role, label, color, background } = event.data;
    super.deserialize(event);
    Object.assign(this.options, {
      role, label, color, background
    });
  }

  serialize() {
    const { role, label, color, background } = this.options;
    return {
      ...super.serialize(),
      role, label, color, background
    };
  }

  link<T extends LinkModel>(port: PortModel, factory?: AbstractModelFactory<T>): T {
    let link = this.createLinkModel(factory);
    switch (this.role) {
      case 'input': 
	link.setTargetPort(this);
	link.setSourcePort(port);
	break;
      case 'output':
      default:
	link.setSourcePort(this);
	link.setTargetPort(port);
	break;
    }
    return link as T;
  }

  canLinkToPort(port: PortModel, schema: any): boolean {
    const compareSchema = (a, b) => (
      a.nodes.every( (n1) => b.nodes.some( (n2) => (
        n1 === n2 ||
        n1 === n2.origin ||
        n1.origin === n2 ||
        n1.origin === n2.origin
      )))
    );
    if (port instanceof KineticPortModel) {
      return (
	this.role !== port.role &&
	(this.kind == port.kind ||
	 (['input','output'].includes(this.kind))) &&
        compareSchema(this.schema, schema) &&
        compareSchema(this.schema, port.schema)
      );
    }
    // can only connect between kinetic ports
    return false;
  }

  isConnected(): boolean {
    return Object.keys(this.links).length > 0;
  }
  
  createLinkModel(factory?: AbstractModelFactory<LinkModel>): LinkModel {
    let link = super.createLinkModel();
    if (!link && factory) {
      return factory.generateModel({});
    }
    //return link || new KineticLinkModel();
    return link || new DefaultLinkModel();
  }
}
