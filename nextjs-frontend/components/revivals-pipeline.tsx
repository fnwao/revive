"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Clock, Tag, User, MessageSquare, Calendar, AlertCircle, Check, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StalledDeal, Approval } from "@/lib/api"
// Date formatting helper
const formatDistanceToNow = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? "s" : ""} ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? "s" : ""} ago`
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) !== 1 ? "s" : ""} ago`
}

interface PipelineViewProps {
  stalledDeals: StalledDeal[]
  approvals: Approval[]
  onDealClick: (deal: StalledDeal) => void
  selectedDeal: StalledDeal | null
}

type PipelineColumn = {
  id: string
  title: string
  statuses: string[]
  color: string
}

const pipelineColumns: PipelineColumn[] = [
  {
    id: "detected",
    title: "Detected",
    statuses: ["active", "new"],
    color: "bg-blue-500",
  },
  {
    id: "pending",
    title: "Pending Approval",
    statuses: ["pending"],
    color: "bg-yellow-500",
  },
  {
    id: "approved",
    title: "Approved",
    statuses: ["approved"],
    color: "bg-green-500",
  },
  {
    id: "sent",
    title: "Sent",
    statuses: ["sent"],
    color: "bg-purple-500",
  },
  {
    id: "responded",
    title: "Responded",
    statuses: ["responded"],
    color: "bg-emerald-500",
  },
]

export function RevivalsPipeline({ stalledDeals, approvals, onDealClick, selectedDeal }: PipelineViewProps) {
  const [draggedDeal, setDraggedDeal] = useState<StalledDeal | null>(null)

  // Group deals by their approval status or default to "detected"
  const getDealColumn = (deal: StalledDeal): string => {
    const approval = approvals.find(a => a.ghl_deal_id === deal.deal_id)
    if (approval) {
      if (approval.status === "pending") return "pending"
      if (approval.status === "approved") return "approved"
      if (approval.status === "sent") return "sent"
    }
    return "detected"
  }

  const dealsByColumn = pipelineColumns.reduce((acc, column) => {
    acc[column.id] = stalledDeals.filter(deal => {
      const dealColumn = getDealColumn(deal)
      return dealColumn === column.id
    })
    return acc
  }, {} as Record<string, StalledDeal[]>)

  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString))
    } catch {
      return "Unknown"
    }
  }

  const handleDragStart = (deal: StalledDeal) => {
    setDraggedDeal(deal)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.currentTarget.classList.add("opacity-50")
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50")
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.currentTarget.classList.remove("opacity-50")
    
    if (draggedDeal) {
      // In a real implementation, this would update the deal status via API
      console.log(`Moving deal ${draggedDeal.deal_id} to column ${columnId}`)
      setDraggedDeal(null)
    }
  }

  return (
    <div className="flex-1 overflow-x-auto pb-6 bg-white">
      <div className="flex gap-4 min-w-max px-4 py-6">
        {pipelineColumns.map((column) => {
          const deals = dealsByColumn[column.id] || []
          const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0)

          return (
            <div
              key={column.id}
              className="flex flex-col w-80 flex-shrink-0"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", column.color)} />
                    <h3 className="font-semibold text-sm text-[#111827]">{column.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {deals.length}
                    </Badge>
                  </div>
                </div>
                {totalValue > 0 && (
                  <p className="text-xs text-[#6B7280]">
                    {formatCurrency(totalValue)}
                  </p>
                )}
              </div>

              {/* Column Cards */}
              <div className="flex-1 space-y-3 min-h-[200px] max-h-[calc(100vh-250px)] overflow-y-auto">
                {deals.length === 0 ? (
                  <div className="flex items-center justify-center h-32 border-2 border-dashed border-[#E5E7EB] rounded-lg bg-[#F9FAFB]">
                    <p className="text-xs text-[#6B7280]">No deals</p>
                  </div>
                ) : (
                  deals.map((deal) => {
                    const approval = approvals.find(a => a.ghl_deal_id === deal.deal_id)
                    const isSelected = selectedDeal?.deal_id === deal.deal_id

                    return (
                      <Card
                        key={deal.deal_id}
                        draggable
                        onDragStart={() => handleDragStart(deal)}
                        onClick={() => onDealClick(deal)}
                        className={cn(
                          "p-4 cursor-pointer transition-all hover:shadow-md border-[#E5E7EB]",
                          isSelected && "ring-2 ring-[#4F8CFF] border-[#4F8CFF]",
                          draggedDeal?.deal_id === deal.deal_id && "opacity-50"
                        )}
                      >
                        <div className="space-y-2">
                          {/* Deal Title */}
                          <div>
                            <h4 className="font-semibold text-sm text-[#111827] mb-1.5 line-clamp-2">
                              {deal.title}
                            </h4>
                          </div>

                          {/* Deal Value & Days */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                              <DollarSign className="h-3 w-3" />
                              <span>{formatCurrency(deal.value, deal.currency)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                              <Clock className="h-3 w-3" />
                              <span>{deal.days_since_activity}d</span>
                            </div>
                          </div>

                          {/* Approval Status - Simplified */}
                          {approval && (
                            <div className="pt-2 border-t border-[#E5E7EB]">
                              <div className="flex items-center gap-1.5">
                                {approval.status === "pending" && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                                {approval.status === "approved" && <Check className="h-3 w-3 text-green-500" />}
                                {approval.status === "sent" && <Send className="h-3 w-3 text-blue-500" />}
                                <span className="text-xs text-[#6B7280] capitalize">
                                  {approval.status}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

