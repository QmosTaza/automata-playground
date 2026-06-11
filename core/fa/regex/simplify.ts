import { FiniteAutomaton, Regex } from "@/types";
import { keyRegex, deduplicate } from "./utils";


function simplifyConcat(r: Regex): Regex {
    if (r.type !== "concat") return r;

    let children: Regex[] = [];

    //flatten so (ab)c -> abc
    for (const child of r.children) {
        if (child.type === "concat") {
            children.push(...child.children);
        } else {
            children.push(child);
        }
    }

    //A∅B -> ∅
    if (children.some(c => c.type === "empty")) {
        return { type: "empty" };
    }

    //AλB -> AB
    children = children.filter(c => c.type !== "lambda");

    //λλλ -> λ
    if (children.length === 0) {
        return { type: "lambda" };
    }

    //λA -> A
    if (children.length === 1) {
        return children[0];
    }

    //A*A* = A*
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

    //redundant stars
    const cleanedChildren: Regex[] = [];
    for (let i = 0; i < children.length; i++) {
        const current = children[i];
        const next = children[i + 1];

        if (next && next.type === "star" && keyRegex(current) === keyRegex(next.child)) {
            // A(A*) -> A*
            continue;
        }
        if (next && current.type === "star" && keyRegex(next) === keyRegex(current.child)) {
            // (A*)A -> A*
            cleanedChildren.push(current);
            i++;
            continue;
        }
        cleanedChildren.push(current);
    }
    children = cleanedChildren;

    if (children.length === 0) {
        return { type: "lambda" };
    }

    if (children.length === 1) {
        return children[0];
    }

    return {
        type: "concat",
        children
    }
}




