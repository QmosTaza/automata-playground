"use client"

import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps, Position } from "@xyflow/react"

export default function TransitionEdge({ id, sourceX, sourceY,
    targetX, targetY, sourcePosition, targetPosition, label, markerEnd, data
}: EdgeProps) {

    const isSelfLoop = data?.isLoop || (sourceX === targetX && sourceY === targetY)
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
            <BaseEdge
                id={id}
                path={path}
                markerEnd={markerEnd}
                style={{
                    stroke: "#92400e",
                    strokeWidth: 2
                }}
            />

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: "absolute",
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: "all",
                        zIndex: 10
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        (data as any)?.onEdit?.(id);
                    }}
                    className="px-1 py-0.5 rounded-full bg-amber-100 cursor-pointer select-none
                        border-2 border-amber-300 text-stone-800 text-sm font-semibold
                    "
                >
                    {label}
                </div>
            </EdgeLabelRenderer>
        </>
    )
}