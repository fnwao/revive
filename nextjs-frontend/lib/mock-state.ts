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
      deal_title: "Sarah Johnson - Real Estate Mastery Program",
      generated_message: "Hey Sarah! I noticed we haven't connected in a while about the Real Estate Mastery Program. I wanted to check in and see if you're still interested in getting started. I know you were curious about finding deals without a ton of cash upfront - we actually just added a whole new module on creative financing strategies that I think you'd love! Want to hop on a quick call this week?",
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
      deal_title: "Mike Chen - Real Estate Mastery Program",
      generated_message: "Hey Mike! Hope you're doing well. I saw we started talking about the program a few weeks back but haven't connected since. I wanted to reach out and see if you and your wife had a chance to talk about it, or if there are any questions I can answer. What works best for you?",
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
      deal_title: "Jennifer Martinez - Real Estate Mastery Program",
      generated_message: "Hi Jennifer! I wanted to follow up on our conversation about the program. I know you and your husband were thinking it over - I wanted to check in and see if you have any questions. We actually just added some new content on managing real estate investing around a full-time job that I think would be perfect for you. Would you be open to a quick chat?",
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
      deal_title: "David Park - Real Estate Mastery Program",
      generated_message: "Hey David! Quick check-in on the program. I know you were thinking about the payment plan option - I wanted to see where things stand. Happy to answer any questions or help you figure out what works best for your situation!",
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
      deal_title: "Lisa Thompson - Real Estate Mastery Program",
      generated_message: "Hi Lisa! Following up on our conversation about scaling your portfolio. I wanted to see if you and your husband had a chance to talk about the program, and if there's anything else I can share to help with your decision.",
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
      deal_title: "Tom Wilson - Real Estate Mastery Program",
      generated_message: "Hey Tom! I noticed we haven't connected in a bit. I wanted to reach out and see if you're still thinking about the program, or if there's anything I can clarify. I know you were feeling overwhelmed with all the info out there - I'd love to show you how we make it simple and step-by-step. Let me know what you think!",
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
      deal_title: "Rachel Kim - Real Estate Mastery Program",
      generated_message: "Hey Rachel! Hope you're doing well. I wanted to check in and see if you've had a chance to think about the program. I know you were worried about fitting it around your nursing schedule - I'd love to show you how other students with demanding jobs make it work. Interested in learning more?",
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
      deal_title: "James Rodriguez - Real Estate Mastery Program",
      generated_message: "Hi James! Quick follow-up on the program. I know you were thinking it over and wanted to talk to your wife about it. I wanted to make sure we're still in the running! We just added some new content on getting started with a smaller budget that I think would be perfect for you. Would love to show you!",
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
      deal_title: "Amanda Foster - Real Estate Mastery Program",
      generated_message: "Hey Amanda! I wanted to circle back on the program we discussed. I know you're a stay-at-home mom and want to build something for your family - I think this could be perfect for you! Are you still interested in exploring this? Happy to jump on a call whenever works for you (nap time, evenings, whatever!).",
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
      deal_title: "Robert Chen - Real Estate Mastery Program",
      generated_message: "Hi Robert! Following up on our conversation about building passive income. I wanted to see if you've had a chance to think about the program and if there are any questions I can answer. I'm here to help you figure out if it's the right fit. What's the best way to move forward?",
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
      deal_title: "Chris Anderson - Real Estate Mastery Program",
      generated_message: "Hey Chris! Hope all is well. I noticed we started talking about the program but haven't connected in a bit. I wanted to reach out and see if you're still interested or if there's anything holding you back. Happy to answer any questions!",
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
      deal_title: "Patricia Lee - Real Estate Mastery Program",
      generated_message: "Hi Patricia! I wanted to follow up on our conversation about the program. I know you were evaluating different options, and I wanted to make sure we address any concerns you might have. We're here to help make this work for you. What do you think?",
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

