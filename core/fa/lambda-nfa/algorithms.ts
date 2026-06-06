import { FiniteAutomaton, LambdaNFA, State, StateId, Transition } from "../../../types";
import { generateId } from "@/core/shared";
import { createDFAState, getTargetStatesForSubset } from "../nfa/algorithms";
import { getLambdaClosure } from "./simulate";

export function convertLambdaNFAtoDFA(fa: FiniteAutomaton): FiniteAutomaton {
    const initialStateIds = fa.startStates && fa.startStates.length > 0 ? fa.startStates : []
    const initialSet = new Set<StateId>(
        initialStateIds.flatMap(stateId => getLambdaClosure(fa as LambdaNFA, stateId))
    );
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
            const rawTargetSet = getTargetStatesForSubset(fa, currentSignature, a);

            if (rawTargetSet.size === 0) continue;

            const closureTargets = Array.from(rawTargetSet).flatMap(stateId =>
                getLambdaClosure(fa as LambdaNFA, stateId)
            );

            const targetSet = new Set<StateId>(closureTargets);
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


export function convertLambdaNFAtoNFA(fa:FiniteAutomaton): FiniteAutomaton {
    const newTransitions: Transition[] = []
    const stateIds = Object.keys(fa.states);

    for(const fromId of stateIds) {
        const initialClosure = getLambdaClosure(fa as LambdaNFA, fromId);

        for (const symbol of fa.alphabet) {
            const targetSet = new Set<StateId>();

            for(const closureId of initialClosure) {
                for(const t of fa.transitions) {
                    if (t.from === closureId && t.symbol === symbol) {
                        const destinationClosure = getLambdaClosure(fa as LambdaNFA, t.to);
                        for (const finalId of destinationClosure) {
                            targetSet.add(finalId);
                        }
                    }
                }
            }

            for (const toId of targetSet) {
                newTransitions.push({
                    id: generateId(),
                    from: fromId,
                    symbol: symbol,
                    to: toId
                });
            }
        }
    }

    const newAcceptStates = stateIds.filter(id => {
        const closure = getLambdaClosure(fa as LambdaNFA, id);
        return closure.some(closureId => fa.acceptStates.includes(closureId));
    });

    return {
        id: fa.id,
        createdAt: fa.createdAt,
        name: fa.name,
        alphabet: [...fa.alphabet],
        states: { ...fa.states },
        transitions: newTransitions, 
        startStates: [...fa.startStates],
        acceptStates: newAcceptStates,
        kind: "nfa"
    };

}