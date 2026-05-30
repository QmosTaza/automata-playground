import { Project, Automaton, AutomatonId } from "../dfa";


export function generateId(): string {
    return crypto.randomUUID()
}
