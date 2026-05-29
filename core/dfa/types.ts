
export type StateId = string
export type TransitionId = string

export type State = {
    id: StateId
    label: string
    x: number
    y: number
}

export type Transition = {
    id: TransitionId
    symbol: string
    from: State
    to: State
}

export type DFA = {
    states: Record<StateId, State>
    alphabet: string[]
    transitions: Transition[]
    startState: StateId
    acceptStates: Set<StateId>
}