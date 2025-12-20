"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Check, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Calendar, CreditCard } from "lucide-react"
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
  getPlanPrice,
  formatPrice,
} from "@/lib/subscription"
import { useRouter } from "next/navigation"
import { showToast } from "@/lib/toast"

const plans: Array<{
  id: PlanName
  name: string
  description: string
  features: string[]
  popular: boolean
}> = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for trying out Revive.ai",
    features: [
      "5 revivals per month",
      "AI message generation",
      "Manual approval required",
      "Basic analytics",
      "Email support",
    ],
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    description: "For small teams getting started",
    features: [
      "50 revivals per month",
      "AI message generation",
      "Auto-approval option",
      "Advanced analytics",
      "Priority email support",
      "Custom message templates",
      "Knowledge base (up to 10 docs)",
    ],
    popular: true,
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing businesses",
    features: [
      "Unlimited revivals",
      "AI message generation",
      "Auto-approval & scheduling",
      "Advanced analytics & reporting",
      "Priority support (24h response)",
      "Unlimited custom templates",
      "Unlimited knowledge base",
      "Team collaboration (3 users)",
      "API access",
    ],
    popular: false,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState(getSubscription())
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription.billingCycle)
  const [loading, setLoading] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Listen for subscription updates
  useEffect(() => {
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
      const updated = upgradePlan(planId, billingCycle)
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

  const getAnnualPrice = (planId: PlanName) => {
    if (planId === "free") return "$0"
    return formatPrice(getPlanPrice(planId, "annual"), "annual")
  }

  const getMonthlyEquivalent = (planId: PlanName) => {
    if (planId === "free") return "$0"
    const annual = getPlanPrice(planId, "annual")
    return Math.round(annual / 12)
  }

  const isCurrentPlan = (planId: PlanName) => {
    return subscription.plan === planId
  }

  const getButtonText = (planId: PlanName) => {
    if (isCurrentPlan(planId)) {
      return subscription.cancelAtPeriodEnd ? "Cancelling" : "Current Plan"
    }
    if (planId === "free" && subscription.plan !== "free") {
      return "Downgrade to Free"
    }
    return `Upgrade to ${plans.find(p => p.id === planId)?.name}`
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
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-6">
              <AcquiriLogo className="h-8 w-8" />
              <h1 className="text-h1 text-[#111827]">Choose Your Plan</h1>
            </div>
            <p className="text-body text-[#6B7280] max-w-2xl mx-auto mb-8">
              Start recovering revenue from stalled deals. Upgrade anytime, cancel anytime.
            </p>

            {/* Current Plan Status */}
            {subscription.plan !== "free" && (
              <div className="mb-8 p-4 bg-white border border-[#E5E7EB] rounded-lg max-w-md mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                    <span className="text-sm font-medium text-[#111827]">
                      Current: {plans.find(p => p.id === subscription.plan)?.name}
                    </span>
                  </div>
                  {isCancelling && (
                    <span className="text-xs text-[#F6C177] bg-[#F6C177]/10 px-2 py-1 rounded">
                      Cancelling
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Renews {periodEnd.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    <span>{formatPrice(getPlanPrice(subscription.plan, subscription.billingCycle), subscription.billingCycle)}</span>
                  </div>
                </div>
                {isCancelling && (
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
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

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const newCycle: BillingCycle = "monthly"
                  setBillingCycle(newCycle)
                  // Save billing cycle preference
                  const currentSub = getSubscription()
                  const updatedSub = {
                    ...currentSub,
                    billingCycle: newCycle
                  }
                  saveSubscription(updatedSub)
                }}
                className={cn(
                  "text-sm font-medium transition-colors px-3 py-2 rounded-md",
                  billingCycle === "monthly" 
                    ? "text-[#111827] font-semibold bg-white" 
                    : "text-[#6B7280] hover:text-[#111827] hover:bg-white/50"
                )}
              >
                Monthly
              </button>
              <Switch
                checked={billingCycle === "annual"}
                onCheckedChange={(checked) => {
                  const newCycle: BillingCycle = checked ? "annual" : "monthly"
                  setBillingCycle(newCycle)
                  // Save billing cycle preference
                  const currentSub = getSubscription()
                  const updatedSub = {
                    ...currentSub,
                    billingCycle: newCycle
                  }
                  saveSubscription(updatedSub)
                }}
                className="scale-125"
              />
              <button
                type="button"
                onClick={() => {
                  const newCycle: BillingCycle = "annual"
                  setBillingCycle(newCycle)
                  // Save billing cycle preference
                  const currentSub = getSubscription()
                  const updatedSub = {
                    ...currentSub,
                    billingCycle: newCycle
                  }
                  saveSubscription(updatedSub)
                }}
                className={cn(
                  "text-sm font-medium transition-colors px-3 py-2 rounded-md",
                  billingCycle === "annual" 
                    ? "text-[#111827] font-semibold bg-white" 
                    : "text-[#6B7280] hover:text-[#111827] hover:bg-white/50"
                )}
              >
                Annual
                <span className="ml-1 text-xs text-[#4F8CFF]">Save 17%</span>
              </button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan.id)
              const price = plan.id === "free" 
                ? "$0" 
                : billingCycle === "annual"
                ? getAnnualPrice(plan.id)
                : formatPrice(getPlanPrice(plan.id, "monthly"), "monthly")
              
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col",
                    plan.popular && "border-[#4F8CFF] border-2",
                    isCurrent && "border-[#3CCB7F] border-2"
                  )}
                >
                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#4F8CFF] text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#3CCB7F] text-white text-xs font-medium px-3 py-1 rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl mb-1 text-[#111827]">{plan.name}</CardTitle>
                    <CardDescription className="text-[#6B7280]">{plan.description}</CardDescription>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[#111827]">
                          {plan.id === "free" 
                            ? "$0"
                            : billingCycle === "annual"
                            ? getAnnualPrice(plan.id)
                            : formatPrice(getPlanPrice(plan.id, "monthly"), "monthly")}
                        </span>
                        {plan.id !== "free" && (
                          <span className="text-sm text-[#6B7280]">
                            {billingCycle === "annual" ? "/year" : "/month"}
                          </span>
                        )}
                      </div>
                      {billingCycle === "annual" && plan.id !== "free" && (
                        <p className="text-xs text-[#6B7280] mt-1">
                          ${getMonthlyEquivalent(plan.id)}/month billed annually
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <Button
                      className={cn(
                        "w-full mb-6",
                        isCurrent && "bg-white text-[#6B7280] border border-[#E5E7EB]",
                        plan.popular && !isCurrent && "bg-[#4F8CFF] hover:bg-[#6EA0FF]"
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
                        getButtonText(plan.id)
                      )}
                    </Button>

                    <ul className="space-y-3 flex-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-[#4F8CFF] mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#6B7280]">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Cancel Subscription */}
          {subscription.plan !== "free" && !isCancelling && (
            <div className="mt-12 text-center">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading !== null}
                className="text-[#E06C75] border-[#E06C75]/20 hover:bg-[#E06C75]/10"
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
          )}
        </div>
      </div>
    </div>
  )
}
