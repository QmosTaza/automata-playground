export type StateId = string
export type TransitionId = string

export type FiniteAutomaton = {
    states: Record<StateId, State>
    alphabet: string[]
    transitions: Transition[]
    startStates: StateId[]
    acceptStates: StateId[]
}

export type State = {
    id: StateId
    label: string
}

export type StateVisual = {
    id: StateId
    x: number,
    y: number
}

export type Transition = {
    id: TransitionId
    symbol: string | null
    from: StateId
    to: StateId
}

export type DFA = FiniteAutomaton & {
    kind: "dfa"
}

export type NFA = FiniteAutomaton & {
    kind: "nfa"
}

export type LambdaNFA = FiniteAutomaton & {
    kind: "lambda-nfa"
}

export type Automaton = DFA | NFA | LambdaNFA
