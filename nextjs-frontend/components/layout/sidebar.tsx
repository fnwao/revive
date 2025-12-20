"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  Zap, 
  BookOpen, 
  Settings,
  Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AcquiriLogo } from "@/components/logo"
import { getSubscription, getPlanLimits } from "@/lib/subscription"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Revived Deals", href: "/revivals", icon: Zap },
  { name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [subscription, setSubscription] = useState(getSubscription())

  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      setSubscription(getSubscription())
    }
    
    window.addEventListener("subscriptionUpdated", handleSubscriptionUpdate)
    return () => {
      window.removeEventListener("subscriptionUpdated", handleSubscriptionUpdate)
    }
  }, [])

  const limits = getPlanLimits(subscription.plan)
  const revivalsText = limits.revivalsPerMonth === -1 
    ? "Unlimited revivals" 
    : `${limits.revivalsPerMonth} revivals/month`

  const handleNewRevival = () => {
    if (pathname === "/revivals") {
      // If already on revivals page, trigger a custom event to refresh deals
      window.dispatchEvent(new CustomEvent("triggerDealDetection"))
    } else {
      // Set a flag in sessionStorage to trigger detection after navigation
      sessionStorage.setItem("triggerDealDetection", "true")
      // Navigate to revivals page
      router.push("/revivals")
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-[#E5E7EB] bg-white flex-shrink-0">
      <div className="flex h-14 items-center px-4 border-b border-[#E5E7EB] flex-shrink-0">
        <div className="flex items-center gap-2">
          <AcquiriLogo className="h-6 w-6" />
          <span className="text-base font-semibold text-[#111827]">Revive.ai</span>
        </div>
      </div>
      <div className="p-3">
        <Button 
          className="w-full justify-start" 
          size="sm" 
          variant="default"
          onClick={handleNewRevival}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Revival
        </Button>
      </div>
      <nav className="flex-1 space-y-0.5 px-2 overflow-y-auto min-h-0">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "text-[#4F8CFF] font-semibold bg-[#F9FAFB]"
                  : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB]"
              )}
            >
              {isActive && (
                <div className="h-1.5 w-1.5 rounded-full bg-[#4F8CFF] flex-shrink-0" />
              )}
              {!isActive && <div className="h-1.5 w-1.5 flex-shrink-0" />}
              <item.icon className={cn("h-4 w-4", isActive ? "text-[#4F8CFF]" : "text-[#6B7280]")} />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-[#E5E7EB] flex-shrink-0">
        <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-3">
          <p className="text-xs font-medium text-[#111827] capitalize">{subscription.plan} Plan</p>
          <p className="text-xs text-[#6B7280] mt-0.5">{revivalsText}</p>
        </div>
      </div>
    </div>
  )
}
