import { DFA, NFA, LambdaNFA, StateId, TransitionId } from "./finite"

export type AutomatonId = string

export type Project = {
    activeAutomataId: AutomatonId
    automata: Record<AutomatonId, Automaton>
    tabsOrder: AutomatonId[]
}

export type AutomatonBase = {
    id: AutomatonId
    name: string     
    createdAt: number
    regex?: string
}

export type FiniteAutomaton = (DFA | NFA | LambdaNFA) & AutomatonBase
export type Automaton = FiniteAutomaton

export type ValidationResult = {
    valid: boolean
    errors: ValidationError[]
}

export type ValidationError = {
    automataId: AutomatonId
} & (
    | { type: "INVALID_START_STATE" }
    | { type: "MISSING_STATE"; stateId: StateId }
    | { type: "INVALID_TRANSITION"; transitionId: TransitionId }
    | { type: "NON_DETERMINISTIC_TRANSITION"; stateId: StateId; symbol: string }
    | { type: "MISSING_TRANSITION"; stateId: StateId; symbol: string }
    | { type: "ORPHAN_TRANSITION"; symbol: string }
    | { type: "REGEX_SYNTAX_ERROR"; message: string; position?: number }
)

export type SimulationStep = {
    state: StateId
    symbol: string | null
    stepNumber: number
    remainingInput: string
}

export type SimulationResult = {
    accepted: boolean
    steps: SimulationStep[]
    error?: string
}

