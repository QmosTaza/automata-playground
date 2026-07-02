"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";

interface WorkspaceToolbarProps {
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
}

export default function WorkspaceToolbar({
    onExport,
    onImport,
    onClear,
}: WorkspaceToolbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // PHONE Automatically close the dropdown if the user clicks outside of it
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);


    return (
        <div className="relative flex items-center justify-between bg-stone-50 border-b border-stone-200 px-4 h-7 select-none nodrag w-full z-[100]">    
            {/* DESKTOP Left Actions */}
            <div className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {/* Import */}
                <label
                    className="group flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold rounded-md border bg-transparent text-stone-400 border-transparent hover:bg-stone-200/60 hover:text-stone-600 transition-all cursor-pointer whitespace-nowrap select-none tracking-wide"
                >
                    <i className="nf nf-fa-file_import"></i>
                    <span>Import</span>
                    <input
                        type="file"
                        accept=".json"
                        onChange={onImport}
                        className="hidden"
                    />
                </label>

                {/* Export */}
                <button
                    onClick={onExport}
                    className="group flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold rounded-md border bg-transparent text-stone-400 border-transparent hover:bg-stone-200/60 hover:text-stone-600 transition-all cursor-pointer whitespace-nowrap select-none tracking-wide"
                >
                    <i className="nf nf-fa-file_export"></i>
                    <span>Export</span>
                </button>

            </div>

            {/* MOBILE ACTIONS TOGGLE BUTTON */}
            <div className="relative md:hidden flex items-center" ref={menuRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center justify-center p-1 rounded-md text-stone-400 hover:bg-stone-200/60 hover:text-stone-600 transition-all cursor-pointer ${isOpen ? "bg-stone-200 text-stone-700" : ""
                        }`}
                >
                    <i className={`nf nf-fa-bars text-xs`}></i>
                </button>

                {/* DROPDOWN MENU PANEL */}
                <div
                    className={`absolute left-0 top-[26px] min-w-[180px] bg-white border border-stone-200 shadow-xl rounded-md py-1 flex flex-col gap-0.5 transition-all duration-150 transform origin-top-left z-[110] ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                        }`}
                >
                    {/* Import */}
                    <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold text-stone-500 hover:bg-stone-50 hover:text-stone-800 cursor-pointer transition-colors">
                        <i className="nf nf-fa-file_import w-4"></i>
                        <span>Import JSON</span>
                        <input type="file" accept=".json" onChange={(e) => { onImport(e); setIsOpen(false); }} className="hidden" />
                    </label>

                    {/* Export */}
                    <button
                        onClick={() => { onExport(); setIsOpen(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold text-stone-500 hover:bg-stone-50 hover:text-stone-800 text-left cursor-pointer transition-colors"
                    >
                        <i className="nf nf-fa-file_export w-4"></i>
                        <span>Export JSON</span>
                    </button>

                    <div className="border-t border-stone-100 my-1 md:hidden" />

                    {/* Reset Environment */}
                    <button
                        onClick={() => { onClear(); setIsOpen(false); }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold text-amber-600 hover:bg-red-50 hover:text-amber-900 text-left cursor-pointer transition-colors"
                    >
                        <i className="nf nf-md-delete w-4"></i>
                        <span>Reset Environment</span>
                    </button>
                </div>
            </div>

            {/* Center App Name */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
                <span className="text-sm font-bold text-orange-700 uppercase tracking-wider select-none">
                    Park-O-Mata
                </span>
            </div>

            {/* DESKTPOP Right Actions */}
            <div className="hidden md:flex items-center">
                {/* Reset */}
                <button
                    onClick={onClear}
                    className="group flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-bold text-stone-400 border border-transparent hover:border-rose-200 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-md transition-all cursor-pointer tracking-wide"
                    title="Wipe browser memory"
                >
                    <i className="nf nf-md-delete"></i>
                    <span>Reset Environment</span>
                </button>
            </div>
        </div>
    );
}