"use client";

import { Automaton } from "@/types";
import { getStateFromId, getTransitionFromId } from "@/core/fa";
import { useState } from "react";

interface ValidationErrorPanelProps {
    errors: any[];
    a: Automaton;
}

export default function ValidationErrorPanel({ errors, a }: ValidationErrorPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(true); 
    if (!errors || errors.length === 0) return null;

    const criticalErrors = errors.filter(err => err.type !== "MISSING_TRANSITION");
    const warnings = errors.filter(err => err.type === "MISSING_TRANSITION");

    const isCritical = criticalErrors.length > 0;

    return (
        <div
            onClick={() => isCollapsed && setIsCollapsed(false)}
            className={`absolute z-[150] transition-all duration-300 shadow-xl border backdrop-blur-md pointer-events-auto
                top-4 right-4
                ${isCollapsed 
                    ? "w-10 h-10 rounded-full flex items-center justify-center p-0 cursor-pointer active:scale-95" 
                    : "w-[calc(100%-2rem)] sm:w-80 rounded-xl"
                }
                md:top-auto md:bottom-4 md:left-4 md:w-80 md:h-auto md:rounded-xl md:block
                ${isCritical
                    ? "bg-white/95 border-red-200 text-red-700"
                    : "bg-white/95 border-amber-200 text-amber-700"
                }`}
        >
            {/*MOBILE BUTTON PILL LOOK (Only when collapsed on mobile) */}
            {isCollapsed && (
                <div className="md:hidden flex items-center justify-center w-full h-full">
                    <i className={`nf text-base ${isCritical ? "nf-cod-error text-red-600 animate-pulse" : "nf-fa-triangle_exclamation text-amber-600"}`}></i>
                    {/* Badge showing total count */}
                    <span className={`absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-white shadow-sm ${
                        isCritical ? "bg-red-600" : "bg-amber-600"
                    }`}>
                        {errors.length}
                    </span>
                </div>
            )}

            <div className={`${isCollapsed ? "hidden md:block" : "block"}`}>
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsCollapsed(!isCollapsed);
                    }}
                    className={`flex items-center justify-between p-3 cursor-pointer group transition-colors select-none ${isCritical ? "hover:bg-red-50/40" : "hover:bg-amber-50/40"
                        }`}
                >
                    <div className="flex items-center gap-2 mb-2 font-bold">
                        <i className={isCritical ? "nf nf-cod-error" : "nf nf-fa-triangle_exclamation"}></i>
                        <span>
                            {isCritical
                                ? `Automata Errors (${errors.length})`
                                : `Automata Warnings (${errors.length})`
                            }
                        </span>
                    </div>
                    <button
                        className={`flex items-center gap-2 mb-2 font-bold text-xs p-1 rounded-xl transition-all border border-transparent bg-white group-hover:bg-amber-100/70 text-red-700/70 transition-colors`}
                        title={isCollapsed ? "Expand validation logs" : "Minimize panel overlay"}
                    >
                        {isCollapsed ? <i className="nf nf-md-chevron_up"></i> : <i className="nf nf-md-chevron_down"></i>}
                    </button>
                </div>
                {!isCollapsed && (
                    <div className="px-3 pb-3 overflow-y-auto max-h-40 sm:max-h-48 no-scrollbar border-t border-stone-100 pt-2 bg-stone-50/30">
                        <ul className="space-y-1.5 text-[11px] sm:text-xs text-stone-600 whitespace-pre-line">
                            {criticalErrors.map((err, idx) => (
                                <li key={`crit-${idx}`} className="bg-red-50 text-red-900 px-2 py-1.5 rounded border border-red-100 animate-fade-in">
                                    {err.type === "INVALID_START_STATE" && "Initial state required\n(Press Alt + Right Click to set starting state)."}
                                    {err.type === "NON_DETERMINISTIC_TRANSITION" && `Non-Deterministic Transition detected. The state '${getStateFromId(a, err.stateId)?.label}' has many transitions for symbol '${err.symbol}'.`}
                                    {err.type === "INVALID_TRANSITION" && `Corrupt transition structure.\nPlease check the transition from '${getStateFromId(a, getTransitionFromId(a, err.transitionId)?.from)?.label}' to '${getStateFromId(a, getTransitionFromId(a, err.transitionId)?.to)?.label}' with symbol '${getTransitionFromId(a, err.transitionId)?.symbol}'`}
                                    {err.type === "MISSING_STATE" && `State '${err.stateId}' is referenced but does not exist.`}
                                </li>
                            ))}
                            {warnings.map((err, idx) => (
                                <li key={`warn-${idx}`} className="bg-amber-50 text-amber-800 px-2 py-1.5 rounded border border-amber-100 animate-fade-in">
                                    {err.type === "MISSING_TRANSITION" && `Missing transition in '${getStateFromId(a, err.stateId)?.label}' for symbol '${err.symbol}'.`}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}