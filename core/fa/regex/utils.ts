import { Regex } from "@/types";

export function regexEquals(a: Regex, b: Regex) : boolean {
    return keyRegex(a) === keyRegex(b);
}

export function keyRegex(r: Regex): string {
    switch (r.type) {
        case "empty":
            return "∅";

        case "epsilon":
            return "λ";

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

export function printRegex(r: Regex): string {
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

export function deduplicate(list: Regex[]): Regex[] {
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