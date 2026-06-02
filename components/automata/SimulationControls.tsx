"use client";

import { useState } from "react";
import { FiniteAutomaton } from "@/types";

interface SimulationControlsProps {
    faKind: FiniteAutomaton["kind"];
    onKindChange: (kind: FiniteAutomaton["kind"]) => void;
    onSimulate: (input: string) => void;
    canRunSimulation: boolean; 
    hasWarnings: boolean;
}

export default function SimulationControls({ faKind, onKindChange, onSimulate, canRunSimulation, hasWarnings }: SimulationControlsProps) {
    const [simulationString, setSimulationString] = useState("");

    const handleRun = () => {
        if (!canRunSimulation) {
            alert("Simulation not possible. Please fix any validation errors pending.");
            return;
        }
        onSimulate(simulationString);
    };

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-white p-3 rounded-2xl shadow-xl border border-stone-200 backdrop-blur-md bg-white/95">
            <select
                value={faKind}
                onChange={(e) => onKindChange(e.target.value as FiniteAutomaton["kind"])}
                className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 text-sm font-semibold text-stone-700 outline-none cursor-pointer focus:border-amber-500"
            >
                <option value="dfa">DFA (Deterministic)</option>
                <option value="nfa">NFA (Non-Deterministic)</option>
                <option value="lambda-nfa">λ-NFA (Empty Transitions)</option>
            </select>

            <div className="h-5 w-px bg-stone-300" />

            <div className="relative group">
                <input
                    type="text"
                    placeholder="Write a string (ej: aab)"
                    value={simulationString}
                    onChange={(e) => setSimulationString(e.target.value)}
                    className={`px-3 py-1 bg-stone-50 border rounded-lg text-sm outline-none transition-all w-48 text-stone-800
                        ${!canRunSimulation ? 'border-red-200 opacity-60 cursor-not-allowed' : 'border-stone-300 focus:border-amber-500'}
                    `}
                    disabled={!canRunSimulation}
                />
                {!canRunSimulation && (
                    <div className="absolute -bottom-8 left-0 hidden group-hover:block bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                        Fix critical errors to simulate
                    </div>
                )}
            </div>

            <button
                onClick={handleRun}
                disabled={!canRunSimulation}
                className={`font-medium text-sm px-4 py-1.5 rounded-lg transition-all shadow-sm
                    ${canRunSimulation 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer' 
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'}
                `}
            >
                {hasWarnings && canRunSimulation ? "Run (Incomplete)" : "Run"}
            </button>
        </div>
    );
}