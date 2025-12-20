// Subscription management
// Stores subscription info in localStorage for demo mode

export type PlanName = "starter" | "pro" | "scale"
export type BillingCycle = "monthly" | "annual"

export interface Subscription {
  plan: PlanName
  billingCycle: BillingCycle
  status: "active" | "cancelled" | "past_due"
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "acquiri_subscription"

const defaultSubscription: Subscription = {
  plan: "pro", // Pro is the default plan
  billingCycle: "monthly",
  status: "active",
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  cancelAtPeriodEnd: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export function getSubscription(): Subscription {
  if (typeof window === "undefined") return defaultSubscription
  
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return defaultSubscription
    }
  }
  
  saveSubscription(defaultSubscription)
  return defaultSubscription
}

export function saveSubscription(subscription: Subscription): void {
  if (typeof window !== "undefined") {
    const updated = {
      ...subscription,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    // Dispatch custom event for subscription updates
    window.dispatchEvent(new Event("subscriptionUpdated"))
  }
}

export function updateSubscription(updates: Partial<Subscription>): Subscription {
  const current = getSubscription()
  const updated = { ...current, ...updates }
  saveSubscription(updated)
  return updated
}

export function upgradePlan(plan: PlanName, billingCycle: BillingCycle): Subscription {
  const current = getSubscription()
  const now = new Date()
  
  // Calculate period end based on billing cycle
  const periodEnd = billingCycle === "annual"
    ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  return updateSubscription({
    plan,
    billingCycle,
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    cancelAtPeriodEnd: false,
  })
}

export function cancelSubscription(): Subscription {
  return updateSubscription({
    cancelAtPeriodEnd: true,
  })
}

export function reactivateSubscription(): Subscription {
  return updateSubscription({
    cancelAtPeriodEnd: false,
    status: "active",
  })
}

export function getPlanLimits(plan: PlanName): {
  opportunitiesPerMonth: number
  ghlAccounts: number
  autoSend: boolean
  knowledgeBase: boolean
  callTranscripts: boolean
  timingOptimization: boolean
  revenueAttribution: boolean
  multiplePipelines: boolean
  multipleUsers: boolean
  slackEmailSummaries: boolean
  advancedApproval: boolean
  priorityProcessing: boolean
} {
  switch (plan) {
    case "starter":
      return {
        opportunitiesPerMonth: 500,
        ghlAccounts: 1,
        autoSend: false,
        knowledgeBase: false,
        callTranscripts: false,
        timingOptimization: false,
        revenueAttribution: false,
        multiplePipelines: false,
        multipleUsers: false,
        slackEmailSummaries: false,
        advancedApproval: false,
        priorityProcessing: false,
      }
    case "pro":
      return {
        opportunitiesPerMonth: 2000,
        ghlAccounts: 1,
        autoSend: true,
        knowledgeBase: true,
        callTranscripts: true,
        timingOptimization: true,
        revenueAttribution: true,
        multiplePipelines: false,
        multipleUsers: false,
        slackEmailSummaries: false,
        advancedApproval: false,
        priorityProcessing: true,
      }
    case "scale":
      return {
        opportunitiesPerMonth: 5000,
        ghlAccounts: 1, // Can be extended later
        autoSend: true,
        knowledgeBase: true,
        callTranscripts: true,
        timingOptimization: true,
        revenueAttribution: true,
        multiplePipelines: true,
        multipleUsers: true,
        slackEmailSummaries: true,
        advancedApproval: true,
        priorityProcessing: true,
      }
  }
}

export function getPlanPrice(plan: PlanName, billingCycle: BillingCycle): number {
  // Pricing from environment variables or defaults
  const monthlyPrices: Record<PlanName, number> = {
    starter: parseInt(process.env.NEXT_PUBLIC_PLAN_STARTER_PRICE || "97"),
    pro: parseInt(process.env.NEXT_PUBLIC_PLAN_PRO_PRICE || "299"),
    scale: parseInt(process.env.NEXT_PUBLIC_PLAN_SCALE_PRICE || "499"),
  }
  
  const monthlyPrice = monthlyPrices[plan]
  
  if (billingCycle === "annual") {
    return Math.round(monthlyPrice * 12 * 0.83) // 17% discount
  }
  
  return monthlyPrice
}

export function formatPrice(price: number, billingCycle: BillingCycle): string {
  if (price === 0) return "$0"
  if (billingCycle === "annual") {
    return `$${price.toLocaleString()}/year`
  }
  return `$${price}/month`
}

// Entitlement checks for plan limits
export function checkOpportunityLimit(plan: PlanName, currentCount: number): {
  allowed: boolean
  remaining: number
  limit: number
} {
  const limits = getPlanLimits(plan)
  const limit = limits.opportunitiesPerMonth
  
  return {
    allowed: currentCount < limit,
    remaining: Math.max(0, limit - currentCount),
    limit,
  }
}

export function canUseFeature(plan: PlanName, feature: keyof ReturnType<typeof getPlanLimits>): boolean {
  const limits = getPlanLimits(plan)
  return limits[feature] === true
}

export function getPlanTier(plan: PlanName): number {
  switch (plan) {
    case "starter": return 1
    case "pro": return 2
    case "scale": return 3
  }
}

