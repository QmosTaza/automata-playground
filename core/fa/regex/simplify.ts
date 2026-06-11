import { FiniteAutomaton, Regex } from "@/types";
import { keyRegex, deduplicate } from "./utils";

export function simplifyRegex(r: Regex): Regex {
    let current = r;

    while (true) {
        const next = simplifyStep(current);

        if (keyRegex(next) === keyRegex(current)) {
            return next;
        }

        current = next;
    }
}

function simplifyStep(r: Regex): Regex {
    switch (r.type) {
        case "concat":
            return simplifyConcat(
                simplifyChildren(r)
            );

        case "union":
            return simplifyUnion(
                simplifyChildren(r)
            );

        case "star":
            return simplifyStar(
                simplifyChildren(r)
            );

        default:
            return r;
    }
}

function simplifyChildren(r: Regex): Regex {
    switch (r.type) {
        case "star":
            return {
                type: "star",
                child: simplifyRegex(r.child)
            };

        case "concat":
            return {
                type: "concat",
                children: r.children.map(simplifyRegex)
            };

        case "union":
            return {
                type: "union",
                children: r.children.map(simplifyRegex)
            };

        default:
            return r;
    }
}


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
    for (let i = 0; i < children.length - 1; i++) {
        const a = children[i];
        const b = children[i + 1];
        //A(A*) -> A*
        if (
            b.type === "star" &&
            keyRegex(a) === keyRegex(b.child)
        ) {
            children.splice(i, 1);
            i--;
        }
        // (A*)A -> A*
        if (
            a.type === "star" &&
            keyRegex(b) === keyRegex(a.child)
        ) {
            children.splice(i + 1, 1);
            i--;
        }

        // A*(A + B)* -> (A + B)* since A is in union
        // includes similar constructions
        if (a.type === "star" && b.type === "star") {
            const keysA = getStarElements(a);
            const keysB = getStarElements(b);

            // If all elements of A are in B, B absorbs A
            const aSubsetOfB = [...keysA].every(k => keysB.has(k));
            if (aSubsetOfB) {
                children.splice(i, 1);
                i--;
                continue;
            }

            // Viceversa
            const bSubsetOfA = [...keysB].every(k => keysA.has(k));
            if (bSubsetOfA) {
                children.splice(i + 1, 1);
                i--;
                continue;
            }
        }
    }

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
    let flattened: Regex[] = [];
    for (const child of r.children) {
        if (child.type === "union") {
            flattened.push(...child.children);
        } else {
            flattened.push(child);
        }
    }
    children = flattened;

    // detect (a* + a*b* + a*b*c*) -> a*b*c*
    children = children.filter((current, _, self) => {
        return !self.some(other => {
            if (other === current) return false;

            const currentArr = asConcatArray(current);
            const otherArr = asConcatArray(other);

            const currentElements = currentArr.map(c => c.type === "star" ? keyRegex(c.child) : keyRegex(c));
            const otherElements = otherArr.map(c => c.type === "star" ? keyRegex(c.child) : keyRegex(c));

            let otherIdx = 0;
            const isSubsequence = currentElements.every(el => {
                while (otherIdx < otherElements.length && otherElements[otherIdx] !== el) {
                    otherIdx++;
                }
                return otherIdx < otherElements.length;
            });

            if (!isSubsequence) return false;

            const extraElements = otherArr.filter(c => !currentArr.some(curr => keyRegex(curr) === keyRegex(c)));
            const extrasAreOptional = extraElements.every(c => c.type === "star");

            return extrasAreOptional;
        });
    });

    //A + ∅ + B -> A + B
    children = children.filter(c => c.type !== "empty");

    // a + b = b + a
    children.sort((a, b) =>
        keyRegex(a).localeCompare(keyRegex(b))
    );

    //A + A = A
    children = deduplicate(children)

    //∅ + ∅ = ∅
    if (children.length === 0) {
        return { type: "empty" };
    }

    //A + ∅ -> A
    if (children.length === 1) {
        return children[0];
    }

    //A + A* = A*
    const stars = children.filter(
        c => c.type === "star"
    ) as Extract<Regex, { type: "star" }>[];
    children = children.filter(node => {
        if (node.type === "star") return true;
        return !stars.some(
            star => keyRegex(star.child) === keyRegex(node)
        );
    });
    if (children.length === 1) {
        return children[0];
    }

    //A* + λ = A*
    const hasLambda =
        children.some(c => c.type === "lambda");
    if (hasLambda) {
        const hasStar = children.find(
            c => c.type === "star"
        );
        if (hasStar) {
            children = children.filter(
                c => c.type !== "lambda"
            );
        }
    }
    if (children.length === 1) {
        return children[0];
    }

    children.sort((a, b) =>
        keyRegex(a).localeCompare(keyRegex(b))
    );

    const factored = factorUnion(children);
    return factored;
}



