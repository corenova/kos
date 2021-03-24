import * as React from 'react';
import { DiagramEngine, PortWidget } from '@projectstorm/react-diagrams-core';
import { KineticPortModel } from './KineticPortModel';
import styled from '@emotion/styled';

export interface KineticPortProps {
  port: KineticPortModel;
  engine: DiagramEngine;
}

namespace S {
  export const PortLabel = styled.div<{
    right: boolean; background: string; connected: boolean;
  }>`
        background: ${p => p.background};
        border: transparent 1px black;
        border-${p => p.right ? 'right' : 'left'}: 0px;
        border-radius: ${p => p.right ? '15px 0 0 15px' : '0 15px 15px 0'};
        color: ${p => p.connected ? 'white' : 'rgba(180,180,180)'};
        text-align: ${p => p.right ? 'right' : 'left'};
        font-weight: bolder;
	display: flex;
	margin: 1px 0;
	align-items: center;
  `;

  export const Label = styled.div`
    padding: 2px 10px;
    flex-grow: 1;
  `;

  export const Port = styled.div<{
    color: string; right: boolean; connected: boolean;
  }>`
        background: ${p => p.color};
        opacity: ${p => p.connected ? 0.8 : 0.1};
        border: solid 1px black;
        border-${p => p.right ? 'right' : 'left'}: 0px;
        border-radius: ${p => p.right ? '15px 0 0 15px' : '0 15px 15px 0'};
	width: ${p => p.right ? '30px' : '20px'};
	height: 15px;
        color: black;
        padding-${p => p.right? 'right' : 'left'}: 5px;
	&:hover {
          opacity: 1;
 	  background: rgba(255, 174, 66);
	}
  `;
}

export const KineticPortWidget: React.FC<KineticPortProps> = ({ port, engine }) => {
  const right = port.role === 'output'
  const io = port.role === 'output' ? 'OUT' : 'IN';
  const edge = (
    <PortWidget engine={engine} port={port}>
      <S.Port
	color={port.color}
	right={right}
	connected={port.isConnected()}>
        { io }
      </S.Port>
    </PortWidget>
  );
  const label = <S.Label>{port.label}</S.Label>;
  
  return (
    <S.PortLabel
      background={port.background}
      right={right}
      connected={port.isConnected()}>
      {port.role === 'input' ? edge : label}
      {port.role === 'input' ? label : edge}
    </S.PortLabel>
  );
};
