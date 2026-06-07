import { FiniteAutomaton, State, StateId, Transition, Regex, ThompsonGraph } from "@/types"
import { generateId } from "./edit";
import { applyNaiveLayout } from "../fa";
import { convertLambdaNFAtoDFA, minimizeDFA, convertNFAtoDFA } from "../fa";


// REGEX TO NFA
export function compileRegexToLambdaNFA(ast: Regex): ThompsonGraph {
    switch (ast.type) {
        case "empty": {
            const startId = generateId()
            const acceptId = generateId()
            return {
                startId,
                acceptId,
                states: {
                    [startId]: { id: startId, label: "q_in", x: 0, y: 0 },
                    [acceptId]: { id: acceptId, label: "q_out", x: 0, y: 0 }
                },
                transitions: []
            }}
        case "epsilon": {
            const startId = generateId()
            const acceptId = generateId()
            return {
                startId,
                acceptId: startId,
                states: {
                    [startId]: { id: startId, label: "q_ε", x: 0, y: 0 },
                },
                transitions: [
                    {
                        id: generateId(),
                        from: startId,
                        to: acceptId,
                        symbol: null
                    }
                ]
            }}
        case "symbol":{
            const startId = generateId();
            const acceptId = generateId();

            return {
                startId,
                acceptId,
                states: {
                    [startId]: { id: startId, label: `q_${ast.value}_in`, x: 0, y: 0 },
                    [acceptId]: { id: acceptId, label: `q_${ast.value}_out`, x: 0, y: 0 }
                },
                transitions: [
                    {
                        id: generateId(),
                        from: startId,
                        to: acceptId,
                        symbol: ast.value
                    }
                ]
            };
        }

        case "concat": {
            const children = ast.children;
            if (children.length === 0) {
                return compileRegexToLambdaNFA({ type: "epsilon" });
            }

            let combinedGraph = compileRegexToLambdaNFA(children[0]);

            for (let i = 1; i < children.length; i++) {
                const nextGraph = compileRegexToLambdaNFA(children[i]);
                
                const oldAcceptId = combinedGraph.acceptId;
                const redundantStartId = nextGraph.startId;

                const updatedNextTransitions = nextGraph.transitions.map(t => ({
                    ...t,
                    from: t.from === redundantStartId ? oldAcceptId : t.from,
                    to: t.to === redundantStartId ? oldAcceptId : t.to
                }));

                const mergedStates = { ...combinedGraph.states, ...nextGraph.states };
                delete mergedStates[redundantStartId];

                combinedGraph = {
                    startId: combinedGraph.startId,
                    acceptId: nextGraph.acceptId === redundantStartId ? oldAcceptId : nextGraph.acceptId,
                    states: mergedStates,
                    transitions: [...combinedGraph.transitions, ...updatedNextTransitions]
                };
            }

            return combinedGraph;
        }
        case "union": {
            const children = ast.children;
            if (children.length === 0) {
                return compileRegexToLambdaNFA({ type: "empty" });
            }

            if (children.length === 1) {
                return compileRegexToLambdaNFA(children[0]);
            }

            const wrapperStartId = generateId();
            const wrapperAcceptId = generateId();

            const combinedStates: Record<StateId, State> = {
                [wrapperStartId]: { id: wrapperStartId, label: "q_union_src", x: 0, y: 0 },
                [wrapperAcceptId]: { id: wrapperAcceptId, label: "q_union_dst", x: 0, y: 0 }
            };
            const combinedTransitions: Transition[] = [];

            for (const child of children) {
                const childGraph = compileRegexToLambdaNFA(child);

                const startBridge: Transition = {
                    id: generateId(),
                    from: wrapperStartId,
                    to: childGraph.startId,
                    symbol: null
                };

                const acceptBridge: Transition = {
                    id: generateId(),
                    from: childGraph.acceptId,
                    to: wrapperAcceptId,
                    symbol: null
                };

                Object.assign(combinedStates, childGraph.states);
                combinedTransitions.push(...childGraph.transitions, startBridge, acceptBridge);
            }

            return {
                startId: wrapperStartId,
                acceptId: wrapperAcceptId,
                states: combinedStates,
                transitions: combinedTransitions
            };
        }
        case "star": {
            const childGraph = compileRegexToLambdaNFA(ast.child);

            const loopBackTrack: Transition = {
                id: generateId(),
                from: childGraph.acceptId,
                to: childGraph.startId,
                symbol: null
            };

            const bypassTrack: Transition = {
                id: generateId(),
                from: childGraph.startId,
                to: childGraph.acceptId,
                symbol: null
            };

            return {
                startId: childGraph.startId,
                acceptId: childGraph.acceptId,
                states: childGraph.states,
                transitions: [...childGraph.transitions, loopBackTrack, bypassTrack]
            };
        }
    }
}

