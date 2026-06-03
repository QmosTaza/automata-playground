"use client";

import { useState } from "react";
import { Automaton } from "@/types";
import { renameAutomaton, addSymbolToAlphabet, removeSymbolFromAlphabet, renameState } from "@/core/fa/edit";

interface InspectorPanelProps {
    automaton: Automaton;
    onAutomatonChange: (nextAutomaton: Automaton) => void;
}

export default function InspectorPanel({ automaton, onAutomatonChange }: InspectorPanelProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [activeSection, setActiveSection] = useState<"general" | "alphabet" | "states" | "regex">("general");
    const [newSymbol, setNewSymbol] = useState("");

    const hasAlphabet = 'alphabet' in automaton;
    const hasStates = 'states' in automaton;
    const isRegexMachine = 'kind' in automaton && automaton.kind === "regex" as any; //PREP WIP
    const isLambdaNFA = 'kind' in automaton && automaton.kind === "lambda-nfa";

    // GENERAL HANDLERS
    const handleRenameAutomaton = (newName: string) => {
        onAutomatonChange(renameAutomaton(automaton, newName));
    };

    const handleAddSymbol = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasAlphabet) return;

        const trimmed = newSymbol.trim();
        if (!trimmed || trimmed === "λ" || trimmed === "lambda") return;

        onAutomatonChange(addSymbolToAlphabet(automaton, trimmed));
        setNewSymbol("");
    };

    const handleRemoveSymbol = (symbol: string) => {
        if (!hasAlphabet) return;
        onAutomatonChange(removeSymbolFromAlphabet(automaton, symbol));
    };

    const handleRenameState = (stateId: string, newLabel: string) => {
        if (!hasStates) return;
        onAutomatonChange(renameState(automaton, stateId, newLabel));
    };

    return (
        <div className="absolute top-0 left-0 h-full z-[90] flex items-center pointer-events-none">
            {/*MAIN*/}
            <div
                className={`h-[calc(100vh-2rem)] my-4 ml-4 bg-white/95 backdrop-blur-md border border-stone-200 shadow-2xl rounded-2xl flex flex-col transition-all duration-300 pointer-events-auto overflow-hidden
                    ${isOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-none ml-0"}
                `}
            >
                {/*HEADER*/}
                <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 select-none">
                        Machine Inspector
                    </span>
                    <h2 className="text-base font-bold text-stone-800 truncate mt-0.5">{automaton.name}</h2>
                </div>

                {/*SELECTOR*/}
                <div className="flex border-b border-stone-100 px-2 pt-1 bg-stone-50/30">
                    <button
                        onClick={() => setActiveSection("general")}
                        className={`flex-1 py-2 text-xs font-semibold capitalize border-b-2 transition-all cursor-pointer ${activeSection === "general" ? "border-amber-700 text-amber-950 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"}`}
                    >
                        General
                    </button>

                    {hasAlphabet && (
                        <button
                            onClick={() => setActiveSection("alphabet")}
                            className={`flex-1 py-2 text-xs font-semibold capitalize border-b-2 transition-all cursor-pointer ${activeSection === "alphabet" ? "border-amber-700 text-amber-950 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"}`}
                        >
                            Alphabet
                        </button>
                    )}

                    {hasStates && (
                        <button
                            onClick={() => setActiveSection("states")}
                            className={`flex-1 py-2 text-xs font-semibold capitalize border-b-2 transition-all cursor-pointer ${activeSection === "states" ? "border-amber-700 text-amber-950 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"}`}
                        >
                            States
                        </button>
                    )}

                    {isRegexMachine && (
                        <button
                            onClick={() => setActiveSection("regex")}
                            className={`flex-1 py-2 text-xs font-semibold capitalize border-b-2 transition-all cursor-pointer ${activeSection === "regex" ? "border-amber-700 text-amber-950 font-bold" : "border-transparent text-stone-400 hover:text-stone-600"}`}
                        >
                            Regex
                        </button>
                    )}
                </div>

                {/*SCROLLABLE*/}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/*GENERAL*/}
                    {activeSection === "general" && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-stone-500 block mb-1">Name</label>
                                <input
                                    type="text"
                                    value={automaton.name}
                                    onChange={(e) => handleRenameAutomaton(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-amber-600 transition-colors"
                                />
                            </div>
                            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
                                <div className="text-xs text-stone-500 flex justify-between">
                                    <span>Type:</span> <span className="font-bold text-stone-700 uppercase">{(automaton as any).kind ?? "Custom"}</span>
                                </div>
                                {hasStates && (
                                    <div className="text-xs text-stone-500 flex justify-between">
                                        <span>Total States:</span> <span className="font-bold text-stone-700">{Object.keys((automaton as any).states).length}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/*ALPHABET*/}
                    {activeSection === "alphabet" && hasAlphabet && (
                        <div className="space-y-4">
                            <form onSubmit={handleAddSymbol} className="flex gap-2">
                                <input
                                    type="text"
                                    maxLength={1}
                                    placeholder="Add symbol (e.g., c)"
                                    value={newSymbol}
                                    onChange={(e) => setNewSymbol(e.target.value)}
                                    className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-amber-600 transition-colors"
                                />
                                <button type="submit" className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer">
                                    Add
                                </button>
                            </form>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-stone-500 block">Active Alphabet</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {isLambdaNFA && (
                                        <div
                                            title="Lambda transitions are built-in for this automaton type"
                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 border border-stone-300 text-stone-600 font-bold text-xs rounded-full shadow-sm select-none"
                                        >
                                            <span>λ</span>
                                            <span className="text-[9px] font-normal text-stone-400 tracking-tight bg-stone-200/60 px-1 py-0.5 rounded">auto</span>
                                        </div>
                                    )}
                                    {((automaton as any).alphabet as string[]).map((sym) => (
                                        <div key={sym} className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-950 font-bold text-xs rounded-full shadow-sm">
                                            <span>{sym}</span>
                                            <button onClick={() => handleRemoveSymbol(sym)} className="text-amber-700 hover:text-red-600 font-bold cursor-pointer transition-colors text-[10px] ml-0.5">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/*STATES*/}
                    {activeSection === "states" && hasStates && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-stone-500 block mb-1">States List</label>
                            {Object.values((automaton as any).states).map((state: any) => (
                                <div key={state.id} className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-xl">
                                    <input
                                        type="text"
                                        value={state.label}
                                        onChange={(e) => handleRenameState(state.id, e.target.value)}
                                        className="w-20 px-2 py-1 bg-white border border-stone-200 rounded-md text-xs font-bold text-stone-800 text-center outline-none focus:border-amber-600 transition-colors"
                                    />
                                    <div className="flex-1 flex flex-wrap gap-1 text-[10px]">
                                        {(automaton as any).startStates?.includes(state.id) && (
                                            <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded">Initial</span>
                                        )}
                                        {(automaton as any).acceptStates?.includes(state.id) && (
                                            <span className="px-1.5 py-0.5 bg-green-50 border border-green-200 text-green-700 font-bold rounded">Accept</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/*REGEX (WIP)*/}
                    {activeSection === "regex" && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-stone-500 block mb-1">Expression</label>
                                <input
                                    type="text"
                                    placeholder="e.g., (a|b)*abb"
                                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 outline-none focus:border-amber-600 transition-colors"
                                />
                            </div>
                            <p className="text-xs italic text-stone-400">
                                This section will handle regex compilation to NFAs in the future.
                            </p>
                        </div>
                    )}

                </div>
            </div>

            {/*COLLAPSE*/}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-12 w-6 bg-white border border-stone-200 shadow-lg rounded-r-xl flex items-center justify-center text-stone-500 hover:text-amber-700 hover:bg-stone-50 transition-all cursor-pointer pointer-events-auto border-l-0 ${isOpen ? "ml-0" : "ml-4"}`}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isOpen ? "rotate-0" : "rotate-180"}`}><path d="m15 18-6-6 6-6" /></svg>
            </button>
        </div>
    );
}