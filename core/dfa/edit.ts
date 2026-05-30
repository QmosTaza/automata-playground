import { DFAEditor, StateId, State, TransitionId, Transition } from "./types"
import { validateTransition } from "./validate"

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
    const { [stateId]: _, ...remainingStates } = dfa.states
    const remainingTransitions = dfa.transitions.filter(
        t => t.from !== stateId && t.to !== stateId
    )
    const remainingAcceptedStates = dfa.acceptStates.filter(
        s => s !== stateId
    )
    const newStartState = (dfa.startState === stateId) ? selectRandomState(dfa, [stateId]): dfa.startState
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

export function removeTransition(dfa: DFAEditor, transitionId: TransitionId): DFAEditor {
    const newTransitions = dfa.transitions.filter(
        t => t.id !== transitionId
    )
    return {
        ...dfa,
        transitions: newTransitions
    }
}



