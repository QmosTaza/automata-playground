"use client";

import { ReactFlow, Background, Controls, Node, Edge, applyNodeChanges, addEdge, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState, useCallback, useEffect } from "react";

import StateNode from "./StateNode";
import TransitionEdge from "./TransitionEdge";
import { faToNodes, faToEdges, EDGE_STYLE } from "@/visualizers";
import { FiniteAutomaton } from "@/types";
import { addState, createState, addTransition, createTransition } from "@/core/fa/edit";

const nodeTypes = {
    state: StateNode
};

const edgeTypes = {
    transition: TransitionEdge
};

const initialFA: FiniteAutomaton = {
    states: {
        q0: { id: "q0", label: "q0", x: 100, y: 100 },
        q1: { id: "q1", label: "q1", x: 300, y: 100 }
    },
    alphabet: ["a", "b"],
    transitions: [
        { id: "t1", from: "q0", to: "q1", symbol: "a" },
        { id: "t2", from: "q0", to: "q1", symbol: "b" },
        { id: "t3", from: "q1", to: "q1", symbol: "a" }
    ],
    startStates: ["q0"],
    acceptStates: ["q1"],
    kind: "dfa"
};


function AutomataCanvasContent() {
    const { screenToFlowPosition } = useReactFlow();
    const [fa, setFa] = useState(initialFA);
    const [nodes, setNodes] = useState<Node[]>(faToNodes(initialFA));
    const [edges, setEdges] = useState<Edge[]>(faToEdges(initialFA));

    const onNodesChange = useCallback((changes: any) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    useEffect(() => {
        setNodes(faToNodes(fa));
        setEdges(faToEdges(fa));
    }, [fa]);

    const syncFA = useCallback(() => {
        setFa((prev) => ({
            ...prev,
            states: Object.fromEntries(
                nodes.map((n) => [
                    n.id,
                    {
                        ...prev.states[n.id],
                        x: n.position.x,
                        y: n.position.y,
                    },
                ])
            ),
        }));
    }, [nodes]);

    const onPaneClick = useCallback((event: any) => {
    const target = event.target;
    const isHandle = target.closest?.('.react-flow__handle');
    const isEdge = target.closest?.('.react-flow__edge');
    
    if (!isHandle && !isEdge) {
        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        setFa(prev => {
            const newState = createState(prev, position.x, position.y);

            setNodes(nds => [
                ...nds,
                {
                    id: newState.id,
                    type: "state",
                    position,
                    data: {
                        label: newState.label,
                        accepting: false
                    }
                }
            ]);

            return addState(prev, newState);
        });
    }
}, [screenToFlowPosition]);

    const onConnect = useCallback((connection: any) => {
        const t = createTransition(connection.source, connection.target, fa.alphabet[0]);
        const newEdge: Edge = {
            id: t.id,
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            type: "transition",
            label: t.symbol,
        };

        setEdges((eds) => addEdge(newEdge, eds));
        setFa((prev) => addTransition(prev, t));
    }, [fa.alphabet]);

    return (
        <div className="w-full h-screen bg-stone-100">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onNodeDragStop={syncFA}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={EDGE_STYLE}
                onPaneClick={onPaneClick}
                onConnect={onConnect}
                fitView
                nodesConnectable={true}
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}

// Wrapper component with provider
export default function AutomataCanvas() {
    return (
        <ReactFlowProvider>
            <AutomataCanvasContent />
        </ReactFlowProvider>
    );
}