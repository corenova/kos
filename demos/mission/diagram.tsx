import * as React from 'react';
import { action } from '@storybook/addon-actions';
import { DemoCanvasWidget } from '../helpers/DemoCanvasWidget';
import createEngine, {
  CanvasWidget,
  DiagramModel,
  KineticNodeModel,
  KineticLinkModel,
} from '../../viz'

export interface KineticDiagramProps {
  schema: any;
  config: any;
}

export interface KineticProps extends KineticDiagramProps {
  speed?: number;
  source: object;
  enabled?: boolean;
}

export interface KineticState {
  loaded: boolean;
  connected: boolean;
}

export class KineticWidget extends React.Component<KineticProps, KineticState> {
  protected store: any;
  protected stream: any;
  protected engine: any;
  protected model: DiagramModel;
  protected timer: any;
  protected counter: number;

  protected nodeMap: Map;
  
  constructor(props) {
    super(props);

    const { schema, config } = props;
    
    this.store = schema.eval(config);
    this.engine = createEngine();
    this.model = new DiagramModel();
    this.engine.setModel(this.model);

    this.state = {
      connected: false,
      loaded: false,
      counter: 0,
    }
  }

  componentDidMount() {
    this.loadTopology();
  }
  
  loadTopology() {
    if (this.state.loaded) return;
    
    const topology = this.store.get('/kos:topology');
    const nodeMap = new Map;
    const links = [];
    
    for (const node of topology.node) {
      const { schema, render = {} } = node;
      const m = new KineticNodeModel(schema, render);
      const { x = 0, y = 0 } = render;
      m.setPosition(x, y);
      nodeMap.set(node.id, m);
    }
    const nodes = Array.from(nodeMap.values());
    for (const flow of topology.flow) {
      if (flow.mode === 'mesh') continue;

      for (let idx = 0; idx < flow.nodes.length - 1; idx++) {
        const [ a, b ] = [ nodeMap.get(flow.nodes[idx]), nodeMap.get(flow.nodes[idx+1]) ];
        a.portsOut.forEach( (portA) => b.portsIn.forEach( (portB) => {
          if (!portA.canLinkToPort(portB, flow.schema)) return;
          
          let link = portA.link(portB);
          link.setLocked(true);
          links.push(link);
          (link as KineticLinkModel).addLabel(flow.label);
        }));
      }
    }
    this.model.addAll(...nodes, ...links);
    
    nodes.forEach( node => {
      node.registerListener({
        selectionChanged: ({ isSelected }) => {
          if (isSelected) action(node.name)({ schema: node.schema.toString() });
        }
      });
    });
    this.nodeMap = nodeMap;
    this.setState({ loaded: true });
  }

  animatePlayback() {
    if (this.timer) return;
    
    console.log('starting packet replay...');
    this.timer = setInterval(this.process.bind(this), (100 * this.props.speed));
  }

  process() {
    const { source = [] } = this.props;
    if (source.length <= this.counter) {
      console.warn('no more packets at the source');
      this.stopPlayback();
      return;
    }
    const packet = source[this.counter];
    this.counter += 1;
    
    const { tv_sec, tv_usec } = packet.pcap_header;
    const ethernet = packet.payload;
    const ip = ethernet.payload;
    const gaps = ip.payload;

    const [ snode, dnode ] = [ this.nodeMap.get(gaps.src), this.nodeMap.get(gaps.dst) ];
    const [ sname, dname ] = [ snode.name, dnode.name ];
    const [ sip, dip ] = [ ip.saddr.addr.join('.'), ip.daddr.addr.join('.') ];
    const message = `GAPS: ${sname} (${sip}) -> ${dname} (${dip})`;
    
    console.log(message, {
      ethernet: `${ethernet.shost.addr.join(':')} -> ${ethernet.dhost.addr.join(':')}`,
      ip: `${sip} -> ${dip} (${ip.length} bytes)`,
      gaps: `${gaps.src} -> ${gaps.dst}`,
      data: gaps.data,
      raw: packet,
    });
  }
  
  stopPlayback() {
    if (this.timer) {
      console.log('stopping packet replay...');
      clearInterval(this.timer);
      this.timer = null;
    }
    this.counter = 0;
  }
  
  render(){
    if (this.props.enabled) this.animatePlayback();
    else this.stopPlayback();
    
    return (
      <DemoCanvasWidget background="rgb(60,60,60)">
        <CanvasWidget engine={this.engine} />
      </DemoCanvasWidget>
    )
  }
}

/* export const KineticDiagram: React.FC<KineticDiagramProps> = ({
 *   schema, config
 * }) => {
 *   console.info('making a new kinetic diagram');
 *   const store = schema.eval(config);
 *   const engine = createEngine();
 *   const model = new DiagramModel();
 * 
 *   //5) load model into engine
 *   engine.setModel(model);
 * 
 *   //6) render the diagram!
 *   return (
 *   );
 * }; */
