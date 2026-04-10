// API client for backend integration

const DEFAULT_BACKEND_URL = "https://backend-fnwaos-projects.vercel.app"

// Get API URL from localStorage settings or fallback to default
function getApiUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL
  }

  try {
    const savedSettings = localStorage.getItem("revive_settings")
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      if (parsed.apiUrl && parsed.apiUrl.trim()) {
        return parsed.apiUrl.trim()
      }
    }
  } catch (e) {
    console.error("Error reading API URL from settings:", e)
  }

  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL
}

export interface ApiError {
  detail: string
}

export interface StalledDeal {
  deal_id: string
  title: string
  status: string
  value: number
  currency: string
  last_activity_date: string
  days_since_activity: number
  contact_id: string
  pipeline_id: string
  tags?: string[] | null
  // Intelligence fields
  intelligence_score?: number
  priority?: "critical" | "high" | "medium" | "low"
  insights?: string[]
  recommended_action?: string
  response_probability?: number
  response_confidence?: number
  sentiment?: "positive" | "neutral" | "negative"
}

export interface MessageSequenceItem {
  message: string
  order: number
  delay_seconds: number
}

export interface Approval {
  id: string
  deal_id: string
  ghl_deal_id: string
  deal_title: string
  generated_message: string  // JSON array for sequences, or single message
  edited_message: string | null  // JSON array for edited sequences, or single message
  message_sequence?: MessageSequenceItem[]  // Parsed message sequence
  user_feedback: string | null
  status: "pending" | "approved" | "rejected" | "sent"
  created_at: string
  approved_at: string | null
  sent_at: string | null
  scheduled_at: string | null
}

export interface DashboardStats {
  active_revivals: number
  revenue_recovered: number
  success_rate: number
  avg_response_time: number
  pending_approvals: number
}

// Get API key from localStorage or default
const DEFAULT_API_KEY = "revive-default-api-key-2024"

function getApiKey(): string | null {
  if (typeof window === "undefined") return DEFAULT_API_KEY
  const key = localStorage.getItem("api_key")
  return key || DEFAULT_API_KEY
}

// Check if API key is configured
export function hasApiKey(): boolean {
  return getApiKey() !== null
}

// Check if GHL is connected (always true when backend is configured with default key)
export function isGhlConnected(): boolean {
  // Backend has GHL credentials configured, so always connected
  if (hasApiKey()) return true

  if (typeof window === "undefined") return false

  try {
    const saved = localStorage.getItem("revive_settings")
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.ghlConnected === true &&
             parsed.ghlApiKey &&
             parsed.ghlApiKey.trim() &&
             parsed.ghlLocationId &&
             parsed.ghlLocationId.trim()
    }
  } catch (e) {
    console.error("Error reading GHL connection status:", e)
  }

  return false
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey()
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
  }

  const apiUrl = getApiUrl()
  
  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const error: ApiError = await response.json()
        errorMessage = error.detail || errorMessage
      } catch {
        // If JSON parsing fails, use default message
      }
      
      // Handle specific error cases
      if (response.status === 401) {
        errorMessage = "Unauthorized. Please check your API key in Settings."
      } else if (response.status === 404) {
        errorMessage = "Endpoint not found. The backend may not be running."
      } else if (response.status >= 500) {
        errorMessage = "Server error. Please try again later."
      }
      
      throw new Error(errorMessage)
    }

    return response.json()
  } catch (error: any) {
    // Handle network errors (backend not running, CORS, etc.)
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(`Cannot connect to backend at ${apiUrl}. Is the server running?`)
    }
    // Re-throw other errors
    throw error
  }
}

// Dashboard API
export async function getDashboardStats(): Promise<DashboardStats> {
  // Check if we have a real API key, otherwise return mock data
  if (!hasApiKey()) {
    return {
      active_revivals: 12,
      revenue_recovered: 24500,
      success_rate: 68,
      avg_response_time: 2.4,
      pending_approvals: 5,
    }
  }
  
  try {
    // In production, call real endpoint
    return await fetchApi<DashboardStats>("/api/v1/dashboard/stats")
  } catch {
    // Fallback to mock data
    return {
      active_revivals: 12,
      revenue_recovered: 24500,
      success_rate: 68,
      avg_response_time: 2.4,
      pending_approvals: 5,
    }
  }
}

