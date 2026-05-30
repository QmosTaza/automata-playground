import { runDFA } from "./simulate"
import { DFA, DFAEditor, Transition, StateId } from "./types"

export function validateDeterminism(dfa: DFA, input: string) {
  //WIP
}

export function validateTransition(dfa: DFAEditor, transition: Transition): boolean{
    return !dfa.transitions.some(
            t => t.from === transition.from && t.symbol === transition.symbol
        ) 
        && (transition.from in dfa.states) 
        && (transition.to in dfa.states) 
        && dfa.alphabet.includes(transition.symbol)
}

export function stateExists(dfa: DFAEditor, stateId: StateId): boolean{
    return (stateId in dfa.states)
}

export function validateStartState(dfa: DFAEditor): boolean {
    return (
        dfa.startState !== undefined &&
        dfa.startState in dfa.states
    )
}