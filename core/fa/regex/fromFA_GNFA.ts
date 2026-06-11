import { GNFA } from "@/types";
import { Regex, FiniteAutomaton, StateId, } from "@/types";
import { simplifyRegex } from "./simplify";
import { printRegex, empty } from "./utils"
import { convertLambdaNFAtoDFA, minimizeDFA, convertNFAtoDFA } from "..";
import { stateIsSink, stateIsUnreachable } from "..";

export function convertAutomatonToRegex(fa: FiniteAutomaton): string {
    //Convert fa to GNFA
    const g = initGNFA(fa);

    //Determine optimal order of elimination with a good old heuristic
    while (g.states.length > 2) { //until only S and F remain
        const order = pickEliminationOrder(g);

        //remove states
        const bestState = order[0];
        eliminateState(g, bestState);
    }

    //extract the last transition s -> k (= regex)
    const finalRegex = g.R.get(g.start)?.get(g.accept) ?? { type: "empty" };

    //last simplification and print :))
    return printRegex(simplifyRegex(finalRegex));
}

function initGNFA(fa: FiniteAutomaton): GNFA {
    const S = "S"; //new start connects to old start with λ
    const F = "F"; //old accept states connect to this new accept with λ

    const states = [S, ...Object.keys(fa.states), F]; //everything else copied the same

    const R = new Map<string, Map<string, Regex>>();

    function set(i: string, j: string, r: Regex) {
        if (!R.has(i)) R.set(i, new Map());
        R.get(i)!.set(j, r);
    }

    // init all edges as ∅
    for (const i of states) {
        for (const j of states) {
            set(i, j, { type: "empty" });
        }
    }

    // S → start
    for (const s of fa.startStates) {
        set(S, s, { type: "lambda" });
    }

    // accept → F
    for (const a of fa.acceptStates) {
        set(a, F, { type: "lambda" });
    }

    // transitions
    for (const t of fa.transitions) {
        const label: Regex =
            !t.symbol || t.symbol === ""
                ? { type: "lambda" }
                : { type: "symbol", value: t.symbol };

        const prev: Regex = R.get(t.from)?.get(t.to) ?? { type: "empty" };

        set(t.from, t.to, {
            type: "union",
            children: [prev, label]
        });
    }

    return { states, start: S, accept: F, R };
}


function eliminateState(g: GNFA, k: string) {
    const states = g.states;
    const R = g.R;

    //loops k -> k
    const rkk = R.get(k)!.get(k) ?? empty();

    for (const i of states) {
        if (i === k) continue;

        for (const j of states) {
            if (j === k) continue;

            // check if paths i -> k -> j are empty
            const rik = R.get(i)!.get(k) ?? empty();
            const rkj = R.get(k)!.get(j) ?? empty();
            const rij = R.get(i)!.get(j) ?? empty();

            //construct path i->k->j
            const loop: Regex = {
                type: "concat",
                children: [
                    rik,    // i -> k
                    { type: "star", child: rkk }, // 0+ loops in k
                    rkj     // k -> j
                ]
            };

            //unify with old path i->j
            const updated: Regex = simplifyRegex({
                type: "union",
                children: [rij, loop]
            });

            R.get(i)!.set(j, updated);
        }
    }

    // Remove k from the matrix
    for (const i of states) {
        R.get(i)!.delete(k);
    }
    R.delete(k);

    g.states = states.filter(s => s !== k);
}

//HEURISTIC to decide which states to eliminate first
function pickEliminationOrder(g: GNFA): string[] {
    const candidates = g.states.filter(s => s !== g.start && s !== g.accept);

    // Calculate cost of eliminating state
    const getWeight = (state: string) => {
        let inDegree = 0;
        let outDegree = 0;

        for (const other of g.states) {
            if (other === state) continue;

            //count real edges (non empty)
            if (g.R.get(other)?.get(state)?.type !== "empty") inDegree++;
            if (g.R.get(state)?.get(other)?.type !== "empty") outDegree++;
        }

        // number of new paths created = (inDegree * outDegree)
        return inDegree * outDegree;
    };

    // sort from less to more weight 
    return candidates.sort((a, b) => getWeight(a) - getWeight(b));
}

