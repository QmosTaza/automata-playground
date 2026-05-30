import { Node, Edge } from "@xyflow/react"
import { FiniteAutomaton, Transition } from "@/types"

export function faToNodes(fa: FiniteAutomaton): Node[] {
    return Object.values(fa.states).map(state => ({
        id: state.id,
        type: "state",
        position: {
            x: state.x,
            y: state.y
        },
        data: {
            label: state.label,
            accepting: fa.acceptStates.includes(state.id)
        },
        draggable: true
    }))
}

export function faToEdges(fa: FiniteAutomaton): Edge[] {
    const groups = new Map<string, Transition[]>()

    for (const t of fa.transitions) {
        const key = `${t.from}|${t.to}`
        const current = groups.get(key) ?? []
        current.push(t)
        groups.set(key, current)
    }

    return Array.from(groups.entries()).map(
        ([key, transitions]) => {
            const first = transitions[0]
            return {
                id: first.id,
                source: first.from,
                target: first.to,
                type: "transition",
                label: transitions
                    .map(t => t.symbol ?? "λ")
                    .join(", "),
                data: { isLoop: first.from === first.to}
            }
        }
    )
}