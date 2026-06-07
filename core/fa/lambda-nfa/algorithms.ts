import { FiniteAutomaton, LambdaNFA, State, StateId, Transition } from "../../../types";
import { generateId } from "@/core/shared";
import { createDFAState, getTargetStatesForSubset } from "../nfa/algorithms";
import { getLambdaClosure } from "./simulate";

export function convertLambdaNFAtoDFA(fa: FiniteAutomaton): FiniteAutomaton {
    const initialStateIds = fa.startStates && fa.startStates.length > 0 ? fa.startStates : [];
    const initialSet = new Set<StateId>(
        initialStateIds.flatMap(stateId => Array.from(getLambdaClosure(fa as LambdaNFA, stateId)))
    );
    const initialSignature = Array.from(initialSet).sort().join("_");

    const newStates: Record<StateId, State> = {};
    const newTransitions: Transition[] = [];

    const signatureToDfaIdMap: Record<string, StateId> = {};
    const dfaIdToSignatureMap: Record<StateId, string> = {};

    const initialDfaId = generateId();

    signatureToDfaIdMap[initialSignature] = initialDfaId;
    dfaIdToSignatureMap[initialDfaId] = initialSignature;

    const queue: StateId[] = [initialDfaId];

    const firstState = createDFAState(fa, initialDfaId, initialSet);
    newStates[firstState.id] = firstState;

    while (queue.length > 0) {
        const currentDfaId = queue.shift()!;
        const currentSignature = dfaIdToSignatureMap[currentDfaId];

        for (const a of fa.alphabet) {
            const rawTargetSet = getTargetStatesForSubset(fa, currentSignature, a);
            if (rawTargetSet.size === 0) continue;

            const closureTargets = Array.from(rawTargetSet).flatMap(stateId =>
                Array.from(getLambdaClosure(fa as LambdaNFA, stateId))
            );

            const targetSet = new Set<StateId>(closureTargets);
            const targetSignature = Array.from(targetSet).sort().join("_");
            let targetDfaId = signatureToDfaIdMap[targetSignature];

            if (!targetDfaId) {
                targetDfaId = generateId();

                signatureToDfaIdMap[targetSignature] = targetDfaId;
                dfaIdToSignatureMap[targetDfaId] = targetSignature;

                const newState = createDFAState(fa, targetDfaId, targetSet);
                newStates[newState.id] = newState;

                queue.push(targetDfaId);
            }

            newTransitions.push({
                id: generateId(),
                from: currentDfaId,
                symbol: a,
                to: targetDfaId
            });
        }
    }

    const newAcceptStates: StateId[] = Object.keys(newStates).filter(dfaStateId => {
        const signature = dfaIdToSignatureMap[dfaStateId];
        const components = signature.split("_");
        return components.some(nfaId => fa.acceptStates.includes(nfaId));
    });

    return {
        id: fa.id,
        createdAt: fa.createdAt,
        name: fa.name,
        alphabet: [...fa.alphabet],
        states: newStates,
        transitions: newTransitions,
        startStates: [initialDfaId],
        acceptStates: newAcceptStates,
        kind: "dfa"
    };
}


export function convertLambdaNFAtoNFA(fa: FiniteAutomaton): FiniteAutomaton {
    const startClosure = Array.from(getLambdaClosure(fa as any, fa.startStates[0])).sort();
    
    const subsetToIdMap = new Map<string, string>();
    const idToSubsetMap = new Map<string, string[]>();
    
    function getOrCreateStateId(closure: string[]): string {
        const key = closure.join(",");
        if (!subsetToIdMap.has(key)) {
            const newId = generateId();
            subsetToIdMap.set(key, newId);
            idToSubsetMap.set(newId, closure);
        }
        return subsetToIdMap.get(key)!;
    }

    const cleanStartId = getOrCreateStateId(startClosure);
    const queue = [cleanStartId];
    const visited = new Set<string>([cleanStartId]);
    
    const finalTransitions: Transition[] = [];
    const uniqueEdgeChecker = new Set<string>();

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentSubset = idToSubsetMap.get(currentId)!;

        for (const symbol of fa.alphabet) {
            const directTargets = new Set<string>();
            for (const stateId of currentSubset) {
                const structuralEdges = fa.transitions.filter(t => t.from === stateId && t.symbol === symbol);
                for (const edge of structuralEdges) {
                    directTargets.add(edge.to);
                }
            }

            if (directTargets.size > 0) {
                const combinedClosure = new Set<string>();
                for (const target of directTargets) {
                    const closure = getLambdaClosure(fa as any, target);
                    for (const cid of closure) combinedClosure.add(cid);
                }

                const sortedClosure = Array.from(combinedClosure).sort();
                const targetStateId = getOrCreateStateId(sortedClosure);

                const edgeKey = `${currentId}->${targetStateId}|${symbol}`;
                if (!uniqueEdgeChecker.has(edgeKey)) {
                    uniqueEdgeChecker.add(edgeKey);
                    finalTransitions.push({
                        id: generateId(),
                        from: currentId,
                        to: targetStateId,
                        symbol: symbol
                    });
                }

                if (!visited.has(targetStateId)) {
                    visited.add(targetStateId);
                    queue.push(targetStateId);
                }
            }
        }
    }

    const dynamicStates: Record<string, any> = {};
    let stateIndex = 0;

    for (const [id, subset] of idToSubsetMap.entries()) {
        const isAccept = subset.some(sid => fa.acceptStates.includes(sid));
        
        dynamicStates[id] = {
            id,
            label: `q${stateIndex++}`,
            isStart: id === cleanStartId,
            accepting: isAccept,
            x: 0, 
            y: 0
        };
    }

    const finalAcceptStates = Array.from(idToSubsetMap.keys()).filter(id => {
        const subset = idToSubsetMap.get(id)!;
        return subset.some(sid => fa.acceptStates.includes(sid));
    });

    return {
        id: fa.id,
        createdAt: fa.createdAt,
        name: `${fa.name} (Clean NFA)`,
        alphabet: [...fa.alphabet],
        states: dynamicStates,
        transitions: finalTransitions,
        startStates: [cleanStartId],
        acceptStates: finalAcceptStates,
        kind: "nfa"
    };
}