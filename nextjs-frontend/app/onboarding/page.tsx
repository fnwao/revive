"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Play, BookOpen, Settings, BarChart3, MessageSquare, Zap, TrendingUp, DollarSign, Clock, Rocket, Sparkles, User, Sparkles as SparklesIcon } from "lucide-react"
import { AcquiriLogo } from "@/components/logo"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function OnboardingPage() {
  const router = useRouter()
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Check if user is coming from signup (has completed signup)
  useEffect(() => {
    const fromSignup = typeof window !== "undefined" && sessionStorage.getItem("fromSignup") === "true"
    if (fromSignup) {
      setShowTutorial(true)
      sessionStorage.removeItem("fromSignup")
    }
  }, [])

  const tutorialSteps = [
    {
      title: "Welcome to Revive.ai",
      description: "Let's take a quick tour of the platform. This will only take a few minutes.",
      icon: Sparkles,
      illustration: "welcome",
      content: (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-[#4F8CFF]/5 rounded-lg border border-[#4F8CFF]/10 text-center">
              <Zap className="h-6 w-6 text-[#4F8CFF] mx-auto mb-2" />
              <p className="text-xs font-medium text-[#F5F7FA]">Auto-Detect</p>
            </div>
            <div className="p-4 bg-[#4F8CFF]/5 rounded-lg border border-[#4F8CFF]/10 text-center">
              <MessageSquare className="h-6 w-6 text-[#4F8CFF] mx-auto mb-2" />
              <p className="text-xs font-medium text-[#F5F7FA]">AI Messages</p>
            </div>
            <div className="p-4 bg-[#4F8CFF]/5 rounded-lg border border-[#4F8CFF]/10 text-center">
              <TrendingUp className="h-6 w-6 text-[#4F8CFF] mx-auto mb-2" />
              <p className="text-xs font-medium text-[#F5F7FA]">Recover Revenue</p>
            </div>
          </div>
          <p className="text-sm text-[#B8BDC9] text-center">
            Revive.ai automatically detects stalled deals in your GoHighLevel pipeline and generates personalized reactivation messages.
          </p>
        </div>
      ),
    },
    {
      title: "Dashboard Overview",
      description: "Your dashboard shows key metrics at a glance.",
      icon: BarChart3,
      illustration: "dashboard",
      content: (
        <div className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#B8BDC9]">Active Revivals</span>
                <Zap className="h-4 w-4 text-[#4F8CFF]" />
              </div>
              <div className="text-2xl font-bold text-[#F5F7FA]">12</div>
            </div>
            <div className="p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#B8BDC9]">Revenue</span>
                <DollarSign className="h-4 w-4 text-[#4F8CFF]" />
              </div>
              <div className="text-2xl font-bold text-[#F5F7FA]">$24.5K</div>
            </div>
            <div className="p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#B8BDC9]">Success Rate</span>
                <TrendingUp className="h-4 w-4 text-[#4F8CFF]" />
              </div>
              <div className="text-2xl font-bold text-[#F5F7FA]">68%</div>
            </div>
            <div className="p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#B8BDC9]">Response</span>
                <Clock className="h-4 w-4 text-[#4F8CFF]" />
              </div>
              <div className="text-2xl font-bold text-[#F5F7FA]">2.4h</div>
            </div>
          </div>
          <div className="text-sm space-y-1.5 text-[#B8BDC9]">
            <p className="font-medium text-[#F5F7FA]">You'll see:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Active revivals in progress</li>
              <li>Total revenue recovered</li>
              <li>Success rate of your campaigns</li>
              <li>Average response time</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Revivals Page",
      description: "Manage all your deal reactivation campaigns in one place.",
      icon: MessageSquare,
      illustration: "revivals",
      content: (
        <div className="space-y-4 mt-6">
          <div className="space-y-3">
            <div className="p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A] animate-pulse">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm mb-1 text-[#F5F7FA]">Acme Corp Deal</div>
                  <div className="text-xs text-[#B8BDC9]">$5,000 • 10 days inactive</div>
                </div>
                <span className="text-xs px-2 py-1 bg-[#4F8CFF]/10 text-[#4F8CFF] rounded">Pending</span>
              </div>
              <div className="mt-3 p-3 bg-[#0F1115] rounded border-l-2 border-[#4F8CFF]">
                <p className="text-xs leading-relaxed text-[#B8BDC9]">Hi Sarah! I noticed we haven't connected in a while...</p>
              </div>
            </div>
          </div>
          <div className="text-sm space-y-1.5 text-[#B8BDC9]">
            <p className="font-medium text-[#F5F7FA]">Here you can:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>View all stalled deals detected by AI</li>
              <li>Review and edit AI-generated messages</li>
              <li>Approve or reject messages before sending</li>
              <li>Track the status of each revival</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Knowledge Base",
      description: "Upload your sales materials to train AI on your style.",
      icon: BookOpen,
      illustration: "knowledge",
      content: (
        <div className="space-y-4 mt-6">
          <div className="p-6 bg-[#1B1F2A] rounded-lg border-2 border-dashed border-[#4F8CFF]/20 text-center">
            <BookOpen className="h-12 w-12 text-[#4F8CFF] mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1 text-[#F5F7FA]">Upload Documents</p>
            <p className="text-xs text-[#B8BDC9]">Drag and drop files here</p>
          </div>
          <div className="text-sm space-y-1.5 text-[#B8BDC9]">
            <p className="font-medium text-[#F5F7FA]">Upload:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Sales scripts and email templates</li>
              <li>Product documentation</li>
              <li>FAQs and objection handling guides</li>
              <li>Previous successful conversations</li>
            </ul>
            <p className="text-xs text-[#4F8CFF] mt-2 font-medium">
              The more context you provide, the better AI can match your communication style.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Settings & Configuration",
      description: "Customize how Revive.ai works for your business.",
      icon: Settings,
      illustration: "settings",
      content: (
        <div className="space-y-4 mt-6">
          <div className="space-y-3">
            <div className="p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#F5F7FA]">Auto-detect Stalled Deals</p>
                  <p className="text-xs text-[#B8BDC9]">Automatically scan for deals</p>
                </div>
                <div className="w-10 h-6 bg-[#4F8CFF] rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A]">
              <p className="text-sm font-medium mb-2 text-[#F5F7FA]">Stalled Threshold</p>
              <div className="flex items-center gap-2">
                <input type="range" min="1" max="90" value="7" className="flex-1" readOnly />
                <span className="text-sm font-medium text-[#F5F7FA]">7 days</span>
              </div>
            </div>
          </div>
          <div className="text-sm space-y-1.5 text-[#B8BDC9]">
            <p className="font-medium text-[#F5F7FA]">Configure:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Stalled deal threshold (days of inactivity)</li>
              <li>Auto-approval settings</li>
              <li>GoHighLevel integration details</li>
              <li>Notification preferences</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "How It Works",
      description: "The system runs automatically in the background.",
      icon: Zap,
      illustration: "workflow",
      content: (
        <div className="space-y-4 mt-6">
          <div className="relative">
            <div className="space-y-4">
              {[
                { step: "1", text: "AI monitors your GoHighLevel deals continuously", icon: BarChart3 },
                { step: "2", text: "When a deal goes stale, AI analyzes conversation history", icon: MessageSquare },
                { step: "3", text: "AI generates a personalized reactivation message", icon: Sparkles },
                { step: "4", text: "You review and approve (or it sends automatically if enabled)", icon: Check },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A]">
                  <div className="w-8 h-8 rounded-full bg-[#4F8CFF]/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4 text-[#4F8CFF]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#4F8CFF]">Step {item.step}</span>
                    </div>
                    <p className="text-sm text-[#B8BDC9]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "You're Ready!",
      description: "Start recovering revenue from stalled deals today.",
      icon: Rocket,
      illustration: "complete",
      content: (
        <div className="space-y-4 mt-6">
          <div className="text-center p-6 bg-[#4F8CFF]/10 rounded-lg border border-[#4F8CFF]/20">
            <Rocket className="h-16 w-16 text-[#4F8CFF] mx-auto mb-4 animate-bounce" />
            <p className="text-lg font-semibold mb-2 text-[#F5F7FA]">Let's Get Started!</p>
            <p className="text-sm text-[#B8BDC9]">
              The system is now active and monitoring your deals. You'll receive notifications when revival opportunities are detected.
            </p>
          </div>
          <div className="p-4 bg-[#4F8CFF]/10 rounded-lg border border-[#4F8CFF]/20">
            <div className="flex items-start gap-3">
              <SparklesIcon className="h-5 w-5 text-[#4F8CFF] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium mb-1 text-[#F5F7FA]">Pro Tip</p>
                <p className="text-xs text-[#B8BDC9]">
                  Start with manual approval enabled for the first week to learn how AI generates messages, then switch to auto-approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const handleNext = () => {
    setIsAnimating(true)
    setTimeout(() => {
      if (tutorialStep < tutorialSteps.length - 1) {
        setTutorialStep(tutorialStep + 1)
      } else {
        handleComplete()
      }
      setIsAnimating(false)
    }, 200)
  }

  const handlePrevious = () => {
    setIsAnimating(true)
    setTimeout(() => {
      if (tutorialStep > 0) {
        setTutorialStep(tutorialStep - 1)
      }
      setIsAnimating(false)
    }, 200)
  }

  const handleComplete = () => {
    setShowTutorial(false)
    router.push("/dashboard")
  }

  const handleSkip = () => {
    setShowTutorial(false)
    router.push("/dashboard")
  }

  // Show tutorial if coming from signup
  if (showTutorial) {
    const currentStep = tutorialSteps[tutorialStep]
    const Icon = currentStep.icon

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1115] p-4">
        <div className="w-full max-w-4xl">
          <Card className="bg-[#1B1F2A] border-[#2A2F3A] overflow-hidden">
            <div className="p-8">
              {/* Header with Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                    {currentStep.icon === Sparkles ? (
                      <AcquiriLogo className="h-8 w-8" />
                    ) : (
                      <Icon className="h-8 w-8 text-[#4F8CFF]" />
                    )}
                    <div>
                      <div className="text-xs font-medium text-[#8A90A2] mb-1">
                        Step {tutorialStep + 1} of {tutorialSteps.length}
                      </div>
                      <h2 className="text-2xl font-bold text-[#F5F7FA]">{currentStep.title}</h2>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-[#B8BDC9]"
                  >
                    Skip Tutorial
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-[#1B1F2A] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#4F8CFF] transition-all duration-500 ease-out"
                    style={{ width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className={cn(
                "transition-all duration-300",
                isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
              )}>
                <p className="text-[#B8BDC9] text-lg mb-6">{currentStep.description}</p>
                
                {/* Illustration/Visual Content */}
                <div className="mb-6">
                  {currentStep.content}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-4 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={tutorialStep === 0 || isAnimating}
                  className="flex-1"
                >
                  <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                  Previous
                </Button>
                <div className="flex gap-1">
                  {tutorialSteps.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        idx === tutorialStep
                          ? "w-8 bg-[#4F8CFF]"
                          : idx < tutorialStep
                          ? "w-2 bg-[#4F8CFF]/50"
                          : "w-2 bg-[#2A2F3A]"
                      )}
                    />
                  ))}
                </div>
                <Button
                  onClick={handleNext}
                  disabled={isAnimating}
                  className="flex-1"
                >
                  {tutorialStep === tutorialSteps.length - 1 ? "Get Started" : "Next"}
                  {tutorialStep < tutorialSteps.length - 1 && (
                    <ArrowRight className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Landing page for users who navigate directly to /onboarding
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1115] p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AcquiriLogo className="h-12 w-12" />
            <h1 className="text-4xl font-bold tracking-tight text-[#F5F7FA]">Welcome to Revive.ai</h1>
          </div>
          <p className="text-[#B8BDC9] text-lg">
            Let's get your revenue recovery system set up in just a few steps
          </p>
        </div>

        <Card className="bg-[#1B1F2A] border-[#2A2F3A]">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2 text-[#F5F7FA]">Get Started</h2>
              <p className="text-[#B8BDC9] text-sm">
                Create your account and set up Revive.ai in minutes
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-[#B8BDC9]">
                Our guided setup will walk you through:
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#1B1F2A] rounded-lg text-center border border-[#2A2F3A]">
                  <User className="h-8 w-8 text-[#4F8CFF] mx-auto mb-2" />
                  <p className="text-xs font-medium text-[#F5F7FA]">Create Account</p>
                </div>
                <div className="p-4 bg-[#1B1F2A] rounded-lg text-center border border-[#2A2F3A]">
                  <Zap className="h-8 w-8 text-[#4F8CFF] mx-auto mb-2" />
                  <p className="text-xs font-medium text-[#F5F7FA]">Connect GHL</p>
                </div>
                <div className="p-4 bg-[#1B1F2A] rounded-lg text-center border border-[#2A2F3A]">
                  <Settings className="h-8 w-8 text-[#4F8CFF] mx-auto mb-2" />
                  <p className="text-xs font-medium text-[#F5F7FA]">Configure</p>
                </div>
              </div>
              <div className="pt-4">
                <Link href="/signup">
                  <Button className="w-full h-11 text-base font-medium" size="lg">
                    Start Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center text-sm text-[#B8BDC9]">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-[#4F8CFF] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