// Deals API
export async function detectStalledDeals(
  pipelineId?: string,
  dealIds?: string[],
  thresholdDays: number = 7,
  statusFilter?: string[],
  tagsFilter?: string[]
): Promise<{ stalled_deals: StalledDeal[]; total_found: number }> {
  // Return mock data if no API key AND GHL is not connected
  // If GHL is connected, we should try to use real API even without backend API key
  if (!hasApiKey() && !isGhlConnected()) {
    const mockDeals: StalledDeal[] = [
      {
        deal_id: "deal-001",
        title: "Sarah Johnson - Real Estate Mastery Program",
        status: "active",
        value: 5000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 10,
        contact_id: "contact-001",
        pipeline_id: "pipeline-001",
        tags: ["enterprise", "high-value"],
      },
      {
        deal_id: "deal-002",
        title: "Mike Chen - Real Estate Mastery Program",
        status: "active",
        value: 2000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 8,
        contact_id: "contact-002",
        pipeline_id: "pipeline-001",
        tags: ["startup", "small-business"],
        intelligence_score: 58.0,
        priority: "medium",
        insights: ["Deal inactive for 8 days - good time to re-engage"],
        recommended_action: "Send friendly follow-up message",
        response_probability: 55.0,
        response_confidence: 60.0,
        sentiment: "neutral",
      },
      {
        deal_id: "deal-003",
        title: "Jennifer Martinez - Real Estate Mastery Program",
        status: "won",
        value: 10000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 12,
        contact_id: "contact-003",
        pipeline_id: "pipeline-001",
        tags: ["enterprise", "premium"],
        intelligence_score: 85.0,
        priority: "critical",
        insights: ["High-value deal ($10,000) - significant revenue potential", "Deal appears to be in final stages - high conversion potential"],
        recommended_action: "Send personalized reactivation message immediately",
        response_probability: 75.0,
        response_confidence: 80.0,
        sentiment: "positive",
      },
      {
        deal_id: "deal-004",
        title: "David Park - Real Estate Mastery Program",
        status: "active",
        value: 7500,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 15,
        contact_id: "contact-004",
        pipeline_id: "pipeline-001",
        tags: ["growth", "mid-market"],
      },
      {
        deal_id: "deal-005",
        title: "Lisa Thompson - Real Estate Mastery Program",
        status: "active",
        value: 12000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 9,
        contact_id: "contact-005",
        pipeline_id: "pipeline-001",
        tags: ["enterprise", "high-value", "priority"],
        intelligence_score: 78.0,
        priority: "high",
        insights: ["High-value deal ($12,000) - significant revenue potential", "Deal inactive for 9 days - good time to re-engage"],
        recommended_action: "High-value deal - craft personalized message with specific value points",
        response_probability: 70.0,
        response_confidence: 75.0,
        sentiment: "positive",
      },
      {
        deal_id: "deal-006",
        title: "Tom Wilson - Real Estate Mastery Program",
        status: "lost",
        value: 6000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 11,
        contact_id: "contact-006",
        pipeline_id: "pipeline-001",
        tags: ["pro", "tech"],
      },
      {
        deal_id: "deal-007",
        title: "Rachel Kim - Real Estate Mastery Program",
        status: "active",
        value: 8500,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 13,
        contact_id: "contact-007",
        pipeline_id: "pipeline-001",
        tags: ["enterprise", "cloud"],
      },
      {
        deal_id: "deal-008",
        title: "James Rodriguez - Real Estate Mastery Program",
        status: "active",
        value: 7200,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 14,
        contact_id: "contact-008",
        pipeline_id: "pipeline-001",
        tags: ["premium", "mid-market"],
      },
      {
        deal_id: "deal-009",
        title: "Amanda Foster - Real Estate Mastery Program",
        status: "active",
        value: 4500,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 16,
        contact_id: "contact-009",
        pipeline_id: "pipeline-001",
        tags: ["growth", "small-business"],
      },
      {
        deal_id: "deal-010",
        title: "Robert Chen - Real Estate Mastery Program",
        status: "active",
        value: 15000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 18,
        contact_id: "contact-010",
        pipeline_id: "pipeline-001",
        tags: ["enterprise", "high-value", "priority"],
        intelligence_score: 82.0,
        priority: "critical",
        insights: ["High-value deal ($15,000) - significant revenue potential", "Deal inactive for 18 days - urgent attention needed"],
        recommended_action: "Urgent: Deal at risk - send message with value proposition",
        response_probability: 68.0,
        response_confidence: 70.0,
        sentiment: "neutral",
      },
      {
        deal_id: "deal-011",
        title: "Chris Anderson - Real Estate Mastery Program",
        status: "active",
        value: 1800,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 7,
        contact_id: "contact-011",
        pipeline_id: "pipeline-001",
        tags: ["startup", "small-business"],
      },
      {
        deal_id: "deal-012",
        title: "Patricia Lee - Real Estate Mastery Program",
        status: "active",
        value: 9200,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 19,
        contact_id: "contact-012",
        pipeline_id: "pipeline-001",
        tags: ["professional", "mid-market"],
      },
      {
        deal_id: "deal-013",
        title: "Emily Watson - Real Estate Mastery Program",
        status: "active",
        value: 18000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 6,
        contact_id: "contact-013",
        pipeline_id: "pipeline-001",
        tags: ["enterprise", "healthcare", "high-value"],
        intelligence_score: 88.0,
        priority: "critical",
        insights: ["High-value deal ($18,000) - significant revenue potential", "Deal recently active - good momentum to maintain"],
        recommended_action: "Send personalized reactivation message immediately",
        response_probability: 80.0,
        response_confidence: 85.0,
        sentiment: "positive",
      },
      {
        deal_id: "deal-014",
        title: "Michael Brown - Real Estate Mastery Program",
        status: "active",
        value: 14000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 5,
        contact_id: "contact-014",
        pipeline_id: "pipeline-001",
        tags: ["premium", "fintech", "high-value"],
      },
      {
        deal_id: "deal-015",
        title: "Jessica Taylor - Real Estate Mastery Program",
        status: "active",
        value: 6800,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 4,
        contact_id: "contact-015",
        pipeline_id: "pipeline-001",
        tags: ["growth", "education", "mid-market"],
      },
      {
        deal_id: "deal-016",
        title: "Daniel Kim - Real Estate Mastery Program",
        status: "active",
        value: 11000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 3,
        contact_id: "contact-016",
        pipeline_id: "pipeline-001",
        tags: ["professional", "retail", "high-value"],
      },
      {
        deal_id: "deal-017",
        title: "Maria Garcia - Real Estate Mastery Program",
        status: "active",
        value: 2200,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 2,
        contact_id: "contact-017",
        pipeline_id: "pipeline-001",
        tags: ["startup", "small-business", "green"],
      },
      {
        deal_id: "deal-018",
        title: "Kevin Nguyen - Real Estate Mastery Program",
        status: "active",
        value: 16000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 1,
        contact_id: "contact-018",
        pipeline_id: "pipeline-001",
        tags: ["enterprise", "logistics", "high-value", "priority"],
      },
    ]

    // Apply filters to mock data
    let filteredDeals = [...mockDeals]
    
    if (statusFilter && statusFilter.length > 0) {
      filteredDeals = filteredDeals.filter(deal => 
        deal.status && statusFilter.includes(deal.status)
      )
    }
    
    if (tagsFilter && tagsFilter.length > 0) {
      filteredDeals = filteredDeals.filter(deal => {
        const dealTags = deal.tags || []
        return tagsFilter.some(tag => dealTags.includes(tag))
      })
    }

    return {
      stalled_deals: filteredDeals,
      total_found: filteredDeals.length,
    }
  }

  const body: any = { stalled_threshold_days: thresholdDays }
  if (pipelineId) {
    body.pipeline_id = pipelineId
  } else if (dealIds && dealIds.length > 0) {
    body.deal_ids = dealIds
  } else if (!isGhlConnected()) {
    // Only use default pipeline for mock data when GHL is not connected
    body.pipeline_id = "pipeline-001"
  }
  // If GHL is connected but no pipeline_id provided, let backend handle it
  
  // Add filters
  if (statusFilter && statusFilter.length > 0) {
    body.status_filter = statusFilter
  }
  if (tagsFilter && tagsFilter.length > 0) {
    body.tags_filter = tagsFilter
  }

  try {
    const response = await fetchApi<{
      stalled_deals: StalledDeal[]
      total_found: number
      threshold_days: number
    }>("/api/v1/deals/detect-stalled", {
      method: "POST",
      body: JSON.stringify(body),
    })
    return response
  } catch (error: any) {
    console.error("Error detecting stalled deals:", error)
    // If GHL is connected but API call failed, show error instead of mock data
    if (isGhlConnected()) {
      throw new Error(`Failed to fetch real GHL data: ${error?.detail || error?.message || "Please check your API key and GHL credentials"}`)
    }
    // Fallback to mock data on error only if GHL is not connected
    const mockDeals: StalledDeal[] = [
      {
        deal_id: "deal-001",
        title: "Sarah Johnson - Real Estate Mastery Program",
        status: "active",
        value: 5000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 10,
        contact_id: "contact-001",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-002",
        title: "Mike Chen - Real Estate Mastery Program",
        status: "active",
        value: 2000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 8,
        contact_id: "contact-002",
        pipeline_id: "pipeline-001",
      },
    ]
    return {
      stalled_deals: mockDeals,
      total_found: mockDeals.length,
    }
  }
}

