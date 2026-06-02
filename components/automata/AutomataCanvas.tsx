"use client";

import { ReactFlow, Background, Controls, Node, Edge, applyNodeChanges, applyEdgeChanges, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState, useCallback, useEffect, useRef } from "react";

import StateNode from "./StateNode";
import TransitionEdge from "./TransitionEdge";
import { faToNodes, faToEdges, EDGE_STYLE } from "@/visualizers";
import { FiniteAutomaton } from "@/types";
import { addState, createState, addTransition, createTransition, removeTransition, removeState, renameState, toggleAcceptState, toggleStartState } from "@/core/fa/edit";

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

    const isConnectingRef = useRef(false);

    const onConnectStart = useCallback(() => {
        isConnectingRef.current = true;
    }, []);

    const onConnectEnd = useCallback(() => {
        setTimeout(() => {
            isConnectingRef.current = false;
        }, 50);
    }, []);

    const onToggleAccept = useCallback((id: string) => {
        setFa(prev => toggleAcceptState(prev, id));
    }, []);

    const onRename = useCallback((id: string, newLabel: string) => {
        setFa(prev => renameState(prev, id, newLabel));
    }, []);

    const onToggleStart = useCallback((id: string) => {
        setFa(prev => toggleStartState(prev, id));
    }, []);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    /*
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
                id: sym === symbolsArray[0] ? edgeId : Math.random().toString(36).substring(7),
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
    */

    const handleUpdateSymbols = useCallback((edgeId: string, nextSymbols: (string | null)[]) => {
        setFa(prev => {
            const baseTransition = prev.transitions.find(t => t.id === edgeId);
            if (!baseTransition) return prev;

            const transitionsToRemove = prev.transitions.filter(
                t => t.from === baseTransition.from && t.to === baseTransition.to
            );
            let updatedFa = prev;
            transitionsToRemove.forEach(t => {
                updatedFa = removeTransition(updatedFa, t.id);
            });

            if (nextSymbols.length === 0) {
                const emptyT = createTransition(baseTransition.from, baseTransition.to, undefined);
                emptyT.id = edgeId;
                return addTransition(updatedFa, emptyT);
            }

            nextSymbols.forEach((sym, index) => {
                const newT = createTransition(baseTransition.from, baseTransition.to, sym);
                if (index === 0) {
                    newT.id = edgeId;
                }
                updatedFa = addTransition(updatedFa, newT);
            });

            return updatedFa;
        });
    }, []);

    const handleRemoveEdge = useCallback((edgeId: string) => {
        setFa(prev => removeTransition(prev, edgeId));
    }, []);

    useEffect(() => {
        setNodes(faToNodes(fa, onToggleAccept, onRename, onToggleStart));
        setEdges(faToEdges(fa, handleUpdateSymbols, handleRemoveEdge));
    }, [fa, onToggleAccept, onRename, handleUpdateSymbols, handleRemoveEdge]);

    const onNodesChange = useCallback((changes: any) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    const onEdgesChange = useCallback((changes: any) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
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

    const onPaneClick = useCallback((event: React.MouseEvent) => {
        const target = event.target as HTMLElement;

        if (isConnectingRef.current) return;

        if (
            target.closest('.react-flow__node') ||
            target.closest('.react-flow__handle') ||
            target.closest('.react-flow__edge')
        ) {
            return;
        }

        const isPane = target.classList.contains('react-flow__pane') ||
            target.matches('.react-flow__renderer') ||
            target.matches('svg.react-flow__background');

        if (isPane) {
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            setFa(prev => {
                const newState = createState(prev, position.x, position.y);
                return addState(prev, newState);
            });
        }
    }, [screenToFlowPosition]);

    const onConnect = useCallback((connection: any) => {
        setFa((prev) => {
            const defaultSymbol = prev.alphabet[0] ?? null;
            const t = createTransition(connection.source, connection.target, defaultSymbol);
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
                const transitionsToRemove = prev.transitions.filter(
                    t => t.from === edge.source && t.to === edge.target
                );
                transitionsToRemove.forEach(t => {
                    updatedFa = removeTransition(updatedFa, t.id);
                });
            });
            return updatedFa;
        });
    }, []);

    return (
        <div className="w-full h-screen bg-stone-100">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                defaultEdgeOptions={EDGE_STYLE}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onPaneClick={onPaneClick}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                fitView
                nodesConnectable={true}
                deleteKeyCode={['Backspace', 'Delete']}
                selectionKeyCode={['Shift']}
                edgesFocusable={true}
            //connectionMode="loose"
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}

export default function AutomataCanvas() {
    return (
        <ReactFlowProvider>
            <AutomataCanvasContent />
        </ReactFlowProvider>
    );
}