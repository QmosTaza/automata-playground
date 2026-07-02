"use client";

import { useState, useEffect } from "react";
import { SimulationResult, SimulationStep, FiniteAutomaton } from "@/types";
import { getStateLabelFromId } from "@/core/fa/edit";

interface SimulationStepperProps {
    fa: FiniteAutomaton;
    results: SimulationResult | SimulationResult[];
    onActiveStateChange: (stateId: string | null) => void;
    onClose: () => void;
}

export default function SimulationStepper({ fa, results, onActiveStateChange, onClose }: SimulationStepperProps) {
    // Normalise input
    const branches = Array.isArray(results) ? results : [results];

    const [selectedBranchIdx, setSelectedBranchIdx] = useState(0);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);

    const currentBranch = branches[selectedBranchIdx];
    const steps = currentBranch?.steps ?? [];
    const currentStep = steps[currentStepIdx];

    useEffect(() => {
        if (currentStep) {
            onActiveStateChange(currentStep.state);
        } else {
            onActiveStateChange(null);
        }
        return () => onActiveStateChange(null);
    }, [currentStep, onActiveStateChange]);

    const handleBranchChange = (idx: number) => {
        setSelectedBranchIdx(idx);
        setCurrentStepIdx(0);
    };

    const handleNext = () => {
        if (currentStepIdx < steps.length - 1) {
            setCurrentStepIdx(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStepIdx > 0) {
            setCurrentStepIdx(prev => prev - 1);
        }
    };

    if (!currentBranch) return null;

    const isAccepted = currentBranch.accepted;

    const isCurrentStateAccepting =
        currentStep && fa.acceptStates.includes(currentStep.state);

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[120] w-[92%] max-w-5xl flex gap-4 pointer-events-none">

            {/* BRANCH PANEL */}
            {branches.length > 1 && (
                <div className="w-52 bg-white/95 backdrop-blur-md border border-stone-200 shadow-xl rounded-2xl p-3 flex flex-col gap-1.5 max-h-56 overflow-y-auto pointer-events-auto">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-stone-400 mb-1 select-none">
                        Execution Paths ({branches.length})
                    </span>
                    {branches.map((branch, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleBranchChange(idx)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border active:scale-[0.98]
                                ${selectedBranchIdx === idx
                                    ? "bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-sm"
                                    : "bg-stone-50/50 border-stone-100 text-stone-500 hover:bg-stone-100/80"
                                }
                            `}
                        >
                            <span className="truncate">Path {idx + 1}</span>
                            <span className={`w-2 h-2 rounded-full shrink-0 ml-2
                                ${branch.accepted ? "bg-emerald-500" : "bg-red-500"}
                            `} />
                        </button>
                    ))}
                </div>
            )}

            {/* REPRODUCE STEP-BY-STEP */}
            <div className="flex-1 bg-white/95 backdrop-blur-md border border-stone-200 shadow-xl rounded-2xl overflow-hidden flex flex-col pointer-events-auto">
                {/* FINAL STATE BANNER */}
                <div className={`px-5 py-2 flex justify-between items-center transition-colors duration-300 shadow-inner
                    ${isAccepted ? "bg-emerald-600" : "bg-stone-800"}
                    ${currentBranch.error && !isAccepted ? "bg-rose-700" : ""}
                `}>
                    <div className="flex items-center gap-2">
                        {isAccepted ? (
                            <i className="nf nf-fa-circle_check text-white text-[10px] md:text-[9px]"></i>
                        ) : (
                            <i className="nf nf-cod-error text-white text-[10px] md:text-[9px]"></i>
                        )}
                        <span className="text-white text-[11px] md:text-[12px] font-bold uppercase tracking-wider select-none">
                            {currentBranch.error
                                ? `Simulation Halted: ${currentBranch.error}`
                                : isAccepted ? "String Accepted by Machine" : "String Rejected (Ends in Non-Accepting State)"
                            }
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/90 hover:text-white font-semibold text-xs bg-white/10 hover:bg-white/20 px-2 md:px-3 py-1 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer border border-white/10"
                    >
                        ✕
                    </button>
                </div>

                {/* STEPPER BODY */}
                <div className="p-5 flex flex-col gap-5">

                    {/* STRING VISUALIZER */}
                    <div className="flex flex-col gap-3.5 bg-stone-50/50 border border-stone-100 rounded-xl p-4">
                        {/* CHARACTERS */}
                        <div className="flex justify-center items-center gap-1.5 overflow-x-auto py-0.5">
                            {steps.map((step, i) => (
                                <div
                                    key={i}
                                    className={`flex flex-col items-center transition-all duration-200 shrink-0
                                        ${i === currentStepIdx ? "scale-105 opacity-100" : "opacity-30"}
                                    `}
                                >
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-mono font-bold text-xs border-2 transition-all
                                        ${i === currentStepIdx
                                            ? "bg-amber-100 border-amber-600 text-amber-950 shadow-sm"
                                            : "bg-white border-stone-200 text-stone-500"}
                                    `}>
                                        {step.symbol === null ? "λ" : step.symbol}
                                    </span>
                                    <div className={`w-1 h-1 rounded-full mt-1.5 transition-all
                                        ${i <= currentStepIdx ? "bg-amber-600" : "bg-stone-200"}
                                    `} />
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-stone-200/50 pt-3 flex justify-center items-center gap-1 text-xs text-stone-500 font-medium overflow-x-auto select-none">
                            {steps.slice(0, currentStepIdx + 1).map((step, idx) => (
                                <div key={idx} className="flex items-center gap-1 shrink-0 animate-fade-in">
                                    {idx > 0 && (
                                        <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-1 py-0.2 border border-amber-200 rounded font-bold">
                                            {step.symbol === null ? "λ" : step.symbol}
                                        </span>
                                    )}
                                    {idx > 0 && <span className="text-stone-300 font-light">→</span>}
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs shadow-sm border
                                        ${idx === currentStepIdx
                                            ? "bg-amber-600 border-amber-700 text-white font-black scale-105 ring-2 ring-amber-600/10"
                                            : "bg-white border-stone-200 text-stone-700"
                                        }
                                    `}>
                                        {getStateLabelFromId(fa, step.state)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CONTROLLERS */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-stone-100 pt-3.5">
                        {/* CURRENT STATES */}
                        <div className="flex flex-col select-none">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                Current State
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span
                                    className={`px-3 py-1 text-xs font-mono font-bold rounded-lg shadow-sm border ${isCurrentStateAccepting
                                        ? "bg-emerald-600 text-white border-emerald-700"
                                        : "bg-stone-900 text-stone-50 border-stone-950"
                                        }`}
                                >
                                    {currentStep ? getStateLabelFromId(fa, currentStep.state) : "—"}
                                </span>
                                {currentStepIdx === steps.length - 1 && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border truncate
                                        ${isAccepted
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                            : "bg-stone-100 border-stone-200 text-stone-600"}
                                    `}>
                                        {isAccepted ? "Final State (Match)" : "Final State (No Match)"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* NAV BUTTONS */}
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrev}
                                disabled={currentStepIdx === 0}
                                className={`flex-1 sm:flex-initial font-semibold text-xs px-4 py-2 sm:py-1.5 rounded-lg transition-all shadow-sm border flex items-center justify-center gap-1
                                    ${currentStepIdx !== 0
                                        ? 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer active:scale-95'
                                        : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'}
                                    `}
                            >
                                <i className="nf nf-md-chevron_left text-[10px] md:text-[9px]"></i>
                                <span>Previous</span>
                            </button>

                            <button
                                onClick={handleNext}
                                disabled={currentStepIdx === steps.length - 1}
                                className={`flex-1 sm:flex-initial font-semibold text-xs px-5 py-2 sm:py-1.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1
                                    ${currentStepIdx === steps.length - 1
                                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                        : 'bg-amber-700 hover:bg-amber-800 text-white cursor-pointer active:scale-95'}
                                `}
                            >
                                <span>Next Step</span>
                                <i className="nf nf-md-chevron_right text-[10px] md:text-[9px]"></i>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}