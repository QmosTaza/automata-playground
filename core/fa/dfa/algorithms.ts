import { DFA, FiniteAutomaton, State, StateId, Transition } from "../../../types"
import { createState, createTransition, getTransitionsFromState, getTargetState } from "../edit"
import { generateId } from "@/core/shared"

export function makeDFAComplete(fa: FiniteAutomaton): FiniteAutomaton {
    let sinkState: State | undefined
    const existing = new Set<string>()
    let newTransitions = [...fa.transitions]
    for (const t of fa.transitions) {
        existing.add(`${t.from}|${t.symbol}`)
    }
    for (const stateId in fa.states) {
        for (const symbol of fa.alphabet) {
            const key = `${stateId}|${symbol}`
            if (!existing.has(key)) {
                if (!sinkState) {
                    sinkState = createState(fa, 0, 0)
                }
                newTransitions.push(createTransition(stateId, sinkState.id, symbol))
            }
        }
    }
    if (!sinkState) {
        return fa
    } else {
        for (const symbol of fa.alphabet) {
            newTransitions.push(createTransition(sinkState.id, sinkState.id, symbol))
        }
    }

    return {
        ...fa,
        states: {
            ...fa.states,
            [sinkState.id]: sinkState
        },
        transitions: newTransitions
    }
}

export function minimizeDFA(fa: FiniteAutomaton): FiniteAutomaton {
    const allStateIds = Object.keys(fa.states);

    let groups: StateId[][] = [
        allStateIds.filter(id => fa.acceptStates.includes(id)),
        allStateIds.filter(id => !fa.acceptStates.includes(id))
    ].filter(g => g.length > 0);

    let stable = false

    while (!stable) {
        let newGroups: StateId[][] = [];
        let splitOccurred = false;

        for (const group of groups) {
            let subGroups = [group];

            // Try to split this group using every symbol in the alphabet
            for (const symbol of fa.alphabet) {
                let temporarySplits: StateId[][] = [];
                
                for (const sub of subGroups) {
                    const refined = refineGroup(fa, sub, groups, symbol);
                    temporarySplits.push(...refined);
                    
                    if (refined.length > 1) {
                        splitOccurred = true;
                    }
                }
                subGroups = temporarySplits;
            }
            newGroups.push(...subGroups);
        }
        
        if (!splitOccurred) {
            stable = true;
        } else {
            groups = newGroups;
        }
    }

    const newStates: Record<StateId, State> = {};
    const newAcceptStates: StateId[] = [];
    let newStartStates: StateId[] = [];

    const oldToNewIdMap: Record<StateId, StateId> = {};

    groups.forEach((group, index) => {
        const newId = generateId();
        
        const combinedLabel = group.map(id => fa.states[id].label).join("_");
        
        const avgX = group.reduce((sum, id) => sum + fa.states[id].x, 0) / group.length;
        const avgY = group.reduce((sum, id) => sum + fa.states[id].y, 0) / group.length;

        newStates[newId] = {
            id: newId,
            label: combinedLabel,
            x: avgX,
            y: avgY
        };

        group.forEach(oldId => {
            oldToNewIdMap[oldId] = newId;
        });
        if (group.some(oldId => fa.acceptStates.includes(oldId))) {
            newAcceptStates.push(newId);
        }
        if (group.some(oldId => fa.startStates.includes(oldId))) {
            newStartStates.push(newId);
        }
    });

    const newTransitions: Transition[] = [];
    const seenTransitions = new Set<string>();

    groups.forEach((group) => {
        const representativeOldId = group[0]; 
        const newFromId = oldToNewIdMap[representativeOldId];

        const oldTransitions = fa.transitions.filter(t => t.from === representativeOldId);

        for (const t of oldTransitions) {
            const newToId = oldToNewIdMap[t.to];
            const transitionKey = `${newFromId}-${t.symbol}-${newToId}`;

            if (!seenTransitions.has(transitionKey)) {
                seenTransitions.add(transitionKey);
                newTransitions.push({
                    id: generateId(),
                    from: newFromId,
                    to: newToId,
                    symbol: t.symbol
                });
            }
        }
    });

    return {
        ...fa,
        states: newStates,
        transitions: newTransitions,
        startStates: newStartStates,
        acceptStates: newAcceptStates
    };
}

function refineGroup(fa: FiniteAutomaton, currentGroup: StateId[], allGroups: StateId[][], symbol: string): StateId[][] {
    const LandauClusters: Record<number, StateId[]> = {};

    for (const stateId of currentGroup) {
        const targetStateId = getTargetState(fa, stateId, symbol);
        
        const targetGroupIdx = targetStateId ? getGroupIndex(allGroups, targetStateId) : -1;

        if (!LandauClusters[targetGroupIdx]) {
            LandauClusters[targetGroupIdx] = [];
        }
        LandauClusters[targetGroupIdx].push(stateId);
    }

   return Object.values(LandauClusters);
}

function getGroupIndex(groups: string[][], stateId: string): number {
    return groups.findIndex(group => group.includes(stateId));
}

function splitGroup(groupsList: StateId[][], targetGroupIdx: number, split1: StateId[], split2: StateId[]): StateId[][] {
    const updatedGroups = [...groupsList];
    updatedGroups.splice(targetGroupIdx, 1, split1, split2);
    return updatedGroups;
}

function retrieveGroup(groupsList: StateId[][], stateId: StateId): number {
    return groupsList.findIndex(group => group.includes(stateId));
}