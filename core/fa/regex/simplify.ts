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
    children = children.filter(c => c.type !== "epsilon");

    //λλλ -> λ
    if (children.length === 0) {
        return { type: "epsilon" };
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

    //A(A*) -> A*
    for (let i = 0; i < children.length - 1; i++) {
        const a = children[i];
        const b = children[i + 1];

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
        if (child.type === "union") {
            children.push(...child.children);
        } else {
            children.push(child);
        }
    }

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
    const hasEpsilon =
        children.some(c => c.type === "epsilon");
    if (hasEpsilon) {
        const hasStar = children.find(
            c => c.type === "star"
        );
        if (hasStar) {
            children = children.filter(
                c => c.type !== "epsilon"
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
    if (r.child.type === "empty" || r.child.type === "epsilon") {
        return {
            type: "epsilon"
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
    if (r.child.type === "union") {
        const withoutEpsilon =
            r.child.children.filter(c => c.type !== "epsilon");
        return {
            type: "star",
            child:
                withoutEpsilon.length === 1
                    ? withoutEpsilon[0]
                    : {
                        type: "union",
                        children: withoutEpsilon
                    }
        };
    }

    return {
        type: "star",
        child: r.child
    }
}


//////////////
//FACTORING
//////////////

function factorUnion(children: Regex[]): Regex {
    //nothing to factor
    if (children.length <= 1) {
        return children[0];
    }

    //pay attention to the multiple concatenation we may be summing up
    //like ab + ac or ba + ca
    const paths = children.map(c =>
        asConcatArray(c)
    );

    //PREFIX
    //detect a if ab + ac
    const prefix = longestCommonPrefix(paths);
    //ab + ac = a(b+c)
    if (prefix.length > 0 && prefix.length < paths[0].length) {
        const remainders = paths.map(p => {
            const tail = p.slice(prefix.length);

            return buildConcat(tail)
        });

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
    if (parts.length === 0) return { type: "epsilon" };
    if (parts.length === 1) return parts[0];

    return {
        type: "concat",
        children: parts
    };
}