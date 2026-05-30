import { runDFA } from "./simulate"
import { DFA, DFAEditor, Transition } from "./types"

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