import { NFA, FiniteAutomaton, StateId, State, Transition, SimulationResult, SimulationStep, LambdaNFA } from "../../../types"
import { getTransitionsFromState } from "../edit";
import { generateId } from "@/core/shared";

export function runLambdaNFA(fa: LambdaNFA, input: string): SimulationResult[] {
    const allPathResults: SimulationResult[] = []

    for (const startState of fa.startStates) {
        const initialClosure = getLambdaClosure(fa, startState);

        for (const stateId of initialClosure) {
            const firstStep: SimulationStep = {
                state: stateId,
                stepNumber: 0,
                symbol: null,
                remainingInput: input
            };
            exploreLambdaNFAPath(fa, input, stateId, [firstStep], new Set(), allPathResults);
        }
    }
    return allPathResults
}

export function exploreLambdaNFAPath(fa: LambdaNFA, remainingInput: string, currentStateId: StateId, currentSteps: SimulationStep[], visitedLambdaTransitions: Set<string>, globalResults: SimulationResult[]) {
    const transitions = getTransitionsFromState(fa, currentStateId);
    const lambdaTransitions = transitions.filter(t => t.symbol === null);
    
    for (const t of lambdaTransitions) {
        const transitionKey = `${currentStateId}->${t.to}@lambda-${remainingInput.length}`;
        
        if (!visitedLambdaTransitions.has(transitionKey)) {
            const newStep: SimulationStep = {
                state: t.to,
                stepNumber: currentSteps.length,
                symbol: null,
                remainingInput: remainingInput
            };

            const nextVisited = new Set(visitedLambdaTransitions).add(transitionKey);

            exploreLambdaNFAPath(
                fa,
                remainingInput,
                t.to,
                [...currentSteps, newStep],
                nextVisited,
                globalResults
            );
        }
    }

    if (remainingInput.length === 0) {
        globalResults.push({
            accepted: fa.acceptStates.includes(currentStateId),
            steps: currentSteps
        });
        return;
    }

    const symbol = remainingInput[0];
    const nextRemaining = remainingInput.slice(1);

    const textTransitions = transitions.filter(t => t.symbol === symbol);

    if (textTransitions.length === 0 && lambdaTransitions.length === 0) {
        globalResults.push({
            accepted: false,
            error: `Missing transition for '${symbol}'`,
            steps: currentSteps
        });
        return;
    }

    for (const t of textTransitions) {
        const newStep: SimulationStep = {
            state: t.to,
            stepNumber: currentSteps.length,
            symbol: symbol,
            remainingInput: nextRemaining
        };

        exploreLambdaNFAPath(
            fa,
            nextRemaining,
            t.to,
            [...currentSteps, newStep],
            new Set(), 
            globalResults
        );
    }

}



export function getLambdaClosure(automaton: LambdaNFA, startStateId: string): Set<string> {
    const closure = new Set<string>([startStateId]);
    const queue: string[] = [startStateId];
    const lambdaMap = new Map<string, string[]>();

    if (!automaton || !automaton.transitions) return closure;

    // Micro-diagnostic loop
    let edgeCount = 0;
    for (const t of automaton.transitions) {
        edgeCount++;
        if (!t) continue;

        // Support null, undefined, empty string, greek letters, or string versions
        const isLambda = 
            t.symbol === null || 
            t.symbol === undefined || 
            t.symbol === "" || 
            t.symbol === "λ" || 
            t.symbol === "ε" ||
            String(t.symbol).toLowerCase() === "lambda" ||
            String(t.symbol).toLowerCase() === "epsilon";

        if (isLambda) {
            if (!lambdaMap.has(t.from)) lambdaMap.set(t.from, []);
            lambdaMap.get(t.from)!.push(t.to);
        }
    }

    let queueIterations = 0;
    while (queue.length > 0) {
        queueIterations++;
        if (queueIterations > 2000) {
            console.error(`[CLOSURE CRASH] Queue went infinite on state: ${startStateId}`);
            debugger;
            break;
        }

        const currentState = queue.shift()!;
        const neighbors = lambdaMap.get(currentState);

        if (neighbors) {
            for (const nextStateId of neighbors) {
                if (!closure.has(nextStateId)) {
                    closure.add(nextStateId);
                    queue.push(nextStateId);
                }
            }
        }
    }

    return closure;
}

export function convertLambdaNFAtoNFA(fa: FiniteAutomaton): FiniteAutomaton {
    console.log("=== 🔬 MICROSCOPIC DIAGNOSTIC START ===");
    const newTransitions: Transition[] = [];
    const stateIds = Object.keys(fa.states);
    
    console.log(`Total States to process: ${stateIds.length}`);
    console.log(`Total Transitions to scan: ${fa.transitions.length}`);

    const transitionMap = new Map<string, string[]>();
    for (const t of fa.transitions) {
        if (t.symbol !== null && t.symbol !== "" && t.symbol !== "λ" && t.symbol !== "ε") {
            const key = `${t.from}|${t.symbol}`;
            if (!transitionMap.has(key)) transitionMap.set(key, []);
            transitionMap.get(key)!.push(t.to);
        }
    }

    const closureCache = new Map<string, string[]>();
    
    // Process states one by one and log each step to find the exact freeze point
    for (let i = 0; i < stateIds.length; i++) {
        const id = stateIds[i];
        console.log(` -> Processing closure [${i + 1}/${stateIds.length}] for state ID: ${id}`);
        
        const closureSet = getLambdaClosure(fa as any, id);
        closureCache.set(id, Array.from(closureSet));
    }
    
    console.log("✅ STEP 1 PASSED: Closure Cache completely built!");

    for (const fromId of stateIds) {
        const initialClosure = closureCache.get(fromId) || [];

        for (const symbol of fa.alphabet) {
            const targetSet = new Set<string>();

            for (const closureId of initialClosure) {
                const mapKey = `${closureId}|${symbol}`;
                const directlyReachable = transitionMap.get(mapKey);

                if (directlyReachable) {
                    for (const targetId of directlyReachable) {
                        const destinationClosure = closureCache.get(targetId) || [];
                        for (const finalId of destinationClosure) {
                            targetSet.add(finalId);
                        }
                    }
                }
            }

            for (const toId of targetSet) {
                newTransitions.push({
                    id: generateId(),
                    from: fromId,
                    symbol: symbol,
                    to: toId
                });
            }
        }
    }

    console.log(`✅ STEP 2 PASSED: Cross-product transitions built (${newTransitions.length} edges)`);

    const newAcceptStates = stateIds.filter(id => {
        const closure = closureCache.get(id) || [];
        return closure.some(closureId => fa.acceptStates.includes(closureId));
    });

    const accessibleStates = new Set<string>([...fa.startStates]);
    const queue = [...fa.startStates];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const outgoing = newTransitions.filter(t => t.from === current);
        for (const edge of outgoing) {
            if (!accessibleStates.has(edge.to)) {
                accessibleStates.add(edge.to);
                queue.push(edge.to);
            }
        }
    }

    console.log(`✅ STEP 3 PASSED: Accessibility sweep completed (${accessibleStates.size} reachable states)`);

    const dynamicStates: Record<string, any> = {};
    for (const id of stateIds) {
        if (accessibleStates.has(id)) {
            dynamicStates[id] = { ...fa.states[id] };
        }
    }

    return {
        id: fa.id,
        createdAt: fa.createdAt,
        name: `${fa.name} (NFA)`,
        alphabet: [...fa.alphabet],
        states: dynamicStates,
        transitions: newTransitions.filter(t => accessibleStates.has(t.from) && accessibleStates.has(t.to)), 
        startStates: [...fa.startStates],
        acceptStates: newAcceptStates.filter(id => accessibleStates.has(id)),
        kind: "nfa"
    };
}
