import { FiniteAutomaton, DFA, NFA, LambdaNFA, StateId, State, TransitionId, Transition } from "../../types"
import { stateExists, validateTransitionStructure } from "./validate"
import { generateId } from "../shared"


//STATE EDITING

export function createState(fa: FiniteAutomaton, x:number, y:number): State {
    return {
        id: generateId(),
        label: generateStateLabel(fa),
        //TEMPORARILY
        x: x,
        y: y
    }
}

//may replace an existing state too
export function addState(fa: FiniteAutomaton, state: State): FiniteAutomaton {
    return {
        ...fa,
        states: {
            ...fa.states,
            [state.id]: state
        },
    }
}

export function removeState(fa: FiniteAutomaton, stateId: StateId): FiniteAutomaton {
    if (!stateExists(fa, stateId)) {
        return fa
    }
    const { [stateId]: _, ...remainingStates } = fa.states
    const remainingTransitions = fa.transitions.filter(
        t => t.from !== stateId && t.to !== stateId
    )
    const remainingAcceptedStates = fa.acceptStates.filter(
        s => s !== stateId
    )
    const remainingStartStates = fa.startStates.filter(
        s => s !== stateId
    )
    return {
        ...fa,
        transitions: remainingTransitions,
        states: remainingStates,
        acceptStates: remainingAcceptedStates,
        startStates: remainingStartStates
    }
}

export function updateState(fa: FiniteAutomaton,state: State): FiniteAutomaton {
    if (!stateExists(fa, state.id)) {
        return fa
    }
    return {
        ...fa,
        states: {
            ...fa.states,
            [state.id]: state
        }
    }
}

export function renameState( fa: FiniteAutomaton, stateId: StateId, newLabel: string): FiniteAutomaton {
    const state = fa.states[stateId]
    if (!state || labelExists(fa, newLabel)) {
        return fa
    }

    return {
        ...fa,
        states: {
            ...fa.states,
            [stateId]: {
                ...state,
                label: newLabel
            }
        }
    }
}

export function labelExists(fa: FiniteAutomaton, label: string): boolean {
    return Object.values(fa.states).some(
        s => s.label === label
    )
}

function selectRandomState(fa: FiniteAutomaton, rejectStates: StateId[]): StateId | undefined {
    const validStates = Object.keys(fa.states).filter(
        stateId => !rejectStates.includes(stateId)
    )

    if (validStates.length === 0) {
        return undefined
    }

    const index = Math.floor(Math.random() * validStates.length)

    return validStates[index]
}

function generateStateLabel(fa: FiniteAutomaton): string {
    let i: number = 0
    while (true) {
        const label = `q${i}`
        const exists = Object.values(fa.states).some(
            state => state.label === label
        )
        if (!exists) {
            return label
        }
        i++
    }
}


//TRANSITION EDITING

export function createTransition(from: StateId, to: StateId, symbol: string | null | undefined): Transition {
    return {
        id: generateId(),
        from,
        to,
        symbol
    }
}

//checks that states and symbol exist in fa
export function addTransition(fa: FiniteAutomaton, transition: Transition): FiniteAutomaton {
    if (!validateTransitionStructure(fa, transition)) {
        return fa
    }
    return {
        ...fa,
        transitions: [
            ...fa.transitions,
            transition,
        ]
    }
}

//if the transition doesnt exist it stays the same
export function removeTransition(fa: FiniteAutomaton, transitionId: TransitionId): FiniteAutomaton {
    const newTransitions = fa.transitions.filter(
        t => t.id !== transitionId
    )
    return {
        ...fa,
        transitions: newTransitions
    }
}


export function updateTransition(fa: FiniteAutomaton, transition: Transition): FiniteAutomaton {
    if (!validateTransitionStructure(fa, transition)) {
        return fa
    }
    return {
        ...fa,
        transitions: fa.transitions.map(
            t => t.id === transition.id ? transition : t
        )
    }
}


//START STATE EDITING

export function toggleStartState(fa: FiniteAutomaton, stateId: StateId): FiniteAutomaton {
    if (!(stateId in fa.states)) {
        return fa
    }

    const exists = fa.startStates.includes(stateId)

    return {
        ...fa,
        startStates: exists
            ? fa.startStates.filter(s => s !== stateId)
            : [...fa.startStates, stateId]
    }
}

