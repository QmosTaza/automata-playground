import { FiniteAutomaton, State, StateId, Transition, Regex, ThompsonGraph } from "@/types"
import { generateId } from "@/core/shared";
import { applyNaiveLayout, stateIsSink, stateIsUnreachable } from "..";
import { convertLambdaNFAtoDFA, minimizeDFA, convertNFAtoDFA } from "..";


// MEMO TABLES
let regexKeyMemo = new WeakMap<Regex, string>();
let simplifyMemo = new WeakMap<Regex, Regex>();


// Generates an O(1) structurally unique key cache representation for any Regex AST node.

function keyRegex(r: Regex): string {
    const cached = regexKeyMemo.get(r);
    if (cached) return cached;

    let result: string;
    switch (r.type) {
        case "empty":
            result = "∅";
            break;
        case "epsilon":
            result = "λ";
            break;
        case "symbol":
            result = `s:${r.value}`;
            break;
        case "star":
            result = `*(${keyRegex(r.child)})`;
            break;
        case "concat":
            result = `c(${r.children.map(keyRegex).join(",")})`;
            break;
        case "union":
            result = `u(${r.children.map(keyRegex).sort().join(",")})`;
            break;
    }

    regexKeyMemo.set(r, result);
    return result;
}

// Helper to safely extract all active terminal string tokens inside an sub-union target
function collectSymbolsInUnion(r: Regex, set: Set<string>): void {
    if (r.type === "symbol") {
        set.add(r.value);
    } else if (r.type === "union") {
        for (const child of r.children) {
            collectSymbolsInUnion(child, set);
        }
    }
}


// FA TO REGEX STATE ELIMINATION CORE

