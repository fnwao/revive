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
import { Save, Eye, EyeOff, Copy, Check, CheckCircle2, Loader2, ExternalLink, Trash2, CreditCard, Search, Info, AlertCircle, HelpCircle, Settings2, User, Key, Bell, Zap, Building2, Shield, Webhook as WebhookIcon, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { hasApiKey, getSettings, updateSettings, getWebhooks, createWebhook, updateWebhook, deleteWebhook, getTeams, getTeamMembers, addTeamMember, type Webhook, type Team, type TeamMember } from "@/lib/api"
import { getUser, updateUser, saveUser } from "@/lib/user"
import { getSubscription, formatPrice, getPlanPrice, getPlanLimits } from "@/lib/subscription"
import { showToast } from "@/lib/toast"

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
  const settingsRef = useRef(settings)
  
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
    if (settings.ghlLocationId?.trim() && !/^\d+$/.test(settings.ghlLocationId.trim())) {
      setErrors({ ghlLocationId: "Location ID must be numeric" })
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
    { id: "api", title: "API Configuration", icon: Key, description: "Configure your backend API connection", keywords: ["api", "key", "backend", "connection", "url"] },
    { id: "ghl", title: "GoHighLevel", icon: Building2, description: "Connect your GoHighLevel account", keywords: ["ghl", "gohighlevel", "integration", "connect"] },
    { id: "revival", title: "Revival Settings", icon: Zap, description: "Configure how Revive.ai detects and handles stalled deals", keywords: ["revival", "stalled", "deals", "detect", "threshold", "approval"] },
    { id: "notifications", title: "Notifications", icon: Bell, description: "Configure how you receive notifications", keywords: ["notification", "email", "sms", "alert", "notify"] },
    { id: "webhooks", title: "Webhooks", icon: WebhookIcon, description: "Configure webhooks for integrations", keywords: ["webhook", "integration", "api", "events"] },
    { id: "teams", title: "Teams", icon: Users, description: "Manage team members and permissions", keywords: ["team", "members", "collaboration", "users"] },
    { id: "billing", title: "Billing", icon: CreditCard, description: "Manage your subscription and billing", keywords: ["billing", "subscription", "plan", "payment"] },
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
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-h2 text-[#111827] mb-1">Settings</h1>
            <p className="text-body text-[#6B7280]">Manage your account settings and preferences</p>
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
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="max-w-2xl mx-auto space-y-4">
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
            "bg-white border-[#E5E7EB] transition-all",
            expandedSections.has("account") ? "border-[#4F8CFF]/30 shadow-sm" : ""
          )}>
            <button
              onClick={() => toggleSection("account")}
              className="w-full p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base font-semibold text-[#111827]">Account</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">Update your account information</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "account" && (
                  <CheckCircle2 className="h-5 w-5 text-[#3CCB7F]" />
                )}
                <Settings2 className={cn(
                  "h-4 w-4 text-[#6B7280] transition-transform",
                  expandedSections.has("account") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("account") && (
              <div className="px-6 pb-6 space-y-5 border-t border-[#E5E7EB] pt-6">
                <div className="space-y-2">
                <Label htmlFor="email" className="text-[#111827]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateSetting("email", e.target.value)}
                  className={errors.email ? "border-[#E06C75]" : ""}
                />
                {errors.email && <p className="text-xs text-[#E06C75]">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#111827]">Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => updateSetting("name", e.target.value)}
                />
              </div>
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
                  "w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 bg-[#4F8CFF] text-white hover:bg-[#6EA0FF] transition-all duration-150",
                  savedSection === "account" && "!bg-[#3CCB7F] hover:!bg-[#3CCB7F]/90 !text-white",
                  loadingSection === "account" && "opacity-50 cursor-not-allowed"
                )}
                style={savedSection === "account" ? { backgroundColor: "#3CCB7F", color: "#FFFFFF" } : undefined}
              >
                {loadingSection === "account" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : savedSection === "account" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
              </div>
            )}
          </Card>
          )}

          {/* API Configuration */}
          {filteredSections.some(s => s.id === "api") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all",
            expandedSections.has("api") ? "border-[#4F8CFF]/30 shadow-sm" : "",
            apiKeyStatus === "connected" && "border-[#3CCB7F]/30"
          )}>
            <button
              onClick={() => toggleSection("api")}
              className="w-full p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  apiKeyStatus === "connected" ? "bg-[#3CCB7F]/10" : "bg-[#4F8CFF]/10"
                )}>
                  <Key className={cn(
                    "h-5 w-5",
                    apiKeyStatus === "connected" ? "text-[#3CCB7F]" : "text-[#4F8CFF]"
                  )} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold text-[#111827]">API Configuration</CardTitle>
                    {apiKeyStatus === "connected" && (
                      <span className="px-2 py-0.5 rounded-full bg-[#3CCB7F]/10 text-[10px] font-medium text-[#3CCB7F]">
                        Connected
                      </span>
                    )}
                    {apiKeyStatus === "saved" && (
                      <span className="px-2 py-0.5 rounded-full bg-[#6B7280]/10 text-[10px] font-medium text-[#6B7280]">
                        Saved
                      </span>
                    )}
                    {apiKeyStatus === "error" && (
                      <span className="px-2 py-0.5 rounded-full bg-[#E06C75]/10 text-[10px] font-medium text-[#E06C75]">
                        Error
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-sm text-[#6B7280]">Configure your backend API connection</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "api" && (
                  <CheckCircle2 className="h-5 w-5 text-[#3CCB7F]" />
                )}
                <Settings2 className={cn(
                  "h-4 w-4 text-[#6B7280] transition-transform",
                  expandedSections.has("api") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("api") && (
              <div className="px-6 pb-6 space-y-5 border-t border-[#E5E7EB] pt-6">
                <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="api-url" className="text-[#111827]">API URL</Label>
                  <div className="group relative">
                    <HelpCircle className="h-3.5 w-3.5 text-[#6B7280] cursor-help" />
                    <div className="absolute left-0 top-6 w-64 p-2 bg-[#111827] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      The URL where your backend API is running. Default is http://localhost:8000
                    </div>
                  </div>
                </div>
                <Input
                  id="api-url"
                  value={settings.apiUrl}
                  onChange={(e) => updateSetting("apiUrl", e.target.value)}
                  placeholder="http://localhost:8000"
                />
                <p className="text-xs text-[#6B7280]">Backend API endpoint URL</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-[#111827]">API Key</Label>
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
              <div className="flex gap-2">
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log("🖱️ API button clicked")
                    saveSection("api")
                  }}
                  disabled={loadingSection === "api"}
                  type="button"
                  className={cn(
                    "w-full",
                    savedSection === "api" && "!bg-[#3CCB7F] hover:!bg-[#3CCB7F]/90 !text-white"
                  )}
                  style={savedSection === "api" ? { backgroundColor: "#3CCB7F", color: "#FFFFFF" } : undefined}
                >
                  {loadingSection === "api" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : savedSection === "api" ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Saved
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
                  className="flex-1"
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
            "bg-white border-[#E5E7EB] transition-all",
            expandedSections.has("ghl") ? "border-[#4F8CFF]/30 shadow-sm" : "",
            settings.ghlConnected && "border-[#3CCB7F]/30"
          )}>
            <button
              onClick={() => toggleSection("ghl")}
              className="w-full p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  settings.ghlConnected ? "bg-[#3CCB7F]/10" : "bg-[#4F8CFF]/10"
                )}>
                  <Building2 className={cn(
                    "h-5 w-5",
                    settings.ghlConnected ? "text-[#3CCB7F]" : "text-[#4F8CFF]"
                  )} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold text-[#111827]">GoHighLevel Integration</CardTitle>
                    {settings.ghlConnected && (
                      <span className="px-2 py-0.5 rounded-full bg-[#3CCB7F]/10 text-[10px] font-medium text-[#3CCB7F]">
                        Connected
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-sm text-[#6B7280]">Connect your GoHighLevel account</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "ghl" && (
                  <CheckCircle2 className="h-5 w-5 text-[#3CCB7F]" />
                )}
                <Settings2 className={cn(
                  "h-4 w-4 text-[#6B7280] transition-transform",
                  expandedSections.has("ghl") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("ghl") && (
              <div className="px-6 pb-6 space-y-5 border-t border-[#E5E7EB] pt-6">
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
            "bg-white border-[#E5E7EB] transition-all",
            expandedSections.has("revival") ? "border-[#4F8CFF]/30 shadow-sm" : ""
          )}>
            <button
              onClick={() => toggleSection("revival")}
              className="w-full p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base font-semibold text-[#111827]">Revival Settings</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">Configure how Revive.ai detects and handles stalled deals</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "revival" && (
                  <CheckCircle2 className="h-5 w-5 text-[#3CCB7F]" />
                )}
                <Settings2 className={cn(
                  "h-4 w-4 text-[#6B7280] transition-transform",
                  expandedSections.has("revival") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("revival") && (
              <div className="px-6 pb-6 space-y-6 border-t border-[#E5E7EB] pt-6">
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
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("🖱️ Revival button clicked")
                  saveSection("revival")
                }}
                disabled={loadingSection === "revival"}
                type="button"
                className={cn(
                  "w-full",
                  savedSection === "revival" && "!bg-[#3CCB7F] hover:!bg-[#3CCB7F]/90 !text-white"
                )}
                style={savedSection === "revival" ? { backgroundColor: "#3CCB7F", color: "#FFFFFF" } : undefined}
              >
                {loadingSection === "revival" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : savedSection === "revival" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Revival Settings
                  </>
                )}
              </Button>
              </div>
            )}
          </Card>
          )}

          {/* Notifications */}
          {filteredSections.some(s => s.id === "notifications") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all",
            expandedSections.has("notifications") ? "border-[#4F8CFF]/30 shadow-sm" : ""
          )}>
            <button
              onClick={() => toggleSection("notifications")}
              className="w-full p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base font-semibold text-[#111827]">Notifications</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">Configure how you receive notifications</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedSection === "notifications" && (
                  <CheckCircle2 className="h-5 w-5 text-[#3CCB7F]" />
                )}
                <Settings2 className={cn(
                  "h-4 w-4 text-[#6B7280] transition-transform",
                  expandedSections.has("notifications") && "rotate-90"
                )} />
              </div>
            </button>
            
            {expandedSections.has("notifications") && (
              <div className="px-6 pb-6 space-y-6 border-t border-[#E5E7EB] pt-6">
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
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("🖱️ Notifications button clicked")
                  saveSection("notifications")
                }}
                disabled={loadingSection === "notifications"}
                type="button"
                className={cn(
                  "w-full",
                  savedSection === "notifications" && "!bg-[#3CCB7F] hover:!bg-[#3CCB7F]/90 !text-white"
                )}
                style={savedSection === "notifications" ? { backgroundColor: "#3CCB7F", color: "#FFFFFF" } : undefined}
              >
                {loadingSection === "notifications" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : savedSection === "notifications" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Notification Settings
                  </>
                )}
              </Button>
              </div>
            )}
          </Card>
          )}

          {/* Webhooks Section */}
          {filteredSections.some(s => s.id === "webhooks") && (
          <Card className={cn(
            "bg-white border-[#E5E7EB] transition-all",
            expandedSections.has("webhooks") ? "border-[#4F8CFF]/30 shadow-sm" : ""
          )}>
            <button
              onClick={() => toggleSection("webhooks")}
              className="w-full p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                  <WebhookIcon className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base font-semibold text-[#111827]">Webhooks</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">Configure webhooks for integrations</CardDescription>
                </div>
              </div>
              <Settings2 className={cn(
                "h-4 w-4 text-[#6B7280] transition-transform",
                expandedSections.has("webhooks") && "rotate-90"
              )} />
            </button>
            
            {expandedSections.has("webhooks") && (
              <div className="px-6 pb-6 space-y-4 border-t border-[#E5E7EB] pt-6">
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
            "bg-white border-[#E5E7EB] transition-all",
            expandedSections.has("teams") ? "border-[#4F8CFF]/30 shadow-sm" : ""
          )}>
            <button
              onClick={() => toggleSection("teams")}
              className="w-full p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base font-semibold text-[#111827]">Teams</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">Manage team members and permissions</CardDescription>
                </div>
              </div>
              <Settings2 className={cn(
                "h-4 w-4 text-[#6B7280] transition-transform",
                expandedSections.has("teams") && "rotate-90"
              )} />
            </button>
            
            {expandedSections.has("teams") && (
              <div className="px-6 pb-6 space-y-4 border-t border-[#E5E7EB] pt-6">
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
            "bg-white border-[#E5E7EB] transition-all",
            expandedSections.has("billing") ? "border-[#4F8CFF]/30 shadow-sm" : ""
          )}>
            <button
              onClick={() => toggleSection("billing")}
              className="w-full p-6 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-[#4F8CFF]" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base font-semibold text-[#111827]">Billing</CardTitle>
                  <CardDescription className="text-sm text-[#6B7280]">Manage your subscription and billing</CardDescription>
                </div>
              </div>
              <Settings2 className={cn(
                "h-4 w-4 text-[#6B7280] transition-transform",
                expandedSections.has("billing") && "rotate-90"
              )} />
            </button>
            
            {expandedSections.has("billing") && (
              <div className="px-6 pb-6 space-y-4 border-t border-[#E5E7EB] pt-6">
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