// ACCEPT STATES EDITING
export function isStateAccepting(fa: FiniteAutomaton, stateId: StateId): boolean {
    return fa.acceptStates.includes(stateId)
}

export function addAcceptState(fa: FiniteAutomaton, stateId: StateId): FiniteAutomaton {
    if (!stateExists(fa, stateId) || isStateAccepting(fa, stateId)) {
        return fa
    }
    return {
        ...fa,
        acceptStates: [
            ...fa.acceptStates,
            stateId
        ]
    }
}

export function removeAcceptState(fa: FiniteAutomaton, stateId: StateId): FiniteAutomaton {
    const remainingAcceptStates = fa.acceptStates.filter(
        s => s !== stateId
    )
    return {
        ...fa,
        acceptStates: remainingAcceptStates
    }
}

export function toggleAcceptState( fa: FiniteAutomaton, stateId: StateId): FiniteAutomaton {
    if (!stateExists(fa, stateId)) {
        return fa
    }

    return isStateAccepting(fa, stateId)
        ? removeAcceptState(fa, stateId)
        : addAcceptState(fa, stateId)
}


// ALPHABET EDITING 

export function addSymbolToAlphabet(fa: FiniteAutomaton, symbol: string): FiniteAutomaton {
    if (fa.alphabet.includes(symbol)) {
        return fa
    }
    return {
        ...fa,
        alphabet: [
            ...fa.alphabet,
            symbol
        ]
    }
}

export function removeSymbolFromAlphabet(fa: FiniteAutomaton, symbol: string): FiniteAutomaton {
    const alphabet = fa.alphabet.filter(
        s => s !== symbol
    )
    return {
        ...fa,
        alphabet
    }
}

export function toggleSymbol(fa: FiniteAutomaton,symbol: string): FiniteAutomaton {

    return fa.alphabet.includes(symbol)
        ? removeSymbolFromAlphabet(fa, symbol)
        : addSymbolToAlphabet(fa, symbol)
}


// SYMBOL EDITING
export function cleanSymbol (input: string) : string | null{
    const trimmed = input.trim();
    return trimmed === "" ? null : trimmed; // space = λ
};

//OTHERS
export function getStateFromId (fa: FiniteAutomaton, id: StateId | undefined) : State | undefined{
    if (!id) return undefined
    return fa.states[id]
}

export function getStateLabelFromId(fa: FiniteAutomaton, id: string | undefined): string {
    if (!id) return "—";
    return fa.states[id]?.label ?? id;
}

export function getTransitionFromId (fa: FiniteAutomaton, id: TransitionId | undefined) : Transition | undefined{
    return fa.transitions.find(
        transition => transition.id === id
    )
}

export function renameAutomaton<T extends FiniteAutomaton>(fa: T, newName: string): T {
    return {
        ...fa,
        name: newName
    }
}

// CONNECTION RELATED FUNCTIONS

export function getTransitionsFromState(fa: DFA | NFA | LambdaNFA, currentState: StateId): Transition[] {
    return fa.transitions.filter(
        t => t.from === currentState
    )
}

export function getTransitionsToState(fa: DFA | NFA | LambdaNFA, currentState: StateId): Transition[] {
    return fa.transitions.filter(
        t => t.to === currentState
    )
}

export function getTargetStateDFA(fa: FiniteAutomaton, fromId: StateId, symbol: string): StateId | null {
    const transition = fa.transitions.find(t => t.from === fromId && t.symbol === symbol);
    return transition ? transition.to : null;
}

export function getTargetStatesNFA(fa: FiniteAutomaton, fromId: StateId, symbol: string): Set<StateId> {
    const targetStates = new Set<StateId>();
    for (const t of fa.transitions) {
        if (t.from === fromId && t.symbol === symbol) {
            targetStates.add(t.to);
        }
    }
    return targetStates
}

export function getTargetStatesNFALabels(fa: FiniteAutomaton, fromId: StateId, symbol: string): Set<string> {
    const targetStates = new Set<StateId>();
    for (const t of fa.transitions) {
        if (t.from === fromId && t.symbol === symbol) {
            targetStates.add(getStateLabelFromId(fa,t.to));
        }
    }
    return targetStates
}


export function getDirectlyConnectedStates(fa: FiniteAutomaton, originId: StateId): Set<StateId> {
    const transitions = getTransitionsFromState(fa, originId)
    const directlyConnectedStates: Set<StateId> = new Set

    for (const t of transitions){
        directlyConnectedStates.add(t.to)
    }

    return directlyConnectedStates
}