export async function generateMessage(dealId: string, channel: "sms" | "email" | "both" = "sms"): Promise<{
  message: string
  approval_id: string
  generated_messages?: string[]
  message_sequence?: Array<{ message: string; order: number; delay_seconds: number }>
  email_subject?: string
}> {
  // Return mock messages based on deal
  if (!hasApiKey()) {
    const messageSequences: Record<string, string[]> = {
      "deal-001": [
        "Hey Sarah! 👋",
        "I noticed we haven't connected in a while about the Real Estate Mastery Program.",
        "I wanted to check in and see if you're still interested in getting started. I know you were curious about finding deals without a ton of cash upfront - we actually just added a whole new module on creative financing strategies that I think you'd love!",
        "Want to hop on a quick call this week?"
      ],
      "deal-002": [
        "Hey Mike! Hope you're doing well.",
        "I saw we started talking about the program a few weeks back but haven't connected since.",
        "I wanted to reach out and see if you and your wife had a chance to talk about it, or if there are any questions I can answer.",
        "What works best for you?"
      ],
      "deal-003": [
        "Hi Jennifer! 👋",
        "I wanted to follow up on our conversation about the program.",
        "I know you and your husband were thinking it over - I wanted to check in and see if you have any questions.",
        "We actually just added some new content on managing real estate investing around a full-time job that I think would be perfect for you. Would you be open to a quick chat?"
      ],
      "deal-004": [
        "Hey David!",
        "Quick check-in on the program.",
        "I know you were thinking about the payment plan option - I wanted to see where things stand.",
        "Happy to answer any questions or help you figure out what works best for your situation!"
      ],
      "deal-005": [
        "Hi Lisa!",
        "Following up on our conversation about scaling your portfolio.",
        "I wanted to see if you and your husband had a chance to talk about the program, and if there's anything else I can share to help with your decision."
      ],
      "deal-006": [
        "Hey Tom!",
        "I noticed we haven't connected in a bit.",
        "I wanted to reach out and see if you're still thinking about the program, or if there's anything I can clarify.",
        "I know you were feeling overwhelmed with all the info out there - I'd love to show you how we make it simple and step-by-step. Let me know what you think!"
      ],
      "deal-007": [
        "Hey Rachel! Hope you're doing well.",
        "I wanted to check in and see if you've had a chance to think about the program.",
        "I know you were worried about fitting it around your nursing schedule - I'd love to show you how other students with demanding jobs make it work.",
        "Interested in learning more?"
      ],
      "deal-008": [
        "Hi James!",
        "Quick follow-up on the program.",
        "I know you were thinking it over and wanted to talk to your wife about it.",
        "I wanted to make sure we're still in the running! We just added some new content on getting started with a smaller budget that I think would be perfect for you. Would love to show you!"
      ],
      "deal-009": [
        "Hey Amanda!",
        "I wanted to circle back on the program we discussed.",
        "I know you're a stay-at-home mom and want to build something for your family - I think this could be perfect for you!",
        "Are you still interested in exploring this? Happy to jump on a call whenever works for you (nap time, evenings, whatever!)."
      ],
      "deal-010": [
        "Hi Robert!",
        "Following up on our conversation about building passive income.",
        "I wanted to see if you've had a chance to think about the program and if there are any questions I can answer.",
        "I'm here to help you figure out if it's the right fit. What's the best way to move forward?"
      ],
      "deal-011": [
        "Hey Chris!",
        "Hope all is well.",
        "I noticed we started talking about the program but haven't connected in a bit.",
        "I wanted to reach out and see if you're still interested or if there's anything holding you back. Happy to answer any questions!"
      ],
      "deal-012": [
        "Hi Patricia!",
        "I wanted to follow up on our conversation about the program.",
        "I know you were evaluating different options, and I wanted to make sure we address any concerns you might have.",
        "We're here to help make this work for you. What do you think?"
      ],
      "deal-013": [
        "Hi Emily!",
        "I wanted to follow up on our conversation about the program.",
        "I know you were thinking it over - I wanted to check in and see if you have any questions.",
        "Would you be open to a quick chat?"
      ],
      "deal-014": [
        "Hi Michael!",
        "Following up on our conversation about the program.",
        "I know you were evaluating different options - I wanted to make sure we're still in the running!",
        "Would love to show you how this could work for you."
      ],
      "deal-015": [
        "Hi Jessica!",
        "Quick check-in on the program.",
        "I sent over some information about how it works for people with busy schedules.",
        "Have you had a chance to review it?"
      ],
      "deal-016": [
        "Hi Daniel!",
        "Following up on our conversation.",
        "I wanted to see if you're still interested in the program or if there are any questions I can answer.",
        "Let me know what you think!"
      ],
      "deal-017": [
        "Hi Maria!",
        "Your trial is ending soon. How's everything going?",
        "I wanted to check in and see if you'd like to continue with the program or if you have any questions."
      ],
      "deal-018": [
        "Hi Kevin!",
        "Following up on our conversation about the program.",
        "I wanted to see if you're still interested or if there are any questions I can answer.",
        "Let me know what you think!"
      ],
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    const sequence = messageSequences[dealId] || [
      "Hey! 👋",
      "I wanted to follow up on our previous conversation about the Real Estate Mastery Program.",
      "Are you still interested in getting started?"
    ]

    // Return message sequence
    return {
      message: sequence[0],
      approval_id: `approval-${dealId}-${Date.now()}`,
      generated_messages: sequence,
      message_sequence: sequence.map((msg, i) => ({
        message: msg,
        order: i + 1,
        delay_seconds: i === 0 ? 0 : i === 1 ? 30 : i === 2 ? 120 : 300
      }))
    }
  }

  try {
    // Backend returns { approval_id, deal_id, generated_message, generated_messages?, message_sequence?, status, created_at }
    const response = await fetchApi<{
      approval_id: string
      deal_id: string
      generated_message: string
      generated_messages?: string[]
      message_sequence?: Array<{ message: string; order: number; delay_seconds: number }>
      email_subject?: string
      status: string
      created_at: string
    }>(`/api/v1/deals/${dealId}/generate-message?channel=${channel}`, {
      method: "POST",
    })
    
    // Parse generated_message if it's a JSON array (sequence)
    let parsedMessages: string[] = []
    let parsedSequence: Array<{ message: string; order: number; delay_seconds: number }> = []
    
    try {
      // Try to parse as JSON array first
      if (response.generated_message && response.generated_message.trim().startsWith('[')) {
        const parsed = JSON.parse(response.generated_message)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if it's an array of strings or objects
          if (typeof parsed[0] === 'string') {
            parsedMessages = parsed
          } else if (typeof parsed[0] === 'object' && parsed[0].message) {
            parsedMessages = parsed.map((item: any) => item.message || String(item))
          } else {
            parsedMessages = [response.generated_message]
          }
        } else {
          parsedMessages = [response.generated_message]
        }
      } else {
        parsedMessages = [response.generated_message]
      }
    } catch (e) {
      // If parsing fails, treat as single message
      parsedMessages = [response.generated_message || '']
    }
    
    // Use provided sequences or construct from parsed messages
    if (response.generated_messages) {
      parsedMessages = response.generated_messages
    }
    if (response.message_sequence) {
      parsedSequence = response.message_sequence
    } else if (parsedMessages.length > 1) {
      // Construct sequence with delays if not provided
      parsedSequence = parsedMessages.map((msg, i) => ({
        message: msg,
        order: i + 1,
        delay_seconds: i === 0 ? 0 : i === 1 ? 30 : i === 2 ? 120 : 300
      }))
    }
    
    // Ensure we have at least one message
    if (parsedMessages.length === 0) {
      parsedMessages = [response.generated_message || 'Message generated']
    }
    
    // Transform backend response to frontend format
    return {
      message: parsedMessages[0] || response.generated_message || 'Message generated', // First message for backward compatibility
      approval_id: response.approval_id,
      generated_messages: parsedMessages.length > 1 ? parsedMessages : undefined,
      message_sequence: parsedSequence.length > 0 ? parsedSequence : undefined,
      email_subject: response.email_subject,
    }
  } catch (error) {
    console.error("Error generating message:", error)
    // Fallback to mock message sequence
    const fallbackSequence = [
      "Hi! 👋",
      "Wanted to follow up on our previous conversation.",
      "Still interested in moving forward?"
    ]
    
    return {
      message: fallbackSequence[0],
      approval_id: `approval-${dealId}-${Date.now()}`,
      generated_messages: fallbackSequence,
      message_sequence: fallbackSequence.map((msg, i) => ({
        message: msg,
        order: i + 1,
        delay_seconds: i === 0 ? 0 : i === 1 ? 30 : 120
      }))
    }
  }
}

