import * as React from 'react';
import {
  DefaultLinkFactory,
  DefaultLinkModel,
  DefaultLinkModelOptions,
} from '@projectstorm/react-diagrams';
import styled from '@emotion/styled';
import { css, keyframes } from '@emotion/react';

export class KineticLinkModel extends DefaultLinkModel {
  constructor(options: DefaultLinkModelOptions = {}) {
    super(Object.assign(options, {  type: 'kinetic', width: 3, color: 'rgba(30, 167, 253, 1)' }));
    //super({ type: 'kinetic', width: 3, color: 'rgba(30, 167, 253, 1)' });
  }
}

namespace S {
  export const Keyframes = keyframes`
    from {
      stroke-dashoffset: 24;
    }
    to {
      stroke-dashoffset: 0;
    }
  `;

  const selected = css`
    stroke-dasharray: 10, 2;
    animation: ${Keyframes} 1s linear infinite;    
  `;
  export const Path = styled.path<{ selected: boolean }>`
    ${(p) => p.selected && selected};
    fill: none;
    pointer-events: all;
  `;
}

export interface KineticLinkSegmentProps {
  model: KineticLinkModel;
  path: string;
  selected: boolean;
  frameRate: number;
  increment: number;
}

export const MAX_FPS = 60;

export class KineticLinkSegment extends React.Component<KineticLinkSegmentProps> {
  path: SVGPathElement;
  circle: SVGCircleElement;
  callback: () => any;
  percent: number;
  handle: any;
  frameId: number;

  constructor(props: any) {
    super(props);
    this.percent = 0;
  }

  private frameCount = 0;
  
  private update = () => {
    const { frameRate = 30, increment = 4 } = this.props;
    this.frameCount++;
    if (!this.circle || !this.path) {
      return;
    }
    if (this.frameCount >= Math.round(MAX_FPS / frameRate)) {
      this.percent += increment;
      if (this.percent > 100) {
        this.percent = 0;
        this.frameCount = 0
      }
      let point = this.path.getPointAtLength(this.path.getTotalLength() * (this.percent / 100.0));

      this.circle.setAttribute('cx', '' + point.x);
      this.circle.setAttribute('cy', '' + point.y);
    }
    this.frameId = requestAnimationFrame(this.update);
  }
 
  componentDidMount() {
    this.update();
  }
  componentWillUnmount() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
  }

  render() {
    const { selected, model } = this.props;
    return (
      <>
      <S.Path
      selected={selected}
      ref={ref => {
        this.path = ref;
      }}
      strokeWidth={model.getOptions().width}
      stroke={selected ? model.getOptions().selectedColor : model.getOptions().color}
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
      <KineticLinkSegment model={model} path={path} selected={selected} frameRate={30} increment={4}/>
    );
  }
}
