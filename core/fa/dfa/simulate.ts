import { DFA, StateId, State, Transition, SimulationResult, SimulationStep } from "../../../types"
import { getTransitionsFromState } from "../edit";

export function runDFA(fa: DFA, input: string): SimulationResult {
    let currentState = fa.startStates[0]
    const steps: SimulationStep[] = []

    steps.push({
        state: currentState,
        stepNumber: 0,
        symbol: null,
        remainingInput: input
    })

    if (input.length === 0) {
        return {
            accepted: fa.acceptStates.includes(currentState),
            steps
        }
    }

    for (let i = 0; i < input.length; i++) {
        const symbol = input[i]
        const remaining = input.slice(i + 1)

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

        steps.push({
            state: currentState,
            stepNumber: steps.length,
            symbol,
            remainingInput: remaining
        })
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


