import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { getQuestSteps } from '../../lib/tutorialQuests'
import { useTutorialStore, registerTutorialWorkflowAccessor } from '../../stores/tutorialStore'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useExecutionStore } from '../../stores/executionStore'
import { useConnectionStore } from '../../stores/connectionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import TutorialSpotlight from './TutorialSpotlight'
import TutorialTooltip from './TutorialTooltip'
import TutorialArrow from './TutorialArrow'
import TutorialFinale from './TutorialFinale'
import LaunchTitleSplash from '../launch/LaunchTitleSplash'
import { useTutorialTargetRect } from './useTutorialTargetRect'
import './tutorial.css'

export default function TutorialOverlay({
  onLaunchSplashDone,
}: {
  onLaunchSplashDone?: () => void
}) {
  const questId = useTutorialStore((s) => s.questId)
  const active = useTutorialStore((s) => s.active)
  const stepIndex = useTutorialStore((s) => s.stepIndex)
  const showFinale = useTutorialStore((s) => s.showFinale)
  const showLaunchSplash = useTutorialStore((s) => s.showLaunchSplash)
  const dismissLaunchSplash = useTutorialStore((s) => s.dismissLaunchSplash)
  const runFinished = useTutorialStore((s) => s.runFinished)
  const next = useTutorialStore((s) => s.next)
  const skip = useTutorialStore((s) => s.skip)
  const complete = useTutorialStore((s) => s.complete)
  const dismissFinale = useTutorialStore((s) => s.dismissFinale)
  const checkAutoAdvance = useTutorialStore((s) => s.checkAutoAdvance)
  const trackExecution = useTutorialStore((s) => s.trackExecution)

  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const workflowName = useWorkflowStore((s) => s.workflowName)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const connectionRejectionCount = useConnectionStore((s) => s.rejectionCount)
  const closeSettings = useSettingsStore((s) => s.closeSettings)

  const steps = getQuestSteps(questId)
  const step = steps[stepIndex]
  const targetRect = useTutorialTargetRect(step?.target, active)
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null)
  const handleTooltipMeasured = useCallback((rect: DOMRect) => {
    setTooltipRect(rect)
  }, [])

  useEffect(() => {
    registerTutorialWorkflowAccessor(() => useWorkflowStore.getState())
  }, [])

  useEffect(() => {
    if (active) closeSettings()
  }, [active, closeSettings])

  useEffect(() => {
    if (!active) return
    trackExecution(isRunning, nodes)
  }, [active, isRunning, nodes, trackExecution])

  useEffect(() => {
    if (!active) return
    checkAutoAdvance({
      nodes,
      edges,
      workflowName,
      isRunning,
      connectionRejectionCount,
    })
  }, [active, nodes, edges, workflowName, isRunning, runFinished, connectionRejectionCount, checkAutoAdvance])

  useEffect(() => {
    if (!active) {
      document.body.classList.remove('tutorial-active')
      return
    }
    if (step?.highlightPalette?.length) {
      document.body.classList.add('tutorial-active')
    } else {
      document.body.classList.remove('tutorial-active')
    }
    return () => document.body.classList.remove('tutorial-active')
  }, [active, step?.highlightPalette])

  useEffect(() => {
    if (!active) {
      const frame = requestAnimationFrame(() => setTooltipRect(null))
      return () => cancelAnimationFrame(frame)
    }
  }, [active, stepIndex])

  const handleComplete = useCallback(() => {
    complete()
  }, [complete])

  const handleLaunchSplashDismiss = useCallback(() => {
    dismissLaunchSplash()
  }, [dismissLaunchSplash])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <AnimatePresence onExitComplete={onLaunchSplashDone}>
        {showLaunchSplash && (
          <LaunchTitleSplash key="launch-splash" onDone={handleLaunchSplashDismiss} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFinale && <TutorialFinale key="finale" onDone={dismissFinale} />}
      </AnimatePresence>

      {active && step && (
        <div className="tutorial-root">
          <TutorialSpotlight
            targetRect={targetRect}
            centerMode={step.placement === 'center'}
          />
          <TutorialTooltip
            step={step}
            stepIndex={stepIndex}
            totalSteps={steps.length}
            targetRect={targetRect}
            placement={step.placement}
            onNext={next}
            onSkip={skip}
            onComplete={handleComplete}
            onLayoutMeasured={handleTooltipMeasured}
          />
          <TutorialArrow
            targetRect={targetRect}
            tooltipRect={tooltipRect}
            placement={step.placement}
          />
        </div>
      )}
    </>,
    document.body
  )
}
