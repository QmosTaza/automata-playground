import { Automaton } from "@/types";
import { getStateFromId, getTransitionFromId } from "@/core/fa";

export default function ValidationErrorPanel({ errors, a }: { errors: any[], a: Automaton }) {
    if (errors.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-4 z-[100] max-w-sm max-h-60 overflow-y-auto bg-white p-4 rounded-xl shadow-xl border border-red-200 backdrop-blur-md bg-white/95">
            <div className="flex items-center gap-2 mb-2 text-red-700 font-bold">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Automata Errors ({errors.length})</span>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 whitespace-pre-line">
                {errors.map((err, idx) => (
                    <li key={idx} className="bg-red-50 text-red-900 px-2 py-1.5 rounded border border-red-100">
                        {err.type === "INVALID_START_STATE" && "Initial state required\n(Press Shift + Right Click to set starting state)."}
                        {err.type === "NON_DETERMINISTIC_TRANSITION" && `Non-Deterministic Transition detected. The state '${getStateFromId(a, err.stateId)?.label}' has many transitions for symbol '${err.symbol}'.`}
                        {err.type === "MISSING_TRANSITION" && `Missing transition in '${getStateFromId(a, err.stateId)?.label}' for symbol '${err.symbol}'.`}
                        {err.type === "INVALID_TRANSITION" && `Corrupt transition structure.\nPlease check that the transition from '${getStateFromId(a,getTransitionFromId(a,err.transitionId)?.from)?.label}' 
                        to '${getStateFromId(a,getTransitionFromId(a,err.transitionId)?.to)?.label}' with symbol '${getTransitionFromId(a,err.transitionId)?.symbol}'`}
                    </li>
                ))}
            </ul>
        </div>
    );
}