"use client"

import { Handle, Position } from "@xyflow/react"
import { useState, useRef, useEffect } from "react";

export default function StateNode({ id, data, selected }: any) {
    const handleClassName = `!w-2 !h-2 !bg-amber-100 !border-2
        ${data.accepting ? "!border-orange-700" : "!border-amber-900"}`

    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState(data.label);
    const inputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        setEditLabel(data.label);
        setIsEditing(false);
    }, [data.label]);

    const handleSave = () => {
        const trimmed = editLabel.trim();

        setIsEditing(false);

        if (trimmed && trimmed !== data.label) {
            data.onRename(id, trimmed);
        } else {
            setEditLabel(data.label);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        console.log("KEY", e.key);
        if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
        }
        if (e.key === "Escape") {
            setIsEditing(false);
            setEditLabel(data.label);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        data.onToggleAccept(id);
    };

    const handleToggleStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isEditing) return;
        data.onToggleStart?.(id);
    };

    return (
        <div
            onDoubleClick={handleDoubleClick}
            onContextMenu={(e) => {
                e.preventDefault();
                if (e.altKey || e.shiftKey) {
                    handleToggleStart(e);
                } else {
                    data.onToggleAccept(id);
                }
            }}
            className="relative"
        >
            {data.isStart && (
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 pointer-events-none text-stone-800 animate-fade-in">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M2 12h16M12 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            )}
            <Handle type="target" position={Position.Left} id="left-target"
                className={handleClassName} />

            <Handle type="source" position={Position.Right} id="right-source"
                className={handleClassName} />

            <div className={`relative w-16 h-16 rounded-full border-2 text-stone-800 font-semibold flex items-center justify-center select-none cursor-pointer transition-all
                ${isEditing
                    ? "bg-amber-50 border-amber-500 ring-4 ring-amber-300 scale-105"
                    : selected
                        ? 'ring-4 ring-blue-400 border-blue-500 bg-amber-100'
                        : data.accepting
                            ? "border-orange-700 bg-amber-100"
                            : "border-amber-900 bg-amber-100"
                }`}
            >
                <div className="w-full px-2 text-center z-10">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                handleKeyDown(e);
                            }}
                            className="nodrag w-full text-center bg-transparent outline-none font-semibold text-stone-900"
                            maxLength={5}
                        />
                    ) : (
                        <span>{data.label}</span>
                    )}
                </div>
                {data.accepting && (
                    <div className={`absolute inset-0.75 rounded-full border-2 transition-colors
                            ${isEditing ? "border-amber-400" : "border-orange-700"}`}
                    />
                )}
            </div>
        </div>
    )
}