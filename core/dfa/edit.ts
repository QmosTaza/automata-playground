import { DFA, StateId, State, TransitionId, Transition } from "./types"

//may replace an existing state too
export function addState(dfa: DFA, state: State): DFA {
    return {
        ...dfa,
        states: {
            ...dfa.states,
            [state.id]: state
        }
    }
}

export function removeState(dfa: DFA, stateId: StateId): DFA {
    const { [stateId]: _, ...remainingStates } = dfa.states
    const remainingTransitions = dfa.transitions.filter(
        t => t.from !== stateId && t.to !== stateId
    )
    return {
        ...dfa,
        transitions: remainingTransitions,
        states: remainingStates
    }
}

//checks that it follows AFD rules
export function addTransition(dfa: DFA, transition: Transition): DFA {
    //might wanna add this into validate.ts
    const invalid = 
        dfa.transitions.some(
            t => t.from === transition.from && t.symbol === transition.symbol
        ) 
        || !(transition.from in dfa.states) 
        || !(transition.to in dfa.states) 
        || !dfa.alphabet.includes(transition.symbol)

    if (invalid) {
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

export function removeTransition(dfa: DFA, transitionId: TransitionId): DFA {
    const newTransitions = dfa.transitions.filter(
        t => t.id !== transitionId
    )
    return {
        ...dfa,
        transitions: newTransitions
    }
}



