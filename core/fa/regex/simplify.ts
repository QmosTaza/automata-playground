import { FiniteAutomaton, Regex } from "@/types";
import { keyRegex, deduplicate } from "./utils";

function simplifyConcat(r: Regex): Regex {
    if (r.type !== "concat") return r;

    let children: Regex[] = [];

    // (ab)c -> abc
    for (const child of r.children) {
        if (child.type === "concat") {
            children.push(...child.children);
        } else {
            children.push(child);
        }
    }

    // A ∅ B -> ∅
    if (children.some(c => c.type === "empty")) {
        return { type: "empty" };
    }

    // A λ B -> AB
    children = children.filter(c => c.type !== "lambda");

    // λλλ -> λ
    if (children.length === 0) {
        return { type: "lambda" };
    }

    // λA -> A
    if (children.length === 1) {
        return children[0];
    }

    // A* A* -> A*
    const optimized: Regex[] = [];
    for (const child of children) {
        const last = optimized[optimized.length - 1];
        if (
            last?.type === "star" &&
            child.type === "star" &&
            keyRegex(last.child) === keyRegex(child.child)
        ) {
            continue;
        }
        optimized.push(child);
    }
    children = optimized;

    if (children.length === 1) {
        return children[0];
    }

    return {
        type: "concat",
        children
    };
}

function simplifyUnion(r: Regex): Regex {
    if (r.type !== "union") return r;

    let children: Regex[] = [];

    // (a + b) + c -> a + b + c
    for (const child of r.children) {
        if (child.type === "union") children.push(...child.children);
        else children.push(child);
    }

    // A + ∅ + B -> A + B
    children = children.filter(c => c.type !== "empty");

    // A + A -> A
    children = deduplicate(children);

    if (children.length === 0) return { type: "empty" };
    if (children.length === 1) return children[0];

    const hasLambda = children.some(c => c.type === "lambda");

    // A + A* -> A*
    const stars = children.filter(c => c.type === "star") as any[];
    children = children.filter(node => {
        if (node.type === "star") return true;
        return !stars.some(s => keyRegex(s.child) === keyRegex(node));
    });

    // A* + λ -> A*
    if (hasLambda) {
        const nonLambda = children.filter(c => c.type !== "lambda");
        
        // If the only other element is a star, the star completely absorbs λ safely.
        if (nonLambda.length === 1 && nonLambda[0].type === "star") {
            return nonLambda[0];
        }
    }

    if (children.length === 0) return { type: "empty" };
    if (children.length === 1) return children[0];

    //(ab + ac -> a(b + c))
    return factorUnion(children);
}

function simplifyStar(r: Regex): Regex {
    if (r.type !== "star") return r;

    // ∅* = λ ; λ* = λ
    if (r.child.type === "empty" || r.child.type === "lambda") {
        return { type: "lambda" };
    }

    // (A*)* = A*
    if (r.child.type === "star") {
        return r.child;
    }

    // (A + λ)* -> A*
    if (r.child.type === "union") {
        const cleaned = r.child.children
            .filter(c => c.type !== "lambda")
            .map(c => c.type === "star" ? c.child : c);

        const deduped = deduplicate(cleaned);

        if (deduped.length === 0) {
            return { type: "lambda" };
        }

        if (deduped.length === 1) {
            if (deduped[0].type === "star") return deduped[0];
            return { type: "star", child: deduped[0] };
        }

        return {
            type: "star",
            child: { type: "union", children: deduped }
        };
    }

    return r;
}

//////////////
// FACTORING
//////////////

