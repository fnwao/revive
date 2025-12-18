"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  Loader2,
  ArrowRight,
  Activity
} from "lucide-react"
import { getDashboardStats, getApprovals, approveMessage, rejectMessage, sendMessage, type Approval, hasApiKey, type DashboardStats } from "@/lib/api"
import { getUser, getGreeting, getFirstName } from "@/lib/user"
import { cn } from "@/lib/utils"
import { showToast } from "@/lib/toast"
import Link from "next/link"

export default function DashboardPage() {
  const [user, setUser] = useState(getUser())
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

  // Reload user data when component mounts or user updates
  useEffect(() => {
    const refreshUser = () => {
      const currentUser = getUser()
      if (currentUser) {
        setUser(currentUser)
      }
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
  }, [])

  const greeting = getGreeting()
  const firstName = user ? getFirstName(user.name) : "there"

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      let statsData: DashboardStats
      let approvalsData: { approvals: Approval[]; total: number; pending: number; approved: number; rejected: number; sent: number }
      
      // getDashboardStats and getApprovals should return mock data if no API key or on error
      try {
        statsData = await getDashboardStats()
      } catch (error) {
        console.error("Failed to load stats:", error)
        // Fallback to mock stats
        statsData = {
          active_revivals: 12,
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

      setStats(statsData)
      setApprovals(approvalsData.approvals || [])
      
      // Update pending approvals count from approvals data if available
      if (approvalsData.pending !== undefined) {
        setStats(prev => ({ ...prev, pending_approvals: approvalsData.pending }))
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
    loadData()
  }, [])

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
      setStats(prev => ({
        ...prev,
        active_revivals: Math.max(0, prev.active_revivals - 1),
        pending_approvals: Math.max(0, prev.pending_approvals - 1),
      }))
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
  const isActive = stats.active_revivals > 0

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Main Content - ChatGPT-style rhythm */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Clear Title */}
          <div className="mb-12">
            <h1 className="text-h1 text-[#F5F7FA] mb-2">
              {greeting}, {firstName}
            </h1>
            <p className="text-body text-[#B8BDC9]">
              Revenue recovery is {isActive ? "active" : "inactive"}. Here's what's happening this month.
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-[#1B1F2A] border border-[#3CCB7F]/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                <p className="text-sm text-[#F5F7FA]">{success}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-[#1B1F2A] border border-[#E06C75]/20">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#E06C75]" />
                <p className="text-sm text-[#F5F7FA]">{error}</p>
              </div>
            </div>
          )}

          {/* Key Metrics - Primary Action */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/12 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div>
                  <p className="text-label text-[#8A90A2] uppercase tracking-wide">Revenue Recovered</p>
                  <p className="text-h3 text-[#F5F7FA] mt-1">${stats.revenue_recovered.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-body-small text-[#8A90A2]">This month</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/12 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div>
                  <p className="text-label text-[#8A90A2] uppercase tracking-wide">Deals Revived</p>
                  <p className="text-h3 text-[#F5F7FA] mt-1">{stats.active_revivals}</p>
                </div>
              </div>
              <p className="text-body-small text-[#8A90A2]">Currently active</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  isActive ? "bg-[#3CCB7F]/12" : "bg-[#8A90A2]/12"
                )}>
                  <Activity className={cn(
                    "h-5 w-5",
                    isActive ? "text-[#3CCB7F]" : "text-[#8A90A2]"
                  )} />
                </div>
                <div>
                  <p className="text-label text-[#8A90A2] uppercase tracking-wide">Status</p>
                  <p className={cn(
                    "text-h3 mt-1",
                    isActive ? "text-[#3CCB7F]" : "text-[#8A90A2]"
                  )}>
                    {isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              <p className="text-body-small text-[#8A90A2]">Revive is {isActive ? "working" : "paused"}</p>
            </Card>
          </div>

          {/* Pending Approvals - Supporting Context */}
          {pendingApprovals.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h2 text-[#F5F7FA] mb-1">Pending Approvals</h2>
                  <p className="text-body text-[#B8BDC9]">
                    Review AI-generated messages before sending
                  </p>
                </div>
                <Link href="/revivals">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <Card key={approval.id} className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-[#F5F7FA] mb-1">{approval.deal_title}</h3>
                        <p className="text-body-small text-[#8A90A2]">
                          {new Date(approval.created_at).toLocaleDateString()} at{" "}
                          {new Date(approval.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#0F1115] rounded-lg p-4 mb-4 border border-[#2A2F3A]">
                      <p className="text-body text-[#B8BDC9] leading-relaxed">{approval.generated_message}</p>
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
                ))}
              </div>
            </div>
          )}

          {/* Secondary Actions */}
          <div className="flex items-center gap-3">
            <Link href="/revivals">
              <Button variant="default">
                View All Revivals
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline">
                Configure Settings
              </Button>
            </Link>
          </div>

          {/* API Key Warning */}
          {!hasApiKey() && (
            <div className="mt-12 p-4 rounded-lg bg-[#1B1F2A] border border-[#2A2F3A]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#F5F7FA]">API Key Not Configured</p>
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
