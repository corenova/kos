import createEngine, { DiagramEngine, DiagramModel } from '@projectstorm/react-diagrams';
import { CanvasWidget, CanvasEngineOptions } from '@projectstorm/react-canvas-core';

export { CanvasWidget, DiagramModel };

export * from './link/KineticLink';

export * from './node/KineticNodeFactory';
export * from './node/KineticNodeModel';
export * from './node/KineticNodeWidget';

export * from './port/KineticPortFactory';
export * from './port/KineticPortWidget';
export * from './port/KineticPortModel';

import { KineticLinkFactory } from './link/KineticLink';
import { KineticPortFactory } from './port/KineticPortFactory';
import {
    GeneratorNodeFactory,
    ProcessorNodeFactory,
    TerminatorNodeFactory,
} from './node/KineticNodeFactory';

export default (options: CanvasEngineOptions = {}): DiagramEngine => {
    const engine = createEngine(options);
    engine.getLinkFactories().registerFactory(new KineticLinkFactory());
    engine.getPortFactories().registerFactory(new KineticPortFactory());
    engine.getNodeFactories().registerFactory(new GeneratorNodeFactory());
    engine.getNodeFactories().registerFactory(new ProcessorNodeFactory());
    engine.getNodeFactories().registerFactory(new TerminatorNodeFactory());
    return engine;
}
