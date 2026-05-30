import { FiniteAutomaton, State } from "../../types"
import { createState, createTransition } from "./edit"

export function makeFAComplete(fa: FiniteAutomaton): FiniteAutomaton {
    let sinkState: State | undefined
    const existing = new Set<string>()
    let newTransitions = [...fa.transitions]
    for (const t of fa.transitions) {
        existing.add(`${t.from}|${t.symbol}`)
    }
    for (const stateId in fa.states) {
        for (const symbol of fa.alphabet) {
            const key = `${stateId}|${symbol}`
            if (!existing.has(key)) {
                if (!sinkState) {
                    sinkState = createState(fa, 0, 0)
                }
                newTransitions.push(createTransition(stateId, sinkState.id, symbol))
            }
        }
    }
    if (!sinkState) {
        return fa
    } else {
        for (const symbol of fa.alphabet) {
            newTransitions.push(createTransition(sinkState.id, sinkState.id, symbol))
        }
    }

    return {
        ...fa,
        states: {
            ...fa.states,
            [sinkState.id]: sinkState
        },
        transitions: newTransitions
    }
}