export function convertRegexToAutomaton(regexString: string): FiniteAutomaton {
    const ast = parseRegex(regexString);
    
    const graph = compileRegexToLambdaNFA(ast);
    
    const automaton: FiniteAutomaton = {
        id: generateId(),
        name: `NFA from (${regexString})`,
        createdAt: Date.now(),
        states: graph.states,
        transitions: graph.transitions,
        startStates: [graph.startId],
        acceptStates: [graph.acceptId],
        kind: "lambda-nfa",
        alphabet: extractAlphabetFromAST(ast)
    }

    return applyNaiveLayout(automaton);
}

export function extractAlphabetFromAST(ast: Regex): string[] {
    const symbols = new Set<string>();

    function walk(node: Regex) {
        if (!node) return;
        
        switch (node.type) {
            case "symbol":
                if (node.value && node.value !== "ε" && node.value !== "∅") {
                    symbols.add(node.value);
                }
                break;
            case "star":
                walk(node.child);
                break;
            case "concat":
                node.children.forEach(walk);
                break;
            case "union":
                node.children.forEach(walk);
                break;
        }
    }

    walk(ast);
    return Array.from(symbols).sort();
}

//  FA TO REGEX
export function calculateRij0(fa: FiniteAutomaton, stateI: StateId, stateJ: StateId): string {
    const transitions = fa.transitions.filter(
        t => t.from === stateI && t.to === stateJ
    );

    let result: string = stateI === stateJ ? "ε" : "";

    for (const t of transitions) {
        const symbolLabel = (t.symbol === "" || t.symbol === null || t.symbol === undefined) ? "ε" : t.symbol.trim();
        if (result !== "" && result !== "ε") {
            result += " + " + symbolLabel;
        } else if (result === "ε") {
            result = `ε + ${symbolLabel}`;
        } else {
            result += symbolLabel;
        }
    }
    return result === "" ? "∅" : result;
}

export function calculateRijk(
    fa: FiniteAutomaton, stateI: StateId, stateJ: StateId, k: number, order: StateId[], memo: Map<string, string>
): string {

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

    if (r_ik === "∅" || r_kj === "∅") {
        memo.set(cacheKey, r_ij);
        return r_ij;
    }

    let starBlock = r_kk === "ε" ? "" : `(${r_kk})*`;
    if (r_kk.length === 1 && r_kk !== "ε") starBlock = `${r_kk}*`; // Simplify clean chars like a*

    const pathThroughK = `${formatTerm(r_ik)}${starBlock}${formatTerm(r_kj)}`;

    const result =
        r_ij === "∅"
            ? pathThroughK
            : `${r_ij} + ${pathThroughK}`;

    memo.set(cacheKey, result);
    return result;
}

