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
    const newTransitions: Transition[] = [];
    const stateIds = Object.keys(fa.states);
    
    const transitionMap = new Map<string, string[]>();
    for (const t of fa.transitions) {
        if (t.symbol !== null && t.symbol !== "" && t.symbol !== "λ" && t.symbol !== "ε") {
            const key = `${t.from}|${t.symbol}`;
            if (!transitionMap.has(key)) transitionMap.set(key, []);
            transitionMap.get(key)!.push(t.to);
        }
    }

    const closureCache = new Map<string, string[]>();
    
    for (let i = 0; i < stateIds.length; i++) {
        const id = stateIds[i];
        const closureSet = getLambdaClosure(fa as any, id);
        closureCache.set(id, Array.from(closureSet));
    }
    
    for (const fromId of stateIds) {
        const initialClosure = closureCache.get(fromId) || [];

        for (const symbol of fa.alphabet) {
            const targetSet = new Set<string>();

            for (const closureId of initialClosure) {
                const mapKey = `${closureId}|${symbol}`;
                const directlyReachable = transitionMap.get(mapKey);

                if (directlyReachable) {
                    for (const targetId of directlyReachable) {
                        const destinationClosure = closureCache.get(targetId) || [];
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
        const closure = closureCache.get(id) || [];
        return closure.some(closureId => fa.acceptStates.includes(closureId));
    });

    const accessibleStates = new Set<string>([...fa.startStates]);
    const queue = [...fa.startStates];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const outgoing = newTransitions.filter(t => t.from === current);
        for (const edge of outgoing) {
            if (!accessibleStates.has(edge.to)) {
                accessibleStates.add(edge.to);
                queue.push(edge.to);
            }
        }
    }

    const dynamicStates: Record<string, any> = {};
    for (const id of stateIds) {
        if (accessibleStates.has(id)) {
            dynamicStates[id] = { ...fa.states[id] };
        }
    }

    return {
        id: fa.id,
        createdAt: fa.createdAt,
        name: `${fa.name} (NFA)`,
        alphabet: [...fa.alphabet],
        states: dynamicStates,
        transitions: newTransitions.filter(t => accessibleStates.has(t.from) && accessibleStates.has(t.to)), 
        startStates: [...fa.startStates],
        acceptStates: newAcceptStates.filter(id => accessibleStates.has(id)),
        kind: "nfa"
    };
}
