import { DFA, FiniteAutomaton, Automaton, Transition, StateId, ValidationResult, ValidationError } from "../../../types"
import { validateTransition, countMatchingTransitions, validateStartState, stateExists } from "../validate"

export function validateDFA(fa: DFA): ValidationResult {
    const errors: ValidationError[] = []

    for (const t of fa.transitions) {
        if ( !validateTransition(fa, t)) {
            errors.push({
                type: "INVALID_TRANSITION",
                transitionId: t.id
            })
        }
        if (t.symbol !== null && t.symbol !== undefined && 
            countMatchingTransitions(fa, t.from, t.symbol) !== 1) {
            errors.push({
                type: "NON_DETERMINISTIC_TRANSITION",
                stateId: t.from,
                symbol: t.symbol
            })
        }
    }

    for (const stateId of fa.acceptStates) {
        if (!stateExists(fa, stateId)) {
            errors.push({
                type: "MISSING_STATE",
                stateId
            })
        }
    }

    if (!validateStartState(fa)) {
        errors.push({
            type: "INVALID_START_STATE"
        })
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

export function validateCompleteness(fa: DFA): ValidationError[] {
    const errors: ValidationError[] = []

    for (const stateId in fa.states) {
        for (const symbol of fa.alphabet) {
            if (countMatchingTransitions(fa,stateId, symbol) === 0) {
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