function simplifyStar(r: Regex): Regex {
    if (r.type !== "star") return r;

    //∅* = λ ; λ* = λ
    if (r.child.type === "empty" || r.child.type === "lambda") {
        return {
            type: "lambda"
        };
    }

    //(A*)*
    if (r.child.type === "star") {
        return {
            type: "star",
            child: r.child.child
        }
    }

    //(A + λ)* = A*
    //(A* + B)* = (A+B)* 
    if (r.child.type === "union") {
        const cleaned = r.child.children
            .filter(c => c.type !== "lambda")
            .map(c => c.type === "star" ? c.child : c);

        const deduped = deduplicate(cleaned);

        if (deduped.length === 0) {
            return { type: "lambda" };
        }

        if (deduped.length === 1) {
            return { type: "star", child: deduped[0] };
        }

        if (deduped.length === 2) {
            const [c1, c2] = deduped;

            // (A + B A) -> B*A*
            if (c2.type === "concat" && c2.children.length > 1) {
                const lastChild = c2.children[c2.children.length - 1];
                if (keyRegex(lastChild) === keyRegex(c1)) {
                    const baseB = c2.children.slice(0, -1);
                    const rB = baseB.length === 1 ? baseB[0] : { type: "concat" as const, children: baseB };

                    return simplifyRegex({
                        type: "concat" as const,
                        children: [
                            { type: "star" as const, child: rB },
                            { type: "star" as const, child: c1 }
                        ]
                    } as Regex);
                }
            }

            // (A + A B) -> A*B*
            if (c2.type === "concat" && c2.children.length > 1) {
                const firstChild = c2.children[0];
                if (keyRegex(firstChild) === keyRegex(c1)) {
                    const baseB = c2.children.slice(1);
                    const rB = baseB.length === 1 ? baseB[0] : { type: "concat" as const, children: baseB };

                    return simplifyRegex({
                        type: "concat" as const,
                        children: [
                            { type: "star" as const, child: c1 },
                            { type: "star" as const, child: rB }
                        ]
                    } as Regex);
                }
            }
        }

        return {
            type: "star",
            child: { type: "union", children: deduped }
        };
    }

    //(A*B*)* -> (A+B)*
    if (r.child.type === "concat") {
        const allChildrenAreStars = r.child.children.every(c => c.type === "star");
        if (allChildrenAreStars) {
            return {
                type: "star",
                child: {
                    type: "union",
                    children: r.child.children.map(c => (c as any).child)
                }
            };
        }
    }

    return {
        type: "star",
        child: r.child
    }
}

// Helper for base components in a star (used to eliminate redundant stars in concat)
function getStarElements(r: Regex): Set<string> {
    if (r.type !== "star") return new Set();
    if (r.child.type === "union") {
        return new Set(r.child.children.map(c => keyRegex(c)));
    }
    return new Set([keyRegex(r.child)]);
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
    if (nonLambdaChildren.length === 1 && !hasLambda) {
        return nonLambdaChildren[0];
    }

    //pay attention to the multiple concatenation we may be summing up
    //like ab + ac or ba + ca
    const paths = nonLambdaChildren.map(c =>
        asConcatArray(c)
    );

    //PREFIX
    //detect a if ab + ac
    const prefix = longestCommonPrefix(paths);
    //ab + ac = a(b+c)
    if (prefix.length > 0 && prefix.length < paths[0].length) {
        const remainders = paths.map(p => {
            const tail = p.slice(prefix.length)
            return buildConcat(tail)
        });

        //inject λs
        if (hasLambda) {
            remainders.push({ type: "lambda" });
        }

        return simplifyRegex({
            type: "concat",
            children: [
                ...prefix,
                simplifyRegex({
                    type: "union",
                    children: remainders
                })
            ]
        });
    }

    //SUFFIX
    //detect a if ba + ca
    const suffix = longestCommonSuffix(paths);
    //ba + ca = (b+c)a
    if (suffix.length > 0 && suffix.length < paths[0].length) {
        const remainders = paths.map(p => {
            const head = p.slice(0, p.length - suffix.length);
            return buildConcat(head)
        });

        //inject λs
        if (hasLambda) {
            remainders.push({ type: "lambda" });
        }

        return simplifyRegex({
            type: "concat",
            children: [
                simplifyRegex({
                    type: "union",
                    children: remainders
                }),
                ...suffix
            ]
        });
    }

    return {
        type: "union",
        children
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