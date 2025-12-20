// Mock state management for demo mode
// This allows the dashboard to work fully without a backend

interface MockApproval {
  id: string
  deal_id: string
  ghl_deal_id: string
  deal_title: string
  generated_message: string
  edited_message: string | null
  user_feedback: string | null
  status: "pending" | "approved" | "rejected" | "sent"
  created_at: string
  approved_at: string | null
  sent_at: string | null
  scheduled_at: string | null
}

const MOCK_STORAGE_KEY = "revive_mock_approvals"

export function getMockApprovals(): MockApproval[] {
  if (typeof window === "undefined") return getDefaultMockApprovals()
  
  const stored = localStorage.getItem(MOCK_STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // Only use stored if it has data, otherwise use defaults
      if (parsed && parsed.length > 0) {
        return parsed
      }
    } catch {
      // Fall through to defaults
    }
  }
  // Initialize with defaults if nothing stored
  const defaults = getDefaultMockApprovals()
  saveMockApprovals(defaults)
  return defaults
}

export function getDefaultMockApprovals(): MockApproval[] {
  return [
    {
      id: "approval-001",
      deal_id: "deal-001",
      ghl_deal_id: "deal-001",
      deal_title: "Acme Corp - Enterprise Package",
      generated_message: "Hi Sarah! I noticed we haven't connected in a while about the Enterprise Package. I wanted to check in and see if you're still interested in moving forward. We've had some great success with similar companies, and I'd love to show you how this could work for Acme Corp. Are you available for a quick call this week?",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
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
      user_feedback: null,
      scheduled_at: null,
      status: "pending",
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      sent_at: null,
    },
    {
      id: "approval-003",
      deal_id: "deal-003",
      ghl_deal_id: "deal-003",
      deal_title: "Global Solutions - Premium",
      generated_message: "Hi Jennifer! I wanted to follow up on our Premium package discussion. I know timing is everything, and I wanted to make sure we're aligned on next steps. We've added some new features that might be perfect for Global Solutions. Would you be open to a brief conversation?",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "approved",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      sent_at: null,
    },
    {
      id: "approval-004",
      deal_id: "deal-004",
      ghl_deal_id: "deal-004",
      deal_title: "InnovateCo - Growth Package",
      generated_message: "Hey David! Quick check-in on the Growth Package. I know you were evaluating options, and I wanted to see where things stand. Happy to answer any questions or adjust the proposal to better fit your needs.",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "sent",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "approval-005",
      deal_id: "deal-005",
      ghl_deal_id: "deal-005",
      deal_title: "ScaleUp Ventures - Enterprise",
      generated_message: "Hi Lisa! Following up on our Enterprise package discussion. I wanted to see if you've had a chance to review the proposal and if there's anything else I can provide to help with your decision.",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "pending",
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      sent_at: null,
    },
    {
      id: "approval-006",
      deal_id: "deal-006",
      ghl_deal_id: "deal-006",
      deal_title: "DataFlow Systems - Pro Package",
      generated_message: "Hi Tom! I noticed we haven't touched base on the Pro Package in a bit. I wanted to reach out and see if you're still considering it or if there's anything I can clarify. The API access feature you mentioned interest in is now available. Let me know what you think!",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "pending",
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      sent_at: null,
    },
    {
      id: "approval-007",
      deal_id: "deal-007",
      ghl_deal_id: "deal-007",
      deal_title: "CloudSync Technologies - Enterprise",
      generated_message: "Hey Rachel! Hope you're doing well. I saw we were discussing the Enterprise solution for CloudSync. I wanted to check in and see if you've had a chance to review the proposal. We're offering a special implementation package this month that might be perfect for your timeline. Interested in learning more?",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "pending",
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      sent_at: null,
    },
    {
      id: "approval-008",
      deal_id: "deal-008",
      ghl_deal_id: "deal-008",
      deal_title: "NextGen Solutions - Premium",
      generated_message: "Hi James! Quick follow-up on the Premium package. I know you were evaluating a few options, and I wanted to make sure we're still in the running. We've just launched some new features that align perfectly with what you mentioned you needed. Would love to show you!",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "approved",
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      sent_at: null,
    },
    {
      id: "approval-009",
      deal_id: "deal-009",
      ghl_deal_id: "deal-009",
      deal_title: "Velocity Partners - Growth Package",
      generated_message: "Hey Amanda! I wanted to circle back on the Growth Package we discussed. I know you were looking at scaling your operations, and I think we have something that could really help. Are you still interested in exploring this? Happy to jump on a call whenever works for you.",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "pending",
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      sent_at: null,
    },
    {
      id: "approval-010",
      deal_id: "deal-010",
      ghl_deal_id: "deal-010",
      deal_title: "PrimeTech Industries - Enterprise",
      generated_message: "Hi Robert! Following up on our Enterprise package conversation. I wanted to see if you've had a chance to review the proposal and if there are any questions I can answer. We're here to help make this work for PrimeTech. What's the best way to move forward?",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "sent",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(),
      sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "approval-011",
      deal_id: "deal-011",
      ghl_deal_id: "deal-011",
      deal_title: "Apex Digital - Starter Package",
      generated_message: "Hey Chris! Hope all is well. I noticed we started talking about the Starter Package but haven't connected in a bit. I wanted to reach out and see if you're still interested or if there's anything holding you back. Happy to answer any questions!",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "pending",
      created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      approved_at: null,
      sent_at: null,
    },
    {
      id: "approval-012",
      deal_id: "deal-012",
      ghl_deal_id: "deal-012",
      deal_title: "Summit Enterprises - Professional",
      generated_message: "Hi Patricia! I wanted to follow up on our Professional package discussion. I know you were evaluating different solutions, and I wanted to make sure we address any concerns you might have. We're here to help make this work for Summit. What do you think?",
      edited_message: null,
      user_feedback: null,
      scheduled_at: null,
      status: "approved",
      created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
      sent_at: null,
    },
  ]
}

export function saveMockApprovals(approvals: MockApproval[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(approvals))
  }
}

export function getMockApproval(approvalId: string): MockApproval | undefined {
  const approvals = getMockApprovals()
  return approvals.find(a => a.id === approvalId)
}

export function updateMockApproval(
  approvalId: string,
  updates: Partial<MockApproval>
): MockApproval[] {
  const approvals = getMockApprovals()
  const updated = approvals.map(a => 
    a.id === approvalId ? { ...a, ...updates } : a
  )
  saveMockApprovals(updated)
  return updated
}