// Approvals API
export async function getApprovals(params?: {
  status_filter?: string
  deal_id?: string
  limit?: number
  offset?: number
}): Promise<{
  approvals: Approval[]
  total: number
  pending: number
  approved: number
  rejected: number
  sent: number
}> {
  // Return mock data if no API key
  if (!hasApiKey()) {
    // Import mock state to get persisted approvals
    const mockStateModule = await import("./mock-state")
    let mockApprovals = mockStateModule.getMockApprovals() as Approval[]
    
    // If no stored approvals, initialize with defaults
    if (mockApprovals.length === 0) {
      const defaults = mockStateModule.getDefaultMockApprovals()
      mockStateModule.saveMockApprovals(defaults)
      mockApprovals = defaults as Approval[]
    }

    let filtered = [...mockApprovals]
    
    if (params?.status_filter) {
      filtered = filtered.filter(a => a.status === params.status_filter)
    }
    
    if (params?.deal_id) {
      filtered = filtered.filter(a => a.ghl_deal_id === params.deal_id)
    }

    const limit = params?.limit || 50
    const offset = params?.offset || 0
    const paginated = filtered.slice(offset, offset + limit)

    return {
      approvals: paginated,
      total: filtered.length,
      pending: mockApprovals.filter(a => a.status === "pending").length,
      approved: mockApprovals.filter(a => a.status === "approved").length,
      rejected: mockApprovals.filter(a => a.status === "rejected").length,
      sent: mockApprovals.filter(a => a.status === "sent").length,
    }
  }

  const queryParams = new URLSearchParams()
  if (params?.status_filter) queryParams.append("status_filter", params.status_filter)
  if (params?.deal_id) queryParams.append("deal_id", params.deal_id)
  if (params?.limit) queryParams.append("limit", params.limit.toString())
  if (params?.offset) queryParams.append("offset", params.offset.toString())

  const query = queryParams.toString()
  try {
    return await fetchApi(`/api/v1/approvals${query ? `?${query}` : ""}`)
  } catch {
    // Fallback to mock data on error - return mock data directly to avoid recursion
    const mockApprovals: Approval[] = [
      {
        id: "approval-001",
        deal_id: "deal-001",
        ghl_deal_id: "deal-001",
        deal_title: "Acme Corp - Enterprise Package",
        generated_message: "Hi Sarah! I noticed we haven't connected in a while about the Enterprise Package. I wanted to check in and see if you're still interested in moving forward. We've had some great success with similar companies, and I'd love to show you how this could work for Acme Corp. Are you available for a quick call this week?",
        edited_message: null,
        user_feedback: null,
        status: "pending",
        scheduled_at: null,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        approved_at: null,
        sent_at: null,
      },
      {
        id: "approval-002",
        deal_id: "deal-002",
        ghl_deal_id: "deal-002",
        deal_title: "TechStart Inc - Starter Package",
        generated_message: "Hey Mike! Hope you're doing well. I saw we started discussing the Starter Package a few weeks back but haven't finalized things yet. I wanted to reach out and see if there are any questions I can answer or if you'd like to revisit the proposal. What works best for you?",
        edited_message: null,
        user_feedback: null,
        status: "pending",
        scheduled_at: null,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        approved_at: null,
        sent_at: null,
      },
    ]

    let filtered = [...mockApprovals]
    if (params?.status_filter) {
      filtered = filtered.filter(a => a.status === params.status_filter)
    }
    if (params?.deal_id) {
      filtered = filtered.filter(a => a.ghl_deal_id === params.deal_id)
    }

    const limit = params?.limit || 50
    const offset = params?.offset || 0
    const paginated = filtered.slice(offset, offset + limit)

    return {
      approvals: paginated,
      total: filtered.length,
      pending: mockApprovals.filter(a => a.status === "pending").length,
      approved: mockApprovals.filter(a => a.status === "approved").length,
      rejected: mockApprovals.filter(a => a.status === "rejected").length,
      sent: mockApprovals.filter(a => a.status === "sent").length,
    }
  }
}

