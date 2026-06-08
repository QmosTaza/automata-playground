"use client";

import { ReactFlow, Background, Controls, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRef, useCallback, useState, useMemo, useEffect } from "react";

import StateNode from "./StateNode";
import TransitionEdge from "./TransitionEdge";
import SimulationControls from "./SimulationControls";
import SimulationStepper from "./SimulationStepper";
import ValidationErrorPanel from "./ValidationErrorPanel";

import { EDGE_STYLE } from "@/visualizers";
import { useAutomata } from "@/hooks/useAutomata";
import { addState, createState, addTransition, createTransition, removeState, removeTransition } from "@/core/fa";
import { runDFA, makeDFAComplete, runNFA, runLambdaNFA } from "@/core/fa";
import { DFA, NFA, LambdaNFA, SimulationStep, SimulationResult, Transition } from "@/types";
import { generateId } from "@/core/shared";
import InspectorPanel from "./InspectorPanel";
import { convertAutomatonToRegex } from "@/core/fa/regex";

const nodeTypes = { state: StateNode };
const edgeTypes = { transition: TransitionEdge };

interface AutomataCanvasProps {
    activeData: any;
    onSave: (updatedFa: any) => void;
    onLiveRename?: (newName: string) => void;
    saveHookRef: React.MutableRefObject<(() => any) | null>;
}

export default function AutomataCanvas({ activeData, onSave, onLiveRename, saveHookRef }: AutomataCanvasProps) {
    return (
        <ReactFlowProvider>
            <AutomataCanvasContent activeData={activeData} onSave={onSave} onLiveRename={onLiveRename} saveHookRef={saveHookRef} />
        </ReactFlowProvider>
    );
}

function AutomataCanvasContent({ activeData, onSave, onLiveRename, saveHookRef }: AutomataCanvasProps) {

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

    const {
        fa, setFa, nodes, edges,
        onNodesChange, onEdgesChange, onNodeDragStop,
        validationErrors, canRunSimulation,
        activeStateId, setActiveStateId
    } = useAutomata(activeData);

    // mutable reference of the current FA data updating
    const currentFaRef = useRef(fa);
    useEffect(() => {
        currentFaRef.current = fa;
    }, [fa]);

    // returns the latest FA state instantly, bypassing the render cycle.
    useEffect(() => {
        if (!saveHookRef) return;

        saveHookRef.current = () => {
            return currentFaRef.current;
        };
        return () => {
            if (saveHookRef) {
                saveHookRef.current = null;
            }
        };
    }, [saveHookRef]);

    // Keeps edits fast and local.
    const updateWorkspace = useCallback((nextFaOrUpdater: any) => {
        setFa((prev: any) => {
            return typeof nextFaOrUpdater === 'function' ? nextFaOrUpdater(prev) : nextFaOrUpdater;
        });
    }, [setFa]);

    // Swaps out the entire environment dataset when clicking a different tab
    useEffect(() => {
        if (activeData && activeData.id !== fa.id) {
            setFa(activeData);
            
            setSimulationResults(null);
            setActiveStateId(null);
        }
    }, [activeData?.id, fa.id]);

    //No compilation during node movement or simple clicks
    const [debouncedRegex, setDebouncedRegex] = useState("");

    useEffect(() => {
        if (!isMounted || !canRunSimulation) {
            setDebouncedRegex("");
            return;
        }

        const timerId = setTimeout(() => {
            try {
                const freshRegex = convertAutomatonToRegex(fa);
                setDebouncedRegex(freshRegex);
            } catch (error) {
                console.error("Automaton to Regex calculation failed:", error);
                setDebouncedRegex("");
            }
        }, 800); // ms debounce buffer window

        return () => clearTimeout(timerId);
    }, [fa, canRunSimulation, isMounted]);

    const computedAutomaton = useMemo(() => {
        return { ...fa, regex: debouncedRegex };
    }, [fa, debouncedRegex]);

    useEffect(() => {
        onLiveRename?.(fa.name);
    }, [fa.name, onLiveRename]);


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
        if (hasSelectedNodes || hasSelectedEdges) return;

        if (target.classList.contains('react-flow__pane') || target.matches('.react-flow__renderer') || target.matches('svg.react-flow__background')) {
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            updateWorkspace((prev: any) => addState(prev, createState(prev, position.x, position.y)));
        }
    }, [screenToFlowPosition, updateWorkspace, getNodes, getEdges]);

    const onConnect = useCallback((connection: any) => {
        updateWorkspace((prev: any) => {
            const defaultSymbol = prev.alphabet[0] ?? null;
            return addTransition(prev, createTransition(connection.source, connection.target, defaultSymbol));
        });
    }, [updateWorkspace]);

    const onNodesDelete = useCallback((deletedNodes: any[]) => {
        updateWorkspace((prev: any) => {
            let updatedFa = { ...prev };
            deletedNodes.forEach(node => { updatedFa = removeState(updatedFa, node.id); });
            return updatedFa;
        });
    }, [updateWorkspace]);

    const onEdgesDelete = useCallback((deletedEdges: any[]) => {
        updateWorkspace((prev: any) => {
            let updatedFa = { ...prev };
            deletedEdges.forEach(edge => {
                const transitionsToRemove = prev.transitions.filter((t: Transition) => t.from === edge.source && t.to === edge.target);
                transitionsToRemove.forEach((t: Transition) => { updatedFa = removeTransition(updatedFa, t.id); });
            });
            return updatedFa;
        });
    }, [updateWorkspace]);

    const handleKindChange = useCallback((nextKind: typeof fa.kind) => {
        updateWorkspace((prev: any) => ({ ...prev, kind: nextKind }));
    }, [updateWorkspace]);

    const handleAutomataChange = useCallback((nextFa: typeof fa) => {
        const prevStatesCount = Object.keys(fa.states).length;
        const nextStatesCount = Object.keys(nextFa.states).length;

        if (nextStatesCount === prevStatesCount + 1) {
            const newId = Object.keys(nextFa.states).find(id => !fa.states[id]);
            if (newId && nextFa.states[newId]) {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const flowPosition = screenToFlowPosition({ x: centerX, y: centerY });
                nextFa.states[newId].x = flowPosition.x;
                nextFa.states[newId].y = flowPosition.y;
            }
        }
        updateWorkspace(nextFa);
    }, [fa, updateWorkspace, screenToFlowPosition]);

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

    return (
        <div className="w-full h-screen bg-stone-100 relative">
            <SimulationControls
                fa={computedAutomaton}
                onAutomataChange={handleAutomataChange}
                faKind={fa.kind}
                onKindChange={handleKindChange}
                onSimulate={handleSimulationRun}
                canRunSimulation={canRunSimulation}
                hasWarnings={validationErrors.length > 0}
            />

            {simulationResults && (
                <SimulationStepper
                    fa={computedAutomaton}
                    results={simulationResults}
                    onActiveStateChange={setActiveStateId}
                    onClose={() => setSimulationResults(null)}
                />
            )}

            <InspectorPanel
                automaton={computedAutomaton}
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

            <ValidationErrorPanel errors={validationErrors} a={computedAutomaton} />
        </div>
    );
}
