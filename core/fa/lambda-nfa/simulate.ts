import { NFA, StateId, State, Transition, SimulationResult, SimulationStep, LambdaNFA } from "../../../types"


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

function exploreLambdaNFAPath(fa: LambdaNFA, remainingInput: string, currentStateId: StateId, currentSteps: SimulationStep[], visitedLambdaTransitions: Set<string>, globalResults: SimulationResult[]) {
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

function getLambdaClosure(fa: LambdaNFA, currentState: StateId): StateId[]{
    const closure = new Set<StateId>([currentState]);
    const queue: StateId[] = [currentState];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const transitions = fa.transitions.filter(t => t.from === current && t.symbol === null);
        for (const t of transitions) {
            if (!closure.has(t.to)) {
                closure.add(t.to);
                queue.push(t.to);
            }
        }
    }
    return Array.from(closure);
}

function getTransitionsFromState(fa: LambdaNFA, currentState: StateId): Transition[] {
    return fa.transitions.filter(
        t => t.from === currentState
    )
}
