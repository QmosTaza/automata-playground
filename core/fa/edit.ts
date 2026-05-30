import { FiniteAutomaton, DFA, NFA, LambdaNFA, StateId, State, TransitionId, Transition } from "../../types"
import { stateExists, validateTransitionStructure } from "./validate"
import { generateId } from "../shared"


//STATE EDITING

export function createState(fa: FiniteAutomaton): State {
    return {
        id: generateId(),
        label: generateStateLabel(fa)
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

function labelExists(fa: FiniteAutomaton, label: string): boolean {
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
    let i = 0
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

export function createTransition(from: StateId, to: StateId, symbol: string): Transition {
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
/* 
    const transitions = fa.transitions.filter(
        t => t.symbol !== symbol
    )
 */
    return {
        ...fa,
        alphabet,
        //transitions
    }
}

export function toggleSymbol(fa: FiniteAutomaton,symbol: string): FiniteAutomaton {

    return fa.alphabet.includes(symbol)
        ? removeSymbolFromAlphabet(fa, symbol)
        : addSymbolToAlphabet(fa, symbol)
}
