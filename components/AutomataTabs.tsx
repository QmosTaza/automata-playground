"use client";

import React from 'react';
import { useState } from 'react';

interface AutomataTabsProps {
    project: {
        activeAutomataId: string;
        tabsOrder: string[];
        automata: Record<string, { id: string; name: string }>;
    };
    onSelectTab: (id: string) => void;
    onAddTab: () => void;
    onDeleteTab: (id: string, e: React.MouseEvent) => void;
    setIsHelpOpen: (state: boolean) => void;
    setIsHelpMobileOpen: (state: boolean) => void;
}

function AutomataTabs({
    project,
    onSelectTab,
    onAddTab,
    onDeleteTab,
    setIsHelpOpen,
    setIsHelpMobileOpen
}: AutomataTabsProps) {


    return (
        <div className="flex items-center justify-between bg-stone-50 border-b border-stone-200 px-4 h-11 select-none nodrag w-full">
            {/* Tab Selection List */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[calc(100%-60px)] no-scrollbar py-1">
                {project.tabsOrder.map((id) => {
                    const currentTab = project.automata[id];
                    if (!currentTab) return null;

                    const isActive = id === project.activeAutomataId;

                    return (
                        <div
                            key={id}
                            onClick={() => onSelectTab(id)}
                            className={`group flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap select-none tracking-wide ${isActive
                                ? "bg-white text-amber-800 border-stone-200 shadow-sm"
                                : "bg-transparent text-stone-400 border-transparent hover:bg-stone-200/60 hover:text-stone-600"
                                }`}
                        >
                            {/* Label reads directly from the active automaton instance name */}
                            <span>{currentTab.name || "Untitled Automaton"}</span>

                            {/* Close Tab (Only if multiple tabs exist) */}
                            {project.tabsOrder.length > 1 && (
                                <button
                                    onClick={(e) => onDeleteTab(id, e)}
                                    className="text-[10px] font-sans font-normal text-stone-400 hover:text-rose-600 rounded p-0.5 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ml-0.5"
                                    title="Close workspace"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Add Tab Button */}
                <button
                    onClick={onAddTab}
                    className="p-1.5 text-stone-400 text-[12px] hover:text-amber-800 hover:bg-stone-200/60 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center ml-1 shrink-0"
                    title="Open fresh workspace"
                >
                    <i className="nf nf-oct-plus"></i>
                </button>
            </div>

            {/* Context Right Side (Version + Help button) */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                    onClick={() => {
                        if (window.innerWidth < 640) {
                            setIsHelpMobileOpen(true);
                        } else {
                            setIsHelpOpen(true);
                        }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-mono font-bold text-stone-400 border border-transparent hover:bg-stone-200/40 hover:text-stone-600 rounded-lg transition-all cursor-pointer tracking-wide"
                    title="Open user guide"
                >
                    <i className="nf nf-fa-book_open_reader"></i>
                    <span className="hidden sm:inline">Help</span>
                </button>
                <span className="hidden sm:block h-3 w-[1px] bg-stone-200" />
                <span className="hidden sm:inline-block text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md tracking-wide uppercase select-none">
                    v1.0.0
                </span>
            </div>
        </div>
    );
}

export default React.memo(AutomataTabs);