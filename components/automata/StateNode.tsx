"use client"

import { Handle, Position, useConnection } from "@xyflow/react"
import { useState, useRef, useEffect } from "react";

export default function StateNode({ id, data, selected }: any) {
    const connection = useConnection();
    const isConnecting = !!connection.inProgress;
    const isSourceOfConnection = connection.fromNode?.id === id;

    const handleClassName = `!w-2 !h-2 !bg-amber-100 !border-2
        ${data.accepting ? "!border-orange-700" : "!border-amber-900"}`

    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState(data.label);
    const inputRef = useRef<HTMLInputElement>(null);
    const { label, accepting, isActive } = data;

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setEditLabel(data.label);
        setIsEditing(false);
    }, [data.label]);

    useEffect(() => {
        if (!selected && isEditing) {
            handleSave();
        }
    }, [selected, isEditing]);

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
            //inputRef.current?.blur();
            handleSave();
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
                if (e.altKey || e.ctrlKey) {
                    handleToggleStart(e);
                } else {
                    data.onToggleAccept(id);
                }
            }}
            className="relative group"
        >
            {data.isStart && (
                <div className="absolute -top-6 -left-6 pointer-events-none text-amber-600 animate-fade-in z-50 select-none rotate-45">
                    <svg width="45" height="20" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M 2 10 L 42 10" strokeLinecap="round" />
                        <path d="M 34 5 Q 35 10 34 15 L 45 10 Z" fill="currentColor"
                            strokeLinejoin="round"
                            strokeLinecap="round" />
                    </svg>
                </div>
            )}

            <Handle
                type="target"
                position={Position.Left}
                id="left-target"
                className={`${handleClassName} transition-all duration-150 relative
                    before:content-[''] before:absolute before:-top-3 before:-left-3 before:-right-3 before:-bottom-3 before:rounded-full before:pointer-events-auto
                    ${isConnecting && !isSourceOfConnection
                        ? "group-hover:!scale-125 group-hover:!bg-amber-300 group-hover:!border-amber-700"
                        : ""
                    }
                `}
            />

            <Handle
                type="source"
                position={Position.Right}
                id="right-source"
                className={`${handleClassName} transition-all duration-150 relative
                    before:content-[''] before:absolute before:-top-3 before:-left-3 before:-right-3 before:-bottom-3 before:rounded-full before:pointer-events-auto
                    ${!isConnecting
                        ? "group-hover:!scale-125 group-hover:!bg-amber-300 group-hover:!border-amber-700"
                        : ""
                    }
                `}
            />

            <div className={`relative w-16 h-16 rounded-full border-2 text-stone-800 font-semibold flex items-center justify-center select-none cursor-pointer transition-all duration-300
                ${isEditing
                    ? "bg-amber-50 border-amber-500 ring-4 ring-amber-300 scale-105"
                    : isActive
                        ? "bg-amber-200 border-amber-600 ring-8 ring-amber-500/20 scale-110 shadow-[0_0_20px_rgba(217,119,6,0.4)] z-50 text-amber-950"
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
                    <div className={`absolute inset-0.75 rounded-full border-2 transition-all
                            ${isEditing ? "border-amber-400" : isActive ? "border-amber-600 scale-95" : "border-orange-700"}`}
                    />
                )}
            </div>
        </div>
    )
}