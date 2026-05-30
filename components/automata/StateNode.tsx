"use client"

import { Handle, Position } from "@xyflow/react"

export default function StateNode({ data }: any) {
    const handleClassName = `!w-2 !h-2 !bg-amber-100 !border-2
        ${data.accepting ? "!border-orange-700" : "!border-amber-900"}`

    return (
        <>
            <Handle type="target" position={Position.Left} id="left-target"
                className={handleClassName} />

            <Handle type="source" position={Position.Right} id="right-source"
                className={handleClassName} />

            <Handle type="source" position={Position.Left} id="left-source"
                className={handleClassName} />

            <Handle type="target" position={Position.Right} id="right-target"
                className={handleClassName} />

            <Handle type="target" position={Position.Bottom} id="bottom-target" className={handleClassName} />
            <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleClassName} />

            <Handle type="target" position={Position.Top} id="top-target" className={handleClassName} />
            <Handle type="source" position={Position.Top} id="top-source" className={handleClassName} />

            <div className={`relative w-16 h-16 rounded-full border-2 bg-amber-100 
                text-stone-800 font-semibold flex items-center justify-center
                ${data.accepting ? "border-orange-700" : "border-amber-900"}`}>
                {data.label}
                {data.accepting && (
                    <div className="absolute inset-0.75 rounded-full border-2 border-orange-700"
                    />
                )}
            </div>
        </>
    )
}