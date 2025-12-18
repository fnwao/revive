"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { AcquiriLogo } from "@/components/logo"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1115] p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <AcquiriLogo className="h-10 w-10" />
            <h1 className="text-4xl font-bold tracking-tight text-[#F5F7FA]">Revive.ai</h1>
          </div>
          <p className="text-[#B8BDC9]">
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-[#1B1F2A] border-[#2A2F3A]">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2 text-[#F5F7FA]">Welcome back</h2>
              <p className="text-[#B8BDC9] text-sm">
                Enter your credentials to access your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-[#1B1F2A] border border-[#E06C75]/20 rounded-lg flex items-center gap-2 text-sm text-[#E06C75]">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-[#4F8CFF] hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
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
                    className="h-11 pr-10"
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
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                size="lg"
                disabled={loading || !email || !password}
                onClick={(e) => {
                  // Ensure form submission works
                  if (!email || !password) {
                    e.preventDefault()
                    setError("Please fill in all fields")
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-[#B8BDC9]">
          <p>
            Don't have an account?{" "}
            <Link href="/signup" className="text-[#4F8CFF] hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
