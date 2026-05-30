export type AutomatonId = string
export type StateId = string
export type TransitionId = string

export type Project = {
    automata: Record<AutomatonId, Automaton>
}

export type Automaton = {
    id: AutomatonId
    type: DFA | DFAEditor
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
    symbol: string
    from: StateId
    to: StateId
}

export type DFA = {
    states: Record<StateId, State>
    alphabet: string[]
    transitions: Transition[]
    startState: StateId
    acceptStates: StateId[]
}

export type DFAEditor = {
    states: Record<StateId, State>
    transitions: Transition[]
    startState?: StateId
    acceptStates: StateId[]
    alphabet: string[]
}