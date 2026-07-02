"use client";

import { useState } from "react";
import { FiniteAutomaton } from "@/types";
import { makeDFAComplete, minimizeDFA, complementDFA, convertNFAtoDFA, convertLambdaNFAtoDFA, convertLambdaNFAtoNFA, applyNaiveLayout } from "@/core/fa";

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
    const [isOpen, setIsOpen] = useState(false);
    const [simulationString, setSimulationString] = useState("");

    const handleRun = () => {
        if (!canRunSimulation) {
            alert("Simulation not possible. Please fix any validation errors pending.");
            return;
        }
        onSimulate(simulationString);
    };

    const handleMakeComplete = () => {
        const completedFa = makeDFAComplete(fa);
        onAutomataChange(completedFa);
    };

    const handleMinimize = () => {
        const minimizedFa = minimizeDFA(fa);
        onAutomataChange(minimizedFa);
    };

    const handleComplement = () => {
        const complementedFa = complementDFA(fa);
        onAutomataChange(complementedFa);
    };

    const handleConvertNFAtoDFA = () => {
        const convertedDFA = convertNFAtoDFA(fa);
        convertedDFA.kind = "dfa";
        onKindChange("dfa");
        onAutomataChange(applyNaiveLayout(convertedDFA));
    };

    const handleConvertLambdaNFAtoDFA = () => {
        const convertedDFA = convertLambdaNFAtoDFA(fa);
        convertedDFA.kind = "dfa";
        onKindChange("dfa");
        onAutomataChange(applyNaiveLayout(convertedDFA));
    };

    const handleConvertLambdaNFAtoNFA = () => {
        const convertedNFA = convertLambdaNFAtoNFA(fa);
        convertedNFA.kind = "nfa";
        onKindChange("nfa");
        onAutomataChange(applyNaiveLayout(convertedNFA));
    };

    return (
        <div className="absolute bottom-0 md:bottom-auto md:top-0 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-none w-full sm:w-auto">
            {/* TOGGLE BUTTON */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`absolute left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] uppercase font-bold tracking-wider transition-all duration-300 pointer-events-auto shadow-md cursor-pointer active:scale-95
                    /* Mobile placement (Top edge of bottom tray) */
                    border border-b-0 border-amber-600 rounded-t-xl
                    /* Desktop placement (Bottom edge of top tray) */
                    md:top-auto md:rounded-t-none md:rounded-b-xl md:border-t-0
                    ${isOpen
                        ? "-top-7 md:bottom-auto"
                        : "top-0 -translate-y-full md:top-0 md:translate-y-0"
                    }
                `}
            >
                <span className="flex items-center gap-1">
                    <i className={`nf md:hidden ${isOpen ? "nf-fa-chevron_down" : "nf-fa-chevron_up"}`}></i>
                    <i className={`nf hidden md:inline ${isOpen ? "nf-fa-chevron_up" : "nf-fa-chevron_down"}`}></i>
                    <span>{isOpen ? "Hide Simulation" : "Run Simulation"}</span>
                </span>
            </button>


            <div className={`flex flex-col items-center gap-2 w-full sm:w-auto transition-all duration-300 origin-bottom md:origin-top px-4 pb-4 md:pb-0 md:pt-4
                ${isOpen
                    ? "opacity-100 translate-y-0 max-h-[250px]"
                    : "opacity-0 translate-y-4 md:-translate-y-4 max-h-0 overflow-hidden pointer-events-none"
                }`}
            >
                {/*MAIN GLOBAL SECTION*/}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl border border-stone-200 backdrop-blur-md bg-white/95 pointer-events-auto w-full sm:w-auto">
                    <select
                        value={faKind}
                        onChange={(e) => onKindChange(e.target.value as FiniteAutomaton["kind"])}
                        className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 text-sm font-semibold text-stone-700 outline-none cursor-pointer focus:border-amber-600 transition-colors h-8 sm:h-auto"
                    >
                        <option value="dfa">DFA (Deterministic)</option>
                        <option value="nfa">NFA (Non-Deterministic)</option>
                        <option value="lambda-nfa">λ-NFA (Empty Transitions)</option>
                    </select>

                    <div className="hidden sm:block h-5 w-px bg-stone-300" />

                    <div className="relative group flex-1 sm:flex-initial">
                        <input
                            type="text"
                            placeholder="Enter a string (e.g., aab). Leave empty for λ"
                            value={simulationString}
                            onChange={(e) => setSimulationString(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && canRunSimulation) {
                                    onSimulate(simulationString);
                                }
                            }}
                            className={`px-3 py-1 bg-stone-50 border rounded-lg text-xs sm:text-sm outline-none transition-all w-full sm:w-64 md:w-80 text-stone-800 h-8 sm:h-auto
                            ${!canRunSimulation ? 'border-red-200 opacity-60 cursor-not-allowed' : 'border-stone-300 focus:border-amber-600'}
                        `}
                            disabled={!canRunSimulation}
                        />
                        {!canRunSimulation && (
                            <div className="absolute -top-7 sm:top-auto sm:-bottom-8 left-0 hidden group-hover:block bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                Fix critical errors to simulate
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleRun}
                        disabled={!canRunSimulation}
                        className={`font-semibold text-xs sm:text-sm px-4 sm:px-5 py-1.5 rounded-lg transition-all shadow-sm h-8 sm:h-auto
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
                    <div className={`flex items-center gap-1.5 bg-white/90 border border-stone-200/80 p-1 sm:px-4 sm:py-1.5 rounded-xl sm:rounded-full shadow-md backdrop-blur-sm animate-fade-in pointer-events-auto max-w-full overflow-x-auto no-scrollbar transition-opacity duration-200
                        ${!canRunSimulation ? "opacity-60" : ""}`}
                    >
                        <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-bold text-stone-400 mr-1 select-none whitespace-nowrap shrink-0">
                            DFA Tools:
                        </span>

                        <button
                            onClick={handleMakeComplete}
                            disabled={!canRunSimulation}
                            title={canRunSimulation ? "Add a sink state and redirect missing transitions to make the DFA complete" : "Fix critical errors to use tools"}
                            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 font-semibold text-xs border whitespace-nowrap shrink-0
                                ${canRunSimulation
                                    ? "text-amber-900 hover:text-amber-950 hover:bg-amber-100/70 border-amber-200 bg-amber-50/50 cursor-pointer active:scale-95"
                                    : "text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed"}
                            `}
                        >
                            <i className="nf nf-md-format_color_fill"></i>
                            <span>Make Complete</span>
                        </button>

                        <button
                            onClick={handleMinimize}
                            disabled={!canRunSimulation}
                            title={canRunSimulation ? "Optimize the automaton by merging equivalent redundant states" : "Fix critical errors to use tools"}
                            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 font-semibold text-xs border whitespace-nowrap shrink-0
                                ${canRunSimulation
                                    ? "text-amber-900 hover:text-amber-950 hover:bg-amber-100/70 border-amber-200 bg-amber-50/50 cursor-pointer active:scale-95"
                                    : "text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed"}
                            `}
                        >
                            <i className="nf nf-fa-minimize"></i>
                            <span>Minimize</span>
                        </button>

                        <button
                            onClick={handleComplement}
                            disabled={!canRunSimulation}
                            title={canRunSimulation ? "Convert the DFA to its complement" : "Fix critical errors to use tools"}
                            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 font-semibold text-xs border whitespace-nowrap shrink-0
                                ${canRunSimulation
                                    ? "text-amber-900 hover:text-amber-950 hover:bg-amber-100/70 border-amber-200 bg-amber-50/50 cursor-pointer active:scale-95"
                                    : "text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed"}
                            `}
                        >
                            <i className="nf nf-md-invert_colors"></i>
                            <span>Complement</span>
                        </button>
                    </div>
                )}

                {faKind === "nfa" && (
                    <div className={`flex items-center gap-1.5 bg-white/90 border border-stone-200/80 p-1 sm:px-4 sm:py-1.5 rounded-xl sm:rounded-full shadow-md backdrop-blur-sm animate-fade-in pointer-events-auto max-w-full overflow-x-auto no-scrollbar transition-opacity duration-200
                        ${!canRunSimulation ? "opacity-60" : ""}`}
                    >
                        <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-bold text-stone-400 mr-1 select-none whitespace-nowrap shrink-0">
                            NFA Tools:
                        </span>

                        <button
                            onClick={handleConvertNFAtoDFA}
                            disabled={!canRunSimulation}
                            title={canRunSimulation ? "Convert this Non-Deterministic machine into a Deterministic equivalent using subset construction" : "Fix critical errors to use tools"}
                            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 font-semibold text-xs border whitespace-nowrap shrink-0
                                ${canRunSimulation
                                    ? "text-amber-900 hover:text-amber-950 hover:bg-amber-100/70 border-amber-200 bg-amber-50/50 cursor-pointer active:scale-95"
                                    : "text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed"}
                            `}
                        >
                            <i className="nf nf-md-swap_horizontal"></i>
                            <span>Convert to DFA</span>
                        </button>
                    </div>
                )}

                {faKind === "lambda-nfa" && (
                    <div className={`flex items-center gap-1.5 bg-white/90 border border-stone-200/80 p-1 sm:px-4 sm:py-1.5 rounded-xl sm:rounded-full shadow-md backdrop-blur-sm animate-fade-in pointer-events-auto max-w-full overflow-x-auto no-scrollbar transition-opacity duration-200
                        ${!canRunSimulation ? "opacity-60" : ""}`}
                    >
                        <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-bold text-stone-400 mr-1 select-none whitespace-nowrap shrink-0">
                            λ-NFA Tools:
                        </span>

                        <button
                            onClick={handleConvertLambdaNFAtoDFA}
                            disabled={!canRunSimulation}
                            title={canRunSimulation ? "Convert this Non-Deterministic machine into a Deterministic equivalent using subset construction" : "Fix critical errors to use tools"}
                            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 font-semibold text-xs border whitespace-nowrap shrink-0
                                ${canRunSimulation
                                    ? "text-amber-900 hover:text-amber-950 hover:bg-amber-100/70 border-amber-200 bg-amber-50/50 cursor-pointer active:scale-95"
                                    : "text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed"}
                            `}
                        >
                            <i className="nf nf-md-swap_horizontal"></i>
                            <span>Convert to DFA</span>
                        </button>

                        <button
                            onClick={handleConvertLambdaNFAtoNFA}
                            disabled={!canRunSimulation}
                            title={canRunSimulation ? "Convert this Non-Deterministic machine into a Deterministic equivalent using subset construction" : "Fix critical errors to use tools"}
                            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 font-semibold text-xs border whitespace-nowrap shrink-0
                                ${canRunSimulation
                                    ? "text-amber-900 hover:text-amber-950 hover:bg-amber-100/70 border-amber-200 bg-amber-50/50 cursor-pointer active:scale-95"
                                    : "text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed"}
                            `}
                        >
                            <i className="nf nf-md-swap_horizontal"></i>
                            <span>Convert to NFA</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}