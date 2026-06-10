import { DFA, StateId, State, Transition, SimulationResult, SimulationStep } from "../../../types"
import { getTransitionsFromState } from "../edit";

//Returns whether a given string is accepted by the language of the DFA
// + the states the string has gone through
// REQUIRED: DFA must have been validated before this
export function runDFA(fa: DFA, input: string): SimulationResult {
    //start state (only one for DFAs)
    let currentState = fa.startStates[0]
    const steps: SimulationStep[] = []

    steps.push({
        state: currentState,
        stepNumber: 0,
        symbol: null,
        remainingInput: input
    })

    //accepts empty string if starts state is accepting
    if (input.length === 0) {
        return {
            accepted: fa.acceptStates.includes(currentState),
            steps
        }
    }

    //for each character in the string
    for (let i = 0; i < input.length; i++) {
        const symbol = input[i]
        const remaining = input.slice(i + 1)

        //if character not included -> not accepted
        if (!fa.alphabet.includes(symbol)) {
            return {
                accepted: false,
                steps,
                error: `Invalid symbol: ${symbol}`
            }
        }

        //gets the next state for that symbol, if it doesnt exist -> not accepted
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
        accepted: fa.acceptStates.includes(currentState), //if the final state is accepting -> accepted
        steps
    }
}

//AUX specifically for DFAs, returns the state that the transition with a given symbol points to
// a function like this already exists in fa/edit.ts but I can't be bothered to change it :)
function getNextStateDFA(fa: DFA, symbol: string, currentState: StateId): StateId | undefined {
    const transitions: Transition[] = getTransitionsFromState(fa, currentState)
    for (const t of transitions) {
        if (t.symbol === symbol) {
            return t.to
        }
    }
    return undefined
}


