"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Save, Eye, EyeOff, Copy, Check, CheckCircle2, Loader2, ExternalLink, Trash2, Calendar, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { hasApiKey } from "@/lib/api"
import { getUser, updateUser, saveUser } from "@/lib/user"
import { getSubscription, formatPrice, getPlanPrice, getPlanLimits } from "@/lib/subscription"

interface SettingsData {
  // Account
  email: string
  name: string
  
  // API
  apiKey: string
  apiUrl: string
  
  // GHL Integration
  ghlConnected: boolean
  ghlLocationId: string
  ghlApiKey: string
  
  // Revival Settings
  autoDetectStalled: boolean
  stalledThresholdDays: number
  requireApproval: boolean
  autoApprove: boolean
  
  // Notifications
  emailNotifications: boolean
  smsNotifications: boolean
  notifyOnStalled: boolean
  notifyOnResponse: boolean
}

const defaultSettings: SettingsData = {
  email: "user@example.com",
  name: "John Doe",
  apiKey: "",
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
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
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [subscription, setSubscription] = useState(getSubscription())

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("revive_settings")
      const savedApiKey = localStorage.getItem("api_key")
      const user = getUser()
      
      let loadedSettings = { ...defaultSettings }
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          // Merge saved settings with defaults, ensuring all fields are present
          loadedSettings = { ...defaultSettings, ...parsed }
        } catch (e) {
          console.error("Error parsing saved settings:", e)
          // Use defaults if parse fails
        }
      }
      
      // Load user info if available - this should override saved settings
      if (user) {
        loadedSettings.name = user.name || loadedSettings.name
        loadedSettings.email = user.email || loadedSettings.email
      }
      
      // Always use saved API key if it exists
      if (savedApiKey) {
        loadedSettings.apiKey = savedApiKey
      }
      
      setSettings(loadedSettings)
    }
  }, [])

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

  // Debug: Log saved state changes
  useEffect(() => {
    console.log("Saved state changed:", saved)
  }, [saved])

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
    // Clear saved state when user makes changes
    setSaved(null)
  }

  const validateSettings = (section?: string): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {}

    // Only validate email if it's provided and we're saving account
    if (section === "account") {
      if (settings.email && settings.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
        newErrors.email = "Please enter a valid email address"
      }
    }

    // Only validate threshold if we're saving revival settings
    if (section === "revival") {
      const threshold = Number(settings.stalledThresholdDays)
      if (isNaN(threshold) || threshold < 1 || threshold > 90) {
        newErrors.stalledThresholdDays = "Threshold must be between 1 and 90 days"
      }
    }

    // Only validate GHL location ID if we're saving GHL settings
    if (section === "ghl" && settings.ghlLocationId && settings.ghlLocationId.trim() && !/^\d+$/.test(settings.ghlLocationId)) {
      newErrors.ghlLocationId = "Location ID must be numeric"
    }

    // No validation needed for API section - allow saving even if empty (to clear it)
    // No validation needed for notifications section

    const isValid = Object.keys(newErrors).length === 0
    console.log("Validation result:", { section, isValid, errors: newErrors })
    
    // Update errors state
    setErrors(newErrors)
    
    return { isValid, errors: newErrors }
  }

  const handleSave = async (section: string) => {
    console.log("handleSave called for section:", section)
    console.log("Current settings:", { 
      apiKey: settings.apiKey ? settings.apiKey.substring(0, 15) + "..." : "empty",
      apiUrl: settings.apiUrl,
      autoDetectStalled: settings.autoDetectStalled,
      requireApproval: settings.requireApproval,
      autoApprove: settings.autoApprove,
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      notifyOnStalled: settings.notifyOnStalled,
      notifyOnResponse: settings.notifyOnResponse,
    })
    
    // Validate settings
    const validation = validateSettings(section)
    console.log("Validation result:", { section, isValid: validation.isValid, errors: validation.errors })
    
    if (!validation.isValid) {
      console.log("❌ Validation failed, errors:", validation.errors)
      return
    }

    console.log("Validation passed, starting save...")
    setLoading(true)
    setSaved(null) // Clear any previous saved state
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Save to localStorage - use latest state from settings
      if (typeof window !== "undefined") {
        // Get the latest settings state
        const latestSettings = { ...settings }
        // Always save all current settings to localStorage
        const settingsToSave = { ...latestSettings }
        localStorage.setItem("revive_settings", JSON.stringify(settingsToSave))
        console.log("✅ Settings saved to localStorage")
        
        // Save API key separately for easy access
        if (section === "api") {
          const apiKeyValue = latestSettings.apiKey ? latestSettings.apiKey.trim() : ""
          console.log("Saving API key:", apiKeyValue ? apiKeyValue.substring(0, 15) + "..." : "empty")
          
          if (apiKeyValue) {
            localStorage.setItem("api_key", apiKeyValue)
            console.log("✅ API key saved to localStorage")
            
            // Verify it was saved
            const verify = localStorage.getItem("api_key")
            console.log("✅ Verified saved:", verify ? verify.substring(0, 15) + "..." : "not found")
          } else {
            localStorage.removeItem("api_key")
            console.log("✅ API key removed from localStorage")
          }
        }
        
        // Update user info if account section
        if (section === "account") {
          const user = getUser()
          if (user) {
            updateUser({
              name: latestSettings.name.trim(),
              email: latestSettings.email.trim(),
            })
            console.log("✅ User updated:", { name: latestSettings.name, email: latestSettings.email })
          } else {
            const newUser = {
              id: `user-${Date.now()}`,
              name: latestSettings.name.trim(),
              email: latestSettings.email.trim(),
              createdAt: new Date().toISOString(),
            }
            saveUser(newUser)
            console.log("✅ New user created:", newUser)
          }
          
          // Dispatch event for other components to update
          setTimeout(() => {
            window.dispatchEvent(new Event("userUpdated"))
          }, 100)
        }
      }
      
      // Show success animation
      console.log("✅ Setting saved state to:", section)
      
      // Set loading to false first, then set saved state
      // This ensures the button shows the saved state correctly
      setLoading(false)
      
      // Use a small delay to ensure state updates are processed
      setTimeout(() => {
        setSaved(section)
        console.log("✅ Saved state set to:", section)
        console.log("✅ Button should now show green/Saved state")
      }, 10)
      
      // Show toast notification
      const { showToast } = await import("@/lib/toast")
      const sectionNames: Record<string, string> = {
        account: "Account",
        api: "API Configuration",
        ghl: "GoHighLevel Integration",
        revival: "Revival Settings",
        notifications: "Notifications",
      }
      showToast.saved(sectionNames[section] || section)
      
      // Clear saved state after 3 seconds
      setTimeout(() => {
        console.log("Clearing saved state")
        setSaved(null)
      }, 3000)
    } catch (error) {
      console.error("❌ Failed to save settings:", error)
      const { showToast } = await import("@/lib/toast")
      showToast.error("Failed to save settings", "Please try again or check your connection.")
      setErrors(prev => ({ ...prev, _general: "Failed to save settings. Please try again." }))
      setLoading(false)
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleConnectGHL = async () => {
    if (!validateSettings("ghl")) {
      return
    }

    setLoading(true)
    setErrors({})
    try {
      // Simulate GHL connection
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateSetting("ghlConnected", true)
      // Save the connection state
      await handleSave("ghl")
    } catch (error) {
      console.error("Failed to connect GHL:", error)
      setErrors(prev => ({ ...prev, _general: "Failed to connect to GoHighLevel. Please check your credentials." }))
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectGHL = async () => {
    updateSetting("ghlConnected", false)
    updateSetting("ghlApiKey", "")
    updateSetting("ghlLocationId", "")
    await handleSave("ghl")
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0F1115]">
      {/* Header */}
      <div className="border-b border-[#2A2F3A] bg-[#0F1115] px-6 py-6 flex-shrink-0">
        <h1 className="text-h2 text-[#F5F7FA] mb-1">Settings</h1>
        <p className="text-body text-[#B8BDC9]">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Account Settings */}
          <Card className="p-6 bg-[#1B1F2A] border-[#2A2F3A]">
            <div className="mb-6">
              <CardTitle className="text-base font-semibold mb-1 text-[#F5F7FA]">Account</CardTitle>
              <CardDescription className="text-sm text-[#B8BDC9]">
                Update your account information
              </CardDescription>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#F5F7FA]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateSetting("email", e.target.value)}
                  className={errors.email ? "border-[#E06C75]" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-[#E06C75]">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#F5F7FA]">Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => updateSetting("name", e.target.value)}
                />
              </div>
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("Account save button clicked", { settings, loading, saved })
                  handleSave("account")
                }} 
                disabled={loading}
                type="button"
                className={cn(
                  "w-full transition-all duration-300",
                  saved === "account" && "bg-[#3CCB7F] hover:bg-[#3CCB7F]/90"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved === "account" ? (
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
              </Button>
            </div>
          </Card>

          {/* API Configuration */}
          <Card className="p-6 bg-[#1B1F2A] border-[#2A2F3A]">
            <div className="mb-6">
              <CardTitle className="text-base font-semibold mb-1 text-[#F5F7FA]">API Configuration</CardTitle>
              <CardDescription className="text-sm text-[#B8BDC9]">
                Configure your API key to connect to the backend
              </CardDescription>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url" className="text-[#F5F7FA]">API URL</Label>
                <Input
                  id="api-url"
                  value={settings.apiUrl}
                  onChange={(e) => updateSetting("apiUrl", e.target.value)}
                  placeholder="http://localhost:8000"
                />
                <p className="text-xs text-[#8A90A2]">
                  Backend API endpoint URL
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-[#F5F7FA]">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showApiKey ? "text" : "password"}
                      value={settings.apiKey}
                      onChange={(e) => updateSetting("apiKey", e.target.value)}
                      placeholder="Enter your API key"
                      className={errors.apiKey ? "border-[#E06C75]" : ""}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-[#1B1F2A]"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4 text-[#B8BDC9]" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#B8BDC9]" />
                      )}
                    </Button>
                  </div>
                  {settings.apiKey && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(settings.apiKey, "apiKey")}
                      className="hover:bg-[#1B1F2A]"
                    >
                      {copied === "apiKey" ? (
                        <Check className="h-4 w-4 text-[#3CCB7F]" />
                      ) : (
                        <Copy className="h-4 w-4 text-[#B8BDC9]" />
                      )}
                    </Button>
                  )}
                </div>
                {errors.apiKey && (
                  <p className="text-xs text-[#E06C75]">{errors.apiKey}</p>
                )}
                <p className="text-xs text-[#8A90A2]">
                  Get your API key from the backend admin script: <code className="bg-[#1B1F2A] px-1.5 py-0.5 rounded text-[#4F8CFF]">python scripts/create_user.py create --email your@email.com</code>
                </p>
                {hasApiKey() && (
                  <div className="flex items-center gap-2 text-xs text-[#3CCB7F]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>API key configured</span>
                  </div>
                )}
              </div>
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("API save button clicked")
                  console.log("Settings state:", { 
                    apiKey: settings.apiKey ? settings.apiKey.substring(0, 15) + "..." : "empty",
                    apiUrl: settings.apiUrl,
                    loading,
                    saved 
                  })
                  handleSave("api")
                }} 
                disabled={loading}
                type="button"
                className={cn(
                  "w-full transition-all duration-300",
                  saved === "api" && "!bg-[#3CCB7F] hover:!bg-[#3CCB7F]/90"
                )}
                style={saved === "api" ? { backgroundColor: "#3CCB7F" } : undefined}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved === "api" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save API Key
                  </>
                )}
              </Button>
              {saved === "api" && (
                <div className="text-xs text-[#3CCB7F] animate-in fade-in duration-300">
                  API key saved successfully!
                </div>
              )}
            </div>
          </Card>

          {/* GoHighLevel Integration */}
          <Card className="p-6 bg-[#1B1F2A] border-[#2A2F3A]">
            <div className="mb-6">
              <CardTitle className="text-base font-semibold mb-1 text-[#F5F7FA]">GoHighLevel Integration</CardTitle>
              <CardDescription className="text-sm text-[#B8BDC9]">
                Connect your GoHighLevel account to sync deals and send messages
              </CardDescription>
            </div>
            <div className="space-y-5">
              {settings.ghlConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#1B1F2A] border border-[#2A2F3A] rounded-lg">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                        <Label className="font-medium text-[#F5F7FA]">Connected</Label>
                      </div>
                      <p className="text-sm text-[#B8BDC9]">
                        Your account is connected to GoHighLevel
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDisconnectGHL}
                      disabled={loading}
                      className="hover:bg-[#1B1F2A]"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#F5F7FA]">Location ID</Label>
                    <Input 
                      value={settings.ghlLocationId} 
                      disabled
                      className="bg-[#0F1115]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ghl-api-key" className="text-[#F5F7FA]">GoHighLevel API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="ghl-api-key"
                          type={showGhlApiKey ? "text" : "password"}
                          value={settings.ghlApiKey}
                          onChange={(e) => updateSetting("ghlApiKey", e.target.value)}
                          placeholder="Enter your GHL API key"
                          className={errors.ghlApiKey ? "border-[#E06C75]" : ""}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-[#1B1F2A]"
                          onClick={() => setShowGhlApiKey(!showGhlApiKey)}
                        >
                          {showGhlApiKey ? (
                            <EyeOff className="h-4 w-4 text-[#B8BDC9]" />
                          ) : (
                            <Eye className="h-4 w-4 text-[#B8BDC9]" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {errors.ghlApiKey && (
                      <p className="text-xs text-[#E06C75]">{errors.ghlApiKey}</p>
                    )}
                    <p className="text-xs text-[#8A90A2]">
                      Find this in your GoHighLevel Settings → Integrations → API
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ghl-location-id" className="text-[#F5F7FA]">Location ID</Label>
                    <Input
                      id="ghl-location-id"
                      value={settings.ghlLocationId}
                      onChange={(e) => updateSetting("ghlLocationId", e.target.value)}
                      placeholder="Enter your location ID"
                      className={errors.ghlLocationId ? "border-[#E06C75]" : ""}
                    />
                    {errors.ghlLocationId && (
                      <p className="text-xs text-[#E06C75]">{errors.ghlLocationId}</p>
                    )}
                    <p className="text-xs text-[#8A90A2]">
                      Find this in your GoHighLevel Settings → Locations
                    </p>
                  </div>
                  <Button 
                    onClick={handleConnectGHL}
                    disabled={loading || !settings.ghlApiKey.trim() || !settings.ghlLocationId.trim()}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect GoHighLevel
                      </>
                    )}
                  </Button>
                  {saved === "ghl" && (
                    <div className="flex items-center gap-2 text-xs text-[#3CCB7F] animate-in fade-in slide-in-from-top-2 duration-300">
                      <CheckCircle2 className="h-3.5 w-3.5 animate-in zoom-in duration-200" />
                      <span>Successfully connected!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Revival Settings */}
          <Card className="p-6 bg-[#1B1F2A] border-[#2A2F3A]">
            <div className="mb-6">
              <CardTitle className="text-base font-semibold mb-1 text-[#F5F7FA]">Revival Settings</CardTitle>
              <CardDescription className="text-sm text-[#B8BDC9]">
                Configure how Revive.ai detects and handles stalled deals
              </CardDescription>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#F5F7FA]">Auto-detect Stalled Deals</Label>
                  <p className="text-sm text-[#B8BDC9]">
                    Automatically scan for deals that need attention
                  </p>
                </div>
                <Switch
                  checked={settings.autoDetectStalled}
                  onCheckedChange={async (checked) => {
                    updateSetting("autoDetectStalled", checked)
                    // Auto-save after state update
                    setTimeout(async () => {
                      await handleSave("revival")
                    }, 50)
                  }}
                />
              </div>
              
              <Separator className="bg-[#2A2F3A]" />
              
              <div className="space-y-2">
                <Label htmlFor="threshold-days" className="text-[#F5F7FA]">Stalled Threshold (days)</Label>
                <Input
                  id="threshold-days"
                  type="number"
                  min="1"
                  max="90"
                  value={settings.stalledThresholdDays}
                  onChange={(e) => updateSetting("stalledThresholdDays", parseInt(e.target.value) || 7)}
                  className={errors.stalledThresholdDays ? "border-[#E06C75]" : ""}
                />
                {errors.stalledThresholdDays && (
                  <p className="text-xs text-[#E06C75]">{errors.stalledThresholdDays}</p>
                )}
                <p className="text-sm text-[#B8BDC9]">
                  Deals inactive for this many days will be flagged for revival
                </p>
              </div>
              
              <Separator className="bg-[#2A2F3A]" />
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#F5F7FA]">Require Approval Before Sending</Label>
                  <p className="text-sm text-[#B8BDC9]">
                    Review all messages before they're sent
                  </p>
                </div>
                <Switch
                  checked={settings.requireApproval}
                  onCheckedChange={async (checked) => {
                    // Update both settings first
                    setSettings(prev => {
                      const updated = { ...prev, requireApproval: checked }
                      if (checked) {
                        updated.autoApprove = false
                      }
                      return updated
                    })
                    // Clear saved state
                    setSaved(null)
                    // Auto-save after state update
                    setTimeout(async () => {
                      await handleSave("revival")
                    }, 50)
                  }}
                />
              </div>
              
              <Separator className="bg-[#2A2F3A]" />
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#F5F7FA]">Auto-approve Messages</Label>
                  <p className="text-sm text-[#B8BDC9]">
                    Automatically approve and send messages (requires approval to be disabled)
                  </p>
                </div>
                <Switch
                  checked={settings.autoApprove}
                  onCheckedChange={async (checked) => {
                    // Update both settings first
                    setSettings(prev => {
                      const updated = { ...prev, autoApprove: checked }
                      if (checked) {
                        updated.requireApproval = false
                      }
                      return updated
                    })
                    // Clear saved state
                    setSaved(null)
                    // Auto-save after state update
                    setTimeout(async () => {
                      await handleSave("revival")
                    }, 50)
                  }}
                  disabled={settings.requireApproval}
                />
              </div>
              
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("Revival save button clicked", { settings, loading, saved })
                  handleSave("revival")
                }} 
                disabled={loading}
                type="button"
                className={cn(
                  "w-full transition-all duration-300",
                  saved === "revival" && "bg-[#3CCB7F] hover:bg-[#3CCB7F]/90"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved === "revival" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6 bg-[#1B1F2A] border-[#2A2F3A]">
            <div className="mb-6">
              <CardTitle className="text-base font-semibold mb-1 text-[#F5F7FA]">Notifications</CardTitle>
              <CardDescription className="text-sm text-[#B8BDC9]">
                Choose how you want to be notified about activity
              </CardDescription>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#F5F7FA]">Email Notifications</Label>
                  <p className="text-sm text-[#B8BDC9]">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={async (checked) => {
                    updateSetting("emailNotifications", checked)
                    // Auto-save after state update
                    setTimeout(async () => {
                      await handleSave("notifications")
                    }, 50)
                  }}
                />
              </div>
              
              <Separator className="bg-[#2A2F3A]" />
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#F5F7FA]">SMS Notifications</Label>
                  <p className="text-sm text-[#B8BDC9]">
                    Receive notifications via SMS
                  </p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={async (checked) => {
                    updateSetting("smsNotifications", checked)
                    // Auto-save after state update
                    setTimeout(async () => {
                      await handleSave("notifications")
                    }, 50)
                  }}
                />
              </div>
              
              <Separator className="bg-[#2A2F3A]" />
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#F5F7FA]">Notify on Stalled Deals</Label>
                  <p className="text-sm text-[#B8BDC9]">
                    Get notified when stalled deals are detected
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnStalled}
                  onCheckedChange={async (checked) => {
                    updateSetting("notifyOnStalled", checked)
                    // Auto-save after state update
                    setTimeout(async () => {
                      await handleSave("notifications")
                    }, 50)
                  }}
                />
              </div>
              
              <Separator className="bg-[#2A2F3A]" />
              
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-[#F5F7FA]">Notify on Responses</Label>
                  <p className="text-sm text-[#B8BDC9]">
                    Get notified when contacts respond to revival messages
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnResponse}
                  onCheckedChange={async (checked) => {
                    updateSetting("notifyOnResponse", checked)
                    // Auto-save after state update
                    setTimeout(async () => {
                      await handleSave("notifications")
                    }, 50)
                  }}
                />
              </div>
              
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("Notifications save button clicked", { settings, loading, saved })
                  handleSave("notifications")
                }} 
                disabled={loading}
                type="button"
                className={cn(
                  "w-full transition-all duration-300",
                  saved === "notifications" && "bg-[#3CCB7F] hover:bg-[#3CCB7F]/90"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved === "notifications" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Billing */}
          <Card className="p-6 bg-[#1B1F2A] border-[#2A2F3A]">
            <div className="mb-6">
              <CardTitle className="text-base font-semibold mb-1 text-[#F5F7FA]">Billing</CardTitle>
              <CardDescription className="text-sm text-[#B8BDC9]">
                Manage your subscription and billing
              </CardDescription>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#1B1F2A] border border-[#2A2F3A] rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-[#F5F7FA] capitalize">
                      {subscription.plan} Plan
                    </p>
                    {subscription.cancelAtPeriodEnd && (
                      <span className="text-xs text-[#F6C177] bg-[#F6C177]/10 px-2 py-0.5 rounded">
                        Cancelling
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#8A90A2] mt-2">
                    {subscription.plan !== "free" && (
                      <>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          <span>{formatPrice(getPlanPrice(subscription.plan, subscription.billingCycle), subscription.billingCycle)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    )}
                    {subscription.plan === "free" && (
                      <span>
                        {getPlanLimits(subscription.plan).revivalsPerMonth === "unlimited" 
                          ? "Unlimited" 
                          : `${getPlanLimits(subscription.plan).revivalsPerMonth} revivals`} per month
                      </span>
                    )}
                  </div>
                </div>
                <Link href="/pricing">
                  <Button>{subscription.plan === "free" ? "View Plans" : "Manage Plan"}</Button>
                </Link>
              </div>
              <div className="text-xs text-[#8A90A2] space-y-1">
                <p>• {getPlanLimits(subscription.plan).revivalsPerMonth === "unlimited" ? "Unlimited" : `${getPlanLimits(subscription.plan).revivalsPerMonth}`} revivals per month</p>
                <p>• AI message generation</p>
                <p>• {getPlanLimits(subscription.plan).autoApproval ? "Auto-approval available" : "Manual approval required"}</p>
                <p>• {getPlanLimits(subscription.plan).knowledgeBaseDocs === "unlimited" ? "Unlimited" : getPlanLimits(subscription.plan).knowledgeBaseDocs === 0 ? "No" : getPlanLimits(subscription.plan).knowledgeBaseDocs} knowledge base docs</p>
                {getPlanLimits(subscription.plan).apiAccess && <p>• API access</p>}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
