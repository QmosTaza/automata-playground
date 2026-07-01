import { DFA, FiniteAutomaton, State, StateId, Transition } from "../../../types"
import { createState, createTransition, getTransitionsFromState, getTargetStateDFA, stateIsUnreachable, stateIsSink } from "../edit"
import { generateId } from "@/core/shared"

//function that completes any DFA
export function makeDFAComplete(fa: FiniteAutomaton): FiniteAutomaton {
    let sinkStateId: StateId | undefined = Object.keys(fa.states).find(id =>
        stateIsSink(fa, id)
    ); //find pre-existing sinks (that arent accepting obviously)

    //otherwise create one
    let createdNewSink = false;
    let sinkStateObj: State | undefined = sinkStateId ? fa.states[sinkStateId] : undefined;

    //which transitions exist already?
    const existing = new Set<string>()
    let newTransitions = [...fa.transitions]
    for (const t of fa.transitions) {
        existing.add(`${t.from}|${t.symbol}`)
    }
    //create every missing transition to sink 
    for (const stateId in fa.states) {
        for (const symbol of fa.alphabet) {
            const key = `${stateId}|${symbol}`
            if (!existing.has(key)) {
                if (!sinkStateId) { //create sink if none exists
                    sinkStateObj = createState(fa, 0, 0);
                    sinkStateId = sinkStateObj.id;
                    createdNewSink = true;
                }
                newTransitions.push(createTransition(stateId, sinkStateId, symbol))
            }
        }
    }
    // if no changes, return og (maybe this should happen earlier?)
    if (!sinkStateId || (!createdNewSink && newTransitions.length === fa.transitions.length)) {
        return fa;
    }

    //ensure sink returns transition to itself for each symbol
    if (createdNewSink && sinkStateObj) {
        for (const symbol of fa.alphabet) {
            newTransitions.push(createTransition(sinkStateId, sinkStateId, symbol));
        }
    }

    return {
        ...fa,
        states: createdNewSink && sinkStateObj ? {
            ...fa.states,
            [sinkStateId]: sinkStateObj
        } : fa.states,
        transitions: newTransitions
    };
}

//function that minimizes any DFA
export function minimizeDFA(fa: FiniteAutomaton): FiniteAutomaton {
    
    //initially, group states based on whether they are accepting or not
    const allStateIds = Object.keys(fa.states);

    let groups: StateId[][] = [
        allStateIds.filter(id => fa.acceptStates.includes(id) && !stateIsUnreachable(fa, id)),
        allStateIds.filter(id => !fa.acceptStates.includes(id) && !stateIsUnreachable(fa, id))
    ].filter(g => g.length > 0);

    //as long as different group members have transitions on the same symbol 
    // but to different groups from one another (can be split into subgroups), it is not stable
    let stable = false

    while (!stable) {
        let newGroups: StateId[][] = [];
        let splitOccurred = false;

        for (const group of groups) { //per group
            let subGroups = [group];

            for (const symbol of fa.alphabet) { //per available symbol
                let temporarySplits: StateId[][] = [];

                for (const sub of subGroups) { //per subgroup
                    const refined = refineGroup(fa, sub, groups, symbol);
                    temporarySplits.push(...refined);

                    if (refined.length > 1) { //if subgroup = group
                        splitOccurred = true;
                    }
                }
                subGroups = temporarySplits;
            }
            newGroups.push(...subGroups);
        }

        //no more splits = finally stable
        if (!splitOccurred) {
            stable = true;
        } else {
            groups = newGroups;
        }
    }

    //create new minimized automaton (might be worth creating a isMinimized function for performance?)
    const newStates: Record<StateId, State> = {};
    const newAcceptStates: StateId[] = [];
    let newStartStates: StateId[] = [];

    const oldToNewIdMap: Record<StateId, StateId> = {};

    //for each group, create automaton
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

    //for each group, create transitions
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

//Function to convert current DFA to its complement. This is done by swapping the accepting and non-accepting states over a COMPLETE DFA.
export function complementDFA(fa: FiniteAutomaton): FiniteAutomaton {
    const completeDFA = makeDFAComplete(fa);

    const newAcceptStates = Object.keys(completeDFA.states).filter(id => !completeDFA.acceptStates.includes(id));

    return {
        ...completeDFA,
        acceptStates: newAcceptStates
    };
}

//AUX FUNCTION that splits a single group into smaller subgroups based on a specific alphabet symbol.
// States end up in the same subgroup if their transitions on this symbol land in the exact same target group.
function refineGroup(fa: FiniteAutomaton, currentGroup: StateId[], allGroups: StateId[][], symbol: string): StateId[][] {
    const LandauClusters: Record<number, StateId[]> = {};

    for (const stateId of currentGroup) {
        const targetStateId = getTargetStateDFA(fa, stateId, symbol);

        const targetGroupIdx = targetStateId ? getGroupIndex(allGroups, targetStateId) : -1;

        if (!LandauClusters[targetGroupIdx]) {
            LandauClusters[targetGroupIdx] = [];
        }
        LandauClusters[targetGroupIdx].push(stateId);
    }

    return Object.values(LandauClusters);
}

//AUX FUNCTION finds the index of the group block that contains the given stateId.
function getGroupIndex(groups: string[][], stateId: string): number {
    return groups.findIndex(group => group.includes(stateId));
}

//UNUSED AUX FUNCTIONS
function splitGroup(groupsList: StateId[][], targetGroupIdx: number, split1: StateId[], split2: StateId[]): StateId[][] {
    const updatedGroups = [...groupsList];
    updatedGroups.splice(targetGroupIdx, 1, split1, split2);
    return updatedGroups;
}

function retrieveGroup(groupsList: StateId[][], stateId: StateId): number {
    return groupsList.findIndex(group => group.includes(stateId));
}