function factorUnion(children: Regex[]): Regex {
    if (children.length === 0) return { type: "empty" };
    if (children.length === 1) return children[0];

    const hasLambda = children.some(c => c.type === "lambda");
    const nonLambdaChildren = children.filter(c => c.type !== "lambda");

    if (nonLambdaChildren.length === 0) {
        return { type: "lambda" };
    }

    const paths = nonLambdaChildren.map(c => asConcatArray(c));

    // PREFIX: ab + ac -> a(b + c)
    const prefix = longestCommonPrefix(paths);
    if (prefix.length > 0 && paths.some(p => p.length > prefix.length)) {
        const remainders = paths.map(p => buildConcat(p.slice(prefix.length)));
        const innerUnion: Regex = remainders.length === 1
            ? remainders[0]
            : { type: "union", children: deduplicate(remainders) };

        const factoredConcat: Regex = {
            type: "concat",
            children: [...prefix, innerUnion]
        };

        if (hasLambda) {
            return { type: "union", children: deduplicate([{ type: "lambda" }, factoredConcat]) };
        }
        return factoredConcat;
    }

    // SUFFIX: ba + ca -> (b + c)a
    const suffix = longestCommonSuffix(paths);
    if (suffix.length > 0 && paths.some(p => p.length > suffix.length)) {
        const remainders = paths.map(p => buildConcat(p.slice(0, p.length - suffix.length)));
        const innerUnion: Regex = remainders.length === 1
            ? remainders[0]
            : { type: "union", children: deduplicate(remainders) };

        const factoredConcat: Regex = {
            type: "concat",
            children: [innerUnion, ...suffix]
        };

        if (hasLambda) {
            return { type: "union", children: deduplicate([{ type: "lambda" }, factoredConcat]) };
        }
        return factoredConcat;
    }

    if (hasLambda) {
        return {
            type: "union",
            children: deduplicate([{ type: "lambda" }, ...nonLambdaChildren])
        };
    }

    return {
        type: "union",
        children: deduplicate(nonLambdaChildren)
    };
}

function longestCommonPrefix(paths: Regex[][]): Regex[] {
    if (paths.length === 0) return [];
    const prefix: Regex[] = [];
    let i = 0;
    while (true) {
        const first = paths[0][i];
        if (!first) break;
        const k = keyRegex(first);
        const matches = paths.every(p => p[i] && keyRegex(p[i]) === k);
        if (!matches) break;
        prefix.push(first);
        i++;
    }
    return prefix;
}

function longestCommonSuffix(paths: Regex[][]): Regex[] {
    if (paths.length === 0) return [];
    const suffix: Regex[] = [];
    let offset = 1;
    while (true) {
        const first = paths[0][paths[0].length - offset];
        if (!first) break;
        const k = keyRegex(first);
        const matches = paths.every(p => {
            const candidate = p[p.length - offset];
            return candidate && keyRegex(candidate) === k;
        });
        if (!matches) break;
        suffix.unshift(first);
        offset++;
    }
    return suffix;
}

function asConcatArray(r: Regex): Regex[] {
    return r.type === "concat" ? r.children : [r];
}

function buildConcat(parts: Regex[]): Regex {
    if (parts.length === 0) return { type: "lambda" };
    if (parts.length === 1) return parts[0];
    return { type: "concat", children: parts };
}

function canonical(r: Regex): Regex {
    switch (r.type) {
        case "concat": {
            let parts = r.children.flatMap(canonical);
            if (parts.some(p => p.type === "empty")) return { type: "empty" };
            parts = parts.filter(p => p.type !== "lambda");
            if (parts.length === 0) return { type: "lambda" };
            if (parts.length === 1) return parts[0];
            
            const flattened: Regex[] = [];
            for (const part of parts) {
                if (part.type === "concat") flattened.push(...part.children);
                else flattened.push(part);
            }
            return { type: "concat", children: flattened };
        }
        case "union": {
            let parts = r.children.flatMap(canonical);
            parts = parts.filter(p => p.type !== "empty");
            parts = deduplicate(parts);
            if (parts.length === 0) return { type: "empty" };
            if (parts.length === 1) return parts[0];
            return { type: "union", children: parts };
        }
        case "star": {
            const c = canonical(r.child);
            if (c.type === "empty" || c.type === "lambda") return { type: "lambda" };
            if (c.type === "star") return c;
            return { type: "star", child: c };
        }
        default:
            return r;
    }
}

function simplifyStep(r: Regex): Regex {
    switch (r.type) {
        case "concat": return simplifyConcat(r);
        case "union": return simplifyUnion(r);
        case "star": return simplifyStar(r);
        default: return r;
    }
}

export function simplifyRegex(r: Regex, maxIterations: number = 50): Regex {
    let current = canonical(r);
    let previous: Regex | null = null;
    let iterations = 0;

    while (iterations < maxIterations) {
        const next = simplifyStep(current);
        const normalized = canonical(next);

        if (keyRegex(normalized) === keyRegex(current)) return normalized;
        if (previous && keyRegex(normalized) === keyRegex(previous)) return normalized;

        previous = current;
        current = normalized;
        iterations++;
    }
    return current;
}