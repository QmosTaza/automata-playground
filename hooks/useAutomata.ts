"use client";

import { useState, useCallback, useEffect } from "react";
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

export function useAutomata(initialFA: FiniteAutomaton) {
    const [fa, setFa] = useState<FiniteAutomaton>(initialFA);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [activeStateId, setActiveStateId] = useState<string | null>(null);

    const onToggleAccept = useCallback((id: string) => {
        setFa(prev => toggleAcceptState(prev, id));
    }, []);

    const onRename = useCallback((id: string, newLabel: string) => {
        setFa(prev => renameState(prev, id, newLabel));
    }, []);

    const onToggleStart = useCallback((id: string) => {
        setFa(prev => toggleStartState(prev, id));
    }, []);

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
        setNodes((currentNodes) => {
            const nextNodes = faToNodes(fa, onToggleAccept, onRename, onToggleStart, activeStateId);
            return nextNodes.map(newNode => {
                const existingNode = currentNodes.find(n => n.id === newNode.id);
                return {
                    ...newNode,
                    position: existingNode?.position || newNode.position,
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
    }, [fa, onToggleAccept, onRename, onToggleStart, handleUpdateSymbols, handleRemoveEdge, activeStateId]);

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

    const validationErrors = (() => {
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
    })();

    const canRunSimulation = validationErrors.filter(e =>
        e.type !== "MISSING_TRANSITION"
    ).length === 0;

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