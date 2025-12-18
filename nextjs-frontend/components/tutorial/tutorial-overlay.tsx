"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, ArrowRight, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface TutorialStep {
  id: string
  title: string
  description: string
  target?: string // CSS selector for element to highlight
  position?: "top" | "bottom" | "left" | "right" | "center"
  content?: React.ReactNode
}

interface TutorialOverlayProps {
  steps: TutorialStep[]
  onComplete: () => void
  onSkip: () => void
}

export function TutorialOverlay({ steps, onComplete, onSkip }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)

  const currentStepData = steps[currentStep]

  useEffect(() => {
    if (currentStepData?.target) {
      const element = document.querySelector(currentStepData.target) as HTMLElement
      if (element) {
        setHighlightedElement(element)
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    } else {
      setHighlightedElement(null)
    }
  }, [currentStep, currentStepData])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!currentStepData) return null

  const getTooltipPosition = () => {
    if (!highlightedElement) return "center"
    const rect = highlightedElement.getBoundingClientRect()
    const position = currentStepData.position || "bottom"
    
    return {
      top: position === "top" ? rect.top - 20 : position === "bottom" ? rect.bottom + 20 : rect.top + rect.height / 2,
      left: position === "left" ? rect.left - 20 : position === "right" ? rect.right + 20 : rect.left + rect.width / 2,
      position: position
    }
  }

  const tooltipPos = getTooltipPosition()

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={handleNext} />
      
      {/* Highlight */}
      {highlightedElement && (
        <div
          className="fixed z-50 border-2 border-primary rounded-lg pointer-events-none"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 4,
            left: highlightedElement.getBoundingClientRect().left - 4,
            width: highlightedElement.getBoundingClientRect().width + 8,
            height: highlightedElement.getBoundingClientRect().height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={cn(
          "fixed z-50 bg-background rounded-lg p-6 shadow-lg max-w-sm",
          !highlightedElement && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={
          highlightedElement
            ? {
                top: tooltipPos.position === "top" || tooltipPos.position === "bottom" 
                  ? `${tooltipPos.top}px` 
                  : `${tooltipPos.top - 100}px`,
                left: tooltipPos.position === "left" || tooltipPos.position === "right"
                  ? `${tooltipPos.left}px`
                  : `${tooltipPos.left - 150}px`,
                transform: tooltipPos.position === "left" 
                  ? "translateX(-100%)" 
                  : tooltipPos.position === "right"
                  ? "translateX(0)"
                  : tooltipPos.position === "top"
                  ? "translateY(-100%)"
                  : "translateY(0)",
              }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <h3 className="text-base font-semibold mb-1.5">{currentStepData.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{currentStepData.description}</p>
            {currentStepData.content}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <Button size="sm" onClick={handleNext}>
            {currentStep === steps.length - 1 ? "Complete" : "Next"}
            {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </>
  )
}

