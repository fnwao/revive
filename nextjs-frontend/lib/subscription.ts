// Subscription management
// Stores subscription info in localStorage for demo mode

export type PlanName = "free" | "starter" | "professional"
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
  plan: "free",
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
  revivalsPerMonth: number | "unlimited"
  knowledgeBaseDocs: number | "unlimited"
  teamMembers: number | "unlimited"
  apiAccess: boolean
  autoApproval: boolean
} {
  switch (plan) {
    case "free":
      return {
        revivalsPerMonth: 5,
        knowledgeBaseDocs: 0,
        teamMembers: 1,
        apiAccess: false,
        autoApproval: false,
      }
    case "starter":
      return {
        revivalsPerMonth: 50,
        knowledgeBaseDocs: 10,
        teamMembers: 1,
        apiAccess: false,
        autoApproval: true,
      }
    case "professional":
      return {
        revivalsPerMonth: "unlimited",
        knowledgeBaseDocs: "unlimited",
        teamMembers: 3,
        apiAccess: true,
        autoApproval: true,
      }
  }
}

export function getPlanPrice(plan: PlanName, billingCycle: BillingCycle): number {
  if (plan === "free") return 0
  
  const monthlyPrices = {
    starter: 49,
    professional: 149,
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

