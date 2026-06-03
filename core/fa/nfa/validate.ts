import { NFA, FiniteAutomaton, Automaton, AutomatonBase, Transition, StateId, ValidationResult, ValidationError } from "../../../types"
import { validateTransition, countMatchingTransitions, validateStartState, stateExists } from "../validate"
import { getStateFromId } from "../edit"

export function validateNFA(fa: NFA & AutomatonBase): ValidationResult {
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