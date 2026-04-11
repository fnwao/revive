"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Save, Eye, EyeOff, Copy, Check, CheckCircle2, Loader2, ExternalLink, Trash2, CreditCard, Search, Info, AlertCircle, HelpCircle, Settings2, User, Key, Bell, Zap, Building2, Shield, Webhook as WebhookIcon, Users, Plus, X, Tag, Filter, Sparkles, Clock, Target, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { hasApiKey, getSettings, updateSettings, getWebhooks, createWebhook, updateWebhook, deleteWebhook, getTeams, getTeamMembers, addTeamMember, type Webhook, type Team, type TeamMember } from "@/lib/api"
import { getUser, updateUser, saveUser } from "@/lib/user"
import { getSubscription, formatPrice, getPlanPrice, getPlanLimits } from "@/lib/subscription"
import { showToast } from "@/lib/toast"

interface ReactivationRule {
  id: string
  name: string
  enabled: boolean
  statuses: string[]
  tags: string[]
  thresholdDays: number
  priority: number
}

interface SettingsData {
  email: string
  name: string
  apiKey: string
  apiUrl: string
  ghlConnected: boolean
  ghlLocationId: string
  ghlApiKey: string
  autoDetectStalled: boolean
  stalledThresholdDays: number
  requireApproval: boolean
  autoApprove: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  notifyOnStalled: boolean
  notifyOnResponse: boolean
  reactivationRules: ReactivationRule[]
}

