"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle, Calendar, CreditCard, Info, Sparkles, Zap, Users, TrendingUp, Shield, Clock, Plus } from "lucide-react"
import Link from "next/link"
import { AcquiriLogo } from "@/components/logo"
import { cn } from "@/lib/utils"
import {
  getSubscription,
  saveSubscription,
  upgradePlan,
  cancelSubscription,
  reactivateSubscription,
  type PlanName,
  type BillingCycle,
  type Subscription,
  getPlanPrice,
  formatPrice,
} from "@/lib/subscription"
import { useRouter } from "next/navigation"
import { showToast } from "@/lib/toast"

const plans: Array<{
  id: PlanName
  name: string
  description: string
  price: number
  cta: string
  features: string[]
  popular: boolean
  freeTrialDays?: number
}> = [
  {
    id: "starter",
    name: "Starter",
    description: "For solo founders and small service businesses",
    price: 97,
    cta: "Recover lost deals automatically",
    freeTrialDays: 3,
    features: [
      "GoHighLevel integration (1 account)",
      "AI pipeline monitoring",
      "Detection of stalled deals",
      "AI-generated reactivation drafts",
      "Human approval required before sending",
      "Up to 500 active opportunities/month",
      "Email + SMS only",
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "Most popular plan",
    price: 299,
    cta: "Let AI recover revenue for you",
    features: [
      "Everything in Starter, plus:",
      "Auto-send mode (optional toggle)",
      "Style & tone learning",
      "Knowledge base ingestion (docs, scripts, FAQs)",
      "Call transcript ingestion",
      "Timing optimization",
      "Revenue attribution (AI-revived deals)",
      "Up to 2,000 active opportunities/month",
      "Priority processing",
    ],
    popular: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "For agencies and teams",
    price: 499,
    cta: "Turn your pipeline into a revenue engine",
    features: [
      "Everything in Pro, plus:",
      "Multiple pipelines",
      "Multiple users",
      "Slack/email daily summaries",
      "Advanced approval controls",
      "Up to 5,000 active opportunities/month",
    ],
    popular: false,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize subscription on mount (client-side only)
  useEffect(() => {
    setSubscription(getSubscription())
    
    const handleSubscriptionUpdate = () => {
      setSubscription(getSubscription())
    }
    
    window.addEventListener("subscriptionUpdated", handleSubscriptionUpdate)
    return () => {
      window.removeEventListener("subscriptionUpdated", handleSubscriptionUpdate)
    }
  }, [])

  const handleUpgrade = async (planId: PlanName) => {
    if (planId === subscription.plan) {
      showToast.warning("Already on this plan", "You're already subscribed to this plan.")
      setError("You're already on this plan")
      setTimeout(() => setError(null), 3000)
      return
    }

    setLoading(planId)
    setError(null)
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Upgrade the plan
      const updated = upgradePlan(planId, "monthly")
      setSubscription(updated)
      
      const planName = plans.find(p => p.id === planId)?.name || planId
      showToast.planUpgraded(planName)
      setSuccess(`Successfully upgraded to ${planName}!`)
      setTimeout(() => {
        setSuccess(null)
        router.push("/settings")
      }, 2000)
    } catch (err) {
      showToast.error("Upgrade failed", "Failed to upgrade plan. Please try again.")
      setError("Failed to upgrade plan. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(null)
    }
  }

  const handleCancel = async () => {
    setLoading("cancel")
    setError(null)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      cancelSubscription()
      setSubscription(getSubscription())
      showToast.subscriptionCancelled()
      setSuccess("Subscription will cancel at the end of the current billing period")
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      showToast.error("Cancellation failed", "Failed to cancel subscription. Please try again.")
      setError("Failed to cancel subscription. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(null)
    }
  }

  const handleReactivate = async () => {
    setLoading("reactivate")
    setError(null)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      reactivateSubscription()
      setSubscription(getSubscription())
      showToast.subscriptionReactivated()
      setSuccess("Subscription reactivated successfully!")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      showToast.error("Reactivation failed", "Failed to reactivate subscription. Please try again.")
      setError("Failed to reactivate subscription. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(null)
    }
  }

  const isCurrentPlan = (planId: PlanName) => {
    return subscription?.plan === planId
  }

  const getButtonText = (planId: PlanName) => {
    if (!subscription) return "Loading..."
    if (isCurrentPlan(planId)) {
      return subscription.cancelAtPeriodEnd ? "Cancelling" : "Current Plan"
    }
    const plan = plans.find(p => p.id === planId)
    return plan?.cta || `Upgrade to ${plan?.name}`
  }

  const periodEnd = new Date(subscription.currentPeriodEnd)
  const isCancelling = subscription.cancelAtPeriodEnd

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center gap-2 mb-4 px-4 py-2 rounded-full bg-[#4F8CFF]/10 text-[#4F8CFF] text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>Simple, transparent pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#111827] mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-[#6B7280] max-w-2xl mx-auto mb-6">
              Scale with value recovered, not usage complexity. Start recovering revenue from stalled deals.
            </p>

            {/* Current Plan Status */}
            {subscription?.plan && (
              <div className="mb-8 p-5 bg-gradient-to-r from-[#3CCB7F]/10 to-[#4F8CFF]/10 border border-[#3CCB7F]/20 rounded-xl max-w-md mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#3CCB7F] flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280] font-medium">Current Plan</p>
                      <p className="text-sm font-semibold text-[#111827]">
                        {plans.find(p => p.id === subscription?.plan)?.name}
                      </p>
                    </div>
                  </div>
                  {isCancelling && (
                    <Badge variant="outline" className="bg-[#F6C177]/10 text-[#F6C177] border-[#F6C177]/20">
                      Cancelling
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#6B7280] mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Renews {periodEnd.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span className="font-semibold">{subscription && formatPrice(getPlanPrice(subscription.plan, subscription.billingCycle), subscription.billingCycle)}</span>
                  </div>
                </div>
                {isCancelling && (
                  <div className="pt-3 border-t border-[#E5E7EB]">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReactivate}
                      disabled={loading === "reactivate"}
                      className="w-full"
                    >
                      {loading === "reactivate" ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Reactivating...
                        </>
                      ) : (
                        "Reactivate Subscription"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Stickiness Message */}
            <div className="mb-10 flex items-center justify-center gap-2 text-sm text-[#6B7280] bg-[#F9FAFB] px-4 py-3 rounded-lg max-w-md mx-auto">
              <Clock className="h-4 w-4 text-[#4F8CFF]" />
              <span className="font-medium">Revive improves the longer it runs.</span>
              <div className="group relative">
                <Info className="h-4 w-4 text-[#6B7280] cursor-help hover:text-[#4F8CFF] transition-colors" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-[#111827] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[#111827] rotate-45"></div>
                  Turning this off means losing historical AI learning.
                </div>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-white border border-[#3CCB7F]/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                <p className="text-sm text-[#111827]">{success}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-white border border-[#E06C75]/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#E06C75]" />
                <p className="text-sm text-[#111827]">{error}</p>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan, planIndex) => {
              const isCurrent = isCurrentPlan(plan.id)
              const price = getPlanPrice(plan.id, "monthly")
              const isPopular = plan.popular && !isCurrent
              
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col transition-all duration-300",
                    isPopular && "border-[#4F8CFF] border-2 shadow-xl scale-105 md:scale-110",
                    isCurrent && "border-[#3CCB7F] border-2 shadow-lg",
                    !isPopular && !isCurrent && "hover:shadow-md"
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-[#3CCB7F] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                        Current Plan
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className={cn(
                    "pb-6",
                    isPopular && "bg-gradient-to-br from-[#4F8CFF]/5 to-transparent"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {plan.id === "starter" && <Zap className="h-5 w-5 text-[#4F8CFF]" />}
                      {plan.id === "pro" && <Sparkles className="h-5 w-5 text-[#4F8CFF]" />}
                      {plan.id === "scale" && <Users className="h-5 w-5 text-[#4F8CFF]" />}
                      <CardTitle className="text-2xl font-bold text-[#111827]">{plan.name}</CardTitle>
                    </div>
                    <CardDescription className="text-[#6B7280] text-base">{plan.description}</CardDescription>
                    <div className="mt-6">
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-bold text-[#111827]">
                          ${price}
                        </span>
                        <span className="text-base text-[#6B7280] ml-1">
                          /month
                        </span>
                      </div>
                      {plan.freeTrialDays && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F8CFF]/10 text-[#4F8CFF] rounded-lg text-sm font-medium">
                          <Shield className="h-3.5 w-3.5" />
                          <span>{plan.freeTrialDays} day free trial</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col px-6 pb-6">
                    <Button
                      className={cn(
                        "w-full mb-6 h-12 text-base font-semibold transition-all",
                        isCurrent && "bg-white text-[#6B7280] border-2 border-[#E5E7EB] hover:bg-[#F9FAFB]",
                        isPopular && !isCurrent && "bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] shadow-lg",
                        !isPopular && !isCurrent && "bg-[#111827] hover:bg-[#1F2937]"
                      )}
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || loading !== null}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {loading === plan.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {getButtonText(plan.id)}
                          {!isCurrent && <ArrowRight className="h-4 w-4" />}
                        </span>
                      )}
                    </Button>

                    <div className="flex-1">
                      <div className="space-y-3">
                        {plan.features.map((feature, idx) => {
                          const isHeader = feature.includes("Everything in") || feature.includes("plus:")
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-start gap-3",
                                isHeader && "pt-2 border-t border-[#E5E7EB]"
                              )}
                            >
                              <div className={cn(
                                "mt-0.5 flex-shrink-0",
                                isHeader ? "h-4 w-4 rounded-full bg-[#4F8CFF] flex items-center justify-center" : ""
                              )}>
                                {isHeader ? (
                                  <Plus className="h-2.5 w-2.5 text-white" />
                                ) : (
                                  <Check className="h-4 w-4 text-[#3CCB7F]" />
                                )}
                              </div>
                              <span className={cn(
                                "text-sm",
                                isHeader ? "font-semibold text-[#111827]" : "text-[#6B7280]"
                              )}>
                                {feature}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Cancel Subscription */}
          {subscription.plan && !isCancelling && (
            <div className="mt-16 pt-8 border-t border-[#E5E7EB]">
              <div className="max-w-md mx-auto text-center">
                <p className="text-sm text-[#6B7280] mb-4">
                  Need to cancel? Your subscription will remain active until the end of your billing period.
                </p>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading !== null}
                  className="text-[#E06C75] border-[#E06C75]/30 hover:bg-[#E06C75]/10 hover:border-[#E06C75]/50 transition-colors"
                >
                  {loading === "cancel" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Subscription"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
