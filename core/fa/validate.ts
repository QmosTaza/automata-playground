import { DFA, FiniteAutomaton, AutomatonBase, Transition, StateId, ValidationResult, ValidationError } from "../../types"

//counts how many transitions exist that come from the same state 
//with the same symbol, especially useful for DFA
export function countMatchingTransitions(fa: FiniteAutomaton, stateId: StateId, symbol: string | null | undefined): number {
    return fa.transitions.filter(
        t => t.from === stateId && t.symbol === symbol
    ).length
}

    // ensures that every transition:
    //  involves states that exist in the DFA
    //  involves symbols that belong to the DFA's alphabet (incl lambda for DFA and regular NFA)
    //  no other transitions exist involving those states and symbol
export function validateTransition(fa: FiniteAutomaton, transition: Transition): boolean {
    const validStates =
        transition.from in fa.states &&
        transition.to in fa.states
    if (!validStates) {
        return false
    }
    if (transition.symbol === null) {
        return fa.kind === "lambda-nfa"
    }
    if (fa.transitions.filter(
        t => t.id !== transition.id && t.from === transition.from && t.symbol === transition.symbol && t.to === transition.to
    ).length > 0) {
        return false
    }
    return transition.symbol !== undefined && fa.alphabet.includes(transition.symbol)
}

    //same as before, except it does NOT ensure that the symbol belongs to the alphabet
    //used while editing, not for validations
export function validateTransitionStructure(fa: FiniteAutomaton, transition: Transition): boolean {
    const validStates =
        transition.from in fa.states &&
        transition.to in fa.states
    if (!validStates) {
        return false
    }
    if (fa.transitions.filter(
        t => t.id !== transition.id && t.from === transition.from && t.symbol === transition.symbol && t.to === transition.to
    ).length > 0) {
        return false
    }
    return true
}

export function stateExists(fa: FiniteAutomaton, stateId: StateId): boolean {
    return (stateId in fa.states)
}

// ensures that all start states exist and that in DFA there is only one
export function validateStartState(fa: FiniteAutomaton): boolean {
    if (fa.startStates.length < 1) {
        return false
    }
    if (fa.kind === "dfa" && fa.startStates.length > 1) {
        return false
    }
    for (const s of fa.startStates) {
        if (!stateExists(fa, s)) { return false }
    }
    return true
}