const defaultSettings: SettingsData = {
  email: "user@example.com",
  name: "John Doe",
  apiKey: "",
  apiUrl: "http://localhost:8000",
  ghlConnected: false,
  ghlLocationId: "",
  ghlApiKey: "",
  autoDetectStalled: true,
  stalledThresholdDays: 7,
  requireApproval: true,
  autoApprove: false,
  emailNotifications: true,
  smsNotifications: false,
  notifyOnStalled: true,
  notifyOnResponse: true,
  reactivationRules: [
    {
      id: "default-rule",
      name: "Default Rule",
      enabled: true,
      statuses: ["active"],
      tags: [],
      thresholdDays: 7,
      priority: 1,
    },
  ],
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showGhlApiKey, setShowGhlApiKey] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [savedSection, setSavedSection] = useState<string | null>(null)
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [subscription, setSubscription] = useState<ReturnType<typeof getSubscription> | null>(null)
  const [apiKeyStatus, setApiKeyStatus] = useState<"none" | "saved" | "testing" | "connected" | "error">("none")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["account", "api"]))
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({})
  const [editingRule, setEditingRule] = useState<ReactivationRule | null>(null)
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [newTag, setNewTag] = useState("")
  const settingsRef = useRef(settings)
  
  // Common statuses and tags for presets
  const commonStatuses = ["New Lead", "Open", "Working", "Hot Lead", "Follow Up", "Closed", "Won", "Lost"]
  const commonTags = ["High Value", "Engaged", "Cold", "Nurture", "VIP", "Enterprise", "Follow Up", "Qualified"]
  
  // Keep ref in sync with state
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  // Load settings from backend/localStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load API key and URL first (these are always local)
      const savedApiKey = localStorage.getItem("api_key")
      if (savedApiKey) {
        setSettings(prev => ({ ...prev, apiKey: savedApiKey }))
        setApiKeyStatus("saved")
      }

      const savedApiUrl = localStorage.getItem("revive_settings")
      if (savedApiUrl) {
        try {
          const parsed = JSON.parse(savedApiUrl)
          if (parsed.apiUrl) {
            setSettings(prev => ({ ...prev, apiUrl: parsed.apiUrl }))
          }
        } catch {}
      }

      // Load user info
      const user = getUser()
      if (user) {
        setSettings(prev => ({ ...prev, name: user.name, email: user.email }))
      }

      // Load webhooks and teams
      if (hasApiKey()) {
        try {
          const webhooksData = await getWebhooks()
          setWebhooks(webhooksData.webhooks || [])
          
          const teamsData = await getTeams()
          setTeams(teamsData.teams || [])
          
          // Load members for each team
          for (const team of teamsData.teams || []) {
            try {
              const members = await getTeamMembers(team.id)
              setTeamMembers(prev => ({ ...prev, [team.id]: members }))
            } catch (err) {
              console.error(`Error loading members for team ${team.id}:`, err)
            }
          }
        } catch (error) {
          console.error("Error loading webhooks/teams:", error)
        }
      }

      // Load settings from backend if API key is available, otherwise use localStorage
      try {
        const backendSettings = await getSettings()
        setSettings(prev => ({
          ...prev,
          autoDetectStalled: backendSettings.auto_detect_stalled,
          stalledThresholdDays: backendSettings.stalled_threshold_days,
          requireApproval: backendSettings.require_approval,
          autoApprove: backendSettings.auto_approve,
          emailNotifications: backendSettings.email_notifications,
          smsNotifications: backendSettings.sms_notifications,
          notifyOnStalled: backendSettings.notify_on_stalled,
          notifyOnResponse: backendSettings.notify_on_response,
          reactivationRules: backendSettings.reactivation_rules || defaultSettings.reactivationRules,
          ghlConnected: backendSettings.ghl_connected,
          ghlLocationId: backendSettings.ghl_location_id || "",
          ghlApiKey: backendSettings.ghl_api_key || "",
        }))
      } catch (error: any) {
        // getSettings() should never throw now, but just in case, fallback to localStorage
        const saved = localStorage.getItem("revive_settings")
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setSettings(prev => ({ ...prev, ...parsed }))
          } catch {}
        }
      }
    }

    loadSettings()
  }, [])

  // Listen for subscription updates
  useEffect(() => {
    const handleUpdate = () => setSubscription(getSubscription())
    window.addEventListener("subscriptionUpdated", handleUpdate)
    return () => window.removeEventListener("subscriptionUpdated", handleUpdate)
  }, [])

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSavedSection(null)
  }

  const saveSection = async (section: string) => {
    // Get latest settings from ref (always current)
    const currentSettings = { ...settingsRef.current }
    
    // Set loading immediately
    setLoadingSection(section)
    setSavedSection(null)
    setErrors({})

    try {
      // Validate if needed
      if (section === "account") {
        const email = currentSettings.email?.trim()
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setErrors({ email: "Please enter a valid email address" })
          setLoadingSection(null)
          return
        }
      }

      if (section === "revival") {
        const threshold = Number(currentSettings.stalledThresholdDays)
        if (isNaN(threshold) || threshold < 1 || threshold > 90) {
          setErrors({ stalledThresholdDays: "Threshold must be between 1 and 90 days" })
          setLoadingSection(null)
          return
        }
      }

      // Section-specific saves
      if (section === "api") {
        // API key and URL are stored locally only
        const apiKey = currentSettings.apiKey?.trim() || ""
        if (apiKey) {
          localStorage.setItem("api_key", apiKey)
          setApiKeyStatus("saved")
        } else {
          localStorage.removeItem("api_key")
          setApiKeyStatus("none")
        }
        
        // Save API URL to localStorage
        const saved = localStorage.getItem("revive_settings")
        const parsed = saved ? JSON.parse(saved) : {}
        parsed.apiUrl = currentSettings.apiUrl
        localStorage.setItem("revive_settings", JSON.stringify(parsed))
      } else if (section === "account") {
        // Account info is stored locally (no backend endpoint yet)
        const user = getUser()
        if (user) {
          updateUser({ name: currentSettings.name.trim(), email: currentSettings.email.trim() })
        } else {
          saveUser({
            id: `user-${Date.now()}`,
            name: currentSettings.name.trim(),
            email: currentSettings.email.trim(),
            createdAt: new Date().toISOString(),
          })
        }
        window.dispatchEvent(new Event("userUpdated"))
      } else if (section === "revival" || section === "notifications" || section === "ghl") {
        // These sections should be saved to backend if API key is available
        if (hasApiKey()) {
          try {
            // Map frontend format to backend format
            const backendUpdate: any = {}
            
            if (section === "revival") {
              backendUpdate.auto_detect_stalled = currentSettings.autoDetectStalled
              backendUpdate.stalled_threshold_days = currentSettings.stalledThresholdDays
              backendUpdate.require_approval = currentSettings.requireApproval
              backendUpdate.auto_approve = currentSettings.autoApprove
            } else if (section === "notifications") {
              backendUpdate.email_notifications = currentSettings.emailNotifications
              backendUpdate.sms_notifications = currentSettings.smsNotifications
              backendUpdate.notify_on_stalled = currentSettings.notifyOnStalled
              backendUpdate.notify_on_response = currentSettings.notifyOnResponse
            } else if (section === "ghl") {
              backendUpdate.ghl_connected = currentSettings.ghlConnected
              backendUpdate.ghl_api_key = currentSettings.ghlApiKey || null
              backendUpdate.ghl_location_id = currentSettings.ghlLocationId || null
            }
            
            const updated = await updateSettings(backendUpdate)
            
            // Update local state with backend response
            setSettings(prev => ({
              ...prev,
              autoDetectStalled: updated.auto_detect_stalled,
              stalledThresholdDays: updated.stalled_threshold_days,
              requireApproval: updated.require_approval,
              autoApprove: updated.auto_approve,
              emailNotifications: updated.email_notifications,
              smsNotifications: updated.sms_notifications,
              notifyOnStalled: updated.notify_on_stalled,
              notifyOnResponse: updated.notify_on_response,
              ghlConnected: updated.ghl_connected,
              ghlLocationId: updated.ghl_location_id || "",
              ghlApiKey: updated.ghl_api_key || "",
            }))
          } catch (error: any) {
            console.error("Failed to save to backend:", error)
            setErrors({ _general: error.message || "Failed to save to backend. Please try again." })
            setLoadingSection(null)
            return
          }
        } else {
          // No API key, save to localStorage as fallback
          const saved = localStorage.getItem("revive_settings")
          const parsed = saved ? JSON.parse(saved) : {}
          
          if (section === "revival") {
            parsed.autoDetectStalled = currentSettings.autoDetectStalled
            parsed.stalledThresholdDays = currentSettings.stalledThresholdDays
            parsed.requireApproval = currentSettings.requireApproval
            parsed.autoApprove = currentSettings.autoApprove
          } else if (section === "notifications") {
            parsed.emailNotifications = currentSettings.emailNotifications
            parsed.smsNotifications = currentSettings.smsNotifications
            parsed.notifyOnStalled = currentSettings.notifyOnStalled
            parsed.notifyOnResponse = currentSettings.notifyOnResponse
          } else if (section === "ghl") {
            parsed.ghlConnected = currentSettings.ghlConnected
            parsed.ghlApiKey = currentSettings.ghlApiKey
            parsed.ghlLocationId = currentSettings.ghlLocationId
          }
          
          localStorage.setItem("revive_settings", JSON.stringify(parsed))
        }
      }

      // Success
      setLoadingSection(null)
      setSavedSection(section)
      
      const sectionNames: Record<string, string> = {
        account: "Account",
        api: "API Configuration",
        revival: "Revival Settings",
        notifications: "Notification Settings",
        ghl: "GoHighLevel Integration",
      }
      
      showToast.saved(sectionNames[section] || "Settings")
      
      // Clear saved state after 3 seconds
      setTimeout(() => setSavedSection(null), 3000)
    } catch (error: any) {
      console.error("❌ Save error:", error)
      setLoadingSection(null)
      setErrors({ _general: error.message || "Failed to save. Please try again." })
      showToast.error("Failed to save", error.message || "An error occurred while saving settings.")
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleConnectGHL = async () => {
    const locationId = settings.ghlLocationId?.trim() || ""
    if (locationId && !/^[a-zA-Z0-9]+$/.test(locationId)) {
      setErrors({ ghlLocationId: "Location ID must contain only letters and numbers" })
      return
    }
    if (locationId && locationId.length < 10) {
      setErrors({ ghlLocationId: "Location ID must be at least 10 characters" })
      return
    }

    setLoadingSection("ghl")
    setErrors({})

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateSetting("ghlConnected", true)
      await saveSection("ghl")
    } catch (error) {
      setErrors({ _general: "Failed to connect to GoHighLevel." })
      setLoadingSection(null)
    }
  }

  const handleDisconnectGHL = async () => {
    updateSetting("ghlConnected", false)
    updateSetting("ghlApiKey", "")
    updateSetting("ghlLocationId", "")
    await saveSection("ghl")
  }

  const handleTestConnection = async () => {
    const apiKey = localStorage.getItem("api_key")
    const apiUrl = settings.apiUrl || "http://localhost:8000"

    if (!apiKey) {
      setConnectionError("No API key found. Please save your API key first.")
      setApiKeyStatus("error")
      return
    }

    setApiKeyStatus("testing")
    setConnectionError(null)

    try {
      const response = await fetch(`${apiUrl}/api/v1/dashboard/stats`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        setApiKeyStatus("connected")
        showToast.success("Connection successful!", "Your API key is working correctly.")
      } else if (response.status === 401) {
        setApiKeyStatus("error")
        setConnectionError("Invalid API key. Please check your key and try again.")
      } else {
        setApiKeyStatus("error")
        setConnectionError(`Connection failed: ${response.status} ${response.statusText}`)
      }
    } catch (error: any) {
      setApiKeyStatus("error")
      setConnectionError(`Cannot connect to backend. Is it running at ${apiUrl}?`)
    }
  }

  const limits = subscription ? getPlanLimits(subscription.plan) : getPlanLimits("pro")

  // Filter settings based on search
  const sections = [
    { id: "account", title: "Account", icon: User, description: "Update your account information", keywords: ["account", "email", "name", "profile"] },
    { id: "ghl", title: "GoHighLevel", icon: Building2, description: "Connect your GoHighLevel account", keywords: ["ghl", "gohighlevel", "integration", "connect"] },
    { id: "revival", title: "Revival Settings", icon: Zap, description: "Configure how Revive.ai detects and handles stalled deals", keywords: ["revival", "stalled", "deals", "detect", "threshold", "approval"] },
    { id: "notifications", title: "Notifications", icon: Bell, description: "Configure how you receive notifications", keywords: ["notification", "email", "sms", "alert", "notify"] },
  ]

  const filteredSections = searchQuery
    ? sections.filter(section =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : sections

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] bg-white px-4 sm:px-6 py-5 sm:py-6 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-[#4F8CFF]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">Settings</h1>
                <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Manage your account settings and preferences</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            type="text"
            placeholder="Search settings... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {filteredSections.length === 0 ? (
            <Card className="p-12 text-center bg-white border-[#E5E7EB]">
              <Search className="mx-auto h-12 w-12 text-[#6B7280] mb-4" />
              <p className="text-sm font-medium mb-1 text-[#111827]">No settings found</p>
              <p className="text-xs text-[#6B7280] mb-4">
                Try adjusting your search query
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            </Card>
          ) : (
            <>
          {/* Account Settings */}
          {filteredSections.some(s => s.id === "account") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
            expandedSections.has("account") ? "border-[#4F8CFF]/40 shadow-md" : ""
          )}>
            <button
              onClick={() => toggleSection("account")}
              className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">Account</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Update your account information</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "account" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#3CCB7F]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                    <span className="text-xs font-medium text-[#3CCB7F] hidden sm:inline">Saved</span>
                  </div>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-[#6B7280] transition-transform",
                  expandedSections.has("account") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("account") && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 sm:space-y-6 border-t border-[#E5E7EB] pt-5 sm:pt-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#111827]">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSetting("email", e.target.value)}
                    className={cn(
                      "h-10",
                      errors.email ? "border-[#E06C75] focus:border-[#E06C75] focus:ring-[#E06C75]/20" : ""
                    )}
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <div className="flex items-center gap-1.5 text-xs text-[#E06C75]">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-[#111827]">Full Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateSetting("name", e.target.value)}
                    className="h-10"
                    placeholder="John Doe"
                  />
                </div>
                <div className="pt-2">
                  <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  saveSection("account").catch((err) => {
                    console.error("Error saving account:", err)
                  })
                }}
                disabled={loadingSection === "account"}
                type="button"
                    className={cn(
                      "w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold h-11 px-6 bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] text-white hover:from-[#6EA0FF] hover:to-[#4F8CFF] transition-all duration-200 shadow-sm hover:shadow-md",
                      savedSection === "account" && "!bg-gradient-to-r !from-[#3CCB7F] !to-[#3CCB7F] hover:!from-[#3CCB7F] hover:!to-[#3CCB7F]",
                      loadingSection === "account" && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {loadingSection === "account" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : savedSection === "account" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Saved Successfully
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </Card>
          )}

          {/* API Configuration */}
          {filteredSections.some(s => s.id === "api") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
            expandedSections.has("api") ? "border-[#4F8CFF]/40 shadow-md" : "",
            apiKeyStatus === "connected" && "border-[#3CCB7F]/40"
          )}>
            <button
              onClick={() => toggleSection("api")}
              className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  apiKeyStatus === "connected" ? "bg-gradient-to-br from-[#3CCB7F]/10 to-[#3CCB7F]/5" : "bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5"
                )}>
                  <Key className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    apiKeyStatus === "connected" ? "text-[#3CCB7F]" : "text-[#4F8CFF]"
                  )} />
                </div>
                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">API Configuration</CardTitle>
                    {apiKeyStatus === "connected" && (
                      <span className="px-2 py-0.5 rounded-full bg-[#3CCB7F]/10 text-[10px] font-medium text-[#3CCB7F] border border-[#3CCB7F]/20">
                        ✓ Connected
                      </span>
                    )}
                    {apiKeyStatus === "saved" && (
                      <span className="px-2 py-0.5 rounded-full bg-[#6B7280]/10 text-[10px] font-medium text-[#6B7280] border border-[#6B7280]/20">
                        Saved
                      </span>
                    )}
                    {apiKeyStatus === "error" && (
                      <span className="px-2 py-0.5 rounded-full bg-[#E06C75]/10 text-[10px] font-medium text-[#E06C75] border border-[#E06C75]/20">
                        Error
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs sm:text-sm text-[#6B7280]">Configure your backend API connection</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "api" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#3CCB7F]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                    <span className="text-xs font-medium text-[#3CCB7F] hidden sm:inline">Saved</span>
                  </div>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-[#6B7280] transition-transform",
                  expandedSections.has("api") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("api") && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 sm:space-y-6 border-t border-[#E5E7EB] pt-5 sm:pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="api-url" className="text-sm font-medium text-[#111827]">API URL</Label>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-[#6B7280] cursor-help hover:text-[#4F8CFF] transition-colors" />
                      <div className="absolute left-0 top-6 w-64 p-3 bg-[#111827] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                        The URL where your backend API is running. Default is http://localhost:8000
                      </div>
                    </div>
                  </div>
                  <Input
                    id="api-url"
                    value={settings.apiUrl}
                    onChange={(e) => updateSetting("apiUrl", e.target.value)}
                    placeholder="http://localhost:8000"
                    className="h-10 font-mono text-sm"
                  />
                  <p className="text-xs text-[#6B7280]">Backend API endpoint URL</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-sm font-medium text-[#111827]">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showApiKey ? "text" : "password"}
                      value={settings.apiKey}
                      onChange={(e) => updateSetting("apiKey", e.target.value)}
                      placeholder="Enter your API key"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {settings.apiKey && (
                    <Button variant="outline" size="icon" onClick={() => handleCopy(settings.apiKey, "apiKey")}>
                      {copied === "apiKey" ? <Check className="h-4 w-4 text-[#3CCB7F]" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-[#6B7280]">
                    Get your API key by running this command in the backend directory:
                  </p>
                  <div className="flex items-start gap-2 p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                    <code className="text-xs text-[#111827] font-mono flex-1">
                      python scripts/create_user.py create --email your@email.com
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => handleCopy("python scripts/create_user.py create --email your@email.com", "command")}
                    >
                      {copied === "command" ? <Check className="h-3 w-3 text-[#3CCB7F]" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                {apiKeyStatus === "saved" && (
                  <div className="flex items-center gap-2 text-xs text-[#3CCB7F]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>API key saved to browser storage</span>
                  </div>
                )}
                {apiKeyStatus === "connected" && (
                  <div className="flex items-center gap-2 text-xs text-[#3CCB7F]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>✓ Connected to backend successfully</span>
                  </div>
                )}
                {apiKeyStatus === "error" && connectionError && (
                  <div className="flex items-center gap-2 text-xs text-[#E06C75]">
                    <span>⚠ {connectionError}</span>
                  </div>
                )}
              </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      saveSection("api")
                    }}
                    disabled={loadingSection === "api"}
                    type="button"
                    className={cn(
                      "w-full sm:flex-1 h-11 font-semibold",
                      savedSection === "api" 
                        ? "bg-gradient-to-r from-[#3CCB7F] to-[#3CCB7F] hover:from-[#3CCB7F] hover:to-[#3CCB7F] text-white shadow-sm hover:shadow-md" 
                        : "bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] text-white shadow-sm hover:shadow-md"
                    )}
                  >
                    {loadingSection === "api" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : savedSection === "api" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Saved Successfully
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save API Key
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={loadingSection === "api" || apiKeyStatus === "testing" || !hasApiKey()}
                    className="w-full sm:flex-1 h-11 border-2 hover:bg-[#F9FAFB]"
                  >
                    {apiKeyStatus === "testing" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
          )}

          {/* GoHighLevel Integration */}
          {filteredSections.some(s => s.id === "ghl") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
            expandedSections.has("ghl") ? "border-[#4F8CFF]/40 shadow-md" : "",
            settings.ghlConnected && "border-[#3CCB7F]/40"
          )}>
            <button
              onClick={() => toggleSection("ghl")}
              className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  settings.ghlConnected 
                    ? "bg-gradient-to-br from-[#3CCB7F]/10 to-[#3CCB7F]/5" 
                    : "bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5"
                )}>
                  <Building2 className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    settings.ghlConnected ? "text-[#3CCB7F]" : "text-[#4F8CFF]"
                  )} />
                </div>
                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">GoHighLevel Integration</CardTitle>
                    {settings.ghlConnected && (
                      <span className="px-2 py-0.5 rounded-full bg-[#3CCB7F]/10 text-[10px] font-medium text-[#3CCB7F] border border-[#3CCB7F]/20">
                        ✓ Connected
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs sm:text-sm text-[#6B7280]">Connect your GoHighLevel account</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "ghl" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#3CCB7F]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                    <span className="text-xs font-medium text-[#3CCB7F] hidden sm:inline">Saved</span>
                  </div>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-[#6B7280] transition-transform",
                  expandedSections.has("ghl") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("ghl") && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 sm:space-y-6 border-t border-[#E5E7EB] pt-5 sm:pt-6">
                {settings.ghlConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-[#111827]">Connected</p>
                      <p className="text-xs text-[#6B7280]">Your account is connected to GoHighLevel</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDisconnectGHL} disabled={loadingSection === "ghl"}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#111827]">Location ID</Label>
                    <Input value={settings.ghlLocationId} disabled className="bg-white" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ghl-api-key" className="text-[#111827]">API Key</Label>
                    <div className="relative">
                      <Input
                        id="ghl-api-key"
                        type={showGhlApiKey ? "text" : "password"}
                        value={settings.ghlApiKey}
                        onChange={(e) => updateSetting("ghlApiKey", e.target.value)}
                        placeholder="Enter your GoHighLevel API key"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowGhlApiKey(!showGhlApiKey)}
                      >
                        {showGhlApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ghl-location-id" className="text-[#111827]">Location ID</Label>
                    <Input
                      id="ghl-location-id"
                      value={settings.ghlLocationId}
                      onChange={(e) => updateSetting("ghlLocationId", e.target.value)}
                      placeholder="Enter your location ID"
                      className={errors.ghlLocationId ? "border-[#E06C75]" : ""}
                    />
                    {errors.ghlLocationId && <p className="text-xs text-[#E06C75]">{errors.ghlLocationId}</p>}
                  </div>
                  <Button
                    onClick={handleConnectGHL}
                    disabled={loadingSection === "ghl" || !settings.ghlApiKey.trim() || !settings.ghlLocationId.trim()}
                    className="w-full"
                    type="button"
                  >
                    {loadingSection === "ghl" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect GoHighLevel"
                    )}
                  </Button>
                </div>
              )}
              </div>
            )}
          </Card>
          )}

          {/* Revival Settings */}
          {filteredSections.some(s => s.id === "revival") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
            expandedSections.has("revival") ? "border-[#4F8CFF]/40 shadow-md" : ""
          )}>
            <button
              onClick={() => toggleSection("revival")}
              className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">Revival Settings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Configure how Revive.ai detects and handles stalled deals</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "revival" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#3CCB7F]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                    <span className="text-xs font-medium text-[#3CCB7F] hidden sm:inline">Saved</span>
                  </div>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-[#6B7280] transition-transform",
                  expandedSections.has("revival") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("revival") && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 sm:space-y-6 border-t border-[#E5E7EB] pt-5 sm:pt-6">
                <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#111827]">Auto-Detect Stalled Deals</Label>
                  <p className="text-sm text-[#6B7280]">Automatically scan for deals that need attention</p>
                </div>
                <Switch
                  checked={settings.autoDetectStalled}
                  onCheckedChange={(checked) => {
                    updateSetting("autoDetectStalled", checked)
                    setTimeout(() => saveSection("revival"), 50)
                  }}
                />
              </div>
              <Separator className="bg-[#2A2F3A]" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="threshold-days" className="text-[#111827]">Stalled Threshold (days)</Label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-[#6B7280] cursor-help" />
                    <div className="absolute left-0 top-6 w-64 p-2 bg-[#111827] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      Number of days without activity before a deal is considered stalled. Recommended: 7-14 days.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    id="threshold-days"
                    type="number"
                    min="1"
                    max="90"
                    value={settings.stalledThresholdDays}
                    onChange={(e) => updateSetting("stalledThresholdDays", parseInt(e.target.value) || 7)}
                    className={cn(
                      errors.stalledThresholdDays ? "border-[#E06C75]" : "",
                      "flex-1"
                    )}
                  />
                  <div className="text-xs text-[#6B7280] whitespace-nowrap">
                    {settings.stalledThresholdDays === 1 ? "day" : "days"}
                  </div>
                </div>
                {errors.stalledThresholdDays && (
                  <div className="flex items-center gap-1.5 text-xs text-[#E06C75]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{errors.stalledThresholdDays}</span>
                  </div>
                )}
              </div>
              <Separator className="bg-[#2A2F3A]" />
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#111827]">Require Approval</Label>
                  <p className="text-sm text-[#6B7280]">Review messages before sending</p>
                </div>
                <Switch
                  checked={settings.requireApproval}
                  onCheckedChange={(checked) => {
                    updateSetting("requireApproval", checked)
                    setTimeout(() => saveSection("revival"), 50)
                  }}
                />
              </div>
              <Separator className="bg-[#2A2F3A]" />
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#111827]">Auto-Approve</Label>
                  <p className="text-sm text-[#6B7280]">Automatically approve high-confidence messages</p>
                </div>
                <Switch
                  checked={settings.autoApprove}
                  onCheckedChange={(checked) => {
                    updateSetting("autoApprove", checked)
                    setTimeout(() => saveSection("revival"), 50)
                  }}
                  disabled={settings.requireApproval}
                />
              </div>
              
              <Separator className="bg-[#2A2F3A]" />
              
              {/* Reactivation Rules */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Filter className="h-5 w-5 text-[#4F8CFF]" />
                      <Label className="text-[#111827] font-semibold text-base">Reactivation Rules</Label>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-0.5">
                      Automatically reactivate deals based on status, tags, and inactivity thresholds
                    </p>
                  </div>
                  <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingRule(null)
                          setNewStatus("")
                          setNewTag("")
                          setShowRuleDialog(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                            <Filter className="h-5 w-5 text-[#4F8CFF]" />
                          </div>
                          <div>
                            <DialogTitle className="text-xl">{editingRule ? "Edit Reactivation Rule" : "Create Reactivation Rule"}</DialogTitle>
                            <DialogDescription className="mt-1">
                              Configure when deals matching specific criteria should be reactivated
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="space-y-6 mt-6">
                        {/* Rule Name */}
                        <div className="space-y-2">
                          <Label htmlFor="rule-name" className="text-sm font-semibold">Rule Name</Label>
                          <Input
                            id="rule-name"
                            placeholder="e.g., Closed deals without response"
                            value={editingRule?.name || ""}
                            onChange={(e) => setEditingRule(prev => prev ? { ...prev, name: e.target.value } : {
                              id: `rule-${Date.now()}`,
                              name: e.target.value,
                              enabled: true,
                              statuses: [],
                              tags: [],
                              thresholdDays: 7,
                              priority: settings.reactivationRules.length + 1,
                            })}
                            className="text-base"
                          />
                          <p className="text-xs text-[#6B7280]">Give this rule a descriptive name to identify it easily</p>
                        </div>
                        
                        <Separator />
                        
                        {/* Opportunity Statuses */}
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-semibold">Opportunity Statuses</Label>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              Select which deal statuses this rule applies to. Leave empty to match all statuses.
                            </p>
                          </div>
                          
                          {/* Preset Statuses */}
                          <div className="grid grid-cols-4 gap-2">
                            {commonStatuses.map((status) => {
                              const isSelected = editingRule?.statuses.includes(status)
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => {
                                    setEditingRule(prev => {
                                      const currentStatuses = prev?.statuses || []
                                      const newStatuses = isSelected
                                        ? currentStatuses.filter(s => s !== status)
                                        : [...currentStatuses, status]
                                      return prev ? { ...prev, statuses: newStatuses } : {
                                        id: `rule-${Date.now()}`,
                                        name: "",
                                        enabled: true,
                                        statuses: [status],
                                        tags: [],
                                        thresholdDays: 7,
                                        priority: settings.reactivationRules.length + 1,
                                      }
                                    })
                                  }}
                                  className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                    isSelected
                                      ? "bg-[#4F8CFF] text-white shadow-sm"
                                      : "bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB] border border-[#E5E7EB]"
                                  )}
                                >
                                  {status}
                                </button>
                              )
                            })}
                          </div>
                          
                          {/* Custom Status Input */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add custom status (e.g., 'On Hold')"
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newStatus.trim() && !editingRule?.statuses.includes(newStatus.trim())) {
                                  e.preventDefault()
                                  setEditingRule(prev => prev ? {
                                    ...prev,
                                    statuses: [...prev.statuses, newStatus.trim()]
                                  } : {
                                    id: `rule-${Date.now()}`,
                                    name: "",
                                    enabled: true,
                                    statuses: [newStatus.trim()],
                                    tags: [],
                                    thresholdDays: 7,
                                    priority: settings.reactivationRules.length + 1,
                                  })
                                  setNewStatus("")
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (newStatus.trim() && !editingRule?.statuses.includes(newStatus.trim())) {
                                  setEditingRule(prev => prev ? {
                                    ...prev,
                                    statuses: [...prev.statuses, newStatus.trim()]
                                  } : {
                                    id: `rule-${Date.now()}`,
                                    name: "",
                                    enabled: true,
                                    statuses: [newStatus.trim()],
                                    tags: [],
                                    thresholdDays: 7,
                                    priority: settings.reactivationRules.length + 1,
                                  })
                                  setNewStatus("")
                                }
                              }}
                              disabled={!newStatus.trim() || editingRule?.statuses.includes(newStatus.trim())}
                            >
                              Add
                            </Button>
                          </div>
                          
                          {/* Selected Statuses */}
                          {editingRule?.statuses && editingRule.statuses.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {editingRule.statuses.map((status, idx) => (
                                <Badge key={idx} variant="default" className="flex items-center gap-1.5 px-2.5 py-1 bg-[#4F8CFF] text-white">
                                  {status}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-white/80"
                                    onClick={() => setEditingRule(prev => prev ? {
                                      ...prev,
                                      statuses: prev.statuses.filter((_, i) => i !== idx)
                                    } : null)}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Separator />
                        
                        {/* Tags */}
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-semibold">Tags</Label>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              Select which tags deals must have. Leave empty to match all tags.
                            </p>
                          </div>
                          
                          {/* Preset Tags */}
                          <div className="grid grid-cols-4 gap-2">
                            {commonTags.map((tag) => {
                              const isSelected = editingRule?.tags.includes(tag)
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    setEditingRule(prev => {
                                      const currentTags = prev?.tags || []
                                      const newTags = isSelected
                                        ? currentTags.filter(t => t !== tag)
                                        : [...currentTags, tag]
                                      return prev ? { ...prev, tags: newTags } : {
                                        id: `rule-${Date.now()}`,
                                        name: "",
                                        enabled: true,
                                        statuses: [],
                                        tags: [tag],
                                        thresholdDays: 7,
                                        priority: settings.reactivationRules.length + 1,
                                      }
                                    })
                                  }}
                                  className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                    isSelected
                                      ? "bg-[#3CCB7F] text-white shadow-sm"
                                      : "bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB] border border-[#E5E7EB]"
                                  )}
                                >
                                  {tag}
                                </button>
                              )
                            })}
                          </div>
                          
                          {/* Custom Tag Input */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add custom tag (e.g., 'Enterprise')"
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newTag.trim() && !editingRule?.tags.includes(newTag.trim())) {
                                  e.preventDefault()
                                  setEditingRule(prev => prev ? {
                                    ...prev,
                                    tags: [...prev.tags, newTag.trim()]
                                  } : {
                                    id: `rule-${Date.now()}`,
                                    name: "",
                                    enabled: true,
                                    statuses: [],
                                    tags: [newTag.trim()],
                                    thresholdDays: 7,
                                    priority: settings.reactivationRules.length + 1,
                                  })
                                  setNewTag("")
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (newTag.trim() && !editingRule?.tags.includes(newTag.trim())) {
                                  setEditingRule(prev => prev ? {
                                    ...prev,
                                    tags: [...prev.tags, newTag.trim()]
                                  } : {
                                    id: `rule-${Date.now()}`,
                                    name: "",
                                    enabled: true,
                                    statuses: [],
                                    tags: [newTag.trim()],
                                    thresholdDays: 7,
                                    priority: settings.reactivationRules.length + 1,
                                  })
                                  setNewTag("")
                                }
                              }}
                              disabled={!newTag.trim() || editingRule?.tags.includes(newTag.trim())}
                            >
                              Add
                            </Button>
                          </div>
                          
                          {/* Selected Tags */}
                          {editingRule?.tags && editingRule.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {editingRule.tags.map((tag, idx) => (
                                <Badge key={idx} variant="default" className="flex items-center gap-1.5 px-2.5 py-1 bg-[#3CCB7F] text-white">
                                  {tag}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-white/80"
                                    onClick={() => setEditingRule(prev => prev ? {
                                      ...prev,
                                      tags: prev.tags.filter((_, i) => i !== idx)
                                    } : null)}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Separator />
                        
                        {/* Inactivity Threshold */}
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="rule-threshold" className="text-sm font-semibold">Inactivity Threshold</Label>
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              How many days of inactivity before reactivating?
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Input
                              id="rule-threshold"
                              type="number"
                              min="1"
                              max="90"
                              value={editingRule?.thresholdDays || 7}
                              onChange={(e) => setEditingRule(prev => prev ? {
                                ...prev,
                                thresholdDays: parseInt(e.target.value) || 7
                              } : {
                                id: `rule-${Date.now()}`,
                                name: "",
                                enabled: true,
                                statuses: [],
                                tags: [],
                                thresholdDays: parseInt(e.target.value) || 7,
                                priority: settings.reactivationRules.length + 1,
                              })}
                              className="w-32 text-base"
                            />
                            <span className="text-sm text-[#6B7280]">days</span>
                            <div className="flex-1 flex items-center gap-2 text-xs text-[#6B7280]">
                              <Clock className="h-4 w-4" />
                              <span>Deals inactive for this duration will be reactivated</span>
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        {/* Rule Preview */}
                        {editingRule && (
                          <div className="p-4 bg-gradient-to-br from-[#4F8CFF]/5 to-transparent rounded-lg border border-[#4F8CFF]/20">
                            <div className="flex items-start gap-3">
                              <Target className="h-5 w-5 text-[#4F8CFF] mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-[#111827] mb-2">Rule Preview</p>
                                <p className="text-sm text-[#6B7280] leading-relaxed">
                                  This rule will reactivate deals that{" "}
                                  {editingRule.statuses.length > 0 ? (
                                    <>have status <span className="font-medium text-[#111827]">{editingRule.statuses.join(" or ")}</span></>
                                  ) : (
                                    <>have <span className="font-medium text-[#111827]">any status</span></>
                                  )}
                                  {editingRule.tags.length > 0 && (
                                    <> and are tagged with <span className="font-medium text-[#111827]">{editingRule.tags.join(" or ")}</span></>
                                  )}
                                  {", "}
                                  and haven't had activity in <span className="font-medium text-[#111827]">{editingRule.thresholdDays} day{editingRule.thresholdDays !== 1 ? "s" : ""}</span>.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Enabled Toggle */}
                        <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                          <div>
                            <Label className="text-sm font-semibold">Enable Rule</Label>
                            <p className="text-xs text-[#6B7280] mt-0.5">Only enabled rules are used for reactivation</p>
                          </div>
                          <Switch
                            checked={editingRule?.enabled ?? true}
                            onCheckedChange={(checked) => setEditingRule(prev => prev ? {
                              ...prev,
                              enabled: checked
                            } : {
                              id: `rule-${Date.now()}`,
                              name: "",
                              enabled: checked,
                              statuses: [],
                              tags: [],
                              thresholdDays: 7,
                              priority: settings.reactivationRules.length + 1,
                            })}
                          />
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                          <Button
                            className="flex-1"
                            onClick={() => {
                              if (editingRule) {
                                const updatedRules = editingRule.id && settings.reactivationRules.find(r => r.id === editingRule.id)
                                  ? settings.reactivationRules.map(r => r.id === editingRule.id ? editingRule : r)
                                  : [...settings.reactivationRules, editingRule]
                                updateSetting("reactivationRules", updatedRules)
                                setShowRuleDialog(false)
                                setEditingRule(null)
                                setNewStatus("")
                                setNewTag("")
                                setTimeout(() => saveSection("revival"), 50)
                              }
                            }}
                            disabled={!editingRule?.name?.trim()}
                          >
                            {editingRule?.id && settings.reactivationRules.find(r => r.id === editingRule.id) ? "Update Rule" : "Create Rule"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowRuleDialog(false)
                              setEditingRule(null)
                              setNewStatus("")
                              setNewTag("")
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {settings.reactivationRules.length === 0 ? (
                  <Card className="p-8 border-2 border-dashed border-[#E5E7EB] bg-gradient-to-br from-[#F9FAFB] to-white">
                    <div className="text-center max-w-md mx-auto">
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center mx-auto mb-4">
                        <Filter className="h-8 w-8 text-[#4F8CFF]" />
                      </div>
                      <h3 className="text-base font-semibold text-[#111827] mb-2">No Reactivation Rules</h3>
                      <p className="text-sm text-[#6B7280] mb-6">
                        Create rules to automatically reactivate deals based on status, tags, and inactivity. 
                        For example, reactivate "Closed" deals that haven't responded in 7 days.
                      </p>
                      <Button
                        onClick={() => {
                          setEditingRule(null)
                          setNewStatus("")
                          setNewTag("")
                          setShowRuleDialog(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Rule
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {settings.reactivationRules
                      .sort((a, b) => {
                        // Sort enabled rules first, then by priority
                        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
                        return a.priority - b.priority
                      })
                      .map((rule, index) => {
                        const isFirstEnabled = index === 0 && rule.enabled
                        return (
                          <Card 
                            key={rule.id} 
                            className={cn(
                              "p-5 transition-all hover:shadow-md",
                              !rule.enabled && "opacity-60 bg-[#F9FAFB]",
                              isFirstEnabled && "border-2 border-[#4F8CFF]/30 bg-gradient-to-br from-[#4F8CFF]/5 to-white"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-base text-[#111827]">{rule.name}</h4>
                                  {isFirstEnabled && (
                                    <Badge className="bg-[#4F8CFF] text-white text-xs">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Active
                                    </Badge>
                                  )}
                                  {!rule.enabled && (
                                    <Badge variant="outline" className="text-xs">Disabled</Badge>
                                  )}
                                </div>
                                
                                {/* Rule Summary */}
                                <div className="space-y-2 mb-3">
                                  <div className="flex items-start gap-2 text-sm">
                                    <Target className="h-4 w-4 text-[#6B7280] mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <span className="text-[#6B7280]">When deals have status </span>
                                      {rule.statuses.length > 0 ? (
                                        <span className="font-medium text-[#111827]">{rule.statuses.join(", ")}</span>
                                      ) : (
                                        <span className="font-medium text-[#111827]">any status</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {rule.tags.length > 0 && (
                                    <div className="flex items-start gap-2 text-sm">
                                      <Tag className="h-4 w-4 text-[#6B7280] mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <span className="text-[#6B7280]">and are tagged with </span>
                                        <span className="font-medium text-[#111827]">{rule.tags.join(", ")}</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-start gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-[#6B7280] mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <span className="text-[#6B7280]">and inactive for </span>
                                      <span className="font-medium text-[#111827]">{rule.thresholdDays} day{rule.thresholdDays !== 1 ? "s" : ""}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Status and Tag Badges */}
                                <div className="flex flex-wrap gap-2">
                                  {rule.statuses.slice(0, 3).map((status, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                      {status}
                                    </Badge>
                                  ))}
                                  {rule.statuses.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{rule.statuses.length - 3} more
                                    </Badge>
                                  )}
                                  {rule.tags.slice(0, 3).map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {rule.tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{rule.tags.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Switch
                                  checked={rule.enabled}
                                  onCheckedChange={(checked) => {
                                    const updatedRules = settings.reactivationRules.map(r =>
                                      r.id === rule.id ? { ...r, enabled: checked } : r
                                    )
                                    updateSetting("reactivationRules", updatedRules)
                                    setTimeout(() => saveSection("revival"), 50)
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingRule(rule)
                                    setNewStatus("")
                                    setNewTag("")
                                    setShowRuleDialog(true)
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${rule.name}"?`)) {
                                      const updatedRules = settings.reactivationRules.filter(r => r.id !== rule.id)
                                      updateSetting("reactivationRules", updatedRules)
                                      setTimeout(() => saveSection("revival"), 50)
                                    }
                                  }}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    saveSection("revival")
                  }}
                  disabled={loadingSection === "revival"}
                  type="button"
                  className={cn(
                    "w-full h-11 font-semibold",
                    savedSection === "revival" 
                      ? "bg-gradient-to-r from-[#3CCB7F] to-[#3CCB7F] hover:from-[#3CCB7F] hover:to-[#3CCB7F] text-white shadow-sm hover:shadow-md" 
                      : "bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] text-white shadow-sm hover:shadow-md"
                  )}
                >
                  {loadingSection === "revival" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : savedSection === "revival" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Saved Successfully
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Revival Settings
                    </>
                  )}
                </Button>
              </div>
              </div>
            )}
          </Card>
          )}

          {/* Notifications */}
          {filteredSections.some(s => s.id === "notifications") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
            expandedSections.has("notifications") ? "border-[#4F8CFF]/40 shadow-md" : ""
          )}>
            <button
              onClick={() => toggleSection("notifications")}
              className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">Notifications</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Configure how you receive notifications</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "notifications" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#3CCB7F]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                    <span className="text-xs font-medium text-[#3CCB7F] hidden sm:inline">Saved</span>
                  </div>
                )}
                <ChevronRight className={cn(
                  "h-5 w-5 text-[#6B7280] transition-transform",
                  expandedSections.has("notifications") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("notifications") && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5 sm:space-y-6 border-t border-[#E5E7EB] pt-5 sm:pt-6">
                <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#111827]">Email Notifications</Label>
                  <p className="text-sm text-[#6B7280]">Receive notifications via email</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => {
                    updateSetting("emailNotifications", checked)
                    setTimeout(() => saveSection("notifications"), 50)
                  }}
                />
              </div>
              <Separator className="bg-[#2A2F3A]" />
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#111827]">SMS Notifications</Label>
                  <p className="text-sm text-[#6B7280]">Receive notifications via SMS</p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => {
                    updateSetting("smsNotifications", checked)
                    setTimeout(() => saveSection("notifications"), 50)
                  }}
                />
              </div>
              <Separator className="bg-[#2A2F3A]" />
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#111827]">Notify on Stalled Deals</Label>
                  <p className="text-sm text-[#6B7280]">Get notified when deals are detected as stalled</p>
                </div>
                <Switch
                  checked={settings.notifyOnStalled}
                  onCheckedChange={(checked) => {
                    updateSetting("notifyOnStalled", checked)
                    setTimeout(() => saveSection("notifications"), 50)
                  }}
                />
              </div>
              <Separator className="bg-[#2A2F3A]" />
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#111827]">Notify on Response</Label>
                  <p className="text-sm text-[#6B7280]">Get notified when contacts respond to revival messages</p>
                </div>
                <Switch
                  checked={settings.notifyOnResponse}
                  onCheckedChange={(checked) => {
                    updateSetting("notifyOnResponse", checked)
                    setTimeout(() => saveSection("notifications"), 50)
                  }}
                />
              </div>
              <div className="pt-2">
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    saveSection("notifications")
                  }}
                  disabled={loadingSection === "notifications"}
                  type="button"
                  className={cn(
                    "w-full h-11 font-semibold",
                    savedSection === "notifications" 
                      ? "bg-gradient-to-r from-[#3CCB7F] to-[#3CCB7F] hover:from-[#3CCB7F] hover:to-[#3CCB7F] text-white shadow-sm hover:shadow-md" 
                      : "bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] text-white shadow-sm hover:shadow-md"
                  )}
                >
                  {loadingSection === "notifications" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : savedSection === "notifications" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Saved Successfully
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </div>
              </div>
            )}
          </Card>
          )}

          {/* Webhooks Section */}
          {filteredSections.some(s => s.id === "webhooks") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
            expandedSections.has("webhooks") ? "border-[#4F8CFF]/40 shadow-md" : ""
          )}>
            <button
              onClick={() => toggleSection("webhooks")}
              className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
                  <WebhookIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">Webhooks</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Configure webhooks for integrations</CardDescription>
                </div>
              </div>
              <ChevronRight className={cn(
                "h-5 w-5 text-[#6B7280] transition-transform",
                expandedSections.has("webhooks") && "rotate-90"
              )} />
            </button>
            
            {expandedSections.has("webhooks") && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4 sm:space-y-5 border-t border-[#E5E7EB] pt-5 sm:pt-6">
                <p className="text-sm text-[#6B7280]">
                  Manage webhooks to receive real-time events from Revive.ai. Visit the <Link href="/webhooks" className="text-[#4F8CFF] hover:underline">Webhooks page</Link> for full configuration.
                </p>
                <div className="space-y-2">
                  {webhooks.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No webhooks configured</p>
                  ) : (
                    <div className="space-y-2">
                      {webhooks.slice(0, 3).map((webhook) => (
                        <div key={webhook.id} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[#111827]">{webhook.name}</p>
                              <p className="text-xs text-[#6B7280] truncate">{webhook.url}</p>
                            </div>
                            <Badge variant={webhook.status === "active" ? "default" : "secondary"}>
                              {webhook.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {webhooks.length > 3 && (
                        <p className="text-xs text-[#6B7280]">+{webhooks.length - 3} more webhooks</p>
                      )}
                    </div>
                  )}
                </div>
                <Link href="/webhooks">
                  <Button variant="outline" className="w-full">
                    <WebhookIcon className="h-4 w-4 mr-2" />
                    Manage Webhooks
                  </Button>
                </Link>
              </div>
            )}
          </Card>
          )}

          {/* Teams Section */}
          {filteredSections.some(s => s.id === "teams") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
            expandedSections.has("teams") ? "border-[#4F8CFF]/40 shadow-md" : ""
          )}>
            <button
              onClick={() => toggleSection("teams")}
              className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">Teams</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Manage team members and permissions</CardDescription>
                </div>
              </div>
              <ChevronRight className={cn(
                "h-5 w-5 text-[#6B7280] transition-transform",
                expandedSections.has("teams") && "rotate-90"
              )} />
            </button>
            
            {expandedSections.has("teams") && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4 sm:space-y-5 border-t border-[#E5E7EB] pt-5 sm:pt-6">
                <p className="text-sm text-[#6B7280]">
                  Manage your teams and collaborate with others. Visit the <Link href="/teams" className="text-[#4F8CFF] hover:underline">Teams page</Link> for full management.
                </p>
                <div className="space-y-2">
                  {teams.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No teams created</p>
                  ) : (
                    <div className="space-y-2">
                      {teams.slice(0, 3).map((team) => {
                        const members = teamMembers[team.id] || []
                        return (
                          <div key={team.id} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-[#111827]">{team.name}</p>
                              <Badge variant="secondary">{members.length} member{members.length !== 1 ? "s" : ""}</Badge>
                            </div>
                            {team.description && (
                              <p className="text-xs text-[#6B7280]">{team.description}</p>
                            )}
                          </div>
                        )
                      })}
                      {teams.length > 3 && (
                        <p className="text-xs text-[#6B7280]">+{teams.length - 3} more teams</p>
                      )}
                    </div>
                  )}
                </div>
                <Link href="/teams">
                  <Button variant="outline" className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Teams
                  </Button>
                </Link>
              </div>
            )}
          </Card>
          )}

          {/* Billing */}
          {filteredSections.some(s => s.id === "billing") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all shadow-sm hover:shadow-md",
            expandedSections.has("billing") ? "border-[#4F8CFF]/40 shadow-md" : ""
          )}>
            <button
              onClick={() => toggleSection("billing")}
              className="w-full p-5 sm:p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base sm:text-lg font-semibold text-[#111827]">Billing</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-[#6B7280] mt-0.5">Manage your subscription and billing</CardDescription>
                </div>
              </div>
              <ChevronRight className={cn(
                "h-5 w-5 text-[#6B7280] transition-transform",
                expandedSections.has("billing") && "rotate-90"
              )} />
            </button>
            
            {expandedSections.has("billing") && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4 sm:space-y-5 border-t border-[#E5E7EB] pt-5 sm:pt-6">
                <div className="flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#111827] capitalize">{subscription?.plan || "pro"} Plan</p>
                  <p className="text-xs text-[#6B7280]">
                    {subscription ? `${formatPrice(getPlanPrice(subscription.plan, subscription.billingCycle), subscription.billingCycle)}/${subscription.billingCycle === "monthly" ? "month" : "year"}` : "Loading..."}
                  </p>
                </div>
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Plans
                  </Button>
                </Link>
              </div>
              </div>
            )}
          </Card>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  )
}
