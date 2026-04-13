"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { detectStalledDeals, generateMessage, getApprovals, approveMessage, rejectMessage, sendMessage, updateEditedMessage, submitFeedback, regenerateMessage, getTemplates, getSettings, type StalledDeal, type Approval, hasApiKey, type MessageTemplate, type ReactivationRule } from "@/lib/api"
import { getConversationForDeal, type ConversationMessage } from "@/lib/demo-data"
import { RevivalsPipeline } from "@/components/revivals-pipeline"
import { Search, RefreshCw, MessageSquare, Clock, DollarSign, Send, Check, X, AlertCircle, User, Loader2, Edit2, Save, MessageCircle, Calendar, Filter, Tag, LayoutGrid, List, TrendingUp, Brain, Target, Zap, Mail, FileText, ArrowRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { showToast } from "@/lib/toast"

export default function RevivalsPage() {
  const [stalledDeals, setStalledDeals] = useState<StalledDeal[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [tagFilters, setTagFilters] = useState<string[]>([])
  const [selectedDeal, setSelectedDeal] = useState<StalledDeal | null>(null)
  const [generatedMessage, setGeneratedMessage] = useState<string>("")
  const [generatedMessages, setGeneratedMessages] = useState<string[]>([])
  const [messageSequence, setMessageSequence] = useState<Array<{ message: string; order: number; delay_seconds: number }>>([])
  const [editedMessage, setEditedMessage] = useState<string>("")
  const [editedMessages, setEditedMessages] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [feedback, setFeedback] = useState<string>("")
  const [showFeedback, setShowFeedback] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("")
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [currentApprovalId, setCurrentApprovalId] = useState<string | null>(null)
  const [messageChannel, setMessageChannel] = useState<"sms" | "email" | "both">("sms")
  const [emailSubject, setEmailSubject] = useState("")
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const refreshIntervalRef = useRef<number | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list")
  const [reactivationRules, setReactivationRules] = useState<ReactivationRule[]>([])
  const [excludedStatuses, setExcludedStatuses] = useState<string[]>(["won", "lost", "abandoned"])
  const [excludedTags, setExcludedTags] = useState<string[]>([])
  const prevChannelRef = useRef(messageChannel)

  const loadReactivationRules = async () => {
    try {
      const settings = await getSettings()
      if (settings.reactivation_rules && settings.reactivation_rules.length > 0) {
        setReactivationRules(settings.reactivation_rules)
      }
      // Load exclusion settings
      if ((settings as any).excluded_statuses) {
        setExcludedStatuses((settings as any).excluded_statuses)
      }
      if ((settings as any).excluded_tags) {
        setExcludedTags((settings as any).excluded_tags)
      }
    } catch (error) {
      console.error("Failed to load reactivation rules:", error)
    }
  }

  const loadStalledDeals = async (showError = true) => {
    setLoading(true)
    setError(null)
    try {
      // Use reactivation rules if available, otherwise use manual filters
      let statusFilter: string[] | undefined = undefined
      let tagFilter: string[] | undefined = undefined
      let thresholdDays = 7
      
      // If we have enabled reactivation rules, use them
      const enabledRules = reactivationRules.filter(r => r.enabled)
      if (enabledRules.length > 0) {
        // For now, use the first enabled rule (can be enhanced to support multiple rules)
        const activeRule = enabledRules[0]
        statusFilter = activeRule.statuses.length > 0 ? activeRule.statuses : undefined
        tagFilter = activeRule.tags.length > 0 ? activeRule.tags : undefined
        thresholdDays = activeRule.thresholdDays
      } else {
        // Fall back to manual filters if no rules configured
        statusFilter = statusFilters.length > 0 ? statusFilters : undefined
        tagFilter = tagFilters.length > 0 ? tagFilters : undefined
      }
      
      // detectStalledDeals will return mock data if no API key
      const result = await detectStalledDeals(
        undefined,
        undefined,
        thresholdDays,
        statusFilter,
        tagFilter,
        excludedStatuses.length > 0 ? excludedStatuses : undefined,
        excludedTags.length > 0 ? excludedTags : undefined
      )
      setStalledDeals(result.stalled_deals)
    } catch (error) {
      console.error("Failed to load stalled deals:", error)
      if (showError) {
        setError(error instanceof Error ? error.message : "Failed to load deals")
        showToast.error("Failed to load deals", error instanceof Error ? error.message : "Please try again.")
      }
      // Fallback to empty array - detectStalledDeals should handle mock data
      setStalledDeals([])
    } finally {
      setLoading(false)
    }
  }

  const loadApprovals = async (showError = true) => {
    try {
      const result = await getApprovals({ limit: 50 })
      setApprovals(result.approvals)
    } catch (error) {
      console.error("Failed to load approvals:", error)
      if (showError) {
        showToast.error("Failed to load approvals", "Some features may not work correctly.")
      }
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await getTemplates({ is_active: true, include_public: true })
      setTemplates(response.templates)
    } catch (error) {
      console.error("Error loading templates:", error)
    }
  }

  const handleTemplateSelect = (template: MessageTemplate) => {
    // Replace variables in template with deal data
    let message = template.body
    if (selectedDeal) {
      message = message
        .replace(/\{\{deal_title\}\}/g, selectedDeal.title || "Deal")
        .replace(/\{\{deal_value\}\}/g, selectedDeal.value ? `$${selectedDeal.value.toLocaleString()}` : "N/A")
        .replace(/\{\{days_since_activity\}\}/g, selectedDeal.days_since_activity?.toString() || "0")
        .replace(/\{\{contact_name\}\}/g, "Contact") // Would need to fetch from deal
    }
    setEditedMessage(message)
    if (template.subject && (messageChannel === "email" || messageChannel === "both")) {
      setEmailSubject(template.subject)
    }
    setSelectedTemplate(template)
    setShowTemplatePicker(false)
    if (!isEditing) {
      setIsEditing(true)
    }
  }

  useEffect(() => {
    loadReactivationRules()
    loadStalledDeals()
    loadApprovals()
    loadTemplates()
    
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

  // Auto-refresh when enabled
  useEffect(() => {
    if (autoRefresh) {
      const interval = window.setInterval(() => {
        loadStalledDeals(false) // Don't show errors on auto-refresh
        loadApprovals(false)
      }, 60000) // Refresh every 60 seconds
      refreshIntervalRef.current = interval
      return () => {
        if (interval) window.clearInterval(interval)
        refreshIntervalRef.current = null
      }
    } else {
      if (refreshIntervalRef.current !== null) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [autoRefresh]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Re-generate message when channel changes (if a deal is selected and message exists)
  useEffect(() => {
    if (messageChannel !== prevChannelRef.current && selectedDeal && generatedMessage) {
      prevChannelRef.current = messageChannel
      handleGenerateMessage(selectedDeal)
    } else {
      prevChannelRef.current = messageChannel
    }
  }, [messageChannel]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const result = await generateMessage(deal.deal_id, messageChannel)
      setGeneratedMessage(result.message) // First message for display
      setGeneratedMessages(result.generated_messages || [result.message])
      setMessageSequence(result.message_sequence || [])
      setEditedMessage(result.message)
      setEditedMessages(result.generated_messages || [result.message])
      if (result.email_subject) {
        setEmailSubject(result.email_subject)
      }
      setIsEditing(false)
      setFeedback("")
      setShowFeedback(false)
      setScheduleEnabled(false)
      setScheduledDateTime("")
      setCurrentApprovalId(result.approval_id)
      // Reload approvals to get the new one
      await loadApprovals()
      const messageCount = result.generated_messages?.length || 1
      showToast.success(
        "Message sequence generated", 
        `AI has generated ${messageCount} message${messageCount > 1 ? 's' : ''} for natural conversation flow.`
      )
    } catch (error) {
      console.error("Failed to generate message:", error)
      showToast.error("Generation failed", error instanceof Error ? error.message : "Please try again.")
      const fallbackMessage = "Hi! I wanted to follow up on our previous conversation. Are you still interested in moving forward?"
      setGeneratedMessage(fallbackMessage)
      setGeneratedMessages([fallbackMessage])
      setEditedMessage(fallbackMessage)
      setEditedMessages([fallbackMessage])
      setMessageSequence([])
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

  const handleSaveEdits = async () => {
    if (!currentApprovalId) return
    
    // Filter out empty messages
    const validEditedMessages = editedMessages.filter(msg => msg && msg.trim().length > 0)
    
    // Validate we have at least one message
    if (validEditedMessages.length === 0 && (!editedMessage || !editedMessage.trim())) {
      showToast.error("Invalid message", "Please enter at least one message.")
      return
    }
    
    setActionLoading("save")
    try {
      // If we have multiple messages, send as JSON array, otherwise send as single message
      const messageToSave = validEditedMessages.length > 1 
        ? JSON.stringify(validEditedMessages)
        : (validEditedMessages[0] || editedMessage)
      
      if (!messageToSave || !messageToSave.trim()) {
        showToast.error("Invalid message", "Please enter at least one message.")
        return
      }
      
      await updateEditedMessage(currentApprovalId, messageToSave)
      setGeneratedMessage(validEditedMessages[0] || editedMessage)
      setGeneratedMessages(validEditedMessages.length > 0 ? validEditedMessages : [editedMessage])
      setIsEditing(false)
      showToast.success("Edits saved", "Your changes have been saved.")
      await loadApprovals()
    } catch (error) {
      showToast.error("Failed to save", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!currentApprovalId || !feedback.trim()) return
    
    setActionLoading("feedback")
    try {
      // Regenerate message with feedback
      const result = await regenerateMessage(currentApprovalId, feedback)
      
      // Update local state with regenerated message
      if (result.generated_message) {
        // Check if it's a JSON array (message sequence)
        let parsedMessages: string[] = []
        try {
          if (result.generated_message.trim().startsWith('[')) {
            const parsed = JSON.parse(result.generated_message)
            if (Array.isArray(parsed)) {
              parsedMessages = parsed.filter((msg: any) => msg && typeof msg === 'string' && msg.trim().length > 0)
            } else {
              parsedMessages = [result.generated_message]
            }
          } else {
            parsedMessages = [result.generated_message]
          }
        } catch {
          parsedMessages = [result.generated_message]
        }
        
        setGeneratedMessage(parsedMessages[0] || result.generated_message)
        setGeneratedMessages(parsedMessages.length > 0 ? parsedMessages : [result.generated_message])
        setEditedMessage(parsedMessages[0] || result.generated_message)
        setEditedMessages(parsedMessages.length > 0 ? parsedMessages : [result.generated_message])
        
        // Create message sequence with delays
        if (parsedMessages.length > 1) {
          const sequence = parsedMessages.map((msg, i) => ({
            message: msg,
            order: i + 1,
            delay_seconds: i === 0 ? 0 : i === 1 ? 30 : i === 2 ? 120 : 300
          }))
          setMessageSequence(sequence)
        } else {
          setMessageSequence([])
        }
      }
      
      // Reload approvals to get the updated message
      await loadApprovals()
      
      showToast.success("Message regenerated", "The message has been rewritten based on your feedback.")
      setFeedback("")
      setShowFeedback(false)
    } catch (error) {
      showToast.error("Failed to regenerate message", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSend = async () => {
    if (!currentApprovalId) return
    
    setActionLoading("send")
    try {
      // Determine message to send - handle sequences
      let messageToSend: string | undefined = undefined
      
      // Filter out empty messages from sequences
      const validEditedMessages = editedMessages.filter(msg => msg && msg.trim().length > 0)
      
      if (validEditedMessages.length > 1) {
        // Multiple messages - send as JSON array
        const hasEdits = JSON.stringify(validEditedMessages) !== JSON.stringify(generatedMessages.filter(m => m && m.trim().length > 0))
        messageToSend = hasEdits ? JSON.stringify(validEditedMessages) : undefined
      } else if (validEditedMessages.length === 1) {
        // Single message (after filtering)
        messageToSend = validEditedMessages[0] !== generatedMessage ? validEditedMessages[0] : undefined
      } else {
        // Single message (fallback to editedMessage)
        messageToSend = editedMessage && editedMessage.trim() && editedMessage !== generatedMessage ? editedMessage : undefined
      }
      
      // Check if scheduling is enabled
      let scheduledAtISO: string | undefined = undefined
      if (scheduleEnabled && scheduledDateTime) {
        const scheduledAt = new Date(scheduledDateTime)
        // Validate scheduled time is in the future
        if (scheduledAt <= new Date()) {
          showToast.error("Invalid time", "Scheduled time must be in the future.")
          setActionLoading(null)
          return
        }
        scheduledAtISO = scheduledAt.toISOString()
      }
      
      const result = await sendMessage(
        currentApprovalId,
        messageToSend,
        scheduledAtISO,
        messageChannel,
        messageChannel === "email" || messageChannel === "both" ? emailSubject : undefined
      )
      
      // Count valid messages (filter out empty ones)
      const validMessages = editedMessages.filter(msg => msg && msg.trim().length > 0)
      const messageCount = validMessages.length > 1 ? validMessages.length : 1
      if (scheduledAtISO) {
        const scheduledDate = new Date(scheduledAtISO)
        showToast.success(
          "Message sequence scheduled", 
          `${messageCount} message${messageCount > 1 ? 's' : ''} scheduled for ${scheduledDate.toLocaleString()}.`
        )
      } else {
        showToast.success(
          "Message sequence sent", 
          `${messageCount} message${messageCount > 1 ? 's' : ''} sent successfully!`
        )
      }
      
      setGeneratedMessage("")
      setGeneratedMessages([])
      setEditedMessage("")
      setEditedMessages([])
      setMessageSequence([])
      setIsEditing(false)
      setFeedback("")
      setShowFeedback(false)
      setScheduleEnabled(false)
      setScheduledDateTime("")
      setCurrentApprovalId(null)
      setSelectedDeal(null)
      await loadApprovals()
      await loadStalledDeals()
      // Reload conversation if deal is still selected
      if (selectedDeal) {
        const dealConversation = getConversationForDeal(selectedDeal.deal_id)
        if (dealConversation) {
          setConversation(dealConversation.messages)
        }
      }
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

  // Reload deals when filters change
  useEffect(() => {
    loadStalledDeals()
  }, [statusFilters, tagFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  // When a deal is selected, check if there's an existing approval
  useEffect(() => {
    if (selectedDeal) {
      const approval = getDealApproval(selectedDeal.deal_id)
      if (approval && (approval.status === "pending" || approval.status === "approved")) {
        // Parse generated_message - could be string or JSON array
        let parsedMessages: string[] = []
        try {
          if (approval.generated_message && approval.generated_message.trim().startsWith('[')) {
            const parsed = JSON.parse(approval.generated_message)
            if (Array.isArray(parsed)) {
              parsedMessages = parsed.filter((msg: any) => msg && typeof msg === 'string' && msg.trim().length > 0)
            } else {
              parsedMessages = [approval.generated_message]
            }
          } else {
            parsedMessages = approval.generated_message ? [approval.generated_message] : []
          }
        } catch {
          parsedMessages = approval.generated_message ? [approval.generated_message] : []
        }
        
        // Parse edited_message similarly
        let parsedEditedMessages: string[] = []
        try {
          const editedMsg = approval.edited_message || approval.generated_message || ""
          if (editedMsg.trim().startsWith('[')) {
            const parsed = JSON.parse(editedMsg)
            if (Array.isArray(parsed)) {
              parsedEditedMessages = parsed.filter((msg: any) => msg && typeof msg === 'string' && msg.trim().length > 0)
            } else {
              parsedEditedMessages = [editedMsg]
            }
          } else {
            parsedEditedMessages = editedMsg ? [editedMsg] : []
          }
        } catch {
          parsedEditedMessages = approval.edited_message || approval.generated_message ? [approval.edited_message || approval.generated_message] : []
        }
        
        const firstMessage = parsedMessages[0] || approval.generated_message || ""
        const firstEdited = parsedEditedMessages[0] || approval.edited_message || approval.generated_message || ""
        
        setGeneratedMessage(firstMessage)
        setGeneratedMessages(parsedMessages.length > 0 ? parsedMessages : [firstMessage])
        setEditedMessage(firstEdited)
        setEditedMessages(parsedEditedMessages.length > 0 ? parsedEditedMessages : [firstEdited])
        
        // Create message sequence if multiple messages
        if (parsedMessages.length > 1) {
          const sequence = parsedMessages.map((msg, i) => ({
            message: msg,
            order: i + 1,
            delay_seconds: i === 0 ? 0 : i === 1 ? 30 : i === 2 ? 120 : 300
          }))
          setMessageSequence(sequence)
        } else {
          setMessageSequence([])
        }
        
        setCurrentApprovalId(approval.id)
        setIsEditing(false)
        
        // Show scheduled time if available
        if (approval.scheduled_at) {
          setScheduleEnabled(true)
          // Convert ISO string to datetime-local format
          const scheduledDate = new Date(approval.scheduled_at)
          const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
          setScheduledDateTime(localDateTime)
        } else {
          setScheduleEnabled(false)
          setScheduledDateTime("")
        }
      }
    }
  }, [selectedDeal, approvals])

  return (
    <div className="flex flex-col sm:flex-row h-full min-h-0">
      {/* Left Sidebar - Deal List */}
      <div className={cn(
        "w-full sm:w-80 border-r bg-background flex flex-col flex-shrink-0",
        selectedDeal && "hidden sm:flex"
      )}>
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
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                loadStalledDeals()
                loadApprovals()
              }}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? "Auto-refresh enabled (every 30s)" : "Enable auto-refresh"}
            >
              <Clock className={cn("h-4 w-4", autoRefresh && "animate-pulse")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-primary/10" : ""}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {/* View Toggle */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg mb-3">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1",
                viewMode === "list" 
                  ? "bg-white shadow-sm text-[#111827] hover:bg-white" 
                  : "text-[#6B7280] hover:text-[#111827]"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1.5" />
              List
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex-1",
                viewMode === "pipeline" 
                  ? "bg-white shadow-sm text-[#111827] hover:bg-white" 
                  : "text-[#6B7280] hover:text-[#111827]"
              )}
              onClick={() => setViewMode("pipeline")}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Pipeline
            </Button>
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted space-y-3">
              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Opportunity Status
                </label>
                <div className="space-y-1">
                  {["active", "won", "lost"].map((status) => (
                    <label key={status} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusFilters.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStatusFilters([...statusFilters, status])
                          } else {
                            setStatusFilters(statusFilters.filter(s => s !== status))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Tags Filter */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Tags
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {["enterprise", "high-value", "priority", "startup", "small-business", "growth", "mid-market", "premium", "pro", "tech", "cloud", "professional"].map((tag) => (
                    <label key={tag} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tagFilters.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTagFilters([...tagFilters, tag])
                          } else {
                            setTagFilters(tagFilters.filter(t => t !== tag))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="capitalize">{tag.replace("-", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Clear Filters */}
              {(statusFilters.length > 0 || tagFilters.length > 0) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => {
                    setStatusFilters([])
                    setTagFilters([])
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
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
          {error && (
            <div className="m-4 p-3 rounded-lg bg-white border border-[#E06C75]/20">
              <div className="flex items-center gap-2 text-sm text-[#E06C75]">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}
          {loading && stalledDeals.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading deals...
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                {searchQuery || statusFilters.length > 0 || tagFilters.length > 0
                  ? "No deals match your filters"
                  : "No stalled deals found"}
              </p>
              {(searchQuery || statusFilters.length > 0 || tagFilters.length > 0) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilters([])
                    setTagFilters([])
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredDeals.map((deal) => {
                const approval = getDealApproval(deal.deal_id)
                return (
                  <button
                    key={deal.deal_id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleGenerateMessage(deal)
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleGenerateMessage(deal)
                    }}
                    className={cn(
                      "w-full text-left p-4 hover:bg-muted/50 active:bg-muted transition-colors border-l-2 touch-manipulation",
                      selectedDeal?.deal_id === deal.deal_id 
                        ? "bg-primary/5 border-l-primary" 
                        : "border-l-transparent"
                    )}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
                          {deal.title}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${deal.value.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {deal.days_since_activity}d inactive
                          </span>
                        </div>
                      </div>
                      {approval && (
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0",
                          approval.status === "pending" && "bg-yellow-100 text-yellow-700",
                          approval.status === "approved" && "bg-green-100 text-green-700",
                          approval.status === "sent" && "bg-blue-100 text-blue-700"
                        )}>
                          {approval.status}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Pipeline or Conversation View */}
      <div className={cn(
        "flex-1 flex flex-col bg-background min-h-0",
        !selectedDeal && "hidden sm:flex"
      )}>
        {viewMode === "pipeline" && !selectedDeal ? (
          <RevivalsPipeline
            stalledDeals={filteredDeals}
            approvals={approvals}
            onDealClick={handleGenerateMessage}
            selectedDeal={selectedDeal}
          />
        ) : selectedDeal ? (
          <>
            {/* Header */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="font-semibold text-base">{selectedDeal.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${selectedDeal.value.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedDeal.days_since_activity} days inactive
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedDeal(null)
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedDeal(null)
                  }}
                  className="touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {/* Conversation History */}
              {conversation.length > 0 && (
                <div className="p-6 pb-4 border-b border-muted/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-muted"></div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3">
                        Conversation History
                      </div>
                      <div className="h-px flex-1 bg-muted"></div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4">
                      {conversation.filter(m => m.type === "sms" || m.type === "email" || m.type === "call").length} messages
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {conversation.map((msg, idx) => {
                      const isInbound = msg.direction === "inbound"
                      const isSystem = msg.role === "system"
                      const isCall = msg.type === "call"
                      const isEmail = msg.type === "email"
                      const isNote = msg.type === "note"
                      const isSMS = msg.type === "sms"
                      
                      // Show date separator if date changed
                      const showDateSeparator = idx === 0 || 
                        new Date(msg.timestamp).toDateString() !== new Date(conversation[idx - 1].timestamp).toDateString()
                      
                      return (
                        <div key={msg.id}>
                          {showDateSeparator && (
                            <div className="text-center my-4">
                              <span className="text-xs text-muted-foreground bg-background px-3">
                                {new Date(msg.timestamp).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex gap-3 group",
                              isInbound ? "justify-start" : "justify-end"
                            )}
                          >
                            {isInbound && !isSystem && (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                            )}
                            <div className={cn(
                              "max-w-[75%] rounded-2xl p-4 shadow-sm transition-all",
                              isSystem 
                                ? "bg-muted/40 border border-muted/60"
                                : isInbound
                                ? "bg-primary text-primary-foreground rounded-tl-sm"
                                : "bg-muted rounded-tr-sm"
                            )}>
                              {isSystem && (
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-semibold opacity-80">System Note</span>
                                </div>
                              )}
                              {isInbound && msg.contact_name && (
                                <div className="text-xs font-medium opacity-90 mb-1.5">{msg.contact_name}</div>
                              )}
                              {(isCall || isEmail || isNote) && (
                                <div className="flex items-center gap-2 mb-2 text-xs opacity-80">
                                  {isCall && <span className="font-medium">📞 Call</span>}
                                  {isEmail && <span className="font-medium">✉️ Email</span>}
                                  {isNote && <span className="font-medium">📝 Note</span>}
                                  {isCall && <span>{msg.direction === "inbound" ? "Incoming" : "Outgoing"}</span>}
                                  {msg.contact_phone && <span>• {msg.contact_phone}</span>}
                                  {msg.contact_email && <span>• {msg.contact_email}</span>}
                                </div>
                              )}
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                              <div className="flex items-center gap-2 mt-2.5 text-[10px] opacity-70">
                                <span>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isSMS && (
                                  <>
                                    <span>•</span>
                                    <span className="uppercase">SMS</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {!isInbound && !isSystem && (
                              <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 border-2 border-muted/40">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Generated Message */}
              {generatedMessage && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-muted"></div>
                      <div className="text-xs font-semibold text-primary uppercase tracking-wide px-3 flex items-center gap-2">
                        <MessageSquare className="h-3 w-3" />
                        AI Generated Message
                      </div>
                      <div className="h-px flex-1 bg-muted"></div>
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                          className="h-7 text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Use Template
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditing(true)}
                          className="h-7 text-xs"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Template Picker */}
                  {showTemplatePicker && !isEditing && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-muted/50 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-foreground">
                          Select Template
                        </label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowTemplatePicker(false)}
                          className="h-6 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {templates.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-2">No templates available</p>
                        ) : (
                          templates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleTemplateSelect(template)}
                              className="w-full text-left p-2 text-xs rounded hover:bg-accent transition-colors"
                            >
                              <div className="font-medium">{template.name}</div>
                              <div className="text-muted-foreground truncate">{template.body.substring(0, 50)}...</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-4">
                      {/* Message Sequence Display */}
                      {generatedMessages.length > 1 && (
                        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                            <MessageSquare className="h-3 w-3" />
                            <span className="font-medium">
                              {generatedMessages.length} messages queued for natural conversation flow
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {isEditing ? (
                        <div className="space-y-3">
                          {editedMessages.length > 1 ? (
                            // Edit sequence mode
                            <div className="space-y-3">
                              {editedMessages.map((msg, idx) => (
                                <div key={idx} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Message {idx + 1}
                                      {messageSequence[idx] && messageSequence[idx].delay_seconds > 0 && (
                                        <span className="ml-2 text-[10px]">
                                          (sends after {messageSequence[idx].delay_seconds}s delay)
                                        </span>
                                      )}
                                    </span>
                                    {editedMessages.length > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 ml-auto"
                                        onClick={() => {
                                          const newMessages = editedMessages.filter((_, i) => i !== idx)
                                          setEditedMessages(newMessages)
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <textarea
                                    value={msg}
                                    onChange={(e) => {
                                      const newMessages = [...editedMessages]
                                      newMessages[idx] = e.target.value
                                      setEditedMessages(newMessages)
                                    }}
                                    className="w-full min-h-[80px] p-3 text-sm rounded-lg border-2 border-primary/30 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                                    placeholder={`Message ${idx + 1}...`}
                                  />
                                </div>
                              ))}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditedMessages([...editedMessages, ""])}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Message
                              </Button>
                            </div>
                          ) : (
                            // Single message edit mode
                            <textarea
                              value={editedMessage}
                              onChange={(e) => setEditedMessage(e.target.value)}
                              className="w-full min-h-[140px] p-4 text-sm rounded-xl border-2 border-primary/30 bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                              placeholder="Edit the message..."
                            />
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdits}
                              disabled={actionLoading !== null || !currentApprovalId}
                            >
                              {actionLoading === "save" ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-1" />
                              )}
                              Save Changes
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditedMessage(generatedMessage)
                                setEditedMessages(generatedMessages)
                                setIsEditing(false)
                              }}
                              disabled={actionLoading !== null}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="space-y-3">
                          {messageChannel === "email" ? (
                            // Email preview layout
                            <div className="border-2 border-primary/20 rounded-xl overflow-hidden shadow-sm">
                              {emailSubject && (
                                <div className="bg-muted/40 px-5 py-3 border-b border-primary/10">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <Mail className="h-3 w-3" />
                                    <span>Email Preview</span>
                                  </div>
                                  <p className="text-sm font-medium text-foreground">
                                    Subject: {emailSubject}
                                  </p>
                                </div>
                              )}
                              <div className="px-5 py-4 bg-white">
                                {(editedMessage || generatedMessage).split("\n\n").map((paragraph: string, idx: number) => (
                                  <p key={idx} className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">
                                    {paragraph.split("\n").map((line: string, lineIdx: number) => (
                                      <span key={lineIdx}>
                                        {line}
                                        {lineIdx < paragraph.split("\n").length - 1 && <br />}
                                      </span>
                                    ))}
                                  </p>
                                ))}
                              </div>
                              {editedMessage !== generatedMessage && (
                                <div className="px-5 py-2 border-t border-primary/10 bg-muted/20">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Edit2 className="h-3 w-3" />
                                    <span className="italic">Email has been edited</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : editedMessages.length > 1 ? (
                            // SMS sequence display (unchanged)
                            editedMessages.map((msg: string, idx: number) => (
                              <div
                                key={idx}
                                className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 rounded-xl p-4 shadow-sm relative"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-semibold text-primary/70">
                                    Message {idx + 1}
                                  </span>
                                  {messageSequence[idx] && messageSequence[idx].delay_seconds > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      • Sends after {messageSequence[idx].delay_seconds}s
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {msg}
                                </p>
                              </div>
                            ))
                          ) : (
                            // Single SMS message display (unchanged)
                            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 rounded-xl p-5 shadow-sm">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {editedMessage !== generatedMessage ? editedMessage : generatedMessage}
                              </p>
                              {editedMessage !== generatedMessage && (
                                <div className="mt-3 pt-3 border-t border-primary/10">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Edit2 className="h-3 w-3" />
                                    <span className="italic">Message has been edited</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Channel Selection */}
                      {!isEditing && (
                        <div className="p-3 bg-muted/30 rounded-lg border border-muted/50">
                          <label className="text-xs font-medium text-foreground mb-2 block">
                            Send via
                          </label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={messageChannel === "sms" ? "default" : "outline"}
                              onClick={() => setMessageChannel("sms")}
                              disabled={actionLoading !== null}
                              className="flex-1"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              SMS
                            </Button>
                            <Button
                              size="sm"
                              variant={messageChannel === "email" ? "default" : "outline"}
                              onClick={() => setMessageChannel("email")}
                              disabled={actionLoading !== null}
                              className="flex-1"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                            <Button
                              size="sm"
                              variant={messageChannel === "both" ? "default" : "outline"}
                              onClick={() => setMessageChannel("both")}
                              disabled={actionLoading !== null}
                              className="flex-1"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Both
                            </Button>
                          </div>
                          {(messageChannel === "email" || messageChannel === "both") && (
                            <div className="mt-2">
                              <Input
                                type="text"
                                placeholder="Email subject..."
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Action Buttons - Primary Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-2 pt-2 border-t border-muted/50">
                          <Button 
                            size="sm" 
                            onClick={handleSend}
                            disabled={actionLoading !== null || !currentApprovalId}
                            className="flex-1"
                          >
                            {actionLoading === "send" ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            {scheduleEnabled ? "Schedule Send" : "Send Now"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleApprove}
                            disabled={actionLoading !== null || !currentApprovalId}
                          >
                            {actionLoading === "approve" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleReject}
                            disabled={actionLoading !== null || !currentApprovalId}
                          >
                            {actionLoading === "reject" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                      
                      {/* Secondary Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => setScheduleEnabled(!scheduleEnabled)}
                            disabled={actionLoading !== null}
                            className={scheduleEnabled ? "bg-primary/10 border-primary/30" : ""}
                          >
                            <Calendar className="h-4 w-4 mr-1.5" />
                            {scheduleEnabled ? "Scheduling" : "Schedule"}
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => setShowFeedback(!showFeedback)}
                            disabled={actionLoading !== null}
                            className={showFeedback ? "bg-primary/10 border-primary/30" : ""}
                          >
                            <MessageCircle className="h-4 w-4 mr-1.5" />
                            {showFeedback ? "Hide Feedback" : "Give Feedback"}
                          </Button>
                        </div>
                      )}
                      
                      {/* Schedule Panel */}
                      {scheduleEnabled && !isEditing && (
                        <div className="p-4 bg-muted/40 rounded-xl border border-muted/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">
                              Schedule message for later
                            </label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setScheduleEnabled(false)
                                setScheduledDateTime("")
                              }}
                              disabled={actionLoading !== null}
                              className="h-6 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="datetime-local"
                              value={scheduledDateTime}
                              onChange={(e) => setScheduledDateTime(e.target.value)}
                              min={new Date().toISOString().slice(0, 16)}
                              className="flex-1"
                            />
                          </div>
                          {scheduledDateTime && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded">
                              <Clock className="h-3 w-3" />
                              <span>Will send on {new Date(scheduledDateTime).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Feedback Panel */}
                      {showFeedback && !isEditing && (
                        <div className="p-4 bg-muted/40 rounded-xl border border-muted/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">
                              Provide feedback to regenerate message
                            </label>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setFeedback("")
                                setShowFeedback(false)
                              }}
                              disabled={actionLoading !== null}
                              className="h-6 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="E.g., 'Make it more casual', 'Add pricing details', 'Too formal'..."
                            className="w-full min-h-[100px] p-3 text-sm rounded-lg border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <Button
                            size="sm"
                            onClick={handleSubmitFeedback}
                            disabled={actionLoading !== null || !feedback.trim() || !currentApprovalId}
                            className="w-full"
                          >
                            {actionLoading === "feedback" ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Regenerate Message
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!generatedMessage && (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="text-center max-w-md">
                    {loading ? (
                      <>
                        <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                        <h3 className="font-semibold text-base mb-2">Generating message...</h3>
                        <p className="text-sm text-muted-foreground">
                          AI is analyzing the conversation and creating a personalized reactivation message
                        </p>
                      </>
                    ) : conversation.length === 0 ? (
                      <>
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-base mb-2">No conversation history</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Click on a deal to generate a reactivation message
                        </p>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-12 w-12 text-primary/60 mx-auto mb-4" />
                        <h3 className="font-semibold text-base mb-2">Ready to generate message</h3>
                        <p className="text-sm text-muted-foreground">
                          Review the conversation history above, then click "Generate Message" to create a personalized reactivation message
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area - Regenerate */}
            {generatedMessage && (
              <div className="border-t p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateMessage(selectedDeal)}
                    disabled={loading || isEditing}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Message
                      </>
                    )}
                  </Button>
                  {!isEditing && (
                    <div className="text-xs text-muted-foreground px-3">
                      Need a different tone or approach? Regenerate to get a new message.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Select a deal to get started</h3>
              <p className="text-sm text-muted-foreground">
                Choose a stalled deal from the sidebar to generate a personalized reactivation message
              </p>
            </div>
          </div>
        )}

        {/* Template Library Section - Always visible at bottom */}
        <div className="border-t p-6 bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base mb-1">Template Library</h3>
              <p className="text-sm text-muted-foreground">
                Browse and use pre-built message templates
              </p>
            </div>
            <Link href="/templates">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          {templates.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">No templates available</p>
              <Link href="/templates">
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
              {templates.slice(0, 6).map((template) => (
                <Card
                  key={template.id}
                  className="p-3 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => {
                    if (selectedDeal) {
                      handleTemplateSelect(template)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{template.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {template.description || template.body.substring(0, 60)}...
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize flex-shrink-0">
                      {template.type}
                    </Badge>
                  </div>
                  {template.category && (
                    <div className="mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {template.category}
                      </span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
