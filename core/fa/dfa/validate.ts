import { DFA, FiniteAutomaton, Automaton, AutomatonBase, Transition, StateId, ValidationResult, ValidationError } from "../../../types"
import { validateTransition, countMatchingTransitions, validateStartState, stateExists } from "../validate"
import { getStateFromId } from "../edit"

export function validateDFA(fa: DFA & AutomatonBase): ValidationResult {
    const errors: ValidationError[] = []
    const automataId = fa.id

    for (const t of fa.transitions) {
        if (!validateTransition(fa, t)) {
            errors.push({
                automataId,
                type: "INVALID_TRANSITION",
                transitionId: t.id
            })
        }
    }
    
    for (const stateId in fa.states) {
        for (const symbol of fa.alphabet) {
            if (countMatchingTransitions(fa, stateId, symbol) > 1) {
                errors.push({
                    automataId,
                    type: "NON_DETERMINISTIC_TRANSITION",
                    stateId,
                    symbol
                });
            }
        }
    }
    
    for (const stateId of fa.acceptStates) {
        if (!stateExists(fa, stateId)) {
            errors.push({
                automataId,
                type: "MISSING_STATE",
                stateId
            })
        }
    }
    
    if (!validateStartState(fa)) {
        errors.push({
            automataId,
            type: "INVALID_START_STATE"
        })
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

export function validateCompleteness(fa: DFA & AutomatonBase): ValidationError[] {
    const errors: ValidationError[] = []
    const automataId = fa.id

    for (const stateId in fa.states) {
        for (const symbol of fa.alphabet) {
            if (countMatchingTransitions(fa,stateId, symbol) === 0) {
                errors.push({
                    automataId,
                    type: "MISSING_TRANSITION",
                    stateId,
                    symbol
                })
            }
        }
    }
    return errors
}