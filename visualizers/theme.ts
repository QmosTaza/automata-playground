import { MarkerType, Edge } from "@xyflow/react"

export const EDGE_STYLE = {
    type: "transition",
    markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#92400e",
        width: 15,
        height: 15
    },
    style: {
        stroke: "#92400e",
        strokeWidth: 2
    }
} satisfies Partial<Edge>