function simplifyUnion(r: Regex): Regex {
    if (r.type !== "union") return r;

    let children: Regex[] = [];

    //flatten so (a + b) + c -> a + b + c
    for (const child of r.children) {
        if (child.type === "union") children.push(...child.children);
        else children.push(child);
    }

    //A + ∅ + B -> A + B
    children = children.filter(c => c.type !== "empty");


    const hasLambda = children.some(c => c.type === "lambda");

    // Collapse multiple stars (a* + a*b* + a*b*c*) -> a*b*c*
    const starNodes = children.filter(c => c.type === "star") as any[];
    let collapsed: Regex | null = null;
    for (const star of starNodes) {
        if (isPureStarLanguage(children, star.child)) {
            // Ensure we don't lose lambda if present
            if (hasLambda && !children.some(c => c.type === "lambda" && c !== star)) {
                // Keep lambda separate if needed
                collapsed = star;
                break;
            }
            collapsed = star;
            break;
        }
    }
    if (collapsed) {
        if (hasLambda) {
            const expressionsWithoutLambdaOrStar = children.filter(
                c => c.type !== "lambda" && keyRegex(c) !== keyRegex(collapsed)
            );
            if (expressionsWithoutLambdaOrStar.length > 0) {
                return {
                    type: "union",
                    children: deduplicate([{ type: "lambda" }, collapsed])
                };
            }
        }
        return collapsed;
    }

    //A* + λ  = A*
    if (hasLambda) {
        const nonLambda = children.filter(c => c.type !== "lambda");

        if (nonLambda.length === 1 && nonLambda[0].type === "star") {
            return nonLambda[0];
        }

        //AA* + λ = A*
        if (nonLambda.length === 1 && nonLambda[0].type === "concat") {
            const concat = nonLambda[0];
            if (concat.children.length === 2) {
                const [first, second] = concat.children;
                //mini helper i will never use again
                const cleanLambdaForCompare = (r: Regex): string => {
                    if (r.type === "union") {
                        const noLambda = r.children.filter(c => c.type !== "lambda");
                        if (noLambda.length === 1) return keyRegex(noLambda[0]);
                        return `u(${noLambda.map(cleanLambdaForCompare).sort().join(",")})`;
                    }
                    if (r.type === "concat") {
                        return `c(${r.children.map(cleanLambdaForCompare).join(",")})`;
                    }
                    if (r.type === "star") {
                        return `*(${cleanLambdaForCompare(r.child)})`;
                    }
                    return keyRegex(r);
                };

                const firstKey = cleanLambdaForCompare(first);
                // AA*
                if (second.type === "star") {
                    const secondChildKey = cleanLambdaForCompare(second.child);
                    if (firstKey === secondChildKey) {
                        return second; //A*
                    }
                }
                // A*A
                if (first.type === "star") {
                    const firstChildKey = cleanLambdaForCompare(first.child);
                    if (cleanLambdaForCompare(second) === firstChildKey) {
                        return first; //A*
                    }
                }
            }
        }
    }

    //A + A* = A*
    const stars = children.filter(c => c.type === "star") as any[];
    children = children.filter(node => {
        if (node.type === "star") return true;
        return !stars.some(
            s => keyRegex(s.child) === keyRegex(node)
        );
    });

    if (children.length === 0) return { type: "empty" };
    if (children.length === 1) return children[0];

    const factored = factorUnion(children);



    return factored;
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

    // (A + λ)* = A*
    if (r.child.type === "union") {
        const cleaned = r.child.children
            .filter(c => c.type !== "lambda")
            .map(c => c.type === "star" ? c.child : c);

        const deduped = deduplicate(cleaned);

        if (deduped.length === 0) {
            return { type: "lambda" };
        }

        if (deduped.length === 1) {
            // Avoid more (A*)*
            if (deduped[0].type === "star") {
                return deduped[0];
            }
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
//FACTORING
//////////////

function factorUnion(children: Regex[]): Regex {
    //nothing to factor
    if (children.length === 0) return { type: "empty" };
    if (children.length === 1) return children[0];

    //separate λs
    const hasLambda = children.some(c => c.type === "lambda");
    const nonLambdaChildren = children.filter(c => c.type !== "lambda");

    if (nonLambdaChildren.length === 0) {
        return { type: "lambda" };
    }

    //pay attention to the multiple concatenation we may be summing up
    //like ab + ac or ba + ca
    const paths = nonLambdaChildren.map(c => asConcatArray(c));


    //PREFIX
    //detect a if ab + ac
    const prefix: Regex[] = longestCommonPrefix(paths);
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

    //SUFFIX
    //detect a if ba + ca
    const suffix: Regex[] = longestCommonSuffix(paths);
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

        const matches = paths.every(
            p => p[i] && keyRegex(p[i]) === k
        );
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
        const first =
            paths[0][paths[0].length - offset];
        if (!first) break;

        const k = keyRegex(first);
        const matches = paths.every(p => {
            const candidate =
                p[p.length - offset];
            return (
                candidate &&
                keyRegex(candidate) === k
            );
        });
        if (!matches) break;

        suffix.unshift(first);
        offset++;
    }

    return suffix;
}

//convenient helpers for factorUnion
function asConcatArray(r: Regex): Regex[] {
    return r.type === "concat"
        ? r.children
        : [r];
}

function buildConcat(parts: Regex[]): Regex {
    if (parts.length === 0) return { type: "lambda" };
    if (parts.length === 1) return parts[0];

    return {
        type: "concat",
        children: parts
    };
}

//simplifier helpers
function isPureStarLanguage(children: Regex[], base: Regex): boolean {
    const baseKey = keyRegex(base);

    for (const node of children) {
        if (node.type === "empty" || node.type === "lambda") continue;

        // A*
        if (node.type === "star" && keyRegex(node.child) === baseKey) {
            continue;
        }

        // A
        if (keyRegex(node) === baseKey) {
            continue;
        }

        // simple AA* and viceversa
        if (node.type === "concat") {
            const allValid = node.children.every(c => {
                if (c.type === "star" && keyRegex(c.child) === baseKey) return true;
                if (keyRegex(c) === baseKey) return true;
                return false;
            });
            if (allValid) continue;
        }

        return false;
    }

    return true;
}


// secure transformations
function canonical(r: Regex): Regex {
    switch (r.type) {
        case "concat": {
            let parts = r.children.flatMap(canonical);

            // ∅ annihilates
            if (parts.some(p => p.type === "empty")) {
                return { type: "empty" };
            }

            // remove λ
            parts = parts.filter(p => p.type !== "lambda");

            if (parts.length === 0) return { type: "lambda" };
            if (parts.length === 1) return parts[0];

            // Flatten nested concats
            const flattened: Regex[] = [];
            for (const part of parts) {
                if (part.type === "concat") {
                    flattened.push(...part.children);
                } else {
                    flattened.push(part);
                }
            }

            return { type: "concat", children: flattened };
        }

        case "union": {
            let parts = r.children.flatMap(canonical);

            // ∅ annihilates
            parts = parts.filter(p => p.type !== "empty");

            //maintain lambda
            parts = deduplicate(parts);

            if (parts.length === 0) return { type: "empty" };
            if (parts.length === 1) return parts[0];

            return { type: "union", children: parts };
        }

        case "star": {
            const c = canonical(r.child);
            if (c.type === "empty" || c.type === "lambda") {
                return { type: "lambda" };
            }
            if (c.type === "star") {
                return c;
            }
            return { type: "star", child: c };
        }

        default:
            return r;
    }
}

// simplifyStep only heuristic rules
function simplifyStep(r: Regex): Regex {
    switch (r.type) {
        case "concat":
            return simplifyConcat(r);
        case "union":
            return simplifyUnion(r);
        case "star":
            return simplifyStar(r);
        default:
            return r;
    }
}

// main pipeline: canonical → simplify → canonical
export function simplifyRegex(r: Regex, maxIterations: number = 50): Regex {
    let current = canonical(r);
    let previous: Regex | null = null;
    let iterations = 0;

    while (iterations < maxIterations) {
        const next = simplifyStep(current);
        const normalized = canonical(next);

        if (keyRegex(normalized) === keyRegex(current)) {
            return normalized;
        }

        if (previous && keyRegex(normalized) === keyRegex(previous)) {
            return normalized;
        }

        previous = current;
        current = normalized;
        iterations++;
    }

    return current;
}