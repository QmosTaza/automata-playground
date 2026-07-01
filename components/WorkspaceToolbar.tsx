"use client";

import React from "react";

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
    return (
        <div className="relative flex items-center justify-between bg-stone-50 border-b border-stone-200 px-4 h-7 select-none nodrag w-full">
            {/* Left Actions */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
            {/* Center App Name */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
                <span className="text-sm font-bold text-orange-700 uppercase tracking-wider select-none">
                    Park-O-Mata
                </span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center">
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