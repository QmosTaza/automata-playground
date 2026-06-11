import { Regex, FiniteAutomaton, StateId,  } from "@/types";
import { simplifyRegex } from "./simplify";
import { printRegex } from "./utils"
import { convertLambdaNFAtoDFA, minimizeDFA, convertNFAtoDFA } from "..";
import { stateIsSink, stateIsUnreachable } from "..";

// FA TO REGEX STATE ELIMINATION CORE

export function convertAutomatonToRegex(fa: FiniteAutomaton): string {
    const optimized = preprocessAutomaton(fa);

    const ast = buildRegexAST(optimized);

    return printRegex(
        simplifyRegex(ast)
    );
}

function preprocessAutomaton(fa:FiniteAutomaton): FiniteAutomaton {
    let optimizedFA = {...fa};
    try {
            if (fa.kind === "lambda-nfa") {
                const dfa = convertLambdaNFAtoDFA(fa);
                optimizedFA = minimizeDFA(dfa);
            } else if (fa.kind === "nfa") {
                const dfa = convertNFAtoDFA(fa);
                optimizedFA = minimizeDFA(dfa);
            } else if (fa.kind === "dfa") {
                optimizedFA = minimizeDFA(fa);
            }
        } catch (optimizationError) {
            console.warn("Regex pre-optimization skipped, using raw graph:", optimizationError);
            optimizedFA = fa;
        }
    
        const filteredStates: Record<string, any> = {};
        for (const id in optimizedFA.states) {
            const isDeadSink = stateIsSink(optimizedFA, id);
            const isOrphan = stateIsUnreachable(optimizedFA, id);
    
            if ((!isDeadSink && !isOrphan) || optimizedFA.startStates.includes(id)) {
                filteredStates[id] = optimizedFA.states[id];
            }
        }
    
        const survivingIds = new Set(Object.keys(filteredStates));
        const filteredTransitions = optimizedFA.transitions.filter(
            t => survivingIds.has(t.from) && survivingIds.has(t.to)
        );
    
        return {
            ...optimizedFA,
            states: filteredStates,
            transitions: filteredTransitions
        };
}

function calculateRij0(fa: FiniteAutomaton, stateI: StateId, stateJ: StateId): Regex {
    const transitions = fa.transitions.filter(
        t => t.from === stateI && t.to === stateJ
    );

    const initialTerms: Regex[] = [];

    if (stateI === stateJ) {
        initialTerms.push({ type: "lambda" });
    }

    for (const t of transitions) {
        const symbolLabel = (t.symbol === "" || t.symbol === null || t.symbol === undefined) ? "λ" : t.symbol.trim();
        if (symbolLabel === "λ") {
            initialTerms.push({ type: "lambda" });
        } else if (symbolLabel === "∅") {
            initialTerms.push({ type: "empty" });
        } else {
            initialTerms.push({ type: "symbol", value: symbolLabel });
        }
    }

    if (initialTerms.length === 0) return { type: "empty" };
    
    return simplifyRegex({ type: "union", children: initialTerms });
}


function calculateRijk(
    fa: FiniteAutomaton, 
    stateI: StateId, 
    stateJ: StateId, 
    k: number, 
    order: StateId[], 
    memo: Map<string, Regex> 
): Regex {
    const cacheKey = `${stateI}|${stateJ}|${k}`;
    const cached = memo.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    if (k === 0) {
        const result = calculateRij0(fa, stateI, stateJ);
        memo.set(cacheKey, result);
        return result;
    }

    const stateK = order[k - 1];

    const r_ij = calculateRijk(fa, stateI, stateJ, k - 1, order, memo);
    const r_ik = calculateRijk(fa, stateI, stateK, k - 1, order, memo);
    const r_kk = calculateRijk(fa, stateK, stateK, k - 1, order, memo);
    const r_kj = calculateRijk(fa, stateK, stateJ, k - 1, order, memo);

    if (r_ik.type === "empty" || r_kj.type === "empty") {
        memo.set(cacheKey, r_ij);
        return r_ij;
    }

    const pathThroughK: Regex = {
        type: "concat",
        children: [
            r_ik,
            { type: "star", child: r_kk },
            r_kj
        ]
    };

    const fullUnion: Regex = {
        type: "union",
        children: [r_ij, pathThroughK]
    };

    const result = simplifyRegex(fullUnion);
    memo.set(cacheKey, result);
    return result;
}


function buildRegexAST(fa: FiniteAutomaton): Regex {
    const stateIds = Object.keys(fa.states).sort();

    const memo = new Map<string, Regex>();

    const finalExpressions: Regex[] = [];

    const startId = fa.startStates[0];

    const n = stateIds.length;

    for (const acceptId of fa.acceptStates) {
        if (!fa.states[acceptId]) continue;

        const pathAST = calculateRijk(
            fa,
            startId,
            acceptId,
            n,
            stateIds,
            memo
        );

        if (pathAST.type !== "empty") {
            finalExpressions.push(pathAST);
        }
    }

    if (finalExpressions.length === 0) {
        return { type: "empty" };
    }

    if (finalExpressions.length === 1) {
        return finalExpressions[0];
    }

    return {
        type: "union",
        children: finalExpressions
    };
}