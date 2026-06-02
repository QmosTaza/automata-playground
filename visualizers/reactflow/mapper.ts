import { Node, Edge } from "@xyflow/react"
import { FiniteAutomaton, Transition } from "@/types"

export function faToNodes(fa: FiniteAutomaton, onToggleAccept: (id: string) => void, onRename: (id: string, name: string) => void, onToggleStart: (id: string) => void): Node[] {
    return Object.values(fa.states).map(state => ({
        id: state.id,
        type: "state",
        position: { x: state.x, y: state.y },
        data: {
            label: state.label,
            accepting: fa.acceptStates.includes(state.id),
            onToggleAccept,
            onRename,
            onToggleStart
        },
        draggable: true
    }));
}

export function faToEdges(fa: FiniteAutomaton,
    onUpdateSymbols: (edgeId: string, nextSymbols: (string | null)[]) => void,
    onRemoveEdge: (edgeId: string) => void): Edge[] {
    const groups = new Map<string, Transition[]>();

    for (const t of fa.transitions) {
        const key = `${t.from}|${t.to}`;
        const current = groups.get(key) ?? [];
        current.push(t);
        groups.set(key, current);
    }

    return Array.from(groups.entries()).map(([key, transitions]) => {
        const first = transitions[0];
        const hasReturn = groups.has(`${first.to}|${first.from}`) && first.from !== first.to;
        const finalSymbols = transitions.length === 1 && first.symbol === undefined
            ? []
            : transitions.map(t => t.symbol as string | null);

        return {
            id: first.id,
            source: first.from,
            target: first.to,
            type: "transition",
            label: "",
            data: {
                isLoop: first.from === first.to,
                isBiDirectional: hasReturn,
                symbols: finalSymbols,
                onUpdateSymbols: onUpdateSymbols,
                onRemoveEdge: onRemoveEdge
            }
        };
    });
}