export async function approveMessage(approvalId: string): Promise<{ id: string; status: string; message: string }> {
  if (!hasApiKey()) {
    // Simulate API call for demo - update mock state
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Import dynamically to avoid circular dependencies
    const { updateMockApproval } = await import("./mock-state")
    updateMockApproval(approvalId, {
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    
    return {
      id: approvalId,
      status: "approved",
      message: "Message approved successfully",
    }
  }

  try {
    return await fetchApi(`/api/v1/approvals/${approvalId}/approve`, {
      method: "POST",
    })
  } catch (error) {
    throw error
  }
}

export async function rejectMessage(approvalId: string): Promise<{ id: string; status: string; message: string }> {
  if (!hasApiKey()) {
    // Simulate API call for demo - update mock state
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const { updateMockApproval } = await import("./mock-state")
    updateMockApproval(approvalId, {
      status: "rejected",
    })
    
    return {
      id: approvalId,
      status: "rejected",
      message: "Message rejected",
    }
  }

  try {
    return await fetchApi(`/api/v1/approvals/${approvalId}/reject`, {
      method: "POST",
    })
  } catch (error) {
    throw error
  }
}

export async function updateEditedMessage(approvalId: string, editedMessage: string): Promise<{ id: string; status: string; message: string }> {
  if (!hasApiKey()) {
    // Simulate API call for demo - update mock state
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const { updateMockApproval } = await import("./mock-state")
    updateMockApproval(approvalId, {
      edited_message: editedMessage,
    })
    
    return {
      id: approvalId,
      status: "pending",
      message: "Message updated successfully",
    }
  }

  try {
    return await fetchApi(`/api/v1/approvals/${approvalId}/edit`, {
      method: "PUT",
      body: JSON.stringify({ edited_message: editedMessage }),
    })
  } catch (error) {
    throw error
  }
}

export async function submitFeedback(approvalId: string, feedback: string): Promise<{ id: string; status: string; message: string }> {
  if (!hasApiKey()) {
    // Simulate API call for demo - update mock state
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const { updateMockApproval } = await import("./mock-state")
    updateMockApproval(approvalId, {
      user_feedback: feedback,
    })
    
    return {
      id: approvalId,
      status: "pending",
      message: "Feedback submitted successfully",
    }
  }

  try {
    return await fetchApi(`/api/v1/approvals/${approvalId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    })
  } catch (error) {
    throw error
  }
}

export async function regenerateMessage(approvalId: string, feedback: string): Promise<{ id: string; status: string; message: string; generated_message?: string }> {
  if (!hasApiKey()) {
    // Simulate API call for demo - regenerate message with feedback
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const { getMockApproval, updateMockApproval } = await import("./mock-state")
    const approval = getMockApproval(approvalId)
    
    if (!approval) {
      throw new Error("Approval not found")
    }
    
    // Simulate regenerated message based on feedback
    const previousMessage = approval.edited_message || approval.generated_message
    let regeneratedMessage = previousMessage
    
    // Simple mock regeneration based on common feedback patterns
    const feedbackLower = feedback.toLowerCase()
    if (feedbackLower.includes("more casual") || feedbackLower.includes("less formal")) {
      regeneratedMessage = previousMessage.replace(/Hi!|Hello|Dear/g, "Hey").replace(/\./g, "!")
    } else if (feedbackLower.includes("more formal") || feedbackLower.includes("professional")) {
      regeneratedMessage = previousMessage.replace(/Hey|Hi/g, "Hello").replace(/!/g, ".")
    } else if (feedbackLower.includes("shorter") || feedbackLower.includes("concise")) {
      regeneratedMessage = previousMessage.split(".")[0] + "."
    } else if (feedbackLower.includes("longer") || feedbackLower.includes("more detail")) {
      regeneratedMessage = previousMessage + " I'd love to discuss how we can help you achieve your goals."
    } else if (feedbackLower.includes("pricing") || feedbackLower.includes("price")) {
      regeneratedMessage = previousMessage + " I can share our pricing options if you're interested."
    } else {
      // Default: add feedback context
      regeneratedMessage = previousMessage + " " + feedback
    }
    
    // Update approval with regenerated message
    updateMockApproval(approvalId, {
      generated_message: regeneratedMessage,
      user_feedback: feedback,
      status: "pending",
    })
    
    return {
      id: approvalId,
      status: "pending",
      message: "Message regenerated successfully",
      generated_message: regeneratedMessage,
    }
  }

  try {
    return await fetchApi(`/api/v1/approvals/${approvalId}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    })
  } catch (error) {
    throw error
  }
}

// Knowledge Base Chat API
export async function chatWithKnowledgeBase(
  message: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<{ response: string; document_created: boolean; document_id: string | null; document_title?: string; document_content?: string }> {
  if (!hasApiKey()) {
    // Mock implementation for demo - use AI-like logic
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Determine if we should create a document based on message intent
    const messageLower = message.toLowerCase()
    const shouldCreate = messageLower.includes("add") || 
                        messageLower.includes("create") ||
                        messageLower.includes("update") ||
                        messageLower.includes("save") ||
                        messageLower.includes("document") ||
                        messageLower.includes("faq") ||
                        messageLower.includes("script") ||
                        messageLower.includes("pricing")
    
    if (shouldCreate) {
      // Import and add document to mock storage
      const { addDocument } = await import("./knowledge-base")
      
      // Generate a better document based on message content
      let docTitle = "Document from Chat"
      let docContent = `# Document Created from Chat\n\n${message}\n\nThis document was created through the chat interface.`
      let docType = "TXT"
      
      // Try to infer document type and create better content
      if (messageLower.includes("faq") || messageLower.includes("question")) {
        docTitle = "FAQ - " + message.split(" ").slice(0, 5).join(" ")
        docType = "FAQ"
        docContent = `# FAQ\n\n## Question\n${message}\n\n## Answer\n[Answer to be provided]`
      } else if (messageLower.includes("script") || messageLower.includes("sales")) {
        docTitle = "Sales Script - " + message.split(" ").slice(0, 5).join(" ")
        docType = "Sales Script"
        docContent = `# Sales Script\n\n## Opening\n${message}\n\n## Key Points\n- Point 1\n- Point 2\n\n## Closing\n[Closing statement]`
      } else if (messageLower.includes("pricing") || messageLower.includes("price")) {
        docTitle = "Pricing Information"
        docType = "Pricing Guide"
        docContent = `# Pricing Information\n\n${message}\n\n## Pricing Tiers\n\n[Add your pricing tiers here]`
      } else {
        // Generic document
        docTitle = message.split(" ").slice(0, 8).join(" ") || "Document from Chat"
        if (docTitle.length > 50) docTitle = docTitle.substring(0, 50) + "..."
        docContent = `# ${docTitle}\n\n${message}\n\n## Details\n\n[Additional details can be added here]`
      }
      
      const doc = addDocument({
        name: docTitle,
        type: docType,
        size: docContent.length,
        content: docContent,
        tags: ["chat-created"],
      })
      
      return {
        response: `I've created a document titled "${docTitle}" in your knowledge base based on your message. You can find it in the documents list and edit it if needed.`,
        document_created: true,
        document_id: doc.id,
        document_title: docTitle,
        document_content: docContent,
      }
    }
    
    return {
      response: "I understand. Could you provide more details about what information you'd like to add to the knowledge base? For example, you could say 'Add a FAQ about pricing' or 'Create a sales script for cold outreach'.",
      document_created: false,
      document_id: null,
    }
  }

  try {
    const result = await fetchApi<{ response: string; document_created: boolean; document_id: string | null }>("/api/v1/knowledge-base/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory || [],
      }),
    })
    
    // If document was created, we need to add it to local storage for consistency
    // In a real app, you'd fetch the document from the backend
    if (result.document_created && result.document_id) {
      // The document is already in the backend database
      // For now, we'll rely on the parent component to refresh
      // In the future, we could add a GET endpoint to fetch the document
    }
    
    return result
  } catch (error) {
    throw error
  }
}

