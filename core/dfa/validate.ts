import { DFA, DFAEditor, Transition, StateId, ValidationResult, ValidationError } from "../../types"

export function validateDeterminism(dfa: DFA, input: string) {
    //WIP
}

export function countMatchingTransitions(dfa: DFAEditor, stateId: StateId, symbol:string): number {
    return dfa.transitions.filter(
        t => t.from === stateId && t.symbol === symbol
    ).length
}

export function validateTransitionStructure(dfa: DFAEditor, transition: Transition): boolean {
    return (transition.from in dfa.states)
        && (transition.to in dfa.states)
        && dfa.alphabet.includes(transition.symbol)
}

export function stateExists(dfa: DFAEditor, stateId: StateId): boolean {
    return (stateId in dfa.states)
}

export function validateStartState(dfa: DFAEditor): boolean {
    return (
        dfa.startState !== undefined &&
        dfa.startState in dfa.states
    )
}

export function validateDFA(dfa: DFAEditor): ValidationResult {
    const errors: ValidationError[] = []

    for (const t of dfa.transitions) {
        if (!validateTransitionStructure(dfa, t)) {
            errors.push({
                type: "INVALID_TRANSITION",
                transitionId: t.id
            })
        }
        if (countMatchingTransitions(dfa, t.from, t.symbol) !== 1) {
            errors.push({
                type: "NON_DETERMINISTIC_TRANSITION",
                stateId: t.from,
                symbol: t.symbol
            })
        }
    }

    for (const stateId of dfa.acceptStates) {
        if (!stateExists(dfa, stateId)) {
            errors.push({
                type: "MISSING_STATE",
                stateId
            })
        }
    }

    if (!validateStartState(dfa)) {
        errors.push({
            type: "INVALID_START_STATE"
        })
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

export function validateCompleteness(dfa: DFAEditor): ValidationError[] {
    const errors: ValidationError[] = []

    for (const stateId in dfa.states) {
        for (const symbol of dfa.alphabet) {
            if (countMatchingTransitions(dfa,stateId, symbol) === 0) {
                errors.push({
                    type: "MISSING_TRANSITION",
                    stateId,
                    symbol
                })
            }
        }
    }
    return errors
}