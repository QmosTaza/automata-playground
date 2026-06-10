"use client"

import { useState, useRef, useEffect } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps, MarkerType } from "@xyflow/react"

export default function TransitionEdge({ id, sourceX, sourceY,
    targetX, targetY, sourcePosition, targetPosition, label, markerEnd, data, selected
}: EdgeProps) {

    //SYMBOL EDITING
    const [isEditing, setIsEditing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const customData = data as any;
    const symbols: (string | null)[] = customData?.symbols ?? [];

    useEffect(() => {
        if (isEditing && containerRef.current) {
            containerRef.current?.focus();
        }
    }, [isEditing, symbols]);

    useEffect(() => {
        if (!selected) {
            setIsEditing(false);
        }
    }, [selected]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isEditing || !data) return;

        e.preventDefault();

        if (e.key === "Backspace" || e.key === "Delete") {
            if (symbols.length === 0) {
                setIsEditing(false);
                customData.onRemoveEdge?.(id);
            } else {
                const nextSymbols = symbols.slice(0, -1);
                customData.onUpdateSymbols?.(id, nextSymbols);
            }
        } else if (e.key === " ") {
            customData.onUpdateSymbols?.(id, [...symbols, null]);
        } else if (e.key === "Enter" || e.key === "Escape") {
            setIsEditing(false);
        } else if (e.key.length === 1) {
            customData.onUpdateSymbols?.(id, [...symbols, e.key]);
        }
    };

    //EDGE EDITION
    const edgeColor = selected ? "#3b82f6" : "#92400e";

    const localMarkerId = `marker-${id}`;

    //PATH CALCULATION
    const isSelfLoop = customData?.isLoop || (sourceX === targetX && sourceY === targetY)
    let path: string
    let labelX = (sourceX + targetX) / 2
    let labelY = (sourceY + targetY) / 2

    if (isSelfLoop) {
        const nodeSize = 64

        path = `
            M ${sourceX} ${sourceY}
            C ${sourceX + nodeSize} ${sourceY - nodeSize * 0.5},
              ${sourceX} ${sourceY - nodeSize * 1.5},
              ${sourceX - nodeSize / 2 - 4} ${sourceY - nodeSize / 2 - 4}
        `
        labelX = sourceX
        labelY = sourceY - nodeSize
    } else if (data?.isBiDirectional) {
        const midX = (sourceX + targetX) / 2;
        const midY = (sourceY + targetY) / 2;

        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const len = Math.sqrt(dx * dx + dy * dy);
        const normalX = -dy / len;
        const normalY = dx / len;

        const controlX = midX + normalX * 30;
        const controlY = midY + normalY * 30;

        path = `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
        labelX = controlX;
        labelY = controlY;
    } else {
        [path, labelX, labelY] = getBezierPath({
            sourceX, sourceY, targetX, targetY,
            sourcePosition, targetPosition
        })
    }

    return (
        <>
            <defs>
                <marker
                    id={localMarkerId}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="4.9"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                >
                    <path
                        d="M 2 2 L 2 8 L 8 5 Z"
                        fill={edgeColor}
                        stroke={edgeColor}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                </marker>
            </defs>
            <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="react-flow__edge-interaction cursor-pointer"
            />
            <BaseEdge
                id={id}
                path={path}
                markerEnd={`url(#${localMarkerId})`}
                style={{
                    stroke: edgeColor,
                    strokeWidth: selected ? 3 : 2,
                    transition: "stroke 0.15s, stroke-width 0.15s"
                }}
            />
            <EdgeLabelRenderer>
                <div
                    ref={containerRef}
                    tabIndex={0}
                    autoFocus={isEditing}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => {
                        //if (e.shiftKey) return;
                        if (!selected) return;
                        e.stopPropagation();
                        setIsEditing(true);
                    }}
                    style={{
                        position: "absolute",
                        top: `${labelY}px`,
                        left: `${labelX}px`,
                        transform: `translate(-50%, -50%)`,
                        pointerEvents: "all",
                        zIndex: 10
                    }}
                    className={`px-2 py-0.5 rounded-full select-none border-2 transition-all outline-none
                        ${isEditing
                            ? "bg-amber-50 border-amber-500 ring-2 ring-amber-300 scale-105 cursor-text"
                            : selected
                                ? "bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-300 scale-105 cursor-pointer"
                                : "bg-amber-100 border-amber-300 text-stone-800 font-semibold hover:bg-amber-200 cursor-pointer"
                        }
                        ${symbols.length === 0 && !isEditing ? "border-dashed border-red-400 bg-red-50 text-red-700" : ""}
                    `}
                >
                    {symbols.length === 0 ? (
                        <span className="text-red-600 text-xs font-bold">Ø</span>
                    ) : (
                        symbols.map((sym, index) => (
                            <span key={index}>
                                {sym === null ? "λ" : sym}
                                {index < symbols.length - 1 && <span className="text-amber-600 font-normal">, </span>}
                            </span>
                        ))
                    )}
                </div>
            </EdgeLabelRenderer>
        </>
    )
}