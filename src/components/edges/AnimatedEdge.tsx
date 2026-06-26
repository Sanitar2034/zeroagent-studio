import { memo } from 'react'
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import { useExecutionStore } from '../../stores/executionStore'

const MATRIX_CHARS = '01アイウエオカキクケコサシスセソ'

function MatrixParticle({
  edgePath,
  delay,
  duration,
  char,
}: {
  edgePath: string
  delay: number
  duration: number
  char: string
}) {
  return (
    <text
      fontSize="9"
      fontFamily="var(--font-mono)"
      fill="var(--accent-green)"
      opacity={0.95}
      filter="url(#edge-matrix-glow)"
    >
      <animateMotion dur={`${duration}s`} repeatCount="indefinite" begin={`${delay}s`} path={edgePath} />
      {char}
    </text>
  )
}

function AnimatedEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const isFlowing = useExecutionStore((s) => s.flowingEdges.has(id))
  const currentNodeId = useExecutionStore((s) => s.currentNodeId)
  const isNodeActive = useExecutionStore(
    (s) => s.thinkingNodes.has(source) || s.thinkingNodes.has(target)
  )
  const touchesCurrent =
    currentNodeId != null && (source === currentNodeId || target === currentNodeId)
  const isActive = isFlowing || isNodeActive || touchesCurrent

  const strokeColor = selected
    ? 'var(--accent-green)'
    : isActive
      ? 'var(--accent-cyan)'
      : 'var(--edge-color)'

  const strokeWidth = selected ? 3 : isActive ? 2.5 : 1.5

  return (
    <>
      {selected && (
        <BaseEdge
          id={`${id}-selection-halo`}
          path={edgePath}
          style={{
            stroke: 'rgba(16, 185, 129, 0.35)',
            strokeWidth: 10,
            pointerEvents: 'none',
          }}
        />
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: selected ? '10 6' : undefined,
          animation: selected ? 'edge-dash-march 0.8s linear infinite' : undefined,
          transition: 'stroke 0.25s, stroke-width 0.25s',
          filter: selected
            ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.8))'
            : isActive
              ? 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.55))'
              : undefined,
        }}
      />
      {isActive &&
        [0, 0.35, 0.7].map((delay, index) => (
          <motion.circle
            key={`${id}-pulse-${index}`}
            r={index === 1 ? 3.5 : 2.5}
            fill={index === 1 ? 'var(--accent-green)' : 'var(--accent-cyan)'}
            filter="url(#edge-matrix-glow)"
            opacity={0.9 - index * 0.15}
          >
            <animateMotion
              dur={`${1.2 + index * 0.25}s`}
              repeatCount="indefinite"
              begin={`${delay}s`}
              path={edgePath}
            />
          </motion.circle>
        ))}
      {isActive &&
        [0, 0.5].map((delay, index) => (
          <MatrixParticle
            key={`${id}-matrix-${index}`}
            edgePath={edgePath}
            delay={delay}
            duration={1.6 + index * 0.3}
            char={MATRIX_CHARS[(index + id.length) % MATRIX_CHARS.length]}
          />
        ))}
    </>
  )
}

export default memo(AnimatedEdgeComponent)
