export type StateId = string
export type TransitionId = string

export type FiniteAutomatonBase = {
    states: Record<StateId, State>
    alphabet: string[]
    transitions: Transition[]
    startStates: StateId[]
    acceptStates: StateId[]
}

export type State = {
    id: StateId
    label: string
    x: number
    y: number
}

export type Transition = {
    id: TransitionId
    symbol: string | null | undefined
    from: StateId
    to: StateId
}

export type DFA = FiniteAutomatonBase & {
    kind: "dfa"
}

export type NFA = FiniteAutomatonBase & {
    kind: "nfa"
}

export type LambdaNFA = FiniteAutomatonBase & {
    kind: "lambda-nfa"
}

export interface ThompsonGraph {
    startId: StateId;
    acceptId: StateId;
    states: Record<StateId, State>;
    transitions: Transition[];
}

