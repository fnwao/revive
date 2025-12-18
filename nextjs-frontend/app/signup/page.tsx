"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowRight, Check, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, Zap, Shield, Settings, Rocket, User } from "lucide-react"
import { AcquiriLogo } from "@/components/logo"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  apiKey?: string
  locationId?: string
}

export default function SignUpPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    apiKey: "",
    locationId: "",
    thresholdDays: "7",
    autoApprove: false,
  })

  const steps = [
    { 
      number: 1, 
      title: "Create Account", 
      description: "Set up your account",
      icon: User,
    },
    { 
      number: 2, 
      title: "Connect GHL", 
      description: "Link your GoHighLevel account",
      icon: Zap,
    },
    { 
      number: 3, 
      title: "Configure", 
      description: "Set your preferences",
      icon: Settings,
    },
    { 
      number: 4, 
      title: "Complete", 
      description: "You're all set!",
      icon: Rocket,
    },
  ]

  // Password strength calculator
  useEffect(() => {
    if (!formData.password) {
      setPasswordStrength(0)
      return
    }

    let strength = 0
    if (formData.password.length >= 8) strength++
    if (formData.password.length >= 12) strength++
    if (/[a-z]/.test(formData.password)) strength++
    if (/[A-Z]/.test(formData.password)) strength++
    if (/[0-9]/.test(formData.password)) strength++
    if (/[^A-Za-z0-9]/.test(formData.password)) strength++

    setPasswordStrength(Math.min(strength, 4))
  }, [formData.password])

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = "API key is required"
    }

    if (!formData.locationId.trim()) {
      newErrors.locationId = "Location ID is required"
    } else if (!/^\d+$/.test(formData.locationId)) {
      newErrors.locationId = "Location ID must be numeric"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field as keyof FormErrors]
        return newErrors
      })
    }
  }

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Save user to localStorage
      const { saveUser } = await import("@/lib/user")
      saveUser({
        id: `user-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        createdAt: new Date().toISOString(),
      })
      
      // Set flag to show tutorial, then redirect to onboarding
      if (typeof window !== "undefined") {
        sessionStorage.setItem("fromSignup", "true")
      }
      window.location.href = "/onboarding"
    } catch (error) {
      console.error("Signup error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return "Weak"
    if (passwordStrength === 1) return "Fair"
    if (passwordStrength === 2) return "Good"
    if (passwordStrength === 3) return "Strong"
    return "Very Strong"
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-[#E06C75]"
    if (passwordStrength === 2) return "bg-[#F6C177]"
    if (passwordStrength === 3) return "bg-[#4F8CFF]"
    return "bg-[#3CCB7F]"
  }

  const isStep1Valid = formData.name && formData.email && formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && passwordStrength >= 2
  const isStep2Valid = formData.apiKey && formData.locationId

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1115] p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <AcquiriLogo className="h-12 w-12" />
            <h1 className="text-4xl font-bold tracking-tight text-[#F5F7FA]">Welcome to Revive.ai</h1>
          </div>
          <p className="text-[#B8BDC9] text-lg max-w-md mx-auto">
            Set up your revenue recovery system in minutes. Start recovering lost deals today.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const Icon = s.icon
              const isActive = step === s.number
              const isCompleted = step > s.number
              
              return (
                <div key={s.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        "relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
                        isCompleted
                          ? "bg-[#4F8CFF] text-white scale-110"
                          : isActive
                          ? "bg-[#4F8CFF]/10 text-[#4F8CFF] border-2 border-[#4F8CFF] scale-110"
                          : "bg-[#1B1F2A] text-[#8A90A2]"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                      {isActive && (
                        <div className="absolute inset-0 rounded-full bg-[#4F8CFF]/20 animate-ping" />
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p className={cn(
                        "text-xs font-medium transition-colors",
                        isActive || isCompleted ? "text-[#F5F7FA]" : "text-[#8A90A2]"
                      )}>
                        {s.title}
                      </p>
                      <p className="text-xs text-[#8A90A2] mt-0.5 hidden sm:block">
                        {s.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4 h-0.5 relative">
                      <div className={cn(
                        "absolute inset-0 transition-all duration-500",
                        step > s.number ? "bg-[#4F8CFF]" : "bg-[#2A2F3A]"
                      )} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-[#1B1F2A] border-[#2A2F3A]">
          <div className="p-8">
            {/* Step 1: Create Account */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-[#F5F7FA]">Create Your Account</h2>
                  <p className="text-[#B8BDC9]">
                    Start by creating your Revive.ai account. We'll never share your information.
                  </p>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={cn(
                        "h-11 transition-all",
                        errors.name && "border-[#E06C75] focus-visible:ring-[#E06C75]"
                      )}
                    />
                    {errors.name && (
                      <p className="text-xs text-[#E06C75] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={cn(
                        "h-11 transition-all",
                        errors.email && "border-[#E06C75] focus-visible:ring-[#E06C75]"
                      )}
                    />
                    {errors.email && (
                      <p className="text-xs text-[#E06C75] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className={cn(
                          "h-11 pr-10 transition-all",
                          errors.password && "border-[#E06C75] focus-visible:ring-[#E06C75]"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-11 w-11"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {formData.password && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Password strength</span>
                          <span className={cn(
                            "font-medium",
                            passwordStrength <= 1 && "text-[#E06C75]",
                            passwordStrength === 2 && "text-[#F6C177]",
                            passwordStrength === 3 && "text-[#4F8CFF]",
                            passwordStrength >= 4 && "text-[#3CCB7F]"
                          )}>
                            {getPasswordStrengthLabel()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#1B1F2A] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300",
                              passwordStrength <= 1 && "bg-[#E06C75]",
                              passwordStrength === 2 && "bg-[#F6C177]",
                              passwordStrength === 3 && "bg-[#4F8CFF]",
                              passwordStrength >= 4 && "bg-[#3CCB7F]"
                            )}
                            style={{ width: `${(passwordStrength / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {errors.password && (
                      <p className="text-xs text-[#E06C75] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        className={cn(
                          "h-11 pr-10 transition-all",
                          errors.confirmPassword && "border-[#E06C75] focus-visible:ring-[#E06C75]",
                          formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword && "border-[#3CCB7F]"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-11 w-11"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword && (
                      <p className="text-xs text-[#3CCB7F] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Passwords match
                      </p>
                    )}
                    {errors.confirmPassword && (
                      <p className="text-xs text-[#E06C75] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="w-full h-11 text-base font-medium"
                    size="lg"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleNext()
                    }}
                    disabled={!isStep1Valid}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Connect GoHighLevel */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-[#F5F7FA]">Connect GoHighLevel</h2>
                  <p className="text-[#B8BDC9]">
                    Link your GoHighLevel account to start recovering revenue from stalled deals.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="api-key" className="text-sm font-medium">
                      GoHighLevel API Key
                    </Label>
                    <div className="relative">
                      <Input
                        id="api-key"
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter your GoHighLevel API key"
                        value={formData.apiKey}
                        onChange={(e) => handleInputChange("apiKey", e.target.value)}
                        className={cn(
                          "h-11 pr-10 transition-all",
                          errors.apiKey && "border-[#E06C75] focus-visible:ring-[#E06C75]"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-11 w-11"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.apiKey && (
                      <p className="text-xs text-[#E06C75] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.apiKey}
                      </p>
                    )}
                    <p className="text-xs text-[#B8BDC9]">
                      Don't have an API key?{" "}
                      <a href="#" className="text-[#4F8CFF] hover:underline font-medium">
                        Get one here
                      </a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-id" className="text-sm font-medium">
                      Location ID
                    </Label>
                    <Input
                      id="location-id"
                      placeholder="Enter your location ID"
                      value={formData.locationId}
                      onChange={(e) => handleInputChange("locationId", e.target.value)}
                      className={cn(
                        "h-11 transition-all",
                          errors.locationId && "border-[#E06C75] focus-visible:ring-[#E06C75]"
                      )}
                    />
                    {errors.locationId && (
                      <p className="text-xs text-[#E06C75] flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.locationId}
                      </p>
                    )}
                    <p className="text-xs text-[#B8BDC9]">
                      Find this in your GoHighLevel Settings → Locations
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleBack()
                      }}
                      className="flex-1 h-11"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 h-11 text-base font-medium"
                      size="lg"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleNext()
                      }}
                      disabled={!isStep2Valid}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Configure Settings */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-2xl font-semibold mb-2 text-[#F5F7FA]">Configure Settings</h2>
                  <p className="text-[#B8BDC9]">
                    Set up your revival preferences. You can change these anytime in Settings.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="threshold-days" className="text-sm font-medium">
                      Stalled Deal Threshold (days)
                    </Label>
                    <Input
                      id="threshold-days"
                      type="number"
                      min="1"
                      max="90"
                      value={formData.thresholdDays}
                      onChange={(e) => handleInputChange("thresholdDays", e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-[#B8BDC9]">
                      Deals inactive for this many days will be flagged for revival
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-[#1B1F2A] rounded-lg border border-[#2A2F3A] hover:border-[#4F8CFF]/20 transition-colors">
                    <input
                      type="checkbox"
                      id="auto-approve"
                      checked={formData.autoApprove}
                      onChange={(e) => handleInputChange("autoApprove", e.target.checked)}
                      className="mt-0.5 rounded border-[#2A2F3A]"
                    />
                    <Label htmlFor="auto-approve" className="font-normal cursor-pointer flex-1">
                      <div className="font-medium mb-1 text-[#F5F7FA]">Auto-approve and send messages</div>
                      <p className="text-xs text-[#B8BDC9]">
                        Recommended to keep off for the first week to review AI-generated messages
                      </p>
                    </Label>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleBack()
                      }}
                      className="flex-1 h-11"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 h-11 text-base font-medium"
                      size="lg"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleNext()
                      }}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-20 h-20 rounded-full bg-[#4F8CFF]/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[#4F8CFF]/20 rounded-full animate-ping" />
                    <CheckCircle2 className="h-10 w-10 text-[#4F8CFF] relative z-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold mb-2 text-[#F5F7FA]">You're All Set!</h2>
                    <p className="text-[#B8BDC9]">
                      Your Revive.ai account is ready to go. We'll start monitoring your deals immediately.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-[#1B1F2A] rounded-lg border border-[#3CCB7F]/20">
                    <div className="w-8 h-8 rounded-full bg-[#3CCB7F]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-[#3CCB7F]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[#F5F7FA]">Account created successfully</p>
                      <p className="text-xs text-[#B8BDC9]">Welcome, {formData.name}!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#1B1F2A] rounded-lg border border-[#3CCB7F]/20">
                    <div className="w-8 h-8 rounded-full bg-[#3CCB7F]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-[#3CCB7F]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[#F5F7FA]">GoHighLevel connected</p>
                      <p className="text-xs text-[#B8BDC9]">Location ID: {formData.locationId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#1B1F2A] rounded-lg border border-[#3CCB7F]/20">
                    <div className="w-8 h-8 rounded-full bg-[#3CCB7F]/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-[#3CCB7F]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[#F5F7FA]">Settings configured</p>
                      <p className="text-xs text-[#B8BDC9]">Threshold: {formData.thresholdDays} days</p>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full h-11 text-base font-medium"
                  size="lg"
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    await handleSubmit()
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-[#B8BDC9]">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-[#4F8CFF] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
