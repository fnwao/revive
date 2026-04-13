"use client"

import { X, Brain, MessageSquare, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIContextPanelProps {
  context: {
    analysis: {
      relationship_stage: string
      communication_style: string
      key_topics: string[]
      pain_points: string[]
      interests: string[]
      sentiment_trend: string
      last_interaction_tone: string
      specific_details: string[]
    }
    evidence: Array<{
      type: string
      direction: string
      content: string
      date: string
    }>
    stats: {
      total_messages: number
      meeting_notes_count: number
      date_range: string
    }
  }
  onClose: () => void
}

const sentimentConfig: Record<string, { color: string; icon: any; label: string }> = {
  positive: { color: "text-green-600 bg-green-50 border-green-200", icon: TrendingUp, label: "Positive" },
  negative: { color: "text-red-500 bg-red-50 border-red-200", icon: TrendingDown, label: "Negative" },
  neutral: { color: "text-gray-500 bg-gray-50 border-gray-200", icon: Minus, label: "Neutral" },
  mixed: { color: "text-amber-500 bg-amber-50 border-amber-200", icon: TrendingUp, label: "Mixed" },
}

const directionConfig: Record<string, { label: string; color: string }> = {
  inbound: { label: "Prospect", color: "bg-blue-100 text-blue-700" },
  outbound: { label: "You", color: "bg-gray-100 text-gray-700" },
  context: { label: "Meeting", color: "bg-purple-100 text-purple-700" },
}

export function AIContextPanel({ context, onClose }: AIContextPanelProps) {
  const { analysis, evidence, stats } = context
  const sentiment = sentimentConfig[analysis.sentiment_trend] || sentimentConfig.neutral

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-white border-l border-[#E5E7EB] shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#6C5CE7]" />
          <h3 className="font-semibold text-[#111827] text-sm">AI Context</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition-colors">
          <X className="h-4 w-4 text-[#6B7280]" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary badges */}
        <div className="px-5 py-4 space-y-3 border-b border-[#F3F4F6]">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#6C5CE7]/10 text-[#6C5CE7] border border-[#6C5CE7]/20">
              {analysis.relationship_stage.charAt(0).toUpperCase() + analysis.relationship_stage.slice(1)}-stage
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
              {analysis.communication_style.charAt(0).toUpperCase() + analysis.communication_style.slice(1)}
            </span>
            <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", sentiment.color)}>
              <sentiment.icon className="h-3 w-3" />
              {sentiment.label}
            </span>
          </div>
        </div>

        {/* Key Topics */}
        {analysis.key_topics.length > 0 && (
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Key Topics</h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.key_topics.map((topic, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-[#F3F4F6] text-[#374151]">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pain Points */}
        {analysis.pain_points.length > 0 && (
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Pain Points</h4>
            <ul className="space-y-1">
              {analysis.pain_points.map((point, i) => (
                <li key={i} className="text-xs text-[#374151] flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5">&#x2022;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interests */}
        {analysis.interests.length > 0 && (
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Interests</h4>
            <ul className="space-y-1">
              {analysis.interests.map((interest, i) => (
                <li key={i} className="text-xs text-[#374151] flex items-start gap-1.5">
                  <span className="text-green-400 mt-0.5">&#x2022;</span>
                  {interest}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specific Details */}
        {analysis.specific_details.length > 0 && (
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Specific Details</h4>
            <ul className="space-y-1">
              {analysis.specific_details.map((detail, i) => (
                <li key={i} className="text-xs text-[#374151] flex items-start gap-1.5">
                  <span className="text-[#6C5CE7] mt-0.5">&#x2022;</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evidence */}
        {evidence.length > 0 && (
          <div className="px-5 py-4">
            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Evidence</h4>
            <div className="space-y-3">
              {evidence.map((item, i) => {
                const dir = directionConfig[item.direction] || directionConfig.context
                const isMeeting = item.type === "meeting_notes"
                return (
                  <div key={i} className="rounded-lg border border-[#E5E7EB] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium", dir.color)}>
                        {isMeeting ? <FileText className="h-2.5 w-2.5" /> : <MessageSquare className="h-2.5 w-2.5" />}
                        {isMeeting ? "Meeting Notes" : dir.label}
                      </span>
                      {item.date && (
                        <span className="text-[10px] text-[#9CA3AF]">{item.date}</span>
                      )}
                    </div>
                    <p className="text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">{item.content}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <p className="text-[10px] text-[#9CA3AF] text-center">
          Based on {stats.total_messages} message{stats.total_messages !== 1 ? "s" : ""}
          {stats.meeting_notes_count > 0 && ` and ${stats.meeting_notes_count} meeting note${stats.meeting_notes_count !== 1 ? "s" : ""}`}
          {stats.date_range && ` (${stats.date_range})`}
        </p>
      </div>
    </div>
  )
}
