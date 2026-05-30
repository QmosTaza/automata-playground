"use client"

import { Handle, Position } from "@xyflow/react"

export default function StateNode({ id, data }: any) {
    const handleClassName = `!w-2 !h-2 !bg-amber-100 !border-2
        ${data.accepting ? "!border-orange-700" : "!border-amber-900"}`

    const handleDoubleClick = () => {
        const newLabel = prompt("Nuevo nombre del estado:", data.label);
        if (newLabel && newLabel.trim() !== "") {
            data.onRename(id, newLabel.trim());
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault(); // Evita el menú del navegador
        data.onToggleAccept(id);
    };

    return (
        <div 
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            className="relative"
        >
            <Handle type="target" position={Position.Left} id="left-target"
                className={handleClassName} />

            <Handle type="source" position={Position.Right} id="right-source"
                className={handleClassName} />

            <div className={`relative w-16 h-16 rounded-full border-2 bg-amber-100 
                text-stone-800 font-semibold flex items-center justify-center select-none cursor-pointer
                ${data.accepting ? "border-orange-700" : "border-amber-900"}`}>
                {data.label}
                {data.accepting && (
                    <div className="absolute inset-0.75 rounded-full border-2 border-orange-700"
                    />
                )}
            </div>
        </div>
    )
}