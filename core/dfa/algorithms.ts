import { DFAEditor, State } from "./types"
import { createState, createTransition } from "./edit"

export function makeDFAComplete(dfa: DFAEditor): DFAEditor {
    let sinkState: State | undefined
    const existing = new Set<string>()
    let newTransitions = [...dfa.transitions]
    for (const t of dfa.transitions) {
        existing.add(`${t.from}|${t.symbol}`)
    }
    for (const stateId in dfa.states) {
        for (const symbol of dfa.alphabet) {
            const key = `${stateId}|${symbol}`
            if (!existing.has(key)) {
                if (!sinkState) {
                    sinkState = createState(dfa)
                }
                newTransitions.push(createTransition(stateId, sinkState.id, symbol))
            }
        }
    }
    if (!sinkState) {
        return dfa
    } else {
        for (const symbol of dfa.alphabet) {
            newTransitions.push(createTransition(sinkState.id, sinkState.id, symbol))
        }
    }

    return {
        ...dfa,
        states: {
            ...dfa.states,
            [sinkState.id]: sinkState
        },
        transitions: newTransitions
    }
}