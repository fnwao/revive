// API client for backend integration

// Get API URL from localStorage settings or fallback to env/default
function getApiUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
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
  
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
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
}

export interface Approval {
  id: string
  deal_id: string
  ghl_deal_id: string
  deal_title: string
  generated_message: string
  edited_message: string | null
  status: "pending" | "approved" | "rejected" | "sent"
  created_at: string
  approved_at: string | null
  sent_at: string | null
}

export interface DashboardStats {
  active_revivals: number
  revenue_recovered: number
  success_rate: number
  avg_response_time: number
  pending_approvals: number
}

// Get API key from localStorage (in real app, use proper auth)
function getApiKey(): string | null {
  if (typeof window === "undefined") return null
  const key = localStorage.getItem("api_key")
  return key || null
}

// Check if API key is configured
export function hasApiKey(): boolean {
  return getApiKey() !== null
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
  thresholdDays: number = 7
): Promise<{ stalled_deals: StalledDeal[]; total_found: number }> {
  // Return mock data if no API key
  if (!hasApiKey()) {
    const mockDeals: StalledDeal[] = [
      {
        deal_id: "deal-001",
        title: "Acme Corp - Enterprise Package",
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
        title: "TechStart Inc - Starter Package",
        status: "active",
        value: 2000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 8,
        contact_id: "contact-002",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-003",
        title: "Global Solutions - Premium",
        status: "active",
        value: 10000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 12,
        contact_id: "contact-003",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-004",
        title: "InnovateCo - Growth Package",
        status: "active",
        value: 7500,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 15,
        contact_id: "contact-004",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-005",
        title: "ScaleUp Ventures - Enterprise",
        status: "active",
        value: 12000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 9,
        contact_id: "contact-005",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-006",
        title: "DataFlow Systems - Pro Package",
        status: "active",
        value: 6000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 11,
        contact_id: "contact-006",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-007",
        title: "CloudSync Technologies - Enterprise",
        status: "active",
        value: 8500,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 13,
        contact_id: "contact-007",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-008",
        title: "NextGen Solutions - Premium",
        status: "active",
        value: 7200,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 14,
        contact_id: "contact-008",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-009",
        title: "Velocity Partners - Growth Package",
        status: "active",
        value: 4500,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 16,
        contact_id: "contact-009",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-010",
        title: "PrimeTech Industries - Enterprise",
        status: "active",
        value: 15000,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 18,
        contact_id: "contact-010",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-011",
        title: "Apex Digital - Starter Package",
        status: "active",
        value: 1800,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 7,
        contact_id: "contact-011",
        pipeline_id: "pipeline-001",
      },
      {
        deal_id: "deal-012",
        title: "Summit Enterprises - Professional",
        status: "active",
        value: 9200,
        currency: "USD",
        last_activity_date: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString(),
        days_since_activity: 19,
        contact_id: "contact-012",
        pipeline_id: "pipeline-001",
      },
    ]

    return {
      stalled_deals: mockDeals,
      total_found: mockDeals.length,
    }
  }

  const body: any = { stalled_threshold_days: thresholdDays }
  if (pipelineId) {
    body.pipeline_id = pipelineId
  } else if (dealIds && dealIds.length > 0) {
    body.deal_ids = dealIds
  } else {
    // Default to a pipeline ID if none provided (for testing with database deals)
    body.pipeline_id = "pipeline-001"
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
  } catch (error) {
    console.error("Error detecting stalled deals:", error)
    // Fallback to mock data on error
    const mockDeals: StalledDeal[] = [
      {
        deal_id: "deal-001",
        title: "Acme Corp - Enterprise Package",
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
        title: "TechStart Inc - Starter Package",
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

export async function generateMessage(dealId: string): Promise<{ message: string; approval_id: string }> {
  // Return mock messages based on deal
  if (!hasApiKey()) {
    const messages: Record<string, string> = {
      "deal-001": "Hi Sarah! I noticed we haven't connected in a while about the Enterprise Package. I wanted to check in and see if you're still interested in moving forward. We've had some great success with similar companies, and I'd love to show you how this could work for Acme Corp. Are you available for a quick call this week?",
      "deal-002": "Hey Mike! Hope you're doing well. I saw we started discussing the Starter Package a few weeks back but haven't finalized things yet. I wanted to reach out and see if there are any questions I can answer or if you'd like to revisit the proposal. What works best for you?",
      "deal-003": "Hi Jennifer! I wanted to follow up on our Premium package discussion. I know timing is everything, and I wanted to make sure we're aligned on next steps. We've added some new features that might be perfect for Global Solutions. Would you be open to a brief conversation?",
      "deal-004": "Hey David! Quick check-in on the Growth Package. I know you were evaluating options, and I wanted to see where things stand. Happy to answer any questions or adjust the proposal to better fit your needs.",
      "deal-005": "Hi Lisa! Following up on our Enterprise package discussion. I wanted to see if you've had a chance to review the proposal and if there's anything else I can provide to help with your decision.",
      "deal-006": "Hi Tom! I noticed we haven't touched base on the Pro Package in a bit. I wanted to reach out and see if you're still considering it or if there's anything I can clarify. Let me know what you think!",
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    return {
      message: messages[dealId] || "Hi! I wanted to follow up on our previous conversation. Are you still interested in moving forward?",
      approval_id: `approval-${dealId}-${Date.now()}`,
    }
  }

  try {
    // Backend returns { approval_id, deal_id, generated_message, status, created_at }
    const response = await fetchApi<{
      approval_id: string
      deal_id: string
      generated_message: string
      status: string
      created_at: string
    }>(`/api/v1/deals/${dealId}/generate-message`, {
      method: "POST",
    })
    
    // Transform backend response to frontend format
    return {
      message: response.generated_message,
      approval_id: response.approval_id,
    }
  } catch (error) {
    console.error("Error generating message:", error)
    // Fallback to mock message
    const messages: Record<string, string> = {
      "deal-001": "Hi Sarah! I noticed we haven't connected in a while about the Enterprise Package. I wanted to check in and see if you're still interested in moving forward.",
      "deal-002": "Hey Mike! Hope you're doing well. I saw we started discussing the Starter Package a few weeks back but haven't finalized things yet.",
    }
    return {
      message: messages[dealId] || "Hi! I wanted to follow up on our previous conversation. Are you still interested in moving forward?",
      approval_id: `approval-${dealId}-${Date.now()}`,
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
        status: "pending",
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
        status: "pending",
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

export async function sendMessage(approvalId: string): Promise<{ id: string; status: string; message: string; sent: boolean }> {
  if (!hasApiKey()) {
    // Simulate API call for demo - update mock state
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const { updateMockApproval } = await import("./mock-state")
    updateMockApproval(approvalId, {
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    
    return {
      id: approvalId,
      status: "sent",
      message: "Message sent successfully",
      sent: true,
    }
  }

  try {
    return await fetchApi(`/api/v1/approvals/${approvalId}/send`, {
      method: "POST",
    })
  } catch (error) {
    throw error
  }
}

