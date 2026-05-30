import { DFA, DFAEditor, StateId, TransitionId } from "./finite"

export type AutomatonId = string

export type Project = {
    automata: Record<AutomatonId, Automaton>
}

export type Automaton = DFA
export type AutomatonEditor = DFAEditor

export type ValidationResult = {
    valid: boolean
    errors: ValidationError[]
}

export type ValidationError =
    | {
        type: "INVALID_START_STATE"
    }
    | {
        type: "MISSING_STATE"
        stateId: StateId
    }
    | {
        type: "INVALID_TRANSITION"
        transitionId: TransitionId
    }
    | {
        type: "NON_DETERMINISTIC_TRANSITION"
        stateId: StateId
        symbol: string
    }
    | {
        type: "MISSING_TRANSITION",
        stateId: StateId,
        symbol: string
    }