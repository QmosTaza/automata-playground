import { FiniteAutomaton, Automaton, StateId } from "@/types";
import { runDFA, runNFA, runLambdaNFA } from "../fa";

export function generateId(): string {
    return crypto.randomUUID()
}

export function generateShortlexWords(fa: FiniteAutomaton, limit: number = 10): string[] {
    const validWords: string[] = [];
    const seenWords = new Set<string>();

    const alphabetOrder = (fa.alphabet || [])
        .map(s => s?.trim())
        .filter(s => !!s && s !== "λ" && s !== "λ");

    const queue: [StateId, string][] = [];

    for (const startId of fa.startStates) {
        queue.push([startId, ""]);
    }

    const visitedStatePaths = new Set<string>();

    while (queue.length > 0 && validWords.length < limit) {
        const [currId, path] = queue.shift()!;

        if (fa.acceptStates.includes(currId) && !seenWords.has(path)) {
            seenWords.add(path);
            validWords.push(path === "" ? "λ" : path);
        }

        for (const symbol of alphabetOrder) {
            const matchingTransitions = fa.transitions.filter(
                t => t.from === currId && t.symbol?.trim() === symbol
            );

            for (const t of matchingTransitions) {
                const nextPath = path + symbol;
                const cacheKey = `${t.to}|${nextPath}`;

                if (!visitedStatePaths.has(cacheKey) && nextPath.length <= 20) {
                    visitedStatePaths.add(cacheKey);
                    queue.push([t.to, nextPath]);
                }
            }
        }

        const epsilonTransitions = fa.transitions.filter(
            t => t.from === currId && (t.symbol === null || t.symbol === "λ" || t.symbol === "λ")
        );
        for (const t of epsilonTransitions) {
            const cacheKey = `${t.to}|${path}`;
            if (!visitedStatePaths.has(cacheKey)) {
                visitedStatePaths.add(cacheKey);
                queue.unshift([t.to, path]);
            }
        }
    }

    return validWords.sort((a, b) => {
        if (a === "λ") return -1;
        if (b === "λ") return 1;

        if (a.length !== b.length) {
            return a.length - b.length;
        }

        for (let i = 0; i < a.length; i++) {
            const indexA = alphabetOrder.indexOf(a[i]);
            const indexB = alphabetOrder.indexOf(b[i]);
            if (indexA !== indexB) {
                return indexA - indexB;
            }
        }
        return 0;
    });
}


export function evaluateString(a: Automaton, str: string): boolean {
    switch (a.kind) {
        case "dfa":
            return runDFA(a, str).accepted
        case "nfa":
            for (const path of runNFA(a, str)){
                if (path.accepted) {return true}
            }
            return false
        case "lambda-nfa":
            for (const path of runLambdaNFA(a, str)){
                if (path.accepted) {return true}
            }
            return false

    }
}