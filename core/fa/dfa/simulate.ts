import { DFA, StateId, State, Transition, SimulationResult, SimulationStep } from "../../../types"


export function runDFA(fa: DFA, input: string): SimulationResult {
    //WIP
    let currentState = fa.startStates[0]
    const steps: SimulationStep[] = []

    for (let i = 0; i < input.length; i++) {
        const symbol = input[i]
        steps.push({
            state: currentState,
            stepNumber: i,
            symbol
        })
        if (!fa.alphabet.includes(symbol)) {
            return {
                accepted: false,
                steps,
                error: `Invalid symbol: ${symbol}`
            }
        }
        const nextState = getNextStateDFA(fa, symbol, currentState)
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
        accepted: fa.acceptStates.includes(currentState),
        steps
    }
}

function getNextStateDFA(fa: DFA, symbol: string, currentState: StateId): StateId | undefined {
    const transitions: Transition[] = getTransitionsFromState(fa, currentState)
    for (const t of transitions) {
        if (t.symbol === symbol) {
            return t.to
        }
    }
    return undefined
}

function getTransitionsFromState(fa: DFA, currentState: StateId): Transition[] {
    return fa.transitions.filter(
        t => t.from === currentState
    )
}
