"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Node, Edge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { FiniteAutomaton, DFA, NFA, LambdaNFA, AutomatonBase } from "@/types";
import { faToNodes, faToEdges } from "@/visualizers";
import {
    addState, createState, addTransition, createTransition,
    removeTransition, removeState, renameState, toggleAcceptState, toggleStartState
} from "@/core/fa/edit";
import { validateDFA, validateCompleteness } from "@/core/fa/dfa/validate";
import { validateNFA } from "@/core/fa/nfa/validate";
import { validateLambdaNFA } from "@/core/fa/lambda-nfa/validate";

export function useAutomata(initialFA: FiniteAutomaton, onSave?: (updatedFa: FiniteAutomaton) => void) {
    const [fa, setFa] = useState<FiniteAutomaton>(initialFA);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [activeStateId, setActiveStateId] = useState<string | null>(null);


    const prevIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (!initialFA?.id) return;

        if (prevIdRef.current !== initialFA.id) {
            prevIdRef.current = initialFA.id;
            setFa(initialFA);
        }
    }, [initialFA?.id]);

    useEffect(() => {
        setNodes((currentNodes) => {
            const nextNodes = faToNodes(fa, onToggleAccept, onRename, onToggleStart, activeStateId);

            if (currentNodes.length === 0) return nextNodes;

            const existingNodesMap = new Map(currentNodes.map(n => [n.id, n]));

            return nextNodes.map(newNode => {
                const existingNode = existingNodesMap.get(newNode.id);
                return {
                    ...newNode,
                    position: existingNode && existingNode.position.x !== 0 ? existingNode.position : newNode.position,
                    selected: existingNode?.selected || false,
                    data: {
                        ...newNode.data,
                        isStart: fa.startStates.includes(newNode.id),
                        accepting: fa.acceptStates.includes(newNode.id),
                        isActive: activeStateId === newNode.id
                    }
                };
            });
        });

        setEdges(faToEdges(fa, handleUpdateSymbols, handleRemoveEdge));
    }, [fa, activeStateId]);

    const updateFa = useCallback((updater: (prev: FiniteAutomaton) => FiniteAutomaton) => {
        setFa(prev => updater(prev));
    }, []);

    //makes a state an accepting state (or no longer an accepting state)
    const onToggleAccept = useCallback((id: string) => {
        updateFa(prev => toggleAcceptState(prev, id));
    }, [updateFa]);

    //changes state label
    const onRename = useCallback((id: string, newLabel: string) => {
        updateFa(prev => renameState(prev, id, newLabel));
    }, [updateFa]);

    //makes a state a starting state (or no longer a starting state)
    const onToggleStart = useCallback((id: string) => {
        updateFa(prev => toggleStartState(prev, id));
    }, [updateFa]);

    //for editing, groups all transitions from one state to another in an array
    const handleUpdateSymbols = useCallback((edgeId: string, nextSymbols: (string | null)[]) => {
        updateFa(prev => {
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
    }, [updateFa]);

    //remove transitions from automata when you click + delete or you delete it from inspector tab
    const handleRemoveEdge = useCallback((edgeId: string) => {
        updateFa(prev => removeTransition(prev, edgeId));
    }, [updateFa]);

    // Keep structural alterations isolated locally
    const onNodesChange = useCallback((changes: any) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    const onEdgesChange = useCallback((changes: any) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
    }, []);

    // Commit coordinate layout changes ONLY when dragging finishes
    const onNodeDragStop = useCallback((_: any, node: Node) => {
        updateFa((prev: any) => {
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
    }, [updateFa]);

    // stops complex graph validation routines from executing on every frame render
    const validationErrors = useMemo(() => {
        switch (fa.kind) {
            case "dfa":
                const dfaErrors = validateDFA(fa as DFA & AutomatonBase);
                const compErrors = validateCompleteness(fa as DFA & AutomatonBase);
                return [...dfaErrors.errors, ...compErrors];
            case "nfa":
                const nfaErrors = validateNFA(fa as NFA & AutomatonBase);
                return [...nfaErrors.errors];
            case "lambda-nfa":
                const lambdanfaErrors = validateLambdaNFA(fa as LambdaNFA & AutomatonBase);
                return [...lambdanfaErrors.errors];
        }
        return [];
    }, [fa]);

    // if the validation error is just "Missing transitions", allows you to run the FA
    const canRunSimulation = useMemo(() => {
        return validationErrors.filter(e => e.type !== "MISSING_TRANSITION").length === 0;
    }, [validationErrors]);


    return {
        fa,
        setFa,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onNodeDragStop,
        setNodes,
        setEdges,
        validationErrors,
        onToggleAccept,
        onRename,
        onToggleStart,
        activeStateId,
        setActiveStateId,
        handleUpdateSymbols,
        handleRemoveEdge,
        canRunSimulation
    };
}