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

    let edgeCount = 0;
    for (const t of automaton.transitions) {
        edgeCount++;
        if (!t) continue;

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
