import { DFA, StateId, State, Transition } from "../../types"

type SimulationStep = {
    state: StateId
    stepNumber: number
    symbol: string
}

type SimulationResult = {
    accepted: boolean
    steps: SimulationStep[]
    error?: string
}

export function runDFA(dfa: DFA, input: string): SimulationResult {
    //WIP
    let currentState = dfa.startState
    const steps: SimulationStep[] = []

    for (let i = 0; i < input.length; i++) {
        const symbol = input[i]
        steps.push({
            state: currentState,
            stepNumber: i,
            symbol
        })
        if (!dfa.alphabet.includes(symbol)) {
            return {
                accepted: false,
                steps,
                error: `Invalid symbol: ${symbol}`
            }
        }
        const nextState = getNextStateDFA(dfa, symbol, currentState)
        if (!nextState) {
            return {
                accepted: false,
                steps,
                error: `Missing transition`
            }
        }
        currentState = nextState
    }
    return {
        accepted: dfa.acceptStates.includes(currentState),
        steps
    }
}

function getNextStateDFA(dfa: DFA, symbol: string, currentState: StateId): StateId | undefined {
    const transitions: Transition[] = getTransitionsFromState(dfa, currentState)
    for (const t of transitions) {
        if (t.symbol === symbol) {
            return t.to
        }
    }
    return undefined
}

function getTransitionsFromState(dfa: DFA, currentState: StateId): Transition[] {
    return dfa.transitions.filter(
        t => t.from === currentState
    )
}
