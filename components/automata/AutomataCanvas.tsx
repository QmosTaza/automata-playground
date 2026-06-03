"use client";

import { ReactFlow, Background, Controls, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRef, useCallback, useState } from "react";

import StateNode from "./StateNode";
import TransitionEdge from "./TransitionEdge";
import SimulationControls from "./SimulationControls";
import SimulationStepper from "./SimulationStepper";
import ValidationErrorPanel from "./ValidationErrorPanel";

import { EDGE_STYLE } from "@/visualizers";
import { useAutomata } from "@/hooks/useAutomata";
import { addState, createState, addTransition, createTransition, removeState, removeTransition } from "@/core/fa";
import { runDFA, makeFAComplete, runNFA, runLambdaNFA } from "@/core/fa";
import { DFA, NFA, LambdaNFA, SimulationStep, SimulationResult } from "@/types";
import { generateId } from "@/core/shared";
import InspectorPanel from "./InspectorPanel";

const nodeTypes = { state: StateNode };
const edgeTypes = { transition: TransitionEdge };

const q0Id = generateId();
const q1Id = generateId();
const initialFA = {
    id: generateId(),
    name: "DFA 1",
    createdAt: Date.now(),
    states: {
        [q0Id]: { id: q0Id, label: "q0", x: 100, y: 100 },
        [q1Id]: { id: q1Id, label: "q1", x: 300, y: 100 }
    },
    alphabet: ["a", "b"],
    transitions: [
        { id: generateId(), from: q0Id, to: q1Id, symbol: "a" },
        { id: generateId(), from: q0Id, to: q1Id, symbol: "b" },
        { id: generateId(), from: q1Id, to: q1Id, symbol: "a" }
    ],
    startStates: [q0Id],
    acceptStates: [q1Id],
    kind: "dfa" as const
};

function AutomataCanvasContent() {
    const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

    const {
        fa, setFa, nodes, edges,
        onNodesChange, onEdgesChange, onNodeDragStop,
        validationErrors, canRunSimulation,
        activeStateId, setActiveStateId
    } = useAutomata(initialFA);

    const [simulationResults, setSimulationResults] = useState<SimulationResult | SimulationResult[] | null>(null);
   
    const isConnectingRef = useRef(false);

    const onConnectStart = useCallback(() => {
        isConnectingRef.current = true;
    }, []);

    const onConnectEnd = useCallback(() => {
        setTimeout(() => { isConnectingRef.current = false; }, 50);
    }, []);

    const onPaneClick = useCallback((event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        if (isConnectingRef.current) return;
        if (target.closest('.react-flow__node') || target.closest('.react-flow__handle') || target.closest('.react-flow__edge')) return;

        const hasSelectedNodes = getNodes().some(node => node.selected);
        const hasSelectedEdges = getEdges().some(edge => edge.selected);

        if (hasSelectedNodes || hasSelectedEdges) { return; }

        const isPane = target.classList.contains('react-flow__pane') || target.matches('.react-flow__renderer') || target.matches('svg.react-flow__background');

        if (isPane) {
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            setFa(prev => addState(prev, createState(prev, position.x, position.y)));
        }
    }, [screenToFlowPosition, setFa]);

    const onConnect = useCallback((connection: any) => {
        setFa((prev) => {
            const defaultSymbol = prev.alphabet[0] ?? null;
            return addTransition(prev, createTransition(connection.source, connection.target, defaultSymbol));
        });
    }, [setFa]);

    const onNodesDelete = useCallback((deletedNodes: any[]) => {
        setFa((prev) => {
            let updatedFa = { ...prev };
            deletedNodes.forEach(node => { updatedFa = removeState(updatedFa, node.id); });
            return updatedFa;
        });
    }, [setFa]);

    const onEdgesDelete = useCallback((deletedEdges: any[]) => {
        setFa((prev) => {
            let updatedFa = { ...prev };
            deletedEdges.forEach(edge => {
                const transitionsToRemove = prev.transitions.filter(t => t.from === edge.source && t.to === edge.target);
                transitionsToRemove.forEach(t => { updatedFa = removeTransition(updatedFa, t.id); });
            });
            return updatedFa;
        });
    }, [setFa]);

    const handleSimulationRun = useCallback((input: string) => {
        if (fa.kind === "dfa") {
            const result = runDFA(fa as DFA, input);
            setSimulationResults(result);
            
            if (result.steps && result.steps.length > 0) {
                setActiveStateId(result.steps[0].state);
            }
        } else if (fa.kind === "nfa") {
            const results = runNFA(fa as NFA, input);
            setSimulationResults(results);
            if (results.length > 0 && results[0].steps && results[0].steps.length > 0) {
                setActiveStateId(results[0].steps[0].state);
            }
        } else if (fa.kind === "lambda-nfa") {
            const results = runLambdaNFA(fa as LambdaNFA, input);
            setSimulationResults(results);
            if (results.length > 0 && results[0].steps && results[0].steps.length > 0) {
                setActiveStateId(results[0].steps[0].state);
            }
        }
    }, [fa, setActiveStateId]);

    const handleKindChange = useCallback((nextKind: typeof fa.kind) => {
        setFa(prev => ({ ...prev, kind: nextKind }));
    }, [setFa]);

    const handleAutomataChange = useCallback((nextFa: typeof fa) => {
        const prevStatesCount = Object.keys(fa.states).length;
        const nextStatesCount = Object.keys(nextFa.states).length;

        if (nextStatesCount > prevStatesCount) {
            const newId = Object.keys(nextFa.states).find(id => !fa.states[id]);

            if (newId) {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const flowPosition = screenToFlowPosition({ x: centerX, y: centerY });

                nextFa.states[newId].x = flowPosition.x;
                nextFa.states[newId].y = flowPosition.y;
            }
        }

        setFa(nextFa);
    }, [fa, setFa, screenToFlowPosition]);

    return (
        <div className="w-full h-screen bg-stone-100 relative">
            <SimulationControls
                fa={fa}
                onAutomataChange={handleAutomataChange}
                faKind={fa.kind}
                onKindChange={handleKindChange}
                onSimulate={handleSimulationRun}
                canRunSimulation={canRunSimulation}
                hasWarnings={validationErrors.length > 0}
            />

            {simulationResults && (
                <SimulationStepper
                    fa={fa}
                    results={simulationResults}
                    onActiveStateChange={setActiveStateId}
                    onClose={() => setSimulationResults(null)}
                />
            )}

            <InspectorPanel
                automaton={fa}
                onAutomatonChange={handleAutomataChange}
            />

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
            >
                <Background />
                <Controls
                    position="bottom-right"
                    showInteractive={false}
                    className="!bg-white/95 !backdrop-blur-md !border !border-stone-200 !rounded-xl !shadow-xl !overflow-hidden !m-4
                   [&_button]:!bg-transparent [&_button]:!border-stone-100 [&_button]:hover:!bg-stone-100 [&_button]:!transition-colors
                   [&_svg]:!fill-amber-700"
                />
            </ReactFlow>

            <ValidationErrorPanel errors={validationErrors} a={fa} />
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