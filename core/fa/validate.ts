import { DFA, FiniteAutomaton, Automaton, Transition, StateId, ValidationResult, ValidationError } from "../../types"

export function countMatchingTransitions(fa: FiniteAutomaton, stateId: StateId, symbol: string | null): number {
    return fa.transitions.filter(
        t => t.from === stateId && t.symbol === symbol
    ).length
}

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
        t => t.from === transition.from && t.symbol === transition.symbol && t.to === transition.to
    ).length > 0) {
        return false
    }
    return fa.alphabet.includes(transition.symbol)
}

export function validateTransitionStructure(fa: FiniteAutomaton, transition: Transition): boolean {
    const validStates =
        transition.from in fa.states &&
        transition.to in fa.states
    if (!validStates) {
        return false
    }
    if (fa.transitions.filter(
        t => t.from === transition.from && t.symbol === transition.symbol && t.to === transition.to
    ).length > 0) {
        return false
    }
    return true
}

export function stateExists(fa: FiniteAutomaton, stateId: StateId): boolean {
    return (stateId in fa.states)
}

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
