"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, AlertCircle, Mail, Lock, ArrowRight, CheckCircle2, Sparkles } from "lucide-react"
import { AcquiriLogo } from "@/components/logo"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For demo: create a user if they don't exist
      const { getUser, saveUser } = await import("@/lib/user")
      let user = getUser()
      if (!user) {
        // Create demo user
        user = {
          id: `user-${Date.now()}`,
          name: email.split("@")[0],
          email: email,
          createdAt: new Date().toISOString(),
        }
        saveUser(user)
      }
      
      // Redirect to dashboard
      window.location.href = "/dashboard"
    } catch (error) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Email validation
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Handle email blur
  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setError("Please enter a valid email address")
    } else if (error && validateEmail(email)) {
      setError("")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#F9FAFB] to-[#F3F4F6] p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#4F8CFF]/20 blur-xl rounded-full" />
              <AcquiriLogo className="h-12 w-12 relative z-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[#111827] to-[#4F8CFF] bg-clip-text text-transparent">
              Revive.ai
            </h1>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[#111827]">Welcome back</h2>
            <p className="text-[#6B7280]">
              Sign in to continue recovering revenue from stalled deals
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-white border-[#E5E7EB] shadow-lg">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-[#FEF2F2] border border-[#E06C75]/30 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-[#E06C75] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#E06C75] mb-1">Error</p>
                    <p className="text-sm text-[#E06C75]/80">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-[#111827]">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError("")
                    }}
                    onBlur={handleEmailBlur}
                    required
                    className={cn(
                      "h-12 pl-10",
                      error && email && !validateEmail(email) && "border-[#E06C75] focus-visible:ring-[#E06C75]"
                    )}
                  />
                  {email && validateEmail(email) && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3CCB7F]" />
                  )}
                </div>
                {email && !validateEmail(email) && (
                  <p className="text-xs text-[#E06C75]">Please enter a valid email address</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-[#111827]">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-[#4F8CFF] hover:text-[#6EA0FF] hover:underline font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError("")
                    }}
                    required
                    className="h-12 pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-[#6B7280]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#6B7280]" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E5E7EB] text-[#4F8CFF] focus:ring-[#4F8CFF] focus:ring-2"
                  />
                  <span className="text-sm text-[#6B7280] group-hover:text-[#111827] transition-colors">
                    Remember me
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] transition-all shadow-md hover:shadow-lg"
                size="lg"
                disabled={loading || !email || !password || (email ? !validateEmail(email) : false)}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-4">
          <div className="flex items-center gap-2 justify-center text-sm text-[#6B7280]">
            <p>
              Don't have an account?{" "}
              <Link href="/signup" className="text-[#4F8CFF] hover:text-[#6EA0FF] hover:underline font-semibold transition-colors">
                Sign up for free
              </Link>
            </p>
          </div>
          
          {/* Demo Mode Notice */}
          <div className="p-3 bg-[#4F8CFF]/5 border border-[#4F8CFF]/20 rounded-lg">
            <div className="flex items-center gap-2 justify-center text-xs text-[#6B7280]">
              <Sparkles className="h-3.5 w-3.5 text-[#4F8CFF]" />
              <span>
                Demo mode: Use any email and password to explore the platform
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