function formatTerm(term: string): string {
    if (term.includes("+") && !term.startsWith("(")) {
        return `(${term})`;
    }
    return term === "ε" ? "" : term;
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

export function convertAutomatonToRegex(fa: FiniteAutomaton): string {
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
    
    
    const { normalizedFa, dummyStartId } = normalizeStartStatesForRegex(optimizedFa);
    
    const stateIds = Object.keys(normalizedFa.states).sort();
    const n = stateIds.length;

    const finalExpressions: string[] = [];

    const memo = new Map<string, string>();

    for (const acceptId of normalizedFa.acceptStates) {
        const pathRegex = calculateRijk(normalizedFa, dummyStartId, acceptId, n, stateIds, memo);

        if (pathRegex && pathRegex !== "∅") {
            finalExpressions.push(`(${pathRegex})`);
        }
    }

    const rawResult = finalExpressions.length > 0
        ? (finalExpressions.length === 1 ? finalExpressions[0] : finalExpressions.map(e => `(${e})`).join(" + "))
        : "∅";
    return simplifyRegexStr(rawResult)
}

export function simplifyRegexStr(regexStr: string): string {
    let cleanStr = regexStr.replace(/\s+/g, "");
    if (!cleanStr || cleanStr === "∅") return "∅";

    try {
        const ast = parseRegex(cleanStr);

        let prevStr = "";
        let currentStr = printRegex(ast);
        let simplifiedAST = ast;

        while (currentStr !== prevStr) {
            prevStr = currentStr;
            simplifiedAST = simplifyRegex(simplifiedAST);
            currentStr = printRegex(simplifiedAST);
        }

        return currentStr.replace(/\+/g, " + ");
    } catch (e) {
        console.error("Simplifier structural exception, falling back to raw string:", e);
        return regexStr;
    }
}

export function simplifyRegex(r: Regex): Regex {
    switch (r.type) {
        case "star": {
            let e = simplifyRegex(r.child);

            if (e.type === "empty" || e.type === "epsilon")
                return { type: "epsilon" };

            if (e.type === "star")
                return e;

            if (e.type === "union") {
                const withoutEpsilon = e.children.filter(c => c.type !== "epsilon");
                if (withoutEpsilon.length === 1) {
                    e = withoutEpsilon[0];
                } else if (withoutEpsilon.length > 1) {
                    e = { type: "union", children: withoutEpsilon };
                }
            }

            return { type: "star", child: e };
        }

        case "concat": {
            const terms = r.children.map(simplifyRegex);
            let flat: Regex[] = [];

            for (const t of terms) {
                if (t.type === "concat") flat.push(...t.children);
                else flat.push(t);
            }

            const filtered = flat.filter(t => t.type !== "epsilon");

            if (filtered.some(t => t.type === "empty"))
                return { type: "empty" };

            if (filtered.length === 0)
                return { type: "epsilon" };

            if (filtered.length === 1)
                return filtered[0];

            let optimized: Regex[] = [...filtered];
            let changed = true;

            while (changed) {
                changed = false;
                for (let i = 0; i < optimized.length; i++) {
                    const current = optimized[i];
                    
                    if (current.type === "star") {
                        const starBaseStr = printRegex(current.child);

                        if (i > 0) {
                            const prev = optimized[i - 1];
                            if (isSubSetOfStar(prev, starBaseStr)) {
                                optimized.splice(i - 1, 1);
                                changed = true;
                                break;
                            }
                        }

                        if (i < optimized.length - 1) {
                            const next = optimized[i + 1];
                            if (isSubSetOfStar(next, starBaseStr)) {
                                optimized.splice(i + 1, 1);
                                changed = true;
                                break;
                            }
                        }
                    }
                }
            }

            return optimized.length === 1 ? optimized[0] : { type: "concat", children: optimized };
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
            if (unique.length === 0) return { type: "empty" };

            const complexPaths = unique.filter(c => c.type === "concat" || c.type === "star");
            const looseSymbols = unique.filter(c => c.type === "symbol");

            if (looseSymbols.length > 1 && complexPaths.length > 0) {
                const looseSymbolsKey = looseSymbols.map(printRegex).sort().join("+");

                for (const path of complexPaths) {
                    if (path.type === "concat") {
                        const concatNode = path as Extract<Regex, { type: "concat" }>;
                        const firstChild = concatNode.children[0] as any;

                        if (firstChild?.type === "union") {
                            const targetUnionKey = firstChild.children
                                .map(printRegex)
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
                        const starBaseStr = printRegex(starNode.child);
                        if (isSubSetOfStar(node, starBaseStr)) return false;
                    }
                    
                    for (const concatNode of concatWithTrailingStars) {
                        const children = (concatNode as any).children;
                        const prefix = children.slice(0, -1);
                        const lastChild = children[children.length - 1];
                        const starBaseStr = printRegex(lastChild.child);
                        
                        if (node.type === "symbol" || node.type === "union") {
                            if (isSubSetOfConcatPrefix(node, prefix, starBaseStr)) {
                                return false; 
                            }
                        }
                    }
                    return true;
                });
            }

            const uniqueMap = new Map<string, Regex>();
            for (const c of unique) {
                uniqueMap.set(printRegex(c), c);
            }

            const finalUnique = Array.from(uniqueMap.values());
            if (finalUnique.length === 1) return finalUnique[0];

            finalUnique.sort((a, b) => printRegex(a).localeCompare(printRegex(b)));

            return {
                type: "union",
                children: finalUnique
            };
        }
    }
    return r;
}

function isSubSetOfStar(node: Regex, starBaseStr: string): boolean {
    if (node.type === "epsilon") return true;
    
    const nodeStr = printRegex(node);
    if (nodeStr === starBaseStr) return true;

    if (node.type === "union") {
        return node.children.every(child => isSubSetOfStar(child, starBaseStr));
    }

    if (node.type === "symbol") {
        const structuralElements = starBaseStr.split("+").map(s => s.trim());
        return structuralElements.includes(nodeStr);
    }

    return false;
}

function isSubSetOfConcatPrefix(node: Regex, prefixNodes: Regex[], starBaseStr: string): boolean {
    if (node.type === "union") {
        return node.children.every(child => isSubSetOfConcatPrefix(child, prefixNodes, starBaseStr));
    }

    const nodeStr = printRegex(node);
    
    if (prefixNodes.length === 1 && prefixNodes[0].type === "union") {
        return prefixNodes[0].children.some(child => {
            const childStr = printRegex(child);
            return childStr === nodeStr || childStr === starBaseStr;
        });
    }
    
    const combinedPrefix = prefixNodes.map(printRegex).join("");
    return nodeStr === combinedPrefix;
}



function keyRegex(r: Regex): string {
    switch (r.type) {
        case "empty":
            return "∅";

        case "epsilon":
            return "ε";

        case "symbol":
            return `s:${r.value}`;

        case "star":
            return `*(${keyRegex(r.child)})`;

        case "concat":
            return `c(${r.children.map(keyRegex).join(",")})`;

        case "union":
            return `u(${r.children.map(keyRegex).sort().join(",")})`;
    }
}

function printRegex(r: Regex): string {
    switch (r.type) {
        case "empty":
            return "∅";

        case "epsilon":
            return "ε";

        case "symbol":
            return r.value;

        case "star":
            const inner =
                r.child.type === "symbol"
                    ? printRegex(r.child)
                    : `(${printRegex(r.child)})`;

            return `${inner}*`;

        case "concat":
            return r.children
                .map(child => {
                    if (child.type === "union") {
                        return `(${printRegex(child)})`;
                    }
                    return printRegex(child);
                })
                .join("");

        case "union":
            return r.children
                .map(printRegex)
                .join(" + ");
    }
}

function deduplicate(list: Regex[]): Regex[] {
    const seen = new Set<string>();

    return list.filter(r => {
        const k = printRegex(r);

        if (seen.has(k))
            return false;

        seen.add(k);
        return true;
    });
}


export function parseRegex(input: string): Regex {
    const s = input.replace(/\s+/g, "");
    let pos = 0;

    function peek(): string | undefined {
        return s[pos];
    }

    function consume(expected?: string): string {
        const ch = s[pos];

        if (ch === undefined) {
            throw new Error("Unexpected end of regex");
        }

        if (expected && ch !== expected) {
            throw new Error(
                `Expected '${expected}' but found '${ch}' at ${pos}`
            );
        }

        pos++;
        return ch;
    }

    function parseUnion(): Regex {
        const terms: Regex[] = [parseConcat()];

        while (peek() === "+") {
            consume("+");
            terms.push(parseConcat());
        }

        if (terms.length === 1) {
            return terms[0];
        }

        return {
            type: "union",
            children: terms
        };
    }

    function parseConcat(): Regex {
        const terms: Regex[] = [];

        while (
            pos < s.length &&
            peek() !== ")" &&
            peek() !== "+"
        ) {
            terms.push(parseStar());
        }

        if (terms.length === 0) {
            return { type: "epsilon" };
        }

        if (terms.length === 1) {
            return terms[0];
        }

        return {
            type: "concat",
            children: terms
        };
    }

    function parseStar(): Regex {
        let node = parseAtom();

        while (peek() === "*") {
            consume("*");

            node = {
                type: "star",
                child: node
            };
        }

        return node;
    }

    function parseAtom(): Regex {
        const ch = peek();

        if (!ch) {
            throw new Error("Unexpected end of regex");
        }

        if (ch === "(") {
            consume("(");

            const expr = parseUnion();

            consume(")");

            return expr;
        }

        if (ch === "ε") {
            consume();
            return { type: "epsilon" };
        }

        if (ch === "∅") {
            consume();
            return { type: "empty" };
        }

        consume();

        return {
            type: "symbol",
            value: ch
        };
    }

    const result = parseUnion();

    if (pos !== s.length) {
        throw new Error(
            `Unexpected token '${s[pos]}' at position ${pos}`
        );
    }

    return result;
}