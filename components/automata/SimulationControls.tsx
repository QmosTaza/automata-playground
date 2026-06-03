"use client";

import { useState } from "react";
import { FiniteAutomaton } from "@/types";
import { makeFAComplete } from "@/core/fa";

interface SimulationControlsProps {
    fa: FiniteAutomaton;
    onAutomataChange: (nextFa: FiniteAutomaton) => void;
    faKind: FiniteAutomaton["kind"];
    onKindChange: (kind: FiniteAutomaton["kind"]) => void;
    onSimulate: (input: string) => void;
    canRunSimulation: boolean; 
    hasWarnings: boolean;
}

export default function SimulationControls({ fa, onAutomataChange, faKind, onKindChange, onSimulate, canRunSimulation, hasWarnings }: SimulationControlsProps) {
    const [simulationString, setSimulationString] = useState("");

    const handleRun = () => {
        if (!canRunSimulation) {
            alert("Simulation not possible. Please fix any validation errors pending.");
            return;
        }
        onSimulate(simulationString);
    };

    const handleMakeComplete = () => {
        const completedFa = makeFAComplete(fa);
        onAutomataChange(completedFa);
    };

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
            
            {/*MAIN GLOBAL SECTION*/}
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-xl border border-stone-200 backdrop-blur-md bg-white/95 pointer-events-auto">
                <select
                    value={faKind}
                    onChange={(e) => onKindChange(e.target.value as FiniteAutomaton["kind"])}
                    className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 text-sm font-semibold text-stone-700 outline-none cursor-pointer focus:border-amber-600 transition-colors"
                >
                    <option value="dfa">DFA (Deterministic)</option>
                    <option value="nfa">NFA (Non-Deterministic)</option>
                    <option value="lambda-nfa">λ-NFA (Empty Transitions)</option>
                </select>

                <div className="h-5 w-px bg-stone-300" />

                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Enter a string (e.g., aab). Leave empty for λ"
                        value={simulationString}
                        onChange={(e) => setSimulationString(e.target.value)}
                        className={`px-3 py-1 bg-stone-50 border rounded-lg text-sm outline-none transition-all w-80 text-stone-800
                            ${!canRunSimulation ? 'border-red-200 opacity-60 cursor-not-allowed' : 'border-stone-300 focus:border-amber-600'}
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
                    className={`font-semibold text-sm px-5 py-1.5 rounded-lg transition-all shadow-sm
                        ${canRunSimulation 
                            ? 'bg-amber-700 hover:bg-amber-800 text-white cursor-pointer active:scale-95' 
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'}
                    `}
                >
                    Run
                </button>
            </div>

            {/*TYPE-SPECIFIC TOOLS*/}
            {faKind === "dfa" && (
                <div className="flex items-center gap-2 bg-white/90 border border-stone-200/80 px-4 py-1.5 rounded-full shadow-md backdrop-blur-sm animate-fade-in pointer-events-auto">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 mr-1 select-none">
                        DFA Tools:
                    </span>
                    
                    <button
                        onClick={handleMakeComplete}
                        title="Add a sink state and redirect missing transitions to make the DFA complete"
                        className="px-2.5 py-1 text-amber-900 hover:text-amber-950 hover:bg-amber-100/70 rounded-full transition-all flex items-center gap-1.5 font-semibold text-xs border border-amber-200 bg-amber-50/50 cursor-pointer active:scale-95"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-700">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                        </svg>
                        <span>Make Complete</span>
                    </button>

                    {/* FUTURE DFA ALGORITHMS HERE */}
                    {/* <div className="h-3 w-px bg-stone-300" /> */}
                </div>
            )}

            {faKind === "nfa" && (
                <div className="flex items-center gap-2 bg-stone-50/90 border border-stone-200/80 px-4 py-1.5 rounded-full shadow-md backdrop-blur-sm animate-fade-in pointer-events-auto">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 select-none">
                        NFA Tools:
                    </span>
                    <span className="text-[11px] font-medium text-stone-500 italic px-1">
                        Subset Construction coming soon...
                    </span>
                </div>
            )}
        </div>
    );
}