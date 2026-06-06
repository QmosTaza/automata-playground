import { FiniteAutomaton, State, StateId, Transition } from "../../../types";
import { generateId } from "@/core/shared";

export function convertNFAtoDFA(fa: FiniteAutomaton): FiniteAutomaton {
    const initialStateIds = fa.startStates && fa.startStates.length > 0 ? fa.startStates : []
    const initialSet = new Set<StateId>(initialStateIds);
    const initialSignature = Array.from(initialSet).sort().join("_");

    const newStates: Record<StateId, State> = {};
    const newTransitions: Transition[] = [];

    const signatureToDfaIdMap: Record<string, StateId> = {};
    const dfaIdToSignatureMap: Record<StateId, string> = {};
    
    let initialDfaId: StateId;
    if (initialSet.size === 1) {
        initialDfaId = Array.from(initialSet)[0];
    } else {
        initialDfaId = generateId();
    }
    
    signatureToDfaIdMap[initialSignature] = initialDfaId;
    dfaIdToSignatureMap[initialDfaId] = initialSignature;
    
    const queue: StateId[] = [initialDfaId];
    
    const firstState = createDFAState(fa, initialDfaId, initialSet);
    newStates[firstState.id] = firstState;

    while (queue.length > 0) {
        const currentDfaId = queue.shift()!;
        const currentSignature = dfaIdToSignatureMap[currentDfaId];
        
        for (const a of fa.alphabet) {
            const targetSet = getTargetStatesForSubset(fa, currentSignature, a);

            if (targetSet.size === 0) continue;

            const targetSignature = Array.from(targetSet).sort().join("_");
            let targetDfaId = signatureToDfaIdMap[targetSignature];

            if (!targetDfaId) {
                if (targetSet.size === 1) {
                    targetDfaId = Array.from(targetSet)[0];
                } else {
                    targetDfaId = generateId(); 
                }

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

    const finalStartId = initialSet.size === 1 && fa.startStates[0] ? fa.startStates[0] : initialDfaId;

    return {
        id: fa.id,
        createdAt: fa.createdAt,
        name: fa.name,
        alphabet: [...fa.alphabet],
        states: newStates,
        transitions: newTransitions,
        startStates: [finalStartId], 
        acceptStates: newAcceptStates,
        kind: "dfa"
    };
}

export function getTargetStatesForSubset(fa: FiniteAutomaton, compoundId: StateId, symbol: string): Set<StateId> {
    const targetSet = new Set<StateId>();
    const componentIds = compoundId.split("_");

    for (const id of componentIds) {
        for (const t of fa.transitions) {
            if (t.from === id && t.symbol === symbol) {
                targetSet.add(t.to);
            }
        }
    }
    return targetSet;
}

export function createDFAState(fa: FiniteAutomaton, properId: StateId, set: Set<StateId>): State {
    const stateIdArray = Array.from(set).sort();
    
    if (set.size === 1) {
        const originalId = stateIdArray[0];
        const originalState = fa.states[originalId];
        return {
            id: properId,
            label: originalState?.label ?? originalId,
            x: originalState?.x ?? 100,
            y: originalState?.y ?? 100
        };
    }

    const labelsGrouped = stateIdArray
        .map(id => fa.states[id]?.label ?? "??")
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    
    const finalLabel = labelsGrouped.join("-");

    const sumX = stateIdArray.reduce((sum, id) => sum + (fa.states[id]?.x ?? 0), 0);
    const sumY = stateIdArray.reduce((sum, id) => sum + (fa.states[id]?.y ?? 0), 0);
    
    const avgX = sumX / set.size;
    const avgY = sumY / set.size;

    return {
        id: properId,
        label: finalLabel,
        x: avgX,
        y: avgY
    };
}