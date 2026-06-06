import { FiniteAutomaton, StateId, Transition, Regex } from "@/types"

export function generateId(): string {
    return crypto.randomUUID()
}



//REGEX EXPRESSIONS
export function calculateRij0(fa: FiniteAutomaton, stateI: StateId, stateJ: StateId): string {
    const transitions = fa.transitions.filter(
        t => t.from === stateI && t.to === stateJ
    );

    let result: string = stateI === stateJ ? "ε" : "";

    for (const t of transitions) {
        const symbolLabel = (t.symbol === "" || t.symbol === null) ? "ε" : t.symbol;
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
    const { normalizedFa, dummyStartId } = normalizeStartStatesForRegex(fa);

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

    const rawResult = finalExpressions.length > 0 ? finalExpressions.join(" + ") : "∅";
    return printRegex(simplifyRegex(parseRegex(rawResult)))
}

export function simplifyRegex(regex: Regex): Regex {
    return regex
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
        const k = keyRegex(r);

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