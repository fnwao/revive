"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { detectStalledDeals, generateMessage, getApprovals, approveMessage, rejectMessage, sendMessage, type StalledDeal, type Approval, hasApiKey } from "@/lib/api"
import { getConversationForDeal, type ConversationMessage } from "@/lib/demo-data"
import { Search, RefreshCw, MessageSquare, Clock, DollarSign, Send, Check, X, AlertCircle, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { showToast } from "@/lib/toast"

export default function RevivalsPage() {
  const [stalledDeals, setStalledDeals] = useState<StalledDeal[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDeal, setSelectedDeal] = useState<StalledDeal | null>(null)
  const [generatedMessage, setGeneratedMessage] = useState<string>("")
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [currentApprovalId, setCurrentApprovalId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadStalledDeals = async () => {
    setLoading(true)
    try {
      // detectStalledDeals will return mock data if no API key
      const result = await detectStalledDeals(undefined, undefined, 7)
      setStalledDeals(result.stalled_deals)
    } catch (error) {
      console.error("Failed to load stalled deals:", error)
      // Fallback to empty array - detectStalledDeals should handle mock data
      setStalledDeals([])
    } finally {
      setLoading(false)
    }
  }

  const loadApprovals = async () => {
    try {
      const result = await getApprovals({ limit: 50 })
      setApprovals(result.approvals)
    } catch (error) {
      console.error("Failed to load approvals:", error)
    }
  }

  useEffect(() => {
    loadStalledDeals()
    loadApprovals()
    
    // Check if we should trigger deal detection (from New Revival button)
    const shouldTrigger = sessionStorage.getItem("triggerDealDetection")
    if (shouldTrigger === "true") {
      sessionStorage.removeItem("triggerDealDetection")
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        loadStalledDeals()
      }, 100)
    }
  }, [])

  // Listen for triggerDealDetection event from sidebar (when already on page)
  useEffect(() => {
    const handleTriggerDetection = () => {
      loadStalledDeals()
    }
    
    window.addEventListener("triggerDealDetection", handleTriggerDetection as EventListener)
    return () => {
      window.removeEventListener("triggerDealDetection", handleTriggerDetection as EventListener)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateMessage = async (deal: StalledDeal) => {
    setSelectedDeal(deal)
    setLoading(true)
    setGeneratedMessage("")
    setCurrentApprovalId(null)
    
    // Load conversation history
    const dealConversation = getConversationForDeal(deal.deal_id)
    if (dealConversation) {
      setConversation(dealConversation.messages)
    } else {
      setConversation([])
    }
    
    try {
      const result = await generateMessage(deal.deal_id)
      setGeneratedMessage(result.message)
      setCurrentApprovalId(result.approval_id)
      // Reload approvals to get the new one
      await loadApprovals()
      showToast.success("Message generated", "AI has generated a personalized message for this deal.")
    } catch (error) {
      console.error("Failed to generate message:", error)
      showToast.error("Generation failed", error instanceof Error ? error.message : "Please try again.")
      setGeneratedMessage("Hi! I wanted to follow up on our previous conversation. Are you still interested in moving forward?")
      setCurrentApprovalId(null)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!currentApprovalId) return
    
    setActionLoading("approve")
    try {
      await approveMessage(currentApprovalId)
      showToast.success("Message approved", "The message has been approved and is ready to send.")
      await loadApprovals()
      // Update local state
      const approval = approvals.find(a => a.id === currentApprovalId)
      if (approval) {
        setApprovals(prev => prev.map(a => 
          a.id === currentApprovalId 
            ? { ...a, status: "approved" as const, approved_at: new Date().toISOString() }
            : a
        ))
      }
    } catch (error) {
      showToast.error("Failed to approve", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!currentApprovalId) return
    
    setActionLoading("reject")
    try {
      await rejectMessage(currentApprovalId)
      showToast.success("Message rejected", "The message has been rejected.")
      setGeneratedMessage("")
      setCurrentApprovalId(null)
      await loadApprovals()
    } catch (error) {
      showToast.error("Failed to reject", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSend = async () => {
    if (!currentApprovalId) return
    
    setActionLoading("send")
    try {
      await sendMessage(currentApprovalId)
      showToast.success("Message sent", "The message has been sent successfully!")
      setGeneratedMessage("")
      setCurrentApprovalId(null)
      setSelectedDeal(null)
      await loadApprovals()
      await loadStalledDeals()
    } catch (error) {
      showToast.error("Failed to send", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const filteredDeals = stalledDeals.filter((deal) =>
    deal.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getDealApproval = (dealId: string) => {
    return approvals.find((a) => a.ghl_deal_id === dealId)
  }

  // When a deal is selected, check if there's an existing approval
  useEffect(() => {
    if (selectedDeal) {
      const approval = getDealApproval(selectedDeal.deal_id)
      if (approval && approval.status === "pending") {
        setGeneratedMessage(approval.generated_message)
        setCurrentApprovalId(approval.id)
      } else if (approval && approval.status === "approved") {
        setGeneratedMessage(approval.generated_message || approval.edited_message || "")
        setCurrentApprovalId(approval.id)
      }
    }
  }, [selectedDeal, approvals])

  return (
    <div className="flex h-full min-h-0">
      {/* Left Sidebar - Deal List */}
      <div className="w-80 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={loadStalledDeals}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh Deals
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!hasApiKey() && (
            <Card className="m-4 p-4 bg-muted/30 border-primary/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">API Key Required</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure your API key in Settings to connect to GoHighLevel and load real deals
                  </p>
                  <Link href="/settings">
                    <Button size="sm" className="mt-2">Go to Settings</Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
          {loading && stalledDeals.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : filteredDeals.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No stalled deals found</div>
          ) : (
            <div className="divide-y">
              {filteredDeals.map((deal) => {
                const approval = getDealApproval(deal.deal_id)
                return (
                  <button
                    key={deal.deal_id}
                    onClick={() => handleGenerateMessage(deal)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-accent transition-colors",
                      selectedDeal?.deal_id === deal.deal_id && "bg-accent"
                    )}
                  >
                    <div className="font-medium text-sm mb-1">{deal.title}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${deal.value.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {deal.days_since_activity}d
                      </span>
                    </div>
                    {approval && (
                      <div className="mt-2 text-xs text-primary">
                        {approval.status === "pending" && "Pending approval"}
                        {approval.status === "approved" && "Approved"}
                        {approval.status === "sent" && "Sent"}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Conversation View */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedDeal ? (
          <>
            {/* Header */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="font-semibold text-sm">{selectedDeal.title}</h2>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>${selectedDeal.value.toLocaleString()}</span>
                    <span>{selectedDeal.days_since_activity} days inactive</span>
                  </div>
                  {conversation.length > 0 && (() => {
                    const dealConv = getConversationForDeal(selectedDeal.deal_id)
                    if (dealConv) {
                      return (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {dealConv.contact_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {dealConv.contact_name}
                            </span>
                          )}
                          {dealConv.contact_phone && (
                            <span>{dealConv.contact_phone}</span>
                          )}
                          {dealConv.contact_email && (
                            <span>{dealConv.contact_email}</span>
                          )}
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDeal(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Conversation History */}
              {conversation.length > 0 && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-muted-foreground">Conversation History from GoHighLevel</div>
                    <div className="text-xs text-muted-foreground">
                      {conversation.filter(m => m.type === "sms" || m.type === "email" || m.type === "call").length} messages
                    </div>
                  </div>
                  {conversation.map((msg) => {
                    const isInbound = msg.direction === "inbound"
                    const isSystem = msg.role === "system"
                    const isCall = msg.type === "call"
                    const isEmail = msg.type === "email"
                    const isNote = msg.type === "note"
                    
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          isInbound ? "justify-start" : "justify-end"
                        )}
                      >
                        {!isInbound && !isSystem && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          isSystem 
                            ? "bg-muted/20 border border-muted"
                            : isInbound
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/30"
                        )}>
                          {isSystem && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium opacity-70">System Note</span>
                            </div>
                          )}
                          {isInbound && msg.contact_name && (
                            <div className="text-xs opacity-80 mb-1">{msg.contact_name}</div>
                          )}
                          {isCall && (
                            <div className="flex items-center gap-2 mb-2 text-xs opacity-80">
                              <span className="font-medium">📞 Call</span>
                              <span>{msg.direction === "inbound" ? "Incoming" : "Outgoing"}</span>
                              {msg.contact_phone && <span>• {msg.contact_phone}</span>}
                            </div>
                          )}
                          {isEmail && (
                            <div className="flex items-center gap-2 mb-2 text-xs opacity-80">
                              <span className="font-medium">✉️ Email</span>
                              {msg.contact_email && <span>• {msg.contact_email}</span>}
                            </div>
                          )}
                          {isNote && (
                            <div className="flex items-center gap-2 mb-2 text-xs opacity-80">
                              <span className="font-medium">📝 Note</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                            <span>
                              {new Date(msg.timestamp).toLocaleDateString()} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.type && msg.type !== "note" && (
                              <>
                                <span>•</span>
                                <span className="uppercase">{msg.type}</span>
                              </>
                            )}
                            {msg.direction && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{msg.direction}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {isInbound && !isSystem && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Generated Message */}
              {generatedMessage && (
                <div className="space-y-4 border-t pt-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">AI Generated Message</div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{generatedMessage}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleApprove}
                          disabled={actionLoading !== null || !currentApprovalId}
                        >
                          {actionLoading === "approve" ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleReject}
                          disabled={actionLoading !== null || !currentApprovalId}
                        >
                          {actionLoading === "reject" ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSend}
                          disabled={actionLoading !== null || !currentApprovalId}
                        >
                          {actionLoading === "send" ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!generatedMessage && conversation.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {loading ? "Generating message..." : "Click 'Generate Message' to create a reactivation message"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t p-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Edit message or add context..."
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
                <Button
                  onClick={() => handleGenerateMessage(selectedDeal)}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Select a deal to get started</h3>
              <p className="text-sm text-muted-foreground">
                Choose a stalled deal from the sidebar to generate a personalized reactivation message
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
