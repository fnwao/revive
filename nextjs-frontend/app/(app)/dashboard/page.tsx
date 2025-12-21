"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  Loader2,
  ArrowRight,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Bell,
  Brain,
  Radio
} from "lucide-react"
import { getDashboardStats, getApprovals, approveMessage, rejectMessage, sendMessage, type Approval, hasApiKey, type DashboardStats, getNotifications, markNotificationAsRead, type Notification, detectStalledDeals, type StalledDeal, getSettings, type ReactivationRule } from "@/lib/api"
import { getUser, getGreeting, getFirstName, type User } from "@/lib/user"
import { cn } from "@/lib/utils"
import { showToast } from "@/lib/toast"
import Link from "next/link"

export default function DashboardPage() {
  // Ensure we're on client-side before rendering
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState({
    active_revivals: 0,
    revenue_recovered: 0,
    success_rate: 0,
    avg_response_time: 0,
    pending_approvals: 0,
  })
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<Array<{ action: string; time: string; icon: string }>>([])
  const [stalledDeals, setStalledDeals] = useState<StalledDeal[]>([])
  const [reactivationRules, setReactivationRules] = useState<ReactivationRule[]>([])
  const [greeting, setGreeting] = useState("Hello")
  const [firstName, setFirstName] = useState("there")

  // Set mounted state on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reload user data when component mounts or user updates
  useEffect(() => {
    if (typeof window === "undefined" || !mounted) return
    
    const refreshUser = () => {
      const currentUser = getUser()
      if (currentUser) {
        setUser(currentUser)
        setFirstName(getFirstName(currentUser.name))
      }
      // Update greeting based on current time
      setGreeting(getGreeting())
    }

    refreshUser()
    
    const handleUserUpdate = () => {
      refreshUser()
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "acquiri_user") {
        refreshUser()
      }
    }
    
    window.addEventListener("focus", refreshUser)
    window.addEventListener("userUpdated", handleUserUpdate)
    window.addEventListener("storage", handleStorageChange)
    
    return () => {
      window.removeEventListener("focus", refreshUser)
      window.removeEventListener("userUpdated", handleUserUpdate)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [mounted])

  const loadReactivationRules = async () => {
    try {
      const settings = await getSettings()
      if (settings.reactivation_rules && settings.reactivation_rules.length > 0) {
        setReactivationRules(settings.reactivation_rules)
        return settings.reactivation_rules
      }
    } catch (error) {
      console.error("Failed to load reactivation rules:", error)
    }
    return []
  }

  const loadStalledDeals = async (rules: ReactivationRule[] = []) => {
    try {
      // Use reactivation rules if available, otherwise use default threshold
      let statusFilter: string[] | undefined = undefined
      let tagFilter: string[] | undefined = undefined
      let thresholdDays = 7
      
      // If we have enabled reactivation rules, use them
      const enabledRules = rules.filter(r => r.enabled)
      if (enabledRules.length > 0) {
        // Use the first enabled rule (can be enhanced to support multiple rules)
        const activeRule = enabledRules[0]
        statusFilter = activeRule.statuses.length > 0 ? activeRule.statuses : undefined
        tagFilter = activeRule.tags.length > 0 ? activeRule.tags : undefined
        thresholdDays = activeRule.thresholdDays
      }
      
      const result = await detectStalledDeals(
        undefined, 
        undefined, 
        thresholdDays,
        statusFilter,
        tagFilter
      )
      setStalledDeals(result.stalled_deals)
      return result.stalled_deals
    } catch (error) {
      console.error("Failed to load stalled deals:", error)
      setStalledDeals([])
      return []
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load reactivation rules first
      const rules = await loadReactivationRules()
      setReactivationRules(rules)
      
      // Load stalled deals to get accurate count (pass rules to function)
      const deals = await loadStalledDeals(rules)
      
      let statsData: DashboardStats
      let approvalsData: { approvals: Approval[]; total: number; pending: number; approved: number; rejected: number; sent: number }
      
      // getDashboardStats and getApprovals should return mock data if no API key or on error
      try {
        statsData = await getDashboardStats()
        // Always update active_revivals with actual stalled deals count
        statsData.active_revivals = deals.length
      } catch (error) {
        console.error("Failed to load stats:", error)
        // Fallback to mock stats, but use actual stalled deals count
        statsData = {
          active_revivals: deals.length,
          revenue_recovered: 24500,
          success_rate: 68,
          avg_response_time: 2.4,
          pending_approvals: 5,
        }
      }

      try {
        approvalsData = await getApprovals({ limit: 10 })
        // Ensure we have approvals even if empty
        if (!approvalsData || !approvalsData.approvals) {
          approvalsData = { approvals: [], total: 0, pending: 0, approved: 0, rejected: 0, sent: 0 }
        }
      } catch (error) {
        console.error("Failed to load approvals:", error)
        // Fallback to empty - getApprovals should handle mock data internally
        approvalsData = { approvals: [], total: 0, pending: 0, approved: 0, rejected: 0, sent: 0 }
      }

      // Update stats with actual data
      setStats({
        ...statsData,
        active_revivals: deals.length, // Always use actual stalled deals count
        pending_approvals: approvalsData.pending !== undefined ? approvalsData.pending : statsData.pending_approvals
      })
      setApprovals(approvalsData.approvals || [])

      // Load notifications
      try {
        const notificationsData = await getNotifications({ limit: 5 })
        setNotifications(notificationsData.notifications || [])
        setUnreadCount(notificationsData.unread_count || 0)
        
        // Generate recent activity from notifications and approvals
        const activity: Array<{ action: string; time: string; icon: string }> = []
        
        // Add recent message generations
        const recentApprovals = approvalsData.approvals?.slice(0, 3) || []
        recentApprovals.forEach(approval => {
          const timeAgo = Math.floor((Date.now() - new Date(approval.created_at).getTime()) / 1000 / 60)
          if (timeAgo < 60) {
            activity.push({
              action: `Generated message for ${approval.deal_title || 'a deal'}`,
              time: timeAgo === 0 ? 'Just now' : `${timeAgo}m ago`,
              icon: 'message'
            })
          }
        })
        
        // Add recent notifications as activity
        notificationsData.notifications?.slice(0, 2).forEach(notification => {
          const timeAgo = Math.floor((Date.now() - new Date(notification.created_at).getTime()) / 1000 / 60)
          if (timeAgo < 60) {
            activity.push({
              action: notification.title,
              time: timeAgo === 0 ? 'Just now' : `${timeAgo}m ago`,
              icon: 'bell'
            })
          }
        })
        
        // If no recent activity, show default activity (check if we have active revivals or pending approvals)
        const hasActiveRevivals = statsData.active_revivals > 0 || statsData.pending_approvals > 0
        if (activity.length === 0 && hasActiveRevivals) {
          activity.push({
            action: 'Monitoring pipeline for stalled deals',
            time: 'Active',
            icon: 'monitor'
          })
        }
        
        setRecentActivity(activity.slice(0, 3))
      } catch (error) {
        console.error("Error loading notifications:", error)
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
      // Don't show error - just use fallback data
      setStats({
        active_revivals: 12,
        revenue_recovered: 24500,
        success_rate: 68,
        avg_response_time: 2.4,
        pending_approvals: 5,
      })
      // Try to get mock approvals
      try {
        const mockApprovals = await getApprovals({ limit: 10 })
        setApprovals(mockApprovals.approvals || [])
      } catch {
        setApprovals([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only load data on client-side after mount
    if (!mounted) {
      setLoading(false)
      return
    }
    
    loadData().catch((error) => {
      console.error("Failed to load dashboard data:", error)
      setError("Failed to load dashboard. Please refresh the page.")
      setLoading(false)
    })
  }, [mounted])

  // Auto-refresh when enabled
  useEffect(() => {
    if (typeof window === "undefined") return
    if (autoRefresh) {
      const interval = window.setInterval(() => {
        loadData()
        setLastRefresh(new Date())
      }, 30000) // Refresh every 30 seconds
      return () => window.clearInterval(interval)
    }
  }, [autoRefresh, reactivationRules]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for deal detection events from revivals page
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const handleDealDetection = () => {
      loadData()
    }
    
    window.addEventListener("triggerDealDetection", handleDealDetection as EventListener)
    window.addEventListener("dealUpdated", handleDealDetection as EventListener)
    window.addEventListener("approvalUpdated", handleDealDetection as EventListener)
    
    return () => {
      window.removeEventListener("triggerDealDetection", handleDealDetection as EventListener)
      window.removeEventListener("dealUpdated", handleDealDetection as EventListener)
      window.removeEventListener("approvalUpdated", handleDealDetection as EventListener)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const showSuccess = (message: string) => {
    showToast.success(message)
    setSuccess(message)
    setTimeout(() => setSuccess(null), 3000)
  }

  const showError = (message: string) => {
    showToast.error(message)
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  const handleApprove = async (approvalId: string) => {
    setActionLoading(approvalId)
    setError(null)
    
    setApprovals(prev => prev.map(a => 
      a.id === approvalId 
        ? { ...a, status: "approved" as const, approved_at: new Date().toISOString() }
        : a
    ))
    
    try {
      await approveMessage(approvalId)
      showToast.messageApproved()
      showSuccess("Message approved successfully")
      // Trigger update event for other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("approvalUpdated"))
      }
      await loadData()
    } catch (error) {
      console.error("Failed to approve:", error)
      showError(error instanceof Error ? error.message : "Failed to approve message")
      await loadData()
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (approvalId: string) => {
    setActionLoading(approvalId)
    setError(null)
    
    setApprovals(prev => prev.map(a => 
      a.id === approvalId 
        ? { ...a, status: "rejected" as const }
        : a
    ))
    
    try {
      await rejectMessage(approvalId)
      showToast.messageRejected()
      showSuccess("Message rejected")
      // Trigger update event for other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("approvalUpdated"))
      }
      await loadData()
    } catch (error) {
      console.error("Failed to reject:", error)
      showError(error instanceof Error ? error.message : "Failed to reject message")
      await loadData()
    } finally {
      setActionLoading(null)
    }
  }

  const handleSend = async (approvalId: string) => {
    setActionLoading(approvalId)
    setError(null)
    
    setApprovals(prev => prev.map(a => 
      a.id === approvalId 
        ? { ...a, status: "sent" as const, sent_at: new Date().toISOString() }
        : a
    ))
    
    try {
      await sendMessage(approvalId)
      showToast.messageSent()
      showSuccess("Message sent successfully!")
      // Trigger update event for other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dealUpdated"))
        window.dispatchEvent(new Event("approvalUpdated"))
      }
      await loadData()
    } catch (error) {
      console.error("Failed to send:", error)
      showError(error instanceof Error ? error.message : "Failed to send message")
      await loadData()
    } finally {
      setActionLoading(null)
    }
  }

  const pendingApprovals = approvals.filter(a => a.status === "pending").slice(0, 3)
  const isActive = stats.active_revivals > 0 || stats.pending_approvals > 0

  // Show loading state only on client-side
  if (mounted && loading) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F8CFF]" />
        <p className="mt-4 text-sm text-[#6B7280]">Loading dashboard...</p>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center p-6">
        <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-[#111827] mb-2">Error loading dashboard</h2>
        <p className="text-sm text-[#6B7280] mb-4">{error}</p>
        <Button onClick={() => {
          setError(null)
          loadData()
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Main Content - ChatGPT-style rhythm */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          {/* Clear Title */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#111827] mb-1 sm:mb-2">
                {greeting}, {firstName}
              </h1>
              <p className="text-sm sm:text-base text-[#6B7280]">
                Here's what's happening this month.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Tooltip content="Refresh dashboard data now" side="bottom">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    loadData()
                    setLastRefresh(new Date())
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </Tooltip>
              <Tooltip 
                content={autoRefresh ? "Auto-refresh enabled (updates every 30 seconds)" : "Enable auto-refresh (updates every 30 seconds)"} 
                side="bottom"
              >
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Clock className={cn("h-4 w-4", autoRefresh && "animate-pulse")} />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* AI Status Indicator - Prominent Visual */}
          <Card className={cn(
            "mb-8 border-2 transition-all",
            isActive 
              ? "bg-gradient-to-br from-[#3CCB7F]/10 via-[#3CCB7F]/5 to-transparent border-[#3CCB7F]/30 shadow-lg shadow-[#3CCB7F]/10" 
              : "bg-gradient-to-br from-[#8A90A2]/10 via-[#8A90A2]/5 to-transparent border-[#8A90A2]/20"
          )}>
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Pulsing Status Dot */}
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "h-12 w-12 sm:h-16 sm:w-16 rounded-full flex items-center justify-center border-2",
                    isActive 
                      ? "bg-[#3CCB7F]/20 border-[#3CCB7F]/40" 
                      : "bg-[#8A90A2]/20 border-[#8A90A2]/40"
                  )}>
                    {isActive ? (
                      <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-[#3CCB7F]" />
                    ) : (
                      <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-[#8A90A2]" />
                    )}
                  </div>
                  {isActive && (
                    <>
                      {/* Outer pulsing ring */}
                      <div className="absolute inset-0 rounded-full bg-[#3CCB7F]/20 animate-ping" />
                      {/* Inner pulsing ring */}
                      <div className="absolute inset-2 rounded-full bg-[#3CCB7F]/10 animate-pulse" />
                    </>
                  )}
                </div>

                {/* Status Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h2 className={cn(
                      "text-lg sm:text-xl font-bold",
                      isActive ? "text-[#111827]" : "text-[#6B7280]"
                    )}>
                      AI is {isActive ? "actively monitoring" : "inactive"}
                    </h2>
                    {isActive && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3CCB7F]/20">
                        <div className="h-2 w-2 rounded-full bg-[#3CCB7F] animate-pulse" />
                        <span className="text-xs font-medium text-[#3CCB7F]">LIVE</span>
                      </div>
                    )}
                  </div>
                  {isActive ? (
                    <p className="text-sm text-[#6B7280]">
                      Monitoring <span className="font-semibold text-[#111827]">{stats.active_revivals}</span> {stats.active_revivals === 1 ? 'deal' : 'deals'} and analyzing conversations in real-time
                    </p>
                  ) : (
                    <p className="text-sm text-[#6B7280]">
                      AI monitoring is paused. Start detecting stalled deals to activate.
                    </p>
                  )}
                </div>

                {/* Action Button */}
                {!isActive && (
                  <Link href="/revivals" className="w-full sm:w-auto">
                    <Button size="sm" className="w-full sm:w-auto flex-shrink-0">
                      <Zap className="h-4 w-4 mr-2" />
                      Activate AI
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </Card>

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
                <Activity className="h-4 w-4 text-[#E06C75]" />
                <p className="text-sm text-[#111827]">{error}</p>
              </div>
            </div>
          )}

          {/* Primary Metric - Revenue Recovered (Emphasized) */}
          <Card className="p-6 sm:p-8 mb-6 sm:mb-8 bg-gradient-to-br from-[#4F8CFF]/10 via-[#4F8CFF]/5 to-transparent border-2 border-[#4F8CFF]/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl bg-[#4F8CFF]/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-[#4F8CFF]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#6B7280] uppercase tracking-wide mb-1">Revenue Recovered</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#111827]">${stats.revenue_recovered.toLocaleString()}</p>
                  <p className="text-xs text-[#6B7280] mt-1">This month</p>
                </div>
              </div>
              <div className="w-full sm:w-auto text-left sm:text-right">
                <div className="flex items-center gap-1 text-[#3CCB7F] mb-2 sm:mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs sm:text-sm font-medium">{stats.success_rate}% success rate</span>
                </div>
                <Link href="/revivals" className="block sm:inline-block">
                  <Button size="sm" className="w-full sm:w-auto">
                    <Zap className="h-4 w-4 mr-2" />
                    View Revivals
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>


          {/* Pending Approvals - High Priority Action */}
          {stats.pending_approvals > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#F6C177]/12 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-[#F6C177]" />
                  </div>
                  <div>
                    <h2 className="text-h2 text-[#111827] mb-1">
                      Pending Approvals
                      {stats.pending_approvals > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F6C177]/20 text-[#F6C177] text-sm font-medium">
                          {stats.pending_approvals}
                        </span>
                      )}
                    </h2>
                    <p className="text-body text-[#6B7280]">
                      {stats.pending_approvals === 1 
                        ? "1 message needs your review before sending"
                        : `${stats.pending_approvals} messages need your review before sending`}
                    </p>
                  </div>
                </div>
                <Link href="/revivals">
                  <Button variant="default" size="sm">
                    Review All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {pendingApprovals.length > 0 ? pendingApprovals.map((approval) => (
                  <Card key={approval.id} className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-[#111827] mb-1">{approval.deal_title}</h3>
                        <p className="text-body-small text-[#8A90A2]">
                          {new Date(approval.created_at).toLocaleDateString()} at{" "}
                          {new Date(approval.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 mb-4 border border-[#E5E7EB]">
                      <p className="text-body text-[#6B7280] leading-relaxed">{approval.generated_message}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(approval.id)}
                        disabled={actionLoading === approval.id}
                      >
                        {actionLoading === approval.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(approval.id)}
                        disabled={actionLoading === approval.id}
                      >
                        Reject
                      </Button>
                      <Link href="/revivals">
                        <Button size="sm" variant="ghost">
                          View Full
                          <ArrowRight className="h-3 w-3 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )) : (
                  <Card className="p-5">
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-[#3CCB7F] mx-auto mb-2" />
                      <p className="text-sm text-[#6B7280]">All caught up! No pending approvals.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Notifications Widget */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/12 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div>
                  <h2 className="text-h2 text-[#111827] mb-1">
                    Recent Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-[#4F8CFF]/20 text-[#4F8CFF] text-sm font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </h2>
                  <p className="text-body text-[#6B7280]">
                    Stay updated with important events and activities
                  </p>
                </div>
              </div>
              <Link href="/notifications">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <Card className="p-5">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-8 w-8 text-[#6B7280] mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-[#6B7280]">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-3 rounded-lg border transition-colors cursor-pointer hover:bg-[#F9FAFB]",
                        !notification.read_at ? "bg-[#4F8CFF]/5 border-[#4F8CFF]/20" : "bg-white border-[#E5E7EB]"
                      )}
                      onClick={async () => {
                        if (!notification.read_at) {
                          try {
                            await markNotificationAsRead(notification.id)
                            setNotifications(prev => prev.map(n => 
                              n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
                            ))
                            setUnreadCount(prev => Math.max(0, prev - 1))
                          } catch (error) {
                            console.error("Error marking notification as read:", error)
                          }
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "h-2 w-2 rounded-full mt-2 flex-shrink-0",
                          !notification.read_at ? "bg-[#4F8CFF]" : "bg-transparent"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-[#111827]">{notification.title}</p>
                            <span className="text-xs text-[#6B7280] flex-shrink-0 ml-2">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-[#6B7280] line-clamp-2">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Primary CTA Section */}
          {stats.pending_approvals === 0 && stats.active_revivals === 0 && (
            <Card className="p-8 mb-8 bg-gradient-to-br from-[#4F8CFF]/10 via-[#4F8CFF]/5 to-transparent border-2 border-[#4F8CFF]/20">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-[#4F8CFF]/20 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-[#4F8CFF]" />
                </div>
                <h2 className="text-2xl font-bold text-[#111827] mb-2">Get Started</h2>
                <p className="text-body text-[#6B7280] mb-6 max-w-md mx-auto">
                  Start recovering revenue by detecting stalled deals and generating personalized revival messages.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/revivals">
                    <Button size="lg">
                      <Zap className="h-5 w-5 mr-2" />
                      Detect Stalled Deals
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/knowledge-base">
                    <Button size="lg" variant="outline">
                      Set Up Knowledge Base
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Actionable Insights */}
          {stats.active_revivals > 0 && (
            <div className="mb-8 space-y-3">
              {stats.success_rate < 50 && (
                <Card className="p-5 bg-gradient-to-r from-[#F6C177]/5 to-transparent border-[#F6C177]/20">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-[#F6C177] mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#111827] mb-1">Improve Success Rate</h3>
                      <p className="text-sm text-[#6B7280] mb-3">
                        Your success rate is {stats.success_rate}%. Consider refining your knowledge base or message tone to improve responses.
                      </p>
                      <Link href="/knowledge-base">
                        <Button size="sm" variant="outline">
                          Update Knowledge Base
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}
              {stats.avg_response_time > 24 && (
                <Card className="p-5 bg-gradient-to-r from-[#4F8CFF]/5 to-transparent border-[#4F8CFF]/20">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-[#4F8CFF] mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#111827] mb-1">Response Time</h3>
                      <p className="text-sm text-[#6B7280] mb-3">
                        Average response time is {stats.avg_response_time} hours. Consider following up on older messages.
                      </p>
                      <Link href="/revivals">
                        <Button size="sm" variant="outline">
                          Review Messages
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <Link href="/revivals">
              <Button variant="default">
                <Zap className="h-4 w-4 mr-2" />
                View All Revivals
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/knowledge-base">
              <Button variant="outline">
                Knowledge Base
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline">
                Settings
              </Button>
            </Link>
            {lastRefresh && (
              <p className="text-xs text-[#6B7280] ml-auto">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* API Key Warning */}
          {!hasApiKey() && (
            <div className="mt-12 p-4 rounded-lg bg-white border border-[#E5E7EB]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#111827]">API Key Not Configured</p>
                  <p className="text-body-small text-[#8A90A2] mt-1">
                    Configure your API key in Settings to connect to the backend. Currently showing demo data.
                  </p>
                </div>
                <Link href="/settings">
                  <Button size="sm">Go to Settings</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