//directed connection
export function statesAreConnected (fa:FiniteAutomaton, originId:StateId, destinationId: StateId) : boolean {
    const transition = fa.transitions.find(t => t.from === originId && t.to === destinationId)
    return transition? true : false
}

//directed accessibility
export function stateIsAccessible(fa:FiniteAutomaton, originId: StateId, destinationId: StateId, visited: Set<StateId> = new Set()) : boolean{
    if (originId === destinationId) return true
    if (statesAreConnected(fa, originId, destinationId)) return true

    if (visited.has(originId)) return false
    visited.add(originId)

    for (const nextState of getDirectlyConnectedStates(fa, originId)) {
        if (stateIsAccessible(fa, nextState, destinationId, visited)) {
            return true
        }
    }

    return false;
}

export function stateIsUnreachable(fa:FiniteAutomaton, stateId: StateId) : boolean {
    for (const startState of fa.startStates) {
        if (stateIsAccessible(fa,startState,stateId)) {return false}
    }
    return true
}


export function stateIsSink(fa:FiniteAutomaton, stateId:StateId) : boolean {
    if (isStateAccepting(fa, stateId) || stateIsUnreachable(fa, stateId)) { return false }
    for (const acceptedState of fa.acceptStates) {
        if (stateIsAccessible(fa,stateId,acceptedState)) {return false}
    }
    return true
}


// LAYOUT - RENAMING FUNCTION

export function applyNaiveLayout(automaton: FiniteAutomaton): FiniteAutomaton {
    const states = { ...automaton.states };
    const stateIds = Object.keys(states);
    
    const stateLayers = new Map<string, number>();
    const visited = new Set<string>();

    if (automaton.startStates.length > 0) {
        const queue: { id: string; layer: number }[] = [];
        
        for (const startId of automaton.startStates) {
            queue.push({ id: startId, layer: 0 });
            visited.add(startId);
            stateLayers.set(startId, 0);
        }

        while (queue.length > 0) {
            const { id, layer } = queue.shift()!;

            const outgoing = automaton.transitions.filter(t => t.from === id);
            for (const edge of outgoing) {
                if (!visited.has(edge.to)) {
                    visited.add(edge.to);
                    stateLayers.set(edge.to, layer + 1);
                    queue.push({ id: edge.to, layer: layer + 1 });
                }
            }
        }
    }

    let maxLayer = Array.from(stateLayers.values()).reduce((max, l) => Math.max(max, l), 0);
    for (const id of stateIds) {
        if (!stateLayers.has(id)) {
            stateLayers.set(id, maxLayer + 1);
        }
    }

    const layerGroups = new Map<number, string[]>();
    for (const id of stateIds) {
        const layer = stateLayers.get(id)!;
        if (!layerGroups.has(layer)) layerGroups.set(layer, []);
        layerGroups.get(layer)!.push(id);
    }

    const X_GAP = 200; 
    const Y_GAP = 140; 
    const CANVAS_Y_CENTER = 300; 
    const statePositions = new Map<string, { x: number; y: number }>();
    
    for (const [layer, idsInLayer] of layerGroups.entries()) {
        const totalNodesInLayer = idsInLayer.length;
        const xPos = 100 + layer * X_GAP;

        idsInLayer.forEach((id, index) => {
            const centerOffset = (index - (totalNodesInLayer - 1) / 2) * Y_GAP;
            const yPos = CANVAS_Y_CENTER + centerOffset;

            statePositions.set(id, { x: xPos, y: yPos });
        });
    }

    const sortedStateIdsForLabeling = [...stateIds].sort((a, b) => {
        const layerA = stateLayers.get(a)!;
        const layerB = stateLayers.get(b)!;
        if (layerA !== layerB) return layerA - layerB;
        return (statePositions.get(a)?.y || 0) - (statePositions.get(b)?.y || 0);
    });

    const labelMapping = new Map<string, string>();
    sortedStateIdsForLabeling.forEach((id, index) => {
        labelMapping.set(id, `q${index}`);
    });

    for (const id in states) {
        const coords = statePositions.get(id) || { x: 100, y: 300 };
        states[id] = {
            ...states[id],
            label: labelMapping.get(id) || states[id].label,
            x: coords.x,
            y: coords.y
        };
    }

    return {
        ...automaton,
        states
    };
}
