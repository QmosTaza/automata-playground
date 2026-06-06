"use client";

import { Automaton } from "@/types";
import { getStateFromId, getTransitionFromId } from "@/core/fa";
import { useState } from "react";

interface ValidationErrorPanelProps {
    errors: any[];
    a: Automaton;
}

export default function ValidationErrorPanel({ errors, a }: ValidationErrorPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    if (!errors || errors.length === 0) return null;

    const criticalErrors = errors.filter(err => err.type !== "MISSING_TRANSITION");
    const warnings = errors.filter(err => err.type === "MISSING_TRANSITION");

    const isCritical = criticalErrors.length > 0;

    return (
        <div
            className={`absolute bottom-4 left-4 z-[100] max-w-sm max-h-60 overflow-y-auto p-4 rounded-xl shadow-xl border backdrop-blur-md transition-colors duration-200
                ${isCritical
                    ? "bg-white/95 border-red-200 text-red-700"
                    : "bg-white/95 border-amber-200 text-amber-700"
                }`}
        >
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`flex items-center justify-between p-3 cursor-pointer group transition-colors rounded-t-xl ${isCollapsed ? 'rounded-b-xl' : ''}`}
            >
                <div className="flex items-center gap-2 mb-2 font-bold">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>
                        {isCritical
                            ? `Automata Errors (${errors.length})`
                            : `Automata Warnings (${errors.length})`
                        }
                    </span>
                </div>
                <button
                    className={`p-1 rounded-xl transition-all border border-transparent bg-white group-hover:bg-amber-100/70 text-red-700/70 transition-colors`}
                    title={isCollapsed ? "Expand validation logs" : "Minimize panel overlay"}
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 2 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className={`transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            </div>
            {!isCollapsed && (
                <div className="px-3 pb-3 overflow-y-auto max-h-48 no-scrollbar border-t border-stone-100/80 pt-2.5">

                    <ul className="space-y-1.5 text-xs text-stone-600 whitespace-pre-line">
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
    );
}