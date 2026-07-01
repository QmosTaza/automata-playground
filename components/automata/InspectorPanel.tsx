"use client";

import { useState, useEffect } from "react";
import { FiniteAutomaton } from "@/types";
import { renameAutomaton, addSymbolToAlphabet, removeSymbolFromAlphabet, renameState, cleanSymbol, updateTransition, removeTransition, stateIsAccessible, stateIsUnreachable, stateIsSink } from "@/core/fa/edit";
import { convertRegexToAutomaton, validateRegexInput } from "@/core/fa/regex";
import { generateShortlexWords, evaluateString } from "@/core/shared";

interface InspectorPanelProps {
    automaton: FiniteAutomaton;
    onAutomatonChange: (nextAutomaton: FiniteAutomaton) => void;
}

export default function InspectorPanel({ automaton, onAutomatonChange }: InspectorPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<"overview" | "editor" | "regex">("overview");
    const [newSymbol, setNewSymbol] = useState("");
    const [regex, setRegex] = useState("");
    const [bulkInputs, setBulkInputs] = useState("");

    const hasAlphabet = 'alphabet' in automaton;
    const hasStates = 'states' in automaton;
    const isLambdaNFA = 'kind' in automaton && automaton.kind === "lambda-nfa";

    // HANDLERS
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

    const handleCompileRegex = (expression: string, previousName: string) => {
        const compiledAutomaton = convertRegexToAutomaton(expression);
        // so the name doesn't change
        onAutomatonChange({
            ...compiledAutomaton,
            name: previousName
        });
        setRegex("");
    };

    useEffect(() => {
        setBulkInputs("");
    }, [automaton.id]);

    return (
        <div className="absolute top-0 left-0 h-full z-[90] flex items-center pointer-events-none">
            {/* MAIN */}
            <div
                className={`h-[calc(100%-2rem)] my-4 ml-4 bg-white/95 backdrop-blur-md border border-stone-200 shadow-2xl rounded-2xl flex flex-col transition-all duration-300 pointer-events-auto overflow-hidden
                    ${isOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-none ml-0"}
                `}
            >
                {/* HEADER */}
                <div className="p-4 border-b border-stone-100 bg-stone-50/50">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 select-none">
                        Machine Inspector
                    </span>
                    <h2 className="text-base font-bold text-stone-800 truncate mt-0.5">{automaton.name}</h2>
                </div>

                {/* HEADER BUTTONS */}
                <div className="flex gap-1 border-b border-stone-100 px-3 py-2 bg-stone-50/30">
                    <button
                        onClick={() => setActiveSection("overview")}
                        className={`flex-1 text-center px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border active:scale-[0.98]
                            ${activeSection === "overview"
                                ? "bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-sm"
                                : "bg-transparent border-transparent text-stone-500 hover:bg-stone-100/80"
                            }
                        `}
                    >
                        Overview
                    </button>

                    {(hasAlphabet || hasStates) && (
                        <button
                            onClick={() => setActiveSection("editor")}
                            className={`flex-1 text-center px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border active:scale-[0.98]
                                ${activeSection === "editor"
                                    ? "bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-sm"
                                    : "bg-transparent border-transparent text-stone-500 hover:bg-stone-100/80"
                                }
                            `}
                        >
                            Design & Edit
                        </button>
                    )}

                    <button
                        onClick={() => setActiveSection("regex")}
                        className={`flex-1 text-center px-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border active:scale-[0.98]
                            ${activeSection === "regex"
                                ? "bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-sm"
                                : "bg-transparent border-transparent text-stone-500 hover:bg-stone-100/80"
                            }
                        `}
                    >
                        Regex & Tests
                    </button>
                </div>

                {/* SIDEBAR */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* OVERVIEW & ANÁLISIS FORMAL */}
                    {activeSection === "overview" && (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                    Machine Name
                                </label>
                                <input
                                    type="text"
                                    value={automaton.name}
                                    onChange={(e) => handleRenameAutomaton(e.target.value)}
                                    className="w-full px-3 py-1 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-800 outline-none focus:border-amber-600 transition-colors"
                                />
                            </div>

                            {/* Metadata */}
                            <div className="space-y-2 border-t border-stone-200/60 pt-4">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                    Machine Metadata
                                </label>
                                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                                    <div className="text-xs text-stone-500 flex justify-between items-baseline">
                                        <span>Machine Type:</span>
                                        <span className="font-bold text-stone-700 uppercase">{automaton.kind ?? "Custom"}</span>
                                    </div>
                                    {hasStates && (
                                        <div className="text-xs text-stone-500 flex justify-between">
                                            <span>Total States:</span>
                                            <span className="font-bold text-stone-700">{Object.keys((automaton as any).states).length}</span>
                                        </div>
                                    )}
                                    {'transitions' in automaton && (
                                        <div className="text-xs text-stone-500 flex justify-between">
                                            <span>Total Transitions:</span>
                                            <span className="font-bold text-stone-700">{(automaton as any).transitions.length}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Formal Def*/}
                            <div className="space-y-2 border-t border-stone-200/60 pt-4">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                    Formal Definition
                                </label>
                                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs font-mono text-stone-600 select-none nodrag select-text cursor-text">
                                    <div className="space-y-1.5">
                                        {/* Q */}
                                        <div className="flex items-baseline gap-1 overflow-x-auto whitespace-nowrap py-0.5 no-scrollbar">
                                            <span className="shrink-0 font-bold text-stone-500">Q = &#123;</span>
                                            <span className="text-stone-600 font-medium">
                                                {hasStates ? Object.values((automaton as any).states).map((s: any) => s.label).join(", ") : "—"}
                                            </span>
                                            <span>&#125;</span>
                                        </div>

                                        {/* Σ */}
                                        <div className="flex items-baseline gap-1 overflow-x-auto whitespace-nowrap py-0.5 no-scrollbar">
                                            <span className="shrink-0 font-bold text-stone-500">&Sigma; = &#123;</span>
                                            <span className="text-stone-600 font-medium">
                                                {hasAlphabet ? ((automaton as any).alphabet as string[]).join(", ") : "—"}
                                            </span>
                                            <span>&#125;</span>
                                        </div>

                                        {/* q0 */}
                                        <div className="flex items-baseline gap-1 overflow-x-auto whitespace-nowrap py-0.5 no-scrollbar">
                                            <span className="shrink-0 font-bold text-stone-500">q₀ = &#123;</span>
                                            <span className="text-stone-600 font-medium">
                                                {hasStates ? ((automaton as any).startStates || []).map((id: string) => automaton.states[id]?.label || "—").join(", ") : "—"}
                                            </span>
                                            <span>&#125;</span>
                                        </div>

                                        {/* δ */}
                                        <div className="flex items-baseline gap-1 overflow-x-auto whitespace-nowrap py-0.5 no-scrollbar">
                                            <span className="shrink-0 font-bold text-stone-500">&delta; = &#123;</span>
                                            {'transitions' in automaton && (automaton as any).transitions.length > 0 ? (
                                                ((automaton as any).transitions as any[]).map((t, idx, arr) => {
                                                    const fromLabel = automaton.states[t.from]?.label || "—";
                                                    const toLabel = automaton.states[t.to]?.label || "—";
                                                    const symLabel = t.symbol === null || t.symbol === undefined || t.symbol === "" ? "λ" : t.symbol;
                                                    return (
                                                        <span key={t.id} className="inline-block text-stone-600 font-medium">
                                                            ({fromLabel},{symLabel}) &rarr; {toLabel}
                                                            {idx < arr.length - 1 && <span className="text-stone-400 font-normal mr-1.5">,</span>}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="italic text-stone-400 text-[11px]">&empty;</span>
                                            )}
                                            <span>&#125;</span>
                                        </div>

                                        {/* F */}
                                        <div className="flex items-baseline gap-1 overflow-x-auto whitespace-nowrap py-0.5 no-scrollbar">
                                            <span className="shrink-0 font-bold text-stone-500">F = &#123;</span>
                                            <span className="text-stone-600 font-medium">
                                                {hasStates ? ((automaton as any).acceptStates || []).map((id: string) => automaton.states[id]?.label || "—").join(", ") : "—"}
                                            </span>
                                            <span>&#125;</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SHOW EQ REGEX */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                    Equivalent Regular Expression
                                </label>
                                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs font-mono text-stone-600 select-text gap-2 nodrag nowheel">
                                    <div className="flex items-baseline gap-1.5 overflow-x-auto whitespace-nowrap py-0.5 no-scrollbar w-full select-text">
                                        <span className="shrink-0 font-bold text-stone-500 select-none">R =</span>
                                        {automaton.regex && automaton.regex !== "" ? (
                                            <span className="text-amber-800 font-semibold tracking-wide inline-block select-text cursor-text">
                                                {automaton.regex}
                                            </span>
                                        ) : (
                                            <span className="italic text-stone-400 font-normal select-none">
                                                — (No expression linked)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* QUICK ACTIONS HUB */}
                            <div className="space-y-2 border-t border-stone-200/60 pt-4">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                    Quick Actions
                                </label>
                                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* deletes paths */}
                                        <button
                                            onClick={() => {
                                                if (confirm("Are you sure you want to clear all transitions?")) {
                                                    onAutomatonChange({ ...automaton, transitions: [] });
                                                }
                                            }}
                                            className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-400">
                                                <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3M6 3a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3" />
                                                <path d="M12 6v12" />
                                            </svg>
                                            Clear Paths
                                        </button>

                                        {/* deletes states */}
                                        <button
                                            onClick={() => {
                                                if (confirm("Are you sure you want to clear all states (and their transitions)?")) {
                                                    onAutomatonChange({ ...automaton, states: {}, acceptStates: [], startStates: [], transitions: [] });
                                                }
                                            }}
                                            className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                                        >

                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-400">
                                                <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
                                                <circle cx="12" cy="12" r="3" fill="currentColor" />
                                            </svg>
                                            Clear States
                                        </button>

                                        {/* clears alphabet */}
                                        <button
                                            onClick={() => {
                                                if (confirm("Are you sure you want to wipe the alphabet?")) {
                                                    onAutomatonChange({ ...automaton, alphabet: [] });
                                                }
                                            }}
                                            className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                            Wipe &Sigma;
                                        </button>

                                        {/* deletes everything :)) */}
                                        <button
                                            onClick={() => {
                                                if (confirm("Are you sure you want to clear out the machine?")) {
                                                    onAutomatonChange({ ...automaton, states: {}, acceptStates: [], startStates: [], alphabet: [], transitions: [] });
                                                }
                                            }}
                                            className="px-2.5 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-700 border border-stone-200 hover:border-rose-200 text-stone-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-colors group-hover:text-rose-500">
                                                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                            </svg>
                                            Clear ALL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* UNIFIED GRAPH DESIGN EDITOR */}
                    {activeSection === "editor" && (
                        <div className="space-y-4 animate-fade-in">

                            {/* ALPHABET*/}
                            {hasAlphabet && (
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                        Alphabet configuration
                                    </label>
                                    <form onSubmit={handleAddSymbol} className="flex gap-2">
                                        <input
                                            type="text"
                                            maxLength={1}
                                            placeholder="Add symbol (e.g., c)"
                                            value={newSymbol}
                                            onChange={(e) => setNewSymbol(e.target.value)}
                                            className="flex-1 px-3 py-1 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-800 outline-none focus:border-amber-600 transition-colors"
                                        />
                                        <button
                                            type="submit"
                                            className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
                                        >
                                            Add
                                        </button>
                                    </form>

                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {isLambdaNFA && (
                                            <div
                                                title="Lambda transitions are built-in for this automaton type"
                                                className="flex items-center gap-1.5 px-2.5 py-0.5 border border-stone-300 bg-stone-100 text-stone-600 font-bold text-xs rounded-full shadow-sm select-none"
                                            >
                                                <span>λ</span>
                                                <span className="text-[9px] font-normal text-stone-400 tracking-tight bg-stone-200/60 px-1 py-0.5 rounded">auto</span>
                                            </div>
                                        )}
                                        {((automaton as any).alphabet as string[]).map((sym) => (
                                            <div
                                                key={sym}
                                                className="flex items-center gap-1.5 px-2.5 py-0.5 border border-amber-200 bg-amber-50/50 text-amber-900 font-semibold text-xs rounded-full shadow-sm transition-all hover:bg-amber-100/50"
                                            >
                                                <span>{sym}</span>
                                                <button
                                                    onClick={() => handleRemoveSymbol(sym)}
                                                    className="text-amber-700 hover:text-red-600 font-bold cursor-pointer transition-colors text-[10px] ml-0.5"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STATES LIST*/}
                            {hasStates && (
                                <div className="space-y-2 border-t border-stone-200/60 pt-4">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                        States configuration
                                    </label>{Object.values((automaton as any).states).map((state: any) => (
                                        <div key={state.id} className="flex items-center gap-3 p-2 bg-stone-50 border border-stone-200 rounded-xl">
                                            <input
                                                type="text"
                                                value={state.label}
                                                onChange={(e) => handleRenameState(state.id, e.target.value)}
                                                className="w-20 px-2 py-0.5 bg-white border border-stone-300 rounded-md text-xs font-bold text-stone-800 text-center outline-none focus:border-amber-600 transition-colors"
                                            />
                                            <div className="flex-1 flex flex-wrap gap-1 text-[10px]">
                                                {(automaton as any).startStates?.includes(state.id) && (
                                                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-md">Initial</span>
                                                )}
                                                {(automaton as any).acceptStates?.includes(state.id) && (
                                                    <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 font-bold rounded-md">Accept</span>
                                                )}
                                                {stateIsUnreachable((automaton as any), state.id) && (
                                                    <span className="px-2 py-0.5 bg-red-50 border border-red-200 text-red-700 font-bold rounded-md">Unreachable</span>
                                                )}
                                                {stateIsSink((automaton as any), state.id) && (
                                                    <span className="px-2 py-0.5 bg-stone-50 border border-stone-200 text-stone-700 font-bold rounded-md">Sink</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* TRANSITIONS LIST SUB-SECTION */}
                            {'transitions' in automaton && (automaton as any).transitions.length > 0 && (
                                <div className="space-y-2 border-t border-stone-200/40 pt-4">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                        Transitions Configuration
                                    </label>

                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                                        {((automaton as any).transitions as any[]).map((t) => {
                                            const symLabel = t.symbol === null || t.symbol === undefined || t.symbol === "" ? "" : t.symbol;
                                            const stateOptions = Object.values((automaton as any).states);

                                            return (
                                                <div
                                                    key={t.id}
                                                    className="flex items-center justify-between p-2 bg-stone-50/50 border border-stone-100 rounded-xl transition-all hover:border-stone-200 hover:bg-stone-50 group gap-2"
                                                >
                                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">

                                                        {/* FROM */}
                                                        <select
                                                            value={t.from}
                                                            onChange={(e) => {
                                                                const updated = { ...t, from: e.target.value };
                                                                onAutomatonChange(updateTransition(automaton, updated));
                                                            }}
                                                            className="font-mono text-xs font-bold text-stone-800 bg-white border border-stone-200 px-1.5 py-0.5 rounded shadow-sm outline-none cursor-pointer focus:border-amber-600 transition-colors max-w-[70px] truncate"
                                                        >
                                                            {stateOptions.map((s: any) => (
                                                                <option key={s.id} value={s.id}>{s.label}</option>
                                                            ))}
                                                        </select>

                                                        {/* SYMBOL */}
                                                        <div className="flex items-center gap-0.5 min-w-[45px]">
                                                            <span className="text-stone-400 font-sans text-[10px] select-none">(</span>
                                                            <input
                                                                type="text"
                                                                maxLength={5}
                                                                placeholder="λ"
                                                                value={symLabel}
                                                                onChange={(e) => {
                                                                    const cleanSym = cleanSymbol(e.target.value);
                                                                    const updated = { ...t, symbol: cleanSym };
                                                                    onAutomatonChange(updateTransition(automaton, updated));
                                                                }}
                                                                className="w-8 text-center font-mono font-bold text-xs bg-white border border-stone-200 rounded px-0.5 py-0.5 shadow-inner outline-none focus:border-amber-600 focus:bg-white text-amber-950 placeholder:text-stone-300 placeholder:font-sans"
                                                            />
                                                            <span className="text-stone-400 font-sans text-[10px] select-none">)</span>
                                                        </div>

                                                        {/* Arrow Pointer */}
                                                        <span className="text-amber-600 font-sans font-bold text-xs select-none px-0.5">→</span>

                                                        {/* TO */}
                                                        <select
                                                            value={t.to}
                                                            onChange={(e) => {
                                                                const updated = { ...t, to: e.target.value };
                                                                onAutomatonChange(updateTransition(automaton, updated));
                                                            }}
                                                            className="font-mono text-xs font-bold text-stone-800 bg-white border border-stone-200 px-1.5 py-0.5 rounded shadow-sm outline-none cursor-pointer focus:border-amber-600 transition-colors max-w-[70px] truncate"
                                                        >
                                                            {stateOptions.map((s: any) => (
                                                                <option key={s.id} value={s.id}>{s.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Path Remover*/}
                                                    <button
                                                        onClick={() => onAutomatonChange(removeTransition(automaton, t.id))}
                                                        title="Delete transition pathway"
                                                        className="text-stone-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <line x1="18" y1="6" x2="6" y2="18" />
                                                            <line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* REGEX OPERATIONS & BATCH SUITE */}
                    {activeSection === "regex" && (
                        <div className="space-y-4 animate-fade-in">

                            {/* REGEX */}
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                    REGEX-TO-GRAPH COMPILER
                                </label>
                                {(() => {
                                    const validation = validateRegexInput(regex, "workspace");
                                    const hasText = regex.trim().length > 0;
                                    const isInvalid = hasText && !validation.valid;

                                    return (
                                        <>
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    if (!validation.valid) return;
                                                    handleCompileRegex(regex, automaton.name);
                                                }}
                                                className="flex gap-2 animate-fadeIn"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Enter regex (e.g., (a+b)*a )"
                                                    value={regex}
                                                    onChange={(e) => setRegex(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        e.stopPropagation();
                                                    }}
                                                    className={`flex-1 px-3 py-1 bg-stone-50 border rounded-lg text-sm text-stone-800 outline-none transition-colors ${isInvalid
                                                        ? "border-red-500 focus:border-red-600 bg-red-50/10"
                                                        : "border-stone-300 focus:border-amber-600"
                                                        }`}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!validation.valid}
                                                    className={`px-4 py-1.5 text-white font-semibold text-xs rounded-lg shadow-sm transition-all whitespace-nowrap mr-1 ${validation.valid
                                                        ? "bg-amber-700 hover:bg-amber-800 cursor-pointer active:scale-95"
                                                        : "bg-stone-300 text-stone-500 cursor-not-allowed select-none"
                                                        }`}
                                                >
                                                    Compile
                                                </button>
                                            </form>
                                            {isInvalid && (
                                                <div className="text-[11px] font-medium text-red-600 bg-red-50/50 border border-red-200/60 px-2.5 py-1 rounded-md mt-1 animate-slideDown">
                                                    Regular expression syntax error
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}

                                <p className="text-[10px] text-stone-500 leading-relaxed italic">
                                    Compiling will transform this regex into a λ-NFA using Thompson's Construction.
                                </p>
                            </div>

                            {/* EVALUATED GRAPH EXPRESSION */}
                            <div className="space-y-1 border-t border-stone-200/60 pt-4">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                    Evaluated Graph Expression
                                </label>
                                {(() => {
                                    const regexStr = automaton.regex;
                                    return (
                                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs font-mono text-stone-600 select-text gap-2 nodrag nowheel">
                                            <div className="flex items-baseline gap-1 overflow-x-auto whitespace-nowrap py-0.5 no-scrollbar w-full select-text">
                                                <span className="shrink-0 font-bold text-stone-500 select-none">L(M) = &#123; ℒ⦗ </span>
                                                <span className="text-amber-800 font-semibold tracking-wide inline-block select-text cursor-text">
                                                    {regexStr === "冲" || !regexStr ? "∅" : regexStr}
                                                </span>
                                                <span className="text-stone-500 font-medium select-none ml-1">⦘ ⊆ &Sigma;*</span>
                                                <span className="select-none">&#125;</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* SHORTLEX SHOWCASE */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none block mb-1">
                                    Shortlex Enumeration (First 10 Words)
                                </label>
                                {(() => {
                                    const firstTenWords = generateShortlexWords(automaton, 10);
                                    return (
                                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between text-xs font-mono text-stone-600 select-text gap-2 nodrag nowheel">
                                            <div className="flex items-baseline gap-1 overflow-x-auto whitespace-nowrap py-0.5 no-scrollbar w-full select-text">
                                                {firstTenWords.length === 0 ? (
                                                    <span className="italic text-stone-400 font-normal select-none">
                                                        &empty; (Empty Language - No valid paths found)
                                                    </span>
                                                ) : (
                                                    <div className="flex items-baseline gap-1.5 select-text">
                                                        {firstTenWords.map((word, idx, arr) => (
                                                            <span key={idx} className="inline-block text-stone-600 font-medium select-text cursor-text">
                                                                {word === "λ" ? (
                                                                    <span className="text-stone-400 italic font-normal">λ</span>
                                                                ) : (
                                                                    <span className="text-stone-700 font-normal">{word}</span>
                                                                )}
                                                                {idx < arr.length - 1 && (
                                                                    <span className="text-stone-400 font-normal ml-1 select-none">,</span>
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* BATCH TESTING SUITE */}
                            <div className="space-y-2 border-t border-stone-200/60 pt-4">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider select-none">
                                        Batch Testing Suite
                                    </label>

                                    {bulkInputs.trim().length > 0 && (() => {
                                        const lines = bulkInputs.split("\n").filter(line => line.trim() !== "");
                                        const total = lines.length;
                                        const passed = lines.filter(str => evaluateString(automaton, str)).length;
                                        return (
                                            <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-md tracking-wide uppercase select-none ${passed === total
                                                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                                : "text-amber-800 bg-amber-50 border-amber-200"
                                                }`}>
                                                {passed} / {total} PASSED
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-3 nodrag nowheel">
                                    {/* Text Area Input */}
                                    <textarea
                                        rows={4}
                                        value={bulkInputs}
                                        onChange={(e) => setBulkInputs(e.target.value)}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                        }}
                                        placeholder="Type multiple verification targets...&#10;(One test case per line, use λ for empty string)"
                                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono text-stone-800 outline-none focus:border-amber-600 transition-colors resize-none shadow-sm placeholder:font-sans placeholder:text-stone-400"
                                    />

                                    {/* Live Status Readout */}
                                    {bulkInputs.trim().length > 0 ? (
                                        <div className="space-y-1.5 border-t border-stone-200/60 pt-2.5">
                                            <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block select-none">
                                                Real-time Evaluation Results
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto no-scrollbar py-0.5 select-text cursor-text">
                                                {bulkInputs.split("\n").map((rawLine, index) => {
                                                    if (rawLine === "" && index === bulkInputs.split("\n").length - 1) return null;

                                                    const cleanStr = (rawLine === "λ" || rawLine === "") ? "" : rawLine;
                                                    const isAccepted = evaluateString(automaton, cleanStr);

                                                    return (
                                                        <span
                                                            key={index}
                                                            className={`inline-block text-xs font-mono font-medium rounded-md px-2 py-0.5 border shadow-sm transition-colors select-text ${isAccepted
                                                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/60"
                                                                : "bg-rose-50 text-rose-800 border-rose-200/60"
                                                                }`}
                                                        >
                                                            <span className="font-bold mr-1 select-none">
                                                                {isAccepted ? "✓" : "✗"}
                                                            </span>
                                                            {rawLine === "" ? <span className="text-stone-400 italic font-normal">λ</span> : rawLine}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] italic text-stone-400 font-medium leading-normal px-0.5">
                                            Evaluates all target test strings instantly as you type.
                                        </p>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>

            {/* ACORDEÓN YUJUU */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-12 w-6 bg-white border border-stone-200 shadow-lg rounded-r-xl flex items-center justify-center text-stone-500 hover:text-amber-700 hover:bg-stone-50 transition-all cursor-pointer pointer-events-auto border-l-0 ${isOpen ? "ml-0" : "ml-4"}`}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isOpen ? "rotate-0" : "rotate-180"}`}><path d="m15 18-6-6 6-6" /></svg>
            </button>
        </div>
    );
}