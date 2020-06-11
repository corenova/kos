import * as React from 'react';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';
import { KineticPortWidget } from '../port/KineticPortWidget';
import {
    KineticNodeModel,
    GeneratorNodeModel,
    ProcessorNodeModel,
    TerminatorNodeModel,
} from './KineticNodeModel';

import styled from '@emotion/styled';

export interface KineticNodeWidgetProps {
    node: KineticNodeModel;
    engine: DiagramEngine;
}

export interface KineticNodeWidgetState {}

namespace S {
    export const Node = styled.div<{ background: string; selected: boolean }>`
        background: ${p => p.background};
        border-radius: 7px;
        font-family: sans-serif;
        color: white;
        overflow: hidden;
        font-size: 12px;
        border: solid 3px ${p => (p.selected ? 'rgb(0,192,255)' : 'rgba(115,115,115,0.7)')};
        color: white;
    `;

    export const Title = styled.div`
        background: rgba(200, 200, 200, 0.1);
        display: flex;
        white-space: nowrap;
        justify-items: left;
    `;
    
    export const TitleIcon = styled.div`
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        white-space: nowrap;
    `;

    export const TitleName = styled.div<{ selected: boolean; }>`
        flex-grow: 1;
	color: rgba(220, 220, 200, ${p => (p.selected ? 1 : 0.7)});
	font-size: 14px;
        font-weight: bolder;
        padding: 7px 10px;
	text-align: center;
    `;

    export const Ports = styled.div`
        display: flex;
        background-image: linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2));
	padding: 8px 0;
    `;

    export const PortsContainer = styled.div`
        flex-grow: 1;
        display: flex;
        flex-direction: column;

        &:first-of-type {
          margin-right: 10px;
        }

        &:only-child {
          margin-right: 0px;
        }
    `;
}

export const KineticNodeWidget: React.FC<KineticNodeWidgetProps> = ({
    engine, node
}) => (
    <div className="kinetic-node">
        <KineticPortWidget engine={engine} port={node.getPort('in')}>
            <div className="circle-port" />
        </KineticPortWidget>
        <KineticPortWidget engine={engine} port={node.getPort('out')}>
            <div className="circle-port" />
        </KineticPortWidget>
        <div className="kinetic-node-color" style={{ backgroundColor: node.color }} />
    </div>
);

/**
 * Generator node that models the GeneratorNodeModel. It creates one column
 * for only the output ports on the right.
 */
export const GeneratorNodeWidget: React.FC<KineticNodeWidgetProps> = ({
    engine, node
}) => (
    <S.Node
	data-default-node-name={node.name}
	selected={node.isSelected()}
	background={node.color}>
	<S.Title>
	    <S.TitleIcon>{node.icon}</S.TitleIcon>
	    <S.TitleName selected={node.isSelected()}>{node.title}</S.TitleName>
	</S.Title>
	<S.Ports>
	    <S.PortsContainer>
		{node.portsOut.map(port => (
		    <KineticPortWidget engine={engine} port={port} key={port.id}/>
		))}
	    </S.PortsContainer>
	</S.Ports>
    </S.Node>
);

/**
 * Processor node that models the ProcessorNodeModel. It creates two columns
 * for both all the input ports on the left, and the output ports on the right.
 */
export const ProcessorNodeWidget: React.FC<KineticNodeWidgetProps> = ({ node, engine }) => (
    <S.Node
	data-default-node-name={node.name}
	selected={node.isSelected()}
	background={node.color}>
	<S.Title>
	    <S.TitleIcon>{node.icon}</S.TitleIcon>
	    <S.TitleName selected={node.isSelected()}>{node.title}</S.TitleName>
	</S.Title>
	<S.Ports>
	    <S.PortsContainer>
		{node.portsIn.map(port => (
		    <KineticPortWidget engine={engine} port={port} key={port.id}/>
		))}
	    </S.PortsContainer>
	    <S.PortsContainer>
		{node.portsOut.map(port => (
		    <KineticPortWidget engine={engine} port={port} key={port.id}/>
		))}
	    </S.PortsContainer>
	</S.Ports>
    </S.Node>
);


/**
 * Terminator node that models the TerminatorNodeModel. It creates one column
 * for only the input ports on the left.
 */
export const TerminatorNodeWidget: React.FC<KineticNodeWidgetProps> = ({
    engine, node
}) => (
    <S.Node
	data-default-node-name={node.name}
	selected={node.isSelected()}
	background={node.color}>
	<S.Title>
	    <S.TitleIcon>{node.icon}</S.TitleIcon>
	    <S.TitleName selected={node.isSelected()}>{node.title}</S.TitleName>
	</S.Title>
	<S.Ports>
	    <S.PortsContainer>
		{node.portsIn.map(port => (
		    <KineticPortWidget engine={engine} port={port} key={port.id}/>
		))}
	    </S.PortsContainer>
	</S.Ports>
    </S.Node>
);
