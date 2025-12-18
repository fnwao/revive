// Knowledge base state management
// Stores documents in localStorage for demo mode

export interface KnowledgeBaseDocument {
  id: string
  name: string
  type: string
  size: number
  content: string
  category?: string
  tags: string[]
  uploadedAt: string
  lastModified: string
  status: "processing" | "ready" | "error"
  wordCount?: number
}

const STORAGE_KEY = "acquiri_knowledge_base"

export function getDocuments(): KnowledgeBaseDocument[] {
  if (typeof window === "undefined") return getDefaultDocuments()
  
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch {
      // Fall through to defaults
    }
  }
  
  const defaults = getDefaultDocuments()
  saveDocuments(defaults)
  return defaults
}

function getDefaultDocuments(): KnowledgeBaseDocument[] {
  return [
    {
      id: "doc-001",
      name: "Sales Script - Enterprise Package",
      type: "PDF",
      size: 245000,
      content: `# Enterprise Package Sales Script

## Opening
"Hi [Name], I wanted to reach out because I noticed [Company] is in the [Industry] space, and we've been helping similar companies achieve [Specific Goal]."

## Value Proposition
Our Enterprise Package includes:
- Advanced analytics and reporting
- Priority support with 24/7 availability
- Custom integrations with your existing tools
- Dedicated account manager
- SLA guarantee of 99.9% uptime

## Objection Handling
**"It's too expensive"**
"I understand budget is a concern. Let me show you the ROI - companies typically see a 3x return within the first year. We can also discuss payment terms."

**"We need to think about it"**
"Absolutely, this is an important decision. What specific concerns do you have? I'm happy to address them now."

## Closing
"Based on what you've told me, the Enterprise Package seems like a perfect fit. Would you like to move forward with a pilot program?"`,
      category: undefined,
      tags: [],
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastModified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ready",
      wordCount: 187,
    },
    {
      id: "doc-002",
      name: "Product FAQ",
      type: "DOCX",
      size: 128000,
      content: `# Product FAQ

## General Questions

**Q: What is the setup time?**
A: Most customers are up and running within 2-4 weeks. We provide a dedicated implementation specialist to ensure a smooth onboarding.

**Q: Do you offer a free trial?**
A: Yes! We offer a 14-day free trial with full access to all features. No credit card required.

**Q: What integrations do you support?**
A: We have native integrations with Salesforce, HubSpot, Slack, Microsoft Teams, and many more. We also offer custom API integrations.

## Pricing Questions

**Q: Can I change plans later?**
A: Absolutely! You can upgrade or downgrade at any time. Changes take effect immediately.

**Q: Do you offer discounts for annual plans?**
A: Yes, we offer 17% off when you pay annually.

**Q: Is there a setup fee?**
A: No setup fees for any plan.

## Technical Questions

**Q: What's your uptime guarantee?**
A: We guarantee 99.9% uptime with our Enterprise plan. We have a status page you can monitor.

**Q: How secure is my data?**
A: We use enterprise-grade encryption, SOC 2 compliance, and regular security audits.`,
      category: undefined,
      tags: [],
      uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ready",
      wordCount: 234,
    },
    {
      id: "doc-003",
      name: "Pricing Guide",
      type: "PDF",
      size: 189000,
      content: `# Pricing Guide

## Starter Package - $99/month
Perfect for small teams getting started
- Up to 5 users
- Core features
- Email support
- Basic analytics

## Professional Package - $199/month
For growing businesses
- Up to 50 users
- Advanced features
- Priority support
- API access
- Custom workflows

## Enterprise Package - Custom Pricing
For large organizations
- Unlimited users
- All features
- Dedicated account manager
- Custom integrations
- SLA guarantee
- White-glove onboarding

## Add-ons
- Additional users: $10/user/month
- Premium support: $99/month
- Custom integrations: Contact sales

## Payment Terms
- Monthly billing available
- Annual billing: 17% discount
- Enterprise: Custom terms available`,
      category: undefined,
      tags: [],
      uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      lastModified: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ready",
      wordCount: 156,
    },
    {
      id: "doc-004",
      name: "Objection Handling Guide",
      type: "TXT",
      size: 95000,
      content: `# Objection Handling Guide

## Common Objections and Responses

### "We don't have budget right now"
Response: "I understand budget constraints. Many of our clients start with a pilot program that's more budget-friendly. We can also discuss payment terms that work for you. What would make this work financially?"

### "We're already using another solution"
Response: "That's great that you have a solution in place. Many of our clients use us alongside their existing tools. What specific gaps are you experiencing with your current solution?"

### "We need to think about it"
Response: "Of course, this is an important decision. What specific concerns or questions do you have? I'm happy to address them now so you have all the information you need."

### "It's too expensive"
Response: "I understand cost is a factor. Let me show you the ROI - our clients typically see a 3x return within the first year. We can also discuss which features are most important and customize a plan."

### "We're not ready yet"
Response: "I appreciate that timing is important. What would need to happen for you to be ready? We can work with your timeline and even set up a pilot program."`,
      category: undefined,
      tags: [],
      uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ready",
      wordCount: 198,
    },
    {
      id: "doc-005",
      name: "Company Tone & Style Guide",
      type: "DOCX",
      size: 112000,
      content: `# Company Tone & Style Guide

## Communication Principles
- Professional yet approachable
- Clear and concise
- Solution-focused
- Empathetic to customer needs

## Voice Characteristics
- Confident but not arrogant
- Helpful and consultative
- Transparent and honest
- Enthusiastic about solving problems

## Do's
✓ Use customer's name
✓ Reference specific details from conversations
✓ Ask thoughtful questions
✓ Provide clear next steps
✓ Show genuine interest

## Don'ts
✗ Use jargon or technical terms unnecessarily
✗ Be pushy or aggressive
✗ Make assumptions
✗ Overpromise
✗ Use generic templates

## Email Templates
[Standard templates would go here]

## SMS Guidelines
- Keep messages under 160 characters when possible
- Use clear, direct language
- Include a clear call to action
- Respond promptly`,
      category: undefined,
      tags: [],
      uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ready",
      wordCount: 167,
    },
  ]
}

export function saveDocuments(documents: KnowledgeBaseDocument[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
  }
}

export function addDocument(doc: Omit<KnowledgeBaseDocument, "id" | "uploadedAt" | "lastModified" | "status" | "category" | "tags"> & Partial<Pick<KnowledgeBaseDocument, "category" | "tags">>): KnowledgeBaseDocument {
  const documents = getDocuments()
  const newDoc: KnowledgeBaseDocument = {
    ...doc,
    category: doc.category,
    tags: doc.tags || [],
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    uploadedAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    status: "ready",
  }
  documents.push(newDoc)
  saveDocuments(documents)
  return newDoc
}

export function deleteDocument(id: string): void {
  const documents = getDocuments()
  const filtered = documents.filter(d => d.id !== id)
  saveDocuments(filtered)
}

export function updateDocument(id: string, updates: Partial<KnowledgeBaseDocument>): KnowledgeBaseDocument | null {
  const documents = getDocuments()
  const index = documents.findIndex(d => d.id === id)
  if (index === -1) return null
  
  documents[index] = {
    ...documents[index],
    ...updates,
    lastModified: new Date().toISOString(),
  }
  saveDocuments(documents)
  return documents[index]
}

export function getDocument(id: string): KnowledgeBaseDocument | null {
  const documents = getDocuments()
  return documents.find(d => d.id === id) || null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

