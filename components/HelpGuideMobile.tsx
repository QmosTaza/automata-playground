"use client"

interface HelpGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function HelpGuideMobile({ isOpen, onClose }: HelpGuideProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Transparentish BG */}
            <div
                className="absolute inset-0 bgstone-900/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}>
            </div>

            {/*Actual Guide*/}
            <div className="relative bg-amber-100/95 backdrop-blur-md border border-amber-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-fade-in pointer-events-auto">
                {/* Header */}
                <div className="p-4 bg-white/95 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 select-none">
                            Quick Guide
                        </span>
                        <h2 className="text-base font-bold text-stone-800 mt-0.5">Playground Handbook</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-600 font-sans text-xs p-1.5 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
                {/* CONTENTS */}

                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans text-stone-600 leading-relaxed">

                    <div>
                        <h3 className="font-mono font-bold text-amber-900 uppercase tracking-wide mb-1">
                            <i className="nf nf-cod-circle"></i> Creating States
                        </h3>

                        <p>
                            Click anywhere on the empty workspace to create a new state.
                            To mark a state as the start state, select it and press the <i className="nf nf-fa-circle_right"></i> button. To mark a state as
                            accepting, select it and press the <i className="nf nf-md-circle_double"></i> button.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono font-bold text-amber-900 uppercase tracking-wide mb-1">
                            <i className="nf nf-md-state_machine"></i> Creating Transitions
                        </h3>

                        <p>
                            Drag from the right handle of a state to the left handle of another
                            state (or back to itself) to create a transition. Transition labels
                            can be edited either from the Inspector Panel or directly on the graph
                            by selecting the edge and clicking its label.
                        </p>

                        <p className="mt-2">
                            Type symbols to add them to the transition.
                            Press
                            <kbd className="bg-stone-100 border border-stone-200 px-1 py-0.5 rounded text-[10px] font-mono shadow-sm mx-1">
                                Space
                            </kbd>
                            to insert <span className="font-mono font-bold">λ</span>, and use
                            <kbd className="bg-stone-100 border border-stone-200 px-1 py-0.5 rounded text-[10px] font-mono shadow-sm mx-1">
                                Backspace
                            </kbd>
                            or
                            <kbd className="bg-stone-100 border border-stone-200 px-1 py-0.5 rounded text-[10px] font-mono shadow-sm mx-1">
                                Delete
                            </kbd>
                            to remove symbols.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono font-bold text-amber-900 uppercase tracking-wide mb-1">
                            <i className="nf nf-md-dots_circle"></i> Editing Automata
                        </h3>

                        <p>
                            Select any state or transition to inspect and modify it.
                            The Inspector Panel allows you to rename states, edit transition
                            symbols, and view automaton information.
                        </p>

                        <p className="mt-2">
                            To remove a selected state or transition, press the <i className="nf nf-md-delete"></i> button.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono font-bold text-amber-900 uppercase tracking-wide mb-1">
                            <i className="nf nf-cod-symbol_method"></i> Regular Expressions
                        </h3>

                        <p>
                            The Inspector Panel includes a regular expression compiler.
                            Enter any valid regular expression and generate a new
                            λ-NFA automatically using Thompson's construction.
                        </p>

                        <p className="mt-2">
                            Whenever possible, the playground also computes and displays an
                            equivalent regular expression for the automaton currently shown on
                            the canvas.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono font-bold text-amber-900 uppercase tracking-wide mb-1">
                            <i className="nf nf-md-swap_horizontal"></i> Automaton Types
                        </h3>

                        <p>
                            Use the controls beneath the simulation bar to switch between
                            DFA, NFA, and λ-NFA modes. Validation rules and available
                            transition types automatically adapt to the selected model.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono font-bold text-amber-900 uppercase tracking-wide mb-1">
                            <i className="nf nf-oct-play"></i> Running Simulations
                        </h3>

                        <p>
                            Enter an input string in the simulation bar and press
                            <span className="text-amber-800 font-bold"> Run </span>
                            to execute the automaton. The simulator shows every step of the
                            computation, highlights active states, and indicates whether the
                            input is accepted or rejected.
                        </p>
                    </div>

                </div>
                {/* Bye bye button */}
                <div className="p-3 bg-white/95 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg shadow-sm transition-all cursor-pointer text-xs active:scale-95"
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    )
}