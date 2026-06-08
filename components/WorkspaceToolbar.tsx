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
    <div className="flex items-center justify-between bg-stone-50 border-b border-stone-200 px-4 h-7 select-none nodrag w-full">
      {/* Left Actions */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        
        {/* Export */}
        <button
          onClick={onExport}
          className="group flex items-center gap-2 px-2.5 py-0.5 text-xs font-mono font-bold rounded-md border bg-transparent text-stone-400 border-transparent hover:bg-stone-200/60 hover:text-stone-600 transition-all cursor-pointer whitespace-nowrap select-none tracking-wide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export Project</span>
        </button>

        {/* Import */}
        <label
          className="group flex items-center gap-2 px-2.5 py-0.5 text-xs font-mono font-bold rounded-md border bg-transparent text-stone-400 border-transparent hover:bg-stone-200/60 hover:text-stone-600 transition-all cursor-pointer whitespace-nowrap select-none tracking-wide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span>Import Project</span>
          <input
            type="file"
            accept=".json"
            onChange={onImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Right Actions */}
      <div className="flex items-center">
        {/* Reset */}
        <button
          onClick={onClear}
          className="group flex items-center gap-2 px-2.5 py-0.5 text-xs font-mono font-bold text-stone-400 border border-transparent hover:border-rose-200 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-md transition-all cursor-pointer tracking-wide"
          title="Wipe browser memory"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Reset Environment</span>
        </button>
      </div>
    </div>
  );
}