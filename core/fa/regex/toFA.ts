import { FiniteAutomaton, State, StateId, Transition, Regex, ThompsonGraph } from "@/types"
import { generateId } from "@/core/shared";
import { applyNaiveLayout, stateIsSink, stateIsUnreachable } from "..";
import { convertLambdaNFAtoDFA, minimizeDFA, convertNFAtoDFA } from "..";
import { parseRegex } from "./fromFA";

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
            }
        }
        case "epsilon": {
            const startId = generateId()
            const acceptId = generateId()
            return {
                startId,
                acceptId,
                states: {
                    [startId]: { id: startId, label: "q_λ", x: 0, y: 0 },
                    [acceptId]: { id: acceptId, label: "q_λ_out", x: 0, y: 0 }
                },
                transitions: [
                    {
                        id: generateId(),
                        from: startId,
                        to: acceptId,
                        symbol: null
                    }
                ]
            }
        }
        case "symbol": {
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

                const mergedStates = { ...combinedGraph.states, ...nextGraph.states };
                
                const updatedNextTransitions = nextGraph.transitions.map(t => ({
                    ...t,
                    from: t.from === redundantStartId ? oldAcceptId : t.from,
                    to: t.to === redundantStartId ? oldAcceptId : t.to
                }));

                const finalAcceptId = nextGraph.acceptId === redundantStartId ? oldAcceptId : nextGraph.acceptId;

                delete mergedStates[redundantStartId];

                combinedGraph = {
                    startId: combinedGraph.startId,
                    acceptId: finalAcceptId,
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

            const wrapperStartId = generateId();
            const wrapperAcceptId = generateId();

            const newStates = {
                ...childGraph.states,
                [wrapperStartId]: { id: wrapperStartId, label: "q_star_src", x: 0, y: 0 },
                [wrapperAcceptId]: { id: wrapperAcceptId, label: "q_star_dst", x: 0, y: 0 }
            };

            const starTransitions: Transition[] = [
                { id: generateId(), from: wrapperStartId, to: childGraph.startId, symbol: null },
                { id: generateId(), from: childGraph.acceptId, to: wrapperAcceptId, symbol: null },
                { id: generateId(), from: childGraph.acceptId, to: childGraph.startId, symbol: null },
                { id: generateId(), from: wrapperStartId, to: wrapperAcceptId, symbol: null }
            ];

            return {
                startId: wrapperStartId,
                acceptId: wrapperAcceptId,
                states: newStates,
                transitions: [...childGraph.transitions, ...starTransitions]
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

    const laidOut = applyNaiveLayout(automaton);

    return laidOut;
}

export function extractAlphabetFromAST(ast: Regex): string[] {
    const symbols = new Set<string>();

    function walk(node: Regex) {
        if (!node) return;

        switch (node.type) {
            case "symbol":
                if (node.value && node.value !== "λ" && node.value !== "∅") {
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