export async function sendMessage(
  approvalId: string, 
  editedMessage?: string,
  scheduledAt?: string | Date,
  channel?: "sms" | "email" | "both",
  emailSubject?: string
): Promise<{ id: string; status: string; message: string; sent: boolean }> {
  if (!hasApiKey()) {
    // Simulate API call for demo - update mock state
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const { updateMockApproval } = await import("./mock-state")
    const isScheduled = scheduledAt !== undefined
    const scheduledTime = scheduledAt ? (typeof scheduledAt === 'string' ? scheduledAt : scheduledAt.toISOString()) : null
    
    updateMockApproval(approvalId, {
      status: isScheduled ? "approved" : "sent",
      sent_at: isScheduled ? null : new Date().toISOString(),
      scheduled_at: scheduledTime,
      edited_message: editedMessage || null,
    })
    
    return {
      id: approvalId,
      status: isScheduled ? "approved" : "sent",
      message: isScheduled 
        ? `Message scheduled for ${new Date(scheduledTime!).toLocaleString()}`
        : "Message sent successfully",
      sent: !isScheduled,
    }
  }

  try {
    const body: any = {}
    if (editedMessage) {
      body.edited_message = editedMessage
    }
    if (scheduledAt) {
      body.scheduled_at = typeof scheduledAt === 'string' ? scheduledAt : scheduledAt.toISOString()
    }
    if (channel) {
      body.channel = channel
    }
    if (emailSubject) {
      body.email_subject = emailSubject
    }
    return await fetchApi(`/api/v1/approvals/${approvalId}/send`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw error
  }
}

// Settings API
export interface ReactivationRule {
  id: string
  name: string
  enabled: boolean
  statuses: string[]
  tags: string[]
  thresholdDays: number
  priority: number
}

export interface UserSettings {
  id: string
  user_id: string
  auto_detect_stalled: boolean
  stalled_threshold_days: number
  require_approval: boolean
  auto_approve: boolean
  email_notifications: boolean
  sms_notifications: boolean
  notify_on_stalled: boolean
  notify_on_response: boolean
  ghl_connected: boolean
  ghl_api_key: string | null
  ghl_location_id: string | null
  reactivation_rules?: ReactivationRule[]
  created_at: string
  updated_at: string | null
}

export interface UserSettingsUpdate {
  auto_detect_stalled?: boolean
  stalled_threshold_days?: number
  require_approval?: boolean
  auto_approve?: boolean
  email_notifications?: boolean
  sms_notifications?: boolean
  notify_on_stalled?: boolean
  notify_on_response?: boolean
  ghl_connected?: boolean
  ghl_api_key?: string | null
  ghl_location_id?: string | null
  reactivation_rules?: ReactivationRule[]
}

export async function getSettings(): Promise<UserSettings> {
  if (!hasApiKey()) {
    // Return default settings from localStorage if no API key
    const saved = localStorage.getItem("revive_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          id: "local-settings",
          user_id: "local-user",
          auto_detect_stalled: parsed.autoDetectStalled ?? true,
          stalled_threshold_days: parsed.stalledThresholdDays ?? 7,
          require_approval: parsed.requireApproval ?? true,
          auto_approve: parsed.autoApprove ?? false,
          email_notifications: parsed.emailNotifications ?? true,
          sms_notifications: parsed.smsNotifications ?? false,
          notify_on_stalled: parsed.notifyOnStalled ?? true,
          notify_on_response: parsed.notifyOnResponse ?? true,
          ghl_connected: parsed.ghlConnected ?? false,
          ghl_api_key: parsed.ghlApiKey ?? null,
          ghl_location_id: parsed.ghlLocationId ?? null,
          created_at: new Date().toISOString(),
          updated_at: null,
        }
      } catch {
        // Fall through to default
      }
    }
    
      // Return default settings
      return {
        id: "local-settings",
        user_id: "local-user",
        auto_detect_stalled: true,
        stalled_threshold_days: 7,
        require_approval: true,
        auto_approve: false,
        email_notifications: true,
        reactivation_rules: [
          {
            id: "default-rule",
            name: "Default Rule",
            enabled: true,
            statuses: ["active"],
            tags: [],
            thresholdDays: 7,
            priority: 1,
          },
        ] as ReactivationRule[],
      sms_notifications: false,
      notify_on_stalled: true,
      notify_on_response: true,
      ghl_connected: false,
      ghl_api_key: null,
      ghl_location_id: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    }
  }

  try {
    return await fetchApi<UserSettings>("/api/v1/settings")
  } catch (error: any) {
    console.warn("Error fetching settings from backend, using localStorage:", error.message)
    // Fallback to localStorage - don't throw, just use local storage
    const saved = localStorage.getItem("revive_settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          id: "local-settings",
          user_id: "local-user",
          auto_detect_stalled: parsed.autoDetectStalled ?? true,
          stalled_threshold_days: parsed.stalledThresholdDays ?? 7,
          require_approval: parsed.requireApproval ?? true,
          auto_approve: parsed.autoApprove ?? false,
          email_notifications: parsed.emailNotifications ?? true,
          sms_notifications: parsed.smsNotifications ?? false,
          notify_on_stalled: parsed.notifyOnStalled ?? true,
          notify_on_response: parsed.notifyOnResponse ?? true,
          ghl_connected: parsed.ghlConnected ?? false,
          ghl_api_key: parsed.ghlApiKey ?? null,
          ghl_location_id: parsed.ghlLocationId ?? null,
          created_at: new Date().toISOString(),
          updated_at: null,
        }
      } catch {
        // Fall through to default
      }
    }
    
    // Return default settings instead of throwing
    return {
      id: "local-settings",
      user_id: "local-user",
      auto_detect_stalled: true,
      stalled_threshold_days: 7,
      require_approval: true,
      auto_approve: false,
      email_notifications: true,
      sms_notifications: false,
      notify_on_stalled: true,
      notify_on_response: true,
      ghl_connected: false,
      ghl_api_key: null,
      ghl_location_id: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    }
  }
}