function calculateRij0(fa: FiniteAutomaton, stateI: StateId, stateJ: StateId): Regex {
    const transitions = fa.transitions.filter(
        t => t.from === stateI && t.to === stateJ
    );

    const initialTerms: Regex[] = [];

    if (stateI === stateJ) {
        initialTerms.push({ type: "epsilon" });
    }

    for (const t of transitions) {
        const symbolLabel = (t.symbol === "" || t.symbol === null || t.symbol === undefined) ? "λ" : t.symbol.trim();
        if (symbolLabel === "λ") {
            initialTerms.push({ type: "epsilon" });
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

export function convertAutomatonToRegex(fa: FiniteAutomaton): string {
    regexKeyMemo = new WeakMap();
    simplifyMemo = new WeakMap();
    
    let optimizedFa = { ...fa };

    try {
        if (fa.kind === "lambda-nfa") {
            const dfa = convertLambdaNFAtoDFA(fa);
            optimizedFa = minimizeDFA(dfa);
        } else if (fa.kind === "nfa") {
            const dfa = convertNFAtoDFA(fa);
            optimizedFa = minimizeDFA(dfa);
        } else if (fa.kind === "dfa") {
            optimizedFa = minimizeDFA(fa);
        }
    } catch (optimizationError) {
        console.warn("Regex pre-optimization skipped, using raw graph:", optimizationError);
        optimizedFa = fa;
    }

    const filteredStates: Record<string, any> = {};
    for (const id in optimizedFa.states) {
        const isDeadSink = stateIsSink(optimizedFa, id);
        const isOrphan = stateIsUnreachable(optimizedFa, id);

        if ((!isDeadSink && !isOrphan) || optimizedFa.startStates.includes(id)) {
            filteredStates[id] = optimizedFa.states[id];
        }
    }

    const survivingIds = new Set(Object.keys(filteredStates));
    const filteredTransitions = optimizedFa.transitions.filter(
        t => survivingIds.has(t.from) && survivingIds.has(t.to)
    );

    const regexFa: FiniteAutomaton = {
        ...optimizedFa,
        states: filteredStates,
        transitions: filteredTransitions
    };

    const { normalizedFa, dummyStartId } = normalizeStartStatesForRegex(regexFa);

    const transitionMap = new Map<string, Transition[]>();
    for (const t of normalizedFa.transitions) {
        const key = `${t.from}|${t.to}`;
        if (!transitionMap.has(key)) {
            transitionMap.set(key, []);
        }
        transitionMap.get(key)!.push(t);
    }

    const internalStateIds = Object.keys(normalizedFa.states)
        .filter(id => id !== dummyStartId)
        .sort();
        
    const stateIds = [...internalStateIds, dummyStartId];
    const n = stateIds.length;

    const finalExpressions: Regex[] = []; 
    const memo = new Map<string, Regex>(); 

    for (const acceptId of normalizedFa.acceptStates) {
        if (!normalizedFa.states[acceptId]) continue;
        
        const pathAST = calculateRijk(normalizedFa, dummyStartId, acceptId, n, stateIds, memo);

        if (pathAST && pathAST.type !== "empty") {
            finalExpressions.push(pathAST);
        }
    }

    if (finalExpressions.length === 0) return "∅";

    const finalMasterAST: Regex = finalExpressions.length === 1 
        ? finalExpressions[0] 
        : { type: "union", children: finalExpressions };

    let finalCleanAST = simplifyRegex(finalMasterAST);
    return printRegex(finalCleanAST).replace(/\+/g, " + ");
}

export function normalizeStartStatesForRegex(fa: FiniteAutomaton): {
    normalizedFa: FiniteAutomaton;
    dummyStartId: StateId
} {
    if (fa.startStates.length === 1) {
        return { normalizedFa: fa, dummyStartId: fa.startStates[0] };
    }
    const dummyStartId = generateId();

    const dummyState = {
        id: dummyStartId,
        label: "q_start",
        x: 0,
        y: 0
    };
    const lambdaTransitions: Transition[] = fa.startStates.map(oldStartId => ({
        id: generateId(),
        from: dummyStartId,
        to: oldStartId,
        symbol: null
    }));
    const normalizedFa: FiniteAutomaton = {
        ...fa,
        states: {
            ...fa.states,
            [dummyStartId]: dummyState
        },
        transitions: [
            ...fa.transitions,
            ...lambdaTransitions
        ],
        startStates: [dummyStartId]
    };

    return { normalizedFa, dummyStartId };
}


// STRUCTURAL AST ALGEBRAIC SIMPLIFIER

export function simplifyRegex(r: Regex): Regex {
    const cached = simplifyMemo.get(r);
    if (cached) return cached;

    let result: Regex = r;

    switch (r.type) {
        case "star": {
            let e = simplifyRegex(r.child);

            if (e.type === "empty" || e.type === "epsilon") {
                result = { type: "epsilon" };
                break;
            }

            if (e.type === "star") {
                result = e;
                break;
            }

            if (e.type === "union") {
                const withoutEpsilon = e.children.filter(c => c.type !== "epsilon");
                if (withoutEpsilon.length === 1) {
                    e = withoutEpsilon[0];
                } else if (withoutEpsilon.length > 1) {
                    e = simplifyRegex({ type: "union", children: withoutEpsilon });
                }
            }

            if (e.type === "concat" && e.children.every(c => c.type === "star")) {
                const unionChildren = e.children.map(c => (c as any).child);
                result = simplifyRegex({
                    type: "star",
                    child: { type: "union", children: unionChildren }
                });
                break;
            }

            result = { type: "star", child: e };
            break;
        }

        case "concat": {
            const terms = r.children.map(simplifyRegex);
            let flat: Regex[] = [];

            for (const t of terms) {
                if (t.type === "concat") flat.push(...t.children);
                else flat.push(t);
            }

            if (flat.some(t => t.type === "empty")) {
                result = { type: "empty" };
                break;
            }

            const filtered = flat.filter(t => t.type !== "epsilon");

            if (filtered.length === 0) {
                result = { type: "epsilon" };
                break;
            }

            if (filtered.length === 1) {
                result = filtered[0];
                break;
            }

            let optimized: Regex[] = [...filtered];
            let changed = true;

            while (changed) {
                changed = false;
                for (let i = 0; i < optimized.length; i++) {
                    const current = optimized[i];
                    const next = optimized[i + 1];

                    if (current.type === "star" && next?.type === "star" && keyRegex(current.child) === keyRegex(next.child)) {
                        optimized.splice(i + 1, 1);
                        changed = true;
                        break;
                    }

                    if (current.type === "star") {
                        if (i > 0) {
                            const prev = optimized[i - 1];
                            if (isSubSetOfStar(prev, current.child)) {
                                optimized.splice(i - 1, 1);
                                changed = true;
                                break;
                            }
                        }

                        if (i < optimized.length - 1) {
                            const next = optimized[i + 1];
                            if (isSubSetOfStar(next, current.child)) {
                                optimized.splice(i + 1, 1);
                                changed = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (optimized.length === 2 && optimized[0].type === "star" && optimized[0].child.type === "union") {
                if (isSubSetOfStar(optimized[1], optimized[0].child)) { 
                    result = simplifyRegex({
                        type: "concat",
                        children: [optimized[1], optimized[0]]
                    });
                    break;
                }
            }

            result = optimized.length === 1 ? optimized[0] : { type: "concat", children: optimized };
            break;
        }

        case "union": {
            const flat: Regex[] = [];

            for (const t of r.children.map(simplifyRegex)) {
                if (t.type === "union")
                    flat.push(...t.children);
                else
                    flat.push(t);
            }

            let unique = deduplicate(flat).filter(t => t.type !== "empty");
            if (unique.length === 0) {
                result = { type: "empty" };
                break;
            }
            if (unique.length === 1) {
                result = unique[0];
                break;
            }

            const cleanUnique: typeof unique = [];
            const seenStr = new Set<string>();

            for (const item of unique) {
                const itemKey = keyRegex(item);
                if (!seenStr.has(itemKey)) {
                    seenStr.add(itemKey);
                    cleanUnique.push(item);
                }
            }
            unique = cleanUnique;

            if (unique.length === 1) {
                result = unique[0];
                break;
            }

            const stars = unique.filter(c => c.type === "star") as Extract<Regex, { type: "star" }>[];
            if (stars.length > 0) {
                unique = unique.filter(node => {
                    if (node.type === "star") return true;
                    for (const s of stars) {
                        if (keyRegex(s.child) === keyRegex(node)) return false;
                    }
                    return true;
                });
            }

            const complexPaths = unique.filter(c => c.type === "concat" || c.type === "star");
            const looseSymbols = unique.filter(c => c.type === "symbol");

            if (looseSymbols.length > 1 && complexPaths.length > 0) {
                const looseSymbolsKey = looseSymbols.map(keyRegex).sort().join("+");

                for (const path of complexPaths) {
                    if (path.type === "concat") {
                        const concatNode = path as Extract<Regex, { type: "concat" }>;
                        const firstChild = concatNode.children[0] as any;

                        if (firstChild?.type === "union") {
                            const targetUnionKey = firstChild.children
                                .map(keyRegex)
                                .sort()
                                .join("+");

                            if (looseSymbolsKey === targetUnionKey) {
                                unique = unique.filter((c: Regex) => !looseSymbols.includes(c as any));
                                unique.push(firstChild);
                                break;
                            }
                        }
                    }
                }
            }

            const targetStars = unique.filter(c => c.type === "star") as Extract<Regex, { type: "star" }>[];

            const concatWithTrailingStars = unique.filter(c => {
                if (c.type !== "concat") return false;
                const children = (c as any).children || [];
                return children.length > 0 && children[children.length - 1].type === "star";
            });

            if (targetStars.length > 0 || concatWithTrailingStars.length > 0) {
                unique = unique.filter(node => {
                    if (node.type === "star") return true;

                    for (const starNode of targetStars) {
                        if (isSubSetOfStar(node, starNode.child)) return false;
                    }

                    for (const concatNode of concatWithTrailingStars) {
                        const children = (concatNode as any).children;
                        const prefix = children.slice(0, -1);
                        const lastChild = children[children.length - 1];

                        if (node.type === "symbol" || node.type === "union") {
                            if (isSubSetOfConcatPrefix(node, prefix, lastChild.child)) {
                                return false;
                            }
                        }
                    }
                    return true;
                });
            }

            if (unique.length > 1 && unique.every(c => c.type === "concat")) {
                const firstTermPrefix = keyRegex((unique[0] as any).children[0]);
                const matchesPrefix = unique.every(c => keyRegex((c as any).children[0]) === firstTermPrefix);

                if (matchesPrefix) {
                    const prefixNode = (unique[0] as any).children[0];
                    const remainingTerms = unique.map(c => ({
                        type: "concat" as const,
                        children: (c as any).children.slice(1)
                    }));

                    result = simplifyRegex({
                        type: "concat",
                        children: [prefixNode, { type: "union", children: remainingTerms }]
                    });
                    break;
                }
            }

            const uniqueMap = new Map<string, Regex>();
            for (const c of unique) {
                uniqueMap.set(keyRegex(c), c);
            }

            const finalUnique = Array.from(uniqueMap.values());
            if (finalUnique.length === 1) {
                result = finalUnique[0];
                break;
            }

            finalUnique.sort((a, b) => keyRegex(a).localeCompare(keyRegex(b)));

            result = {
                type: "union",
                children: finalUnique
            };
            break;
        }
    }

    simplifyMemo.set(r, result);
    return result;
}

function isSubSetOfStar(node: Regex, starBaseNode: Regex): boolean {
    if (node.type === "epsilon") return true;
    if (keyRegex(node) === keyRegex(starBaseNode)) return true;

    if (node.type === "union") {
        return node.children.every(child => isSubSetOfStar(child, starBaseNode));
    }

    if (node.type === "symbol") {
        const allowedSymbols = new Set<string>();
        collectSymbolsInUnion(starBaseNode, allowedSymbols);
        return allowedSymbols.has(node.value);
    }

    return false;
}

function isSubSetOfConcatPrefix(node: Regex, prefixNodes: Regex[], starBaseNode: Regex): boolean {
    if (node.type === "union") {
        return node.children.every(child => isSubSetOfConcatPrefix(child, prefixNodes, starBaseNode));
    }

    const nodeKey = keyRegex(node);

    if (prefixNodes.length === 1 && prefixNodes[0].type === "union") {
        return prefixNodes[0].children.some(child => {
            const childKey = keyRegex(child);
            return childKey === nodeKey || keyRegex(starBaseNode) === nodeKey;
        });
    }

    const compiledPrefixNode: Regex = prefixNodes.length === 1 
        ? prefixNodes[0] 
        : { type: "concat", children: prefixNodes };

    return nodeKey === keyRegex(compiledPrefixNode);
}

// HELPERS, SERIALIZERS AND PARSER

function printRegex(r: Regex): string {
    switch (r.type) {
        case "empty":
            return "∅";
        case "epsilon":
            return "λ";
        case "symbol":
            return r.value;
        case "star":
            const inner = r.child.type === "symbol" ? printRegex(r.child) : `(${printRegex(r.child)})`;
            return `${inner}*`;
        case "concat":
            return r.children.map(child => (child.type === "union") ? `(${printRegex(child)})` : printRegex(child)).join("");
        case "union":
            return r.children.map(printRegex).join(" + ");
    }
}

function deduplicate(list: Regex[]): Regex[] {
    const seen = new Set<string>();
    return list.filter(r => {
        const k = keyRegex(r);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

export function parseRegex(input: string): Regex {
    const s = input.replace(/\s+/g, "");
    let pos = 0;

    function peek(): string | undefined { return s[pos]; }
    function consume(expected?: string): string {
        const ch = s[pos];
        if (ch === undefined) throw new Error("Unexpected end of regex");
        if (expected && ch !== expected) throw new Error(`Expected '${expected}' but found '${ch}' at ${pos}`);
        pos++; return ch;
    }

    function parseUnion(): Regex {
        const terms: Regex[] = [parseConcat()];
        while (peek() === "+") { consume("+"); terms.push(parseConcat()); }
        return terms.length === 1 ? terms[0] : { type: "union", children: terms };
    }

    function parseConcat(): Regex {
        const terms: Regex[] = [];
        while (pos < s.length && peek() !== ")" && peek() !== "+") { terms.push(parseStar()); }
        if (terms.length === 0) return { type: "epsilon" };
        return terms.length === 1 ? terms[0] : { type: "concat", children: terms };
    }

    function parseStar(): Regex {
        let node = parseAtom();
        while (peek() === "*") { consume("*"); node = { type: "star", child: node }; }
        return node;
    }

    function parseAtom(): Regex {
        const ch = peek();
        if (!ch) throw new Error("Unexpected end of regex");
        if (ch === "(") { consume("("); const expr = parseUnion(); consume(")"); return expr; }
        if (ch === "λ") { consume(); return { type: "epsilon" }; }
        if (ch === "∅") { consume(); return { type: "empty" }; }
        consume(); return { type: "symbol", value: ch };
    }

    const result = parseUnion();
    if (pos !== s.length) throw new Error(`Unexpected token '${s[pos]}' at position ${pos}`);
    return result;
}