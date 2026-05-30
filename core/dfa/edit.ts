import { DFAEditor, StateId, State, TransitionId, Transition } from "./types"
import { stateExists, validateTransition } from "./validate"
import { generateId } from "../shared"

//may replace an existing state too
export function addState(dfa: DFAEditor, state: State): DFAEditor {
    return {
        ...dfa,
        states: {
            ...dfa.states,
            [state.id]: state
        },
    }
}

export function removeState(dfa: DFAEditor, stateId: StateId): DFAEditor {
    if (!stateExists(dfa, stateId)) {
        return dfa
    }
    const { [stateId]: _, ...remainingStates } = dfa.states
    const remainingTransitions = dfa.transitions.filter(
        t => t.from !== stateId && t.to !== stateId
    )
    const remainingAcceptedStates = dfa.acceptStates.filter(
        s => s !== stateId
    )
    const newStartState = (dfa.startState === stateId) ? selectRandomState(dfa, [stateId]) : dfa.startState
    return {
        ...dfa,
        transitions: remainingTransitions,
        states: remainingStates,
        acceptStates: remainingAcceptedStates,
        startState: newStartState
    }
}

export function selectRandomState(dfa: DFAEditor, rejectStates: StateId[]): StateId | undefined {
    const validStates = Object.keys(dfa.states).filter(
        stateId => !rejectStates.includes(stateId)
    )

    if (validStates.length === 0) {
        return undefined
    }

    const index = Math.floor(Math.random() * validStates.length)

    return validStates[index]
}

//checks that it follows DFA rules
export function addTransition(dfa: DFAEditor, transition: Transition): DFAEditor {
    if (!validateTransition(dfa, transition)) {
        return dfa
    }
    return {
        ...dfa,
        transitions: [
            ...dfa.transitions,
            transition,
        ]
    }
}

//if the transition doesnt exist it stays the same
export function removeTransition(dfa: DFAEditor, transitionId: TransitionId): DFAEditor {
    const newTransitions = dfa.transitions.filter(
        t => t.id !== transitionId
    )
    return {
        ...dfa,
        transitions: newTransitions
    }
}


export function setStartState(dfa: DFAEditor, stateId: StateId): DFAEditor {
    if (!stateExists(dfa, stateId)) {
        return dfa
    }
    return {
        ...dfa,
        startState: stateId
    }
}

export function createState(dfa: DFAEditor): State {
    return {
        id: generateId(),
        label: generateStateLabel(dfa)
    }
}

export function createTransition(from: StateId, to: StateId, symbol: string): Transition {
    return {
        id: generateId(),
        from,
        to,
        symbol
    }
}

function generateStateLabel(dfa: DFAEditor): string {
    let i = 0
    while (true) {
        const label = `q${i}`
        const exists = Object.values(dfa.states).some(
            state => state.label === label
        )
        if (!exists) {
            return label
        }
        i++
    }
}

export function isStateAccepting(dfa: DFAEditor, stateId: StateId): boolean {
    return dfa.acceptStates.includes(stateId)
}

export function addAcceptState(dfa: DFAEditor, stateId: StateId): DFAEditor {
    if (!stateExists(dfa, stateId) || isStateAccepting(dfa, stateId)) {
        return dfa
    }
    return {
        ...dfa,
        acceptStates: [
            ...dfa.acceptStates,
            stateId
        ]
    }
}

export function removeAcceptState(dfa: DFAEditor, stateId: StateId): DFAEditor {
    const remainingAcceptStates = dfa.acceptStates.filter(
        s => s !== stateId
    )
    return {
        ...dfa,
        acceptStates: remainingAcceptStates
    }
}

export function updateState(dfa: DFAEditor,state: State): DFAEditor {
    if (!stateExists(dfa, state.id)) {
        return dfa
    }
    return {
        ...dfa,
        states: {
            ...dfa.states,
            [state.id]: state
        }
    }
}

export function renameState( dfa: DFAEditor, stateId: StateId, newLabel: string): DFAEditor {
    const state = dfa.states[stateId]

    if (!state) {
        return dfa
    }

    return {
        ...dfa,
        states: {
            ...dfa.states,
            [stateId]: {
                ...state,
                label: newLabel
            }
        }
    }
}

export function updateTransition(dfa: DFAEditor, transition: Transition): DFAEditor {
    if (!validateTransition(dfa, transition)) {
        return dfa
    }

    return {
        ...dfa,
        transitions: dfa.transitions.map(
            t => t.id === transition.id
                ? transition
                : t
        )
    }
}

export function toggleAcceptState( dfa: DFAEditor, stateId: StateId): DFAEditor {

    if (!stateExists(dfa, stateId)) {
        return dfa
    }

    return isStateAccepting(dfa, stateId)
        ? removeAcceptState(dfa, stateId)
        : addAcceptState(dfa, stateId)
}

export function addSymbolToAlphabet(dfa: DFAEditor, symbol: string): DFAEditor {
    if (dfa.alphabet.includes(symbol)) {
        return dfa
    }
    return {
        ...dfa,
        alphabet: [
            ...dfa.alphabet,
            symbol
        ]
    }
}

export function removeSymbolFromAlphabet(dfa: DFAEditor, symbol: string): DFAEditor {
    const alphabet = dfa.alphabet.filter(
        s => s !== symbol
    )

    const transitions = dfa.transitions.filter(
        t => t.symbol !== symbol
    )

    return {
        ...dfa,
        alphabet,
        transitions
    }
}

export function toggleSymbol(dfa: DFAEditor,symbol: string): DFAEditor {

    return dfa.alphabet.includes(symbol)
        ? removeSymbolFromAlphabet(dfa, symbol)
        : addSymbolToAlphabet(dfa, symbol)
}

//missing renameState, addSymbolToAlphabet, remove, maybe updaters in general??, toggleAcceptState which could replade add and remove honestly