export async function updateSettings(settings: UserSettingsUpdate): Promise<UserSettings> {
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  
  if (!apiKey) {
    throw new Error("API key not configured")
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/v1/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(settings),
    })
    
    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(error.detail || "Failed to update settings")
    }
    
    return await response.json()
  } catch (error) {
    console.error("Error updating settings:", error)
    throw error
  }
}

// ========== NOTIFICATIONS ==========

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  status: "unread" | "read" | "archived"
  read_at?: string
  created_at: string
}

export interface NotificationListResponse {
  notifications: Notification[]
  total: number
  unread_count: number
}

export async function getNotifications(params?: {
  status_filter?: string
  limit?: number
  offset?: number
}): Promise<NotificationListResponse> {
  if (!hasApiKey()) {
    // Return mock data
    return {
      notifications: [],
      total: 0,
      unread_count: 0,
    }
  }

  const queryParams = new URLSearchParams()
  if (params?.status_filter) queryParams.append("status_filter", params.status_filter)
  if (params?.limit) queryParams.append("limit", params.limit.toString())
  if (params?.offset) queryParams.append("offset", params.offset.toString())

  const query = queryParams.toString()
  try {
    return await fetchApi(`/api/v1/notifications${query ? `?${query}` : ""}`)
  } catch {
    return {
      notifications: [],
      total: 0,
      unread_count: 0,
    }
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  if (!hasApiKey()) {
    return 0
  }

  try {
    const response = await fetchApi<{ unread_count: number }>("/api/v1/notifications/unread-count")
    return response.unread_count
  } catch {
    return 0
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!hasApiKey()) {
    return
  }

  try {
    await fetchApi(`/api/v1/notifications/${notificationId}/read`, {
      method: "POST",
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
  }
}

export async function markAllNotificationsAsRead(): Promise<number> {
  if (!hasApiKey()) {
    return 0
  }

  try {
    const response = await fetchApi<{ marked_count: number }>("/api/v1/notifications/mark-all-read", {
      method: "POST",
    })
    return response.marked_count
  } catch {
    return 0
  }
}

// ========== TEMPLATES ==========

export interface MessageTemplate {
  id: string
  name: string
  description?: string
  type: "sms" | "email" | "both"
  category?: string
  subject?: string
  body: string
  variables?: string[]
  usage_count: number
  success_rate?: number
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at?: string
  created_by?: string
}

export interface TemplateListResponse {
  templates: MessageTemplate[]
  total: number
}

export async function getTemplates(params?: {
  category?: string
  type?: string
  is_active?: boolean
  include_public?: boolean
}): Promise<TemplateListResponse> {
  if (!hasApiKey()) {
    return {
      templates: [],
      total: 0,
    }
  }

  const queryParams = new URLSearchParams()
  if (params?.category) queryParams.append("category", params.category)
  if (params?.type) queryParams.append("type", params.type)
  if (params?.is_active !== undefined) queryParams.append("is_active", params.is_active.toString())
  if (params?.include_public !== undefined) queryParams.append("include_public", params.include_public.toString())

  const query = queryParams.toString()
  try {
    return await fetchApi(`/api/v1/templates${query ? `?${query}` : ""}`)
  } catch {
    return {
      templates: [],
      total: 0,
    }
  }
}

export async function createTemplate(template: {
  name: string
  description?: string
  type: "sms" | "email" | "both"
  category?: string
  subject?: string
  body: string
  variables?: string[]
  is_public?: boolean
}): Promise<MessageTemplate> {
  if (!hasApiKey()) {
    throw new Error("API key not configured")
  }

  try {
    return await fetchApi("/api/v1/templates", {
      method: "POST",
      body: JSON.stringify(template),
    })
  } catch (error) {
    console.error("Error creating template:", error)
    throw error
  }
}

export async function updateTemplate(templateId: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate> {
  if (!hasApiKey()) {
    throw new Error("API key not configured")
  }

  try {
    return await fetchApi(`/api/v1/templates/${templateId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  } catch (error) {
    console.error("Error updating template:", error)
    throw error
  }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  if (!hasApiKey()) {
    return
  }

  try {
    await fetchApi(`/api/v1/templates/${templateId}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("Error deleting template:", error)
    throw error
  }
}

// ========== TEAMS ==========

export interface Team {
  id: string
  name: string
  description?: string
  settings?: Record<string, any>
  created_at: string
  member_count: number
  current_user_role?: string
}

export interface TeamMember {
  id: string
  user_id: string
  user_email: string
  role: string
  permissions?: Record<string, any>
  is_active: boolean
  joined_at: string
}

export interface TeamListResponse {
  teams: Team[]
  total: number
}

export async function getTeams(): Promise<TeamListResponse> {
  if (!hasApiKey()) {
    return {
      teams: [],
      total: 0,
    }
  }

  try {
    return await fetchApi("/api/v1/teams")
  } catch {
    return {
      teams: [],
      total: 0,
    }
  }
}

export async function createTeam(team: { name: string; description?: string }): Promise<Team> {
  if (!hasApiKey()) {
    throw new Error("API key not configured")
  }

  try {
    return await fetchApi("/api/v1/teams", {
      method: "POST",
      body: JSON.stringify(team),
    })
  } catch (error) {
    console.error("Error creating team:", error)
    throw error
  }
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  if (!hasApiKey()) {
    return []
  }

  try {
    return await fetchApi(`/api/v1/teams/${teamId}/members`)
  } catch {
    return []
  }
}

export async function addTeamMember(teamId: string, member: { user_id: string; role: string; permissions?: Record<string, any> }): Promise<TeamMember> {
  if (!hasApiKey()) {
    throw new Error("API key not configured")
  }

  try {
    return await fetchApi(`/api/v1/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify(member),
    })
  } catch (error) {
    console.error("Error adding team member:", error)
    throw error
  }
}

// ========== WEBHOOKS ==========

export interface Webhook {
  id: string
  name: string
  url: string
  secret?: string
  events: string[]
  status: "active" | "inactive" | "failed"
  retry_count: number
  timeout_seconds: number
  total_requests: number
  successful_requests: number
  failed_requests: number
  last_triggered_at?: string
  last_success_at?: string
  last_failure_at?: string
  created_at: string
}

export interface WebhookDelivery {
  id: string
  event_type: string
  status: string
  response_status?: number
  attempts: number
  error_message?: string
  triggered_at: string
  delivered_at?: string
}

export interface WebhookListResponse {
  webhooks: Webhook[]
  total: number
}

export async function getWebhooks(params?: { status_filter?: string }): Promise<WebhookListResponse> {
  if (!hasApiKey()) {
    return {
      webhooks: [],
      total: 0,
    }
  }

  const queryParams = new URLSearchParams()
  if (params?.status_filter) queryParams.append("status_filter", params.status_filter)

  const query = queryParams.toString()
  try {
    return await fetchApi(`/api/v1/webhooks${query ? `?${query}` : ""}`)
  } catch {
    return {
      webhooks: [],
      total: 0,
    }
  }
}

export async function createWebhook(webhook: {
  name: string
  url: string
  secret?: string
  events: string[]
  retry_count?: number
  timeout_seconds?: number
}): Promise<Webhook> {
  if (!hasApiKey()) {
    throw new Error("API key not configured")
  }

  try {
    return await fetchApi("/api/v1/webhooks", {
      method: "POST",
      body: JSON.stringify(webhook),
    })
  } catch (error) {
    console.error("Error creating webhook:", error)
    throw error
  }
}

export async function updateWebhook(webhookId: string, updates: Partial<Webhook> & Record<string, any>): Promise<Webhook> {
  if (!hasApiKey()) {
    throw new Error("API key not configured")
  }

  try {
    return await fetchApi(`/api/v1/webhooks/${webhookId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  } catch (error) {
    console.error("Error updating webhook:", error)
    throw error
  }
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  if (!hasApiKey()) {
    return
  }

  try {
    await fetchApi(`/api/v1/webhooks/${webhookId}`, {
      method: "DELETE",
    })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    throw error
  }
}

export async function getWebhookDeliveries(webhookId: string, params?: {
  limit?: number
  offset?: number
  status_filter?: string
}): Promise<WebhookDelivery[]> {
  if (!hasApiKey()) {
    return []
  }

  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.append("limit", params.limit.toString())
  if (params?.offset) queryParams.append("offset", params.offset.toString())
  if (params?.status_filter) queryParams.append("status_filter", params.status_filter)

  const query = queryParams.toString()
  try {
    return await fetchApi(`/api/v1/webhooks/${webhookId}/deliveries${query ? `?${query}` : ""}`)
  } catch {
    return []
  }
}

// Note: sendMessage function is already defined above with email support

