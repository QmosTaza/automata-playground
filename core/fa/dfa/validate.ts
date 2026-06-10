import { DFA, FiniteAutomaton, Automaton, AutomatonBase, Transition, StateId, ValidationResult, ValidationError } from "../../../types"
import { validateTransition, countMatchingTransitions, validateStartState, stateExists } from "../validate"
import { getStateFromId } from "../edit"

//validates whether the DFA is ready to run strings
export function validateDFA(fa: DFA & AutomatonBase): ValidationResult {
    const errors: ValidationError[] = []
    const automataId = fa.id

    // (see functions in fa/validate.ts)

    // ensures that every transition:
    //  involves states that exist in the DFA
    //  involves symbols that belong to the DFA's alphabet (incl lambda)
    //  no other transitions exist involving those states and symbol
    for (const t of fa.transitions) {
        if (!validateTransition(fa, t)) {
            errors.push({
                automataId,
                type: "INVALID_TRANSITION",
                transitionId: t.id
            })
        }
    }
    
    //ensures that NO non-deterministic transitions exists 
    //(multiple transitions from the same state and with the same symbol)
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
    
    // ensures that all accepting states exist in DFA
    for (const stateId of fa.acceptStates) {
        if (!stateExists(fa, stateId)) {
            errors.push({
                automataId,
                type: "MISSING_STATE",
                stateId
            })
        }
    }

    // ensures that all start states exist and that in DFA there is only one
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