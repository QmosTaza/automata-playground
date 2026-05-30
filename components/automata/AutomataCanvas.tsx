"use client";

import { ReactFlow, Background, Controls, Node, Edge, applyNodeChanges, addEdge, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState, useCallback, useEffect } from "react";

import StateNode from "./StateNode";
import TransitionEdge from "./TransitionEdge";
import { faToNodes, faToEdges, EDGE_STYLE } from "@/visualizers";
import { FiniteAutomaton } from "@/types";
import { addState, createState, addTransition, createTransition, removeTransition, removeState, renameState, toggleAcceptState } from "@/core/fa/edit";

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

    const onToggleAccept = useCallback((id: string) => {
        setFa(prev => toggleAcceptState(prev, id));
    }, []);

    const onRename = useCallback((id: string, newLabel: string) => {
        setFa(prev => renameState(prev, id, newLabel));
    }, []);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const handleEditTransition = useCallback((edgeId: string) => {
        const newSymbols = prompt("Introduce los nuevos símbolos separados por comas (vacío para λ):");
        if (newSymbols === null) return;

        setFa(prev => {
            const baseTransition = prev.transitions.find(t => t.id === edgeId);
            if (!baseTransition) return prev;

            const filteredTransitions = prev.transitions.filter(
                t => !(t.from === baseTransition.from && t.to === baseTransition.to)
            );

            const symbolsArray = newSymbols.split(",").map(s => s.trim());
            const newTransitions = symbolsArray.map(sym => ({
                id: sym === symbolsArray[0] ? edgeId : Math.random().toString(36).substring(7), // Mantenemos el ID base en el primero
                from: baseTransition.from,
                to: baseTransition.to,
                symbol: sym === "" || sym === "λ" ? null : sym
            }));

            return {
                ...prev,
                transitions: [...filteredTransitions, ...newTransitions]
            };
        });
    }, []);

    useEffect(() => {
        setNodes(faToNodes(fa, onToggleAccept, onRename));
        setEdges(faToEdges(fa, handleEditTransition));
    }, [fa, onToggleAccept, onRename, handleEditTransition]);

    const onNodesChange = useCallback((changes: any) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    const onNodeDragStop = useCallback((_: any, node: Node) => {
        setFa(prev => {
            const state = prev.states[node.id];
            if (!state) return prev;
            return {
                ...prev,
                states: {
                    ...prev.states,
                    [node.id]: { ...state, x: node.position.x, y: node.position.y }
                }
            };
        });
    }, []);

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
        const symbol = prompt("Introduce el símbolo de la transición (deja vacío para λ):") ?? "";
        const finalSymbol = symbol.trim() === "" ? null : symbol;

        setFa((prev) => {
            const t = createTransition(connection.source, connection.target, finalSymbol);
            return addTransition(prev, t);
        });
    }, []);

    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
        setFa((prev) => {
            let updatedFa = { ...prev };
            deletedNodes.forEach(node => {
                updatedFa = removeState(updatedFa, node.id);
            });
            return updatedFa;
        });
    }, []);

    const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
        setFa((prev) => {
            let updatedFa = { ...prev };
            deletedEdges.forEach(edge => {
                updatedFa = removeTransition(updatedFa, edge.id);
            });
            return updatedFa;
        });
    }, []);

    return (
        <div className="w-full h-screen bg-stone-100">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onNodeDragStop={onNodeDragStop}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
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