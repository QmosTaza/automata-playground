import { NFA, StateId, State, Transition, SimulationResult, SimulationStep } from "../../../types"
import { getTransitionsFromState } from "../edit";

export function runNFA(fa: NFA, input: string): SimulationResult[] {
    const allPathResults: SimulationResult[] = []

    for (const startState of fa.startStates) {
        const firstStep: SimulationStep = {
            state: startState,
            stepNumber: 0,
            symbol: null,
            remainingInput: input
        };
        exploreNFAPath(fa, input, startState, [firstStep], allPathResults);
    }
    return allPathResults
}

function exploreNFAPath(fa: NFA, remainingInput: string, currentStateId: StateId, currentSteps: SimulationStep[], globalResults: SimulationResult[]) {
    if (remainingInput.length === 0) {
        globalResults.push({
            accepted: fa.acceptStates.includes(currentStateId),
            steps: currentSteps
        });
        return;
    }

    const symbol = remainingInput[0];
    const nextRemaining = remainingInput.slice(1);

    if (!fa.alphabet.includes(symbol)) {
        globalResults.push({
            accepted: false,
            error: `Invalid symbol: ${symbol}`,
            steps: currentSteps
        });
        return;
    }

    const nextStates: StateId[] = getNextStatesNFA(fa, symbol, currentStateId) || [];

    if (nextStates.length === 0) {
        globalResults.push({
            accepted: false,
            error: `Missing transition for '${symbol}'`,
            steps: currentSteps
        });
        return;
    }

    for (const nextStateId of nextStates) {
        const newStep: SimulationStep = {
            state: nextStateId,
            stepNumber: currentSteps.length,
            symbol: symbol,
            remainingInput: nextRemaining
        };
        exploreNFAPath(
            fa,
            nextRemaining,
            nextStateId,
            [...currentSteps, newStep],
            globalResults
        );
    }
}

function getNextStatesNFA(fa: NFA, symbol: string, currentState: StateId): StateId[] {
    const transitions: Transition[] = getTransitionsFromState(fa, currentState)
    const nextStates: StateId[] = []
    for (const t of transitions) {
        if (t.symbol === symbol) {
            nextStates.push(t.to)
        }
    }
    return nextStates
}


