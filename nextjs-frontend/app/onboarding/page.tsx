"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Play, BookOpen, Settings, BarChart3, MessageSquare, Zap, TrendingUp, DollarSign, Clock, Rocket, Sparkles, User, Sparkles as SparklesIcon, X, ChevronLeft, ChevronRight, Filter } from "lucide-react"
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
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 rounded-xl border border-[#4F8CFF]/20 text-center hover:border-[#4F8CFF]/40 transition-all group">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#6EA0FF] flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-[#111827] mb-1">Auto-Detect</p>
              <p className="text-xs text-[#6B7280]">Stalled deals</p>
            </div>
            <div className="p-4 sm:p-6 bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 rounded-xl border border-[#4F8CFF]/20 text-center hover:border-[#4F8CFF]/40 transition-all group">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#6EA0FF] flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-[#111827] mb-1">AI Messages</p>
              <p className="text-xs text-[#6B7280]">Personalized</p>
            </div>
            <div className="p-4 sm:p-6 bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 rounded-xl border border-[#4F8CFF]/20 text-center hover:border-[#4F8CFF]/40 transition-all group">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#6EA0FF] flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-[#111827] mb-1">Recover Revenue</p>
              <p className="text-xs text-[#6B7280]">Automatically</p>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-[#4F8CFF]/5 to-transparent rounded-lg border border-[#4F8CFF]/10">
            <p className="text-sm text-[#111827] text-center leading-relaxed">
              <span className="font-semibold">Revive.ai</span> automatically detects stalled deals in your GoHighLevel pipeline and generates personalized reactivation messages to recover revenue.
            </p>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-gradient-to-br from-[#4F8CFF]/10 to-transparent rounded-xl border border-[#4F8CFF]/20 hover:border-[#4F8CFF]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Active Revivals</span>
                <div className="h-8 w-8 rounded-lg bg-[#4F8CFF]/20 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[#4F8CFF]" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#111827]">12</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-[#3CCB7F]/10 to-transparent rounded-xl border border-[#3CCB7F]/20 hover:border-[#3CCB7F]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Revenue</span>
                <div className="h-8 w-8 rounded-lg bg-[#3CCB7F]/20 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-[#3CCB7F]" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#111827]">$24.5K</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-[#F6C177]/10 to-transparent rounded-xl border border-[#F6C177]/20 hover:border-[#F6C177]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Success Rate</span>
                <div className="h-8 w-8 rounded-lg bg-[#F6C177]/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-[#F6C177]" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#111827]">68%</div>
            </div>
            <div className="p-5 bg-gradient-to-br from-[#6EA0FF]/10 to-transparent rounded-xl border border-[#6EA0FF]/20 hover:border-[#6EA0FF]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Response</span>
                <div className="h-8 w-8 rounded-lg bg-[#6EA0FF]/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-[#6EA0FF]" />
                </div>
              </div>
              <div className="text-3xl font-bold text-[#111827]">2.4h</div>
            </div>
          </div>
          <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <p className="text-sm font-semibold text-[#111827] mb-3">Key Metrics You'll Track:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Active revivals in progress",
                "Total revenue recovered",
                "Success rate of campaigns",
                "Average response time"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#3CCB7F] flex-shrink-0" />
                  <span className="text-xs text-[#6B7280]">{item}</span>
                </div>
              ))}
            </div>
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
            <div className="p-5 bg-gradient-to-br from-white to-[#F9FAFB] rounded-xl border-2 border-[#4F8CFF]/20 shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-base mb-1 text-[#111827]">Acme Corp Deal</div>
                  <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      $5,000
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      10 days inactive
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 bg-[#4F8CFF]/10 text-[#4F8CFF] rounded-full font-medium border border-[#4F8CFF]/20">
                  Pending
                </span>
              </div>
              <div className="mt-4 p-4 bg-white rounded-lg border-l-4 border-[#4F8CFF] shadow-sm">
                <p className="text-sm leading-relaxed text-[#111827]">
                  Hi Sarah! I noticed we haven't connected in a while about the Enterprise Package. I wanted to check in and see if you're still interested...
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <p className="text-sm font-semibold text-[#111827] mb-3">What You Can Do:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "View all stalled deals detected by AI",
                "Review and edit AI-generated messages",
                "Approve or reject messages before sending",
                "Track the status of each revival"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#3CCB7F] flex-shrink-0" />
                  <span className="text-xs text-[#6B7280]">{item}</span>
                </div>
              ))}
            </div>
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
          <div className="p-8 bg-gradient-to-br from-[#4F8CFF]/5 to-transparent rounded-xl border-2 border-dashed border-[#4F8CFF]/30 text-center hover:border-[#4F8CFF]/50 transition-all">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#6EA0FF] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <p className="text-base font-semibold mb-1 text-[#111827]">Upload Documents</p>
            <p className="text-sm text-[#6B7280]">Drag and drop files here or click to browse</p>
          </div>
          <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <p className="text-sm font-semibold text-[#111827] mb-3">Recommended Documents:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Sales scripts and email templates",
                "Product documentation",
                "FAQs and objection handling",
                "Previous successful conversations"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#3CCB7F] flex-shrink-0" />
                  <span className="text-xs text-[#6B7280]">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-[#4F8CFF]/5 rounded-lg border border-[#4F8CFF]/20">
              <p className="text-xs text-[#4F8CFF] font-medium text-center">
                💡 The more context you provide, the better AI can match your communication style.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Configure Reactivation Rules",
      description: "Set up when deals should be reactivated based on status, tags, and inactivity.",
      icon: Filter,
      illustration: "rules",
      content: (
        <div className="space-y-4 mt-6">
          <div className="p-5 bg-gradient-to-br from-white to-[#F9FAFB] rounded-xl border-2 border-[#4F8CFF]/20 shadow-md">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center flex-shrink-0">
                <Filter className="h-5 w-5 text-[#4F8CFF]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#111827] mb-1">Example Rule: Closed Deals</p>
                <p className="text-xs text-[#6B7280] mb-3">
                  Reactivate deals with status "closed" that haven't responded in 7 days
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[#4F8CFF]/10 text-[#4F8CFF] rounded">Status: closed</span>
                    <span className="px-2 py-1 bg-[#3CCB7F]/10 text-[#3CCB7F] rounded">Threshold: 7 days</span>
                  </div>
                  <p className="text-[#6B7280] italic">
                    "If a deal is closed and hasn't had activity in 7 days, generate a reactivation message"
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <p className="text-sm font-semibold text-[#111827] mb-3">What You Can Configure:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Deal statuses (active, closed, won, etc.)",
                "Tags (vip, enterprise, follow-up)",
                "Inactivity threshold (days)",
                "Multiple rules for different scenarios"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#3CCB7F] flex-shrink-0" />
                  <span className="text-xs text-[#6B7280]">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 bg-[#4F8CFF]/5 rounded-lg border border-[#4F8CFF]/20">
            <p className="text-xs text-[#4F8CFF] font-medium text-center">
              💡 Configure your first reactivation rule in Settings after onboarding
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
            <div className="p-5 bg-gradient-to-br from-white to-[#F9FAFB] rounded-xl border border-[#E5E7EB] hover:border-[#4F8CFF]/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#111827] mb-1">Auto-detect Stalled Deals</p>
                  <p className="text-xs text-[#6B7280]">Automatically scan for deals</p>
                </div>
                <div className="w-12 h-6 bg-[#4F8CFF] rounded-full relative shadow-inner">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform" />
                </div>
              </div>
            </div>
            <div className="p-5 bg-gradient-to-br from-white to-[#F9FAFB] rounded-xl border border-[#E5E7EB] hover:border-[#4F8CFF]/30 transition-all">
              <p className="text-sm font-semibold mb-3 text-[#111827]">Stalled Threshold</p>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="90" value="7" className="flex-1 h-2 bg-[#E5E7EB] rounded-lg appearance-none cursor-pointer accent-[#4F8CFF]" readOnly />
                <span className="text-lg font-bold text-[#4F8CFF] min-w-[60px]">7 days</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <p className="text-sm font-semibold text-[#111827] mb-3">Settings You Can Configure:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Reactivation rules (status, tags, threshold)",
                "Auto-approval settings",
                "GoHighLevel integration",
                "Notification preferences"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#3CCB7F] flex-shrink-0" />
                  <span className="text-xs text-[#6B7280]">{item}</span>
                </div>
              ))}
            </div>
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
                { step: "1", text: "AI monitors your GoHighLevel deals continuously", icon: BarChart3, color: "from-[#4F8CFF] to-[#6EA0FF]" },
                { step: "2", text: "When a deal goes stale, AI analyzes conversation history", icon: MessageSquare, color: "from-[#3CCB7F] to-[#4FDD9F]" },
                { step: "3", text: "AI generates a personalized reactivation message", icon: Sparkles, color: "from-[#F6C177] to-[#FFD89B]" },
                { step: "4", text: "You review and approve (or it sends automatically if enabled)", icon: Check, color: "from-[#6EA0FF] to-[#8BB5FF]" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 p-5 bg-gradient-to-br from-white to-[#F9FAFB] rounded-xl border border-[#E5E7EB] hover:border-[#4F8CFF]/30 transition-all group">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform",
                    `bg-gradient-to-br ${item.color}`
                  )}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#4F8CFF] uppercase tracking-wide">Step {item.step}</span>
                    </div>
                    <p className="text-sm text-[#111827] leading-relaxed">{item.text}</p>
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
          <div className="text-center p-8 bg-gradient-to-br from-[#4F8CFF]/10 via-[#6EA0FF]/5 to-transparent rounded-xl border-2 border-[#4F8CFF]/30 shadow-lg">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-[#4F8CFF]/20 blur-2xl rounded-full" />
              <Rocket className="h-20 w-20 text-[#4F8CFF] relative z-10 mx-auto animate-bounce" />
            </div>
            <p className="text-2xl font-bold mb-3 text-[#111827]">You're All Set!</p>
            <p className="text-base text-[#6B7280] leading-relaxed max-w-md mx-auto">
              The system is now active and monitoring your deals. You'll receive notifications when revival opportunities are detected.
            </p>
          </div>
          <div className="p-5 bg-gradient-to-br from-[#F6C177]/10 to-transparent rounded-xl border border-[#F6C177]/20">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F6C177] to-[#FFD89B] flex items-center justify-center flex-shrink-0 shadow-md">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold mb-2 text-[#111827]">Pro Tip</p>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Start with manual approval enabled for the first week to learn how AI generates messages, then switch to auto-approval for maximum efficiency.
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

  // Keyboard navigation
  useEffect(() => {
    if (!showTutorial) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (tutorialStep < tutorialSteps.length - 1) {
          handleNext()
        } else {
          handleComplete()
        }
      } else if (e.key === "ArrowLeft") {
        if (tutorialStep > 0) {
          handlePrevious()
        }
      } else if (e.key === "Escape") {
        handleSkip()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showTutorial, tutorialStep]) // eslint-disable-line react-hooks/exhaustive-deps

  // Show tutorial if coming from signup
  if (showTutorial) {
    const currentStep = tutorialSteps[tutorialStep]
    const Icon = currentStep.icon

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#F9FAFB] to-[#F3F4F6] p-2 sm:p-4">
        <div className="w-full max-w-4xl">
          <Card className="bg-white border-[#E5E7EB] shadow-xl overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8 lg:p-10">
              {/* Header with Progress */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#6EA0FF] flex items-center justify-center shadow-lg flex-shrink-0">
                      {currentStep.icon === Sparkles ? (
                        <AcquiriLogo className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      ) : (
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#4F8CFF] mb-1 uppercase tracking-wide">
                        Step {tutorialStep + 1} of {tutorialSteps.length}
                      </div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#111827] break-words">{currentStep.title}</h2>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-[#6B7280] hover:text-[#111827] flex-shrink-0"
                  >
                    <X className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Skip</span>
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className={cn(
                "transition-all duration-500",
                isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              )}>
                <p className="text-[#6B7280] text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">{currentStep.description}</p>
                
                {/* Illustration/Visual Content */}
                <div className="mb-6 sm:mb-8 min-h-[200px] sm:min-h-[300px]">
                  {currentStep.content}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 sm:pt-8 border-t border-[#E5E7EB]">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={tutorialStep === 0 || isAnimating}
                  className="flex items-center justify-center gap-2 order-2 sm:order-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                {/* Step Indicators */}
                <div className="flex gap-2 justify-center order-1 sm:order-2">
                  {tutorialSteps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!isAnimating) {
                          setIsAnimating(true)
                          setTimeout(() => {
                            setTutorialStep(idx)
                            setIsAnimating(false)
                          }, 200)
                        }
                      }}
                      className={cn(
                        "h-2.5 sm:h-2 rounded-full transition-all duration-300 touch-manipulation",
                        idx === tutorialStep
                          ? "w-8 sm:w-8 bg-[#4F8CFF]"
                          : idx < tutorialStep
                          ? "w-2.5 sm:w-2 bg-[#4F8CFF]/50 hover:bg-[#4F8CFF]/70 active:bg-[#4F8CFF]/70"
                          : "w-2.5 sm:w-2 bg-[#E5E7EB] hover:bg-[#D1D5DB] active:bg-[#D1D5DB]"
                      )}
                      aria-label={`Go to step ${idx + 1}`}
                    />
                  ))}
                </div>
                
                <Button
                  onClick={handleNext}
                  disabled={isAnimating}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] shadow-md hover:shadow-lg transition-all order-3"
                >
                  {tutorialStep === tutorialSteps.length - 1 ? (
                    <>
                      Get Started
                      <Rocket className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-[#E5E7EB]">
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-[#6B7280]">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[#6B7280] text-[10px] sm:text-xs">←</kbd>
                    <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[#6B7280] text-[10px] sm:text-xs">→</kbd>
                    <span className="hidden sm:inline">Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[#6B7280] text-[10px] sm:text-xs">Esc</kbd>
                    <span className="hidden sm:inline">Skip</span>
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Landing page for users who navigate directly to /onboarding
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#F9FAFB] to-[#F3F4F6] p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#4F8CFF]/20 blur-2xl rounded-full" />
              <AcquiriLogo className="h-16 w-16 relative z-10" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-[#111827] via-[#4F8CFF] to-[#111827] bg-clip-text text-transparent">
              Welcome to Revive.ai
            </h1>
          </div>
          <p className="text-[#6B7280] text-xl max-w-2xl mx-auto">
            Automatically detect stalled deals and recover revenue with AI-powered reactivation messages
          </p>
        </div>

        <Card className="bg-white border-[#E5E7EB] shadow-xl">
          <div className="p-10">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold mb-3 text-[#111827]">Get Started in Minutes</h2>
              <p className="text-[#6B7280] text-lg">
                Our guided setup will walk you through everything
              </p>
            </div>
            
            <div className="space-y-8">
              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-[#4F8CFF]/5 to-transparent rounded-xl border border-[#4F8CFF]/10 hover:border-[#4F8CFF]/30 transition-all group">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#6EA0FF] flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-[#111827]">Create Account</h3>
                  <p className="text-sm text-[#6B7280]">
                    Sign up with your email and set up your profile
                  </p>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-[#4F8CFF]/5 to-transparent rounded-xl border border-[#4F8CFF]/10 hover:border-[#4F8CFF]/30 transition-all group">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#6EA0FF] flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <Zap className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-[#111827]">Connect GHL</h3>
                  <p className="text-sm text-[#6B7280]">
                    Link your GoHighLevel account to sync deals
                  </p>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-[#4F8CFF]/5 to-transparent rounded-xl border border-[#4F8CFF]/10 hover:border-[#4F8CFF]/30 transition-all group">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#4F8CFF] to-[#6EA0FF] flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <Settings className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-[#111827]">Configure</h3>
                  <p className="text-sm text-[#6B7280]">
                    Customize settings and preferences
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#3CCB7F]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-[#3CCB7F]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">AI-Powered Messages</p>
                    <p className="text-xs text-[#6B7280]">Personalized and contextual</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-[#4F8CFF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">Auto-Detection</p>
                    <p className="text-xs text-[#6B7280]">Never miss a stalled deal</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#F6C177]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-[#F6C177]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">Easy Approval</p>
                    <p className="text-xs text-[#6B7280]">Review before sending</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#6EA0FF]/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-5 w-5 text-[#6EA0FF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111827]">Real-Time Tracking</p>
                    <p className="text-xs text-[#6B7280]">Monitor your revivals</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-6">
                <Link href="/signup" className="block">
                  <Button className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] shadow-lg hover:shadow-xl transition-all">
                    Start Setup
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-center text-xs text-[#6B7280] mt-4">
                  Free to get started • No credit card required
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-sm text-[#6B7280]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#4F8CFF] hover:text-[#6EA0FF] hover:underline font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
