"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Plus, Edit, Trash2, Search, Mail, MessageSquare, Copy, Filter, X, Sparkles, TrendingUp, Clock, Eye } from "lucide-react"
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, type MessageTemplate } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const { toast } = useToast()

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await getTemplates({
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        include_public: true,
      })
      setTemplates(response.templates)
    } catch (error) {
      console.error("Error loading templates:", error)
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [categoryFilter, typeFilter])

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.body.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      await deleteTemplate(templateId)
      toast({
        title: "Success",
        description: "Template deleted successfully",
      })
      loadTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "error",
      })
    }
  }

  const handleCopy = (template: MessageTemplate) => {
    const text = template.type === "email" && template.subject
      ? `Subject: ${template.subject}\n\n${template.body}`
      : template.body
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Template copied to clipboard",
    })
  }

  const totalTemplates = templates.length
  const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)
  const avgSuccessRate = templates.length > 0
    ? Math.round(templates.reduce((sum, t) => sum + (t.success_rate || 0), 0) / templates.length)
    : 0

  const hasActiveFilters = categoryFilter !== "all" || typeFilter !== "all" || searchQuery.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-[#4F8CFF]" />
            </div>
            <h1 className="text-2xl font-bold text-[#111827]">Message Templates</h1>
          </div>
          <p className="text-muted-foreground">Create and manage reusable message templates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F8CFF] hover:bg-[#6EA0FF]">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <TemplateForm
              onSuccess={() => {
                setIsCreateDialogOpen(false)
                loadTemplates()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {!loading && totalTemplates > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-4 bg-gradient-to-br from-[#4F8CFF]/5 to-transparent border-[#4F8CFF]/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-[#4F8CFF]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold text-[#111827]">{totalTemplates}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-[#3CCB7F]/5 to-transparent border-[#3CCB7F]/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#3CCB7F]/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[#3CCB7F]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold text-[#111827]">{totalUsage.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-[#F6C177]/5 to-transparent border-[#F6C177]/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#F6C177]/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[#F6C177]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Success Rate</p>
                <p className="text-2xl font-bold text-[#111827]">{avgSuccessRate}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              className="w-[160px]"
            >
              <option value="all">All Categories</option>
              <option value="reactivation">Reactivation</option>
              <option value="follow_up">Follow Up</option>
              <option value="value_proposition">Value Proposition</option>
              <option value="urgent">Urgent</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </Select>
            <Select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)} 
              className="w-[140px]"
            >
              <option value="all">All Types</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="both">Both</option>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setCategoryFilter("all")
                  setTypeFilter("all")
                }}
                className="px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-[#4F8CFF] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">
                {hasActiveFilters ? "No templates match your filters" : "No templates yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? "Try adjusting your search or filters"
                  : "Create your first template to get started"}
              </p>
              {!hasActiveFilters && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <TemplateForm
                      onSuccess={() => {
                        setIsCreateDialogOpen(false)
                        loadTemplates()
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="p-6 hover:shadow-lg transition-all border-[#E5E7EB] hover:border-[#4F8CFF]/30 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      template.type === "email" && "bg-blue-100",
                      template.type === "sms" && "bg-green-100",
                      template.type === "both" && "bg-purple-100"
                    )}>
                      {template.type === "email" ? (
                        <Mail className="h-4 w-4 text-blue-600" />
                      ) : template.type === "sms" ? (
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <h3 className="font-semibold text-base text-[#111827] line-clamp-1">{template.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {template.category && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize">
                        {template.category.replace("_", " ")}
                      </Badge>
                    )}
                    {template.is_public && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-[#4F8CFF]/10 text-[#4F8CFF] border-[#4F8CFF]/20">
                        Public
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {template.description && (
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{template.description}</p>
              )}

              {/* Message Preview */}
              <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-muted">
                {template.subject && (
                  <div className="mb-2 pb-2 border-b border-muted">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Subject:</p>
                    <p className="text-xs text-[#111827] line-clamp-1">{template.subject}</p>
                  </div>
                )}
                <p className="text-xs text-[#111827] line-clamp-3 leading-relaxed">{template.body}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-5 pb-4 border-b border-muted">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="font-medium">{template.usage_count || 0} uses</span>
                </div>
                {template.success_rate !== null && template.success_rate !== undefined && template.success_rate > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#F6C177]" />
                    <span className="font-medium text-[#F6C177]">{template.success_rate}% success</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(template)}
                  className="flex-1 hover:bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </Button>
                <Dialog open={editingTemplate?.id === template.id} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                      className="hover:bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <TemplateForm
                      template={template}
                      onSuccess={() => {
                        setEditingTemplate(null)
                        loadTemplates()
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                  className="hover:bg-[#E06C75]/10 hover:border-[#E06C75]/30 hover:text-[#E06C75]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateForm({ template, onSuccess }: { template?: MessageTemplate; onSuccess: () => void }) {
  const [name, setName] = useState(template?.name || "")
  const [description, setDescription] = useState(template?.description || "")
  const [type, setType] = useState<"sms" | "email" | "both">(template?.type || "sms")
  const [category, setCategory] = useState(template?.category || "")
  const [subject, setSubject] = useState(template?.subject || "")
  const [body, setBody] = useState(template?.body || "")
  const [isPublic, setIsPublic] = useState(template?.is_public || false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !body) {
      toast({
        title: "Error",
        description: "Name and body are required",
        variant: "error",
      })
      return
    }

    if (type === "email" && !subject) {
      toast({
        title: "Error",
        description: "Subject is required for email templates",
        variant: "error",
      })
      return
    }

    try {
      setLoading(true)
      if (template) {
        await updateTemplate(template.id, {
          name,
          description,
          type,
          category: category || undefined,
          subject: type === "email" || type === "both" ? subject : undefined,
          body,
          is_public: isPublic,
        })
        toast({
          title: "Success",
          description: "Template updated successfully",
        })
      } else {
        await createTemplate({
          name,
          description,
          type,
          category: category || undefined,
          subject: type === "email" || type === "both" ? subject : undefined,
          body,
          is_public: isPublic,
        })
        toast({
          title: "Success",
          description: "Template created successfully",
        })
      }
      onSuccess()
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-[#4F8CFF]/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-[#4F8CFF]" />
          </div>
          <DialogTitle className="text-xl">{template ? "Edit Template" : "Create Template"}</DialogTitle>
        </div>
        <DialogDescription>
          {template ? "Update your message template" : "Create a reusable message template for reactivation messages"}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-5 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Casual Follow-up"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select 
              id="type"
              value={type} 
              onChange={(e) => setType(e.target.value as "sms" | "email" | "both")}
              required
            >
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="both">Both</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              id="category"
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">None</option>
              <option value="reactivation">Reactivation</option>
              <option value="follow_up">Follow Up</option>
              <option value="value_proposition">Value Proposition</option>
              <option value="urgent">Urgent</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </Select>
          </div>
        </div>
        {(type === "email" || type === "both") && (
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Following up on your interest"
              required={type === "email"}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="body">Message Body *</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter your message template. Use variables like {{deal_title}}, {{deal_value}}, {{contact_name}}"
            rows={6}
            required
            className="font-mono text-sm"
          />
          <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-muted">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Available variables:</p>
            <div className="flex flex-wrap gap-1.5">
              {["deal_title", "deal_value", "contact_name", "days_since_activity"].map((varName) => (
                <code
                  key={varName}
                  className="text-[10px] px-2 py-1 bg-white rounded border border-muted text-[#4F8CFF] cursor-pointer hover:bg-[#4F8CFF]/10"
                  onClick={() => {
                    const textarea = document.getElementById("body") as HTMLTextAreaElement
                    if (textarea) {
                      const start = textarea.selectionStart
                      const end = textarea.selectionEnd
                      const text = textarea.value
                      const newText = text.substring(0, start) + `{{${varName}}}` + text.substring(end)
                      setBody(newText)
                      setTimeout(() => {
                        textarea.focus()
                        textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4)
                      }, 0)
                    }
                  }}
                >
                  {`{{${varName}}}`}
                </code>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-muted">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded w-4 h-4 text-[#4F8CFF] focus:ring-[#4F8CFF]"
          />
          <div className="flex-1">
            <Label htmlFor="isPublic" className="cursor-pointer font-medium text-sm">
              Make this template public
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visible to all team members
            </p>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onSuccess()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : template ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}

