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
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-[#4F8CFF]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#111827]">Message Templates</h1>
              <p className="text-sm sm:text-base text-[#6B7280] mt-1">Create and manage reusable message templates</p>
            </div>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] text-white shadow-sm hover:shadow-md w-full sm:w-auto h-10 sm:h-11 font-semibold">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="p-5 sm:p-6 bg-gradient-to-br from-[#4F8CFF]/5 to-transparent border-[#4F8CFF]/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-[#4F8CFF]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-[#6B7280] font-medium mb-1">Total Templates</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#111827]">{totalTemplates}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 sm:p-6 bg-gradient-to-br from-[#3CCB7F]/5 to-transparent border-[#3CCB7F]/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#3CCB7F]/10 to-[#3CCB7F]/5 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-[#3CCB7F]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-[#6B7280] font-medium mb-1">Total Usage</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#111827]">{totalUsage.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 sm:p-6 bg-gradient-to-br from-[#F6C177]/5 to-transparent border-[#F6C177]/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#F6C177]/10 to-[#F6C177]/5 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-[#F6C177]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-[#6B7280] font-medium mb-1">Avg Success Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#111827]">{avgSuccessRate}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-5 sm:p-6 border-[#E5E7EB] shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 md:gap-5">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                placeholder="Search templates by name or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#111827] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              className="w-[160px] h-10 border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
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
              className="w-[140px] h-10 border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
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
                className="h-10 px-4 border-[#E5E7EB] hover:bg-[#F9FAFB]"
              >
                <X className="h-4 w-4 mr-1.5" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="p-5 sm:p-6 hover:shadow-lg transition-all border-[#E5E7EB] hover:border-[#4F8CFF]/40 group shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      template.type === "email" && "bg-gradient-to-br from-blue-100 to-blue-50",
                      template.type === "sms" && "bg-gradient-to-br from-green-100 to-green-50",
                      template.type === "both" && "bg-gradient-to-br from-purple-100 to-purple-50"
                    )}>
                      {template.type === "email" ? (
                        <Mail className="h-5 w-5 text-blue-600" />
                      ) : template.type === "sms" ? (
                        <MessageSquare className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <h3 className="font-semibold text-base sm:text-lg text-[#111827] line-clamp-1 flex-1">{template.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.category && (
                      <Badge variant="outline" className="text-xs px-2.5 py-1 capitalize border-[#E5E7EB] bg-[#F9FAFB]">
                        {template.category.replace("_", " ")}
                      </Badge>
                    )}
                    {template.is_public && (
                      <Badge variant="outline" className="text-xs px-2.5 py-1 bg-[#4F8CFF]/10 text-[#4F8CFF] border-[#4F8CFF]/20">
                        Public
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {template.description && (
                <p className="text-xs sm:text-sm text-[#6B7280] mb-4 line-clamp-2 leading-relaxed">{template.description}</p>
              )}

              {/* Message Preview */}
              <div className="mb-5 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                {template.subject && (
                  <div className="mb-3 pb-3 border-b border-[#E5E7EB]">
                    <p className="text-[10px] font-semibold text-[#6B7280] mb-1.5 uppercase tracking-wide">Subject:</p>
                    <p className="text-xs sm:text-sm text-[#111827] line-clamp-1 font-medium">{template.subject}</p>
                  </div>
                )}
                <p className="text-xs sm:text-sm text-[#111827] line-clamp-3 leading-relaxed">{template.body}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-[#6B7280] mb-5 pb-5 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#6B7280]" />
                  <span className="font-semibold text-[#111827]">{template.usage_count || 0} uses</span>
                </div>
                {template.success_rate !== null && template.success_rate !== undefined && template.success_rate > 0 && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#F6C177]" />
                    <span className="font-semibold text-[#F6C177]">{template.success_rate}% success</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(template)}
                  className="flex-1 h-9 hover:bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30 hover:text-[#4F8CFF] transition-colors"
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
                      className="h-9 w-9 p-0 hover:bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30 hover:text-[#4F8CFF] transition-colors"
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
                  className="h-9 w-9 p-0 hover:bg-[#E06C75]/10 hover:border-[#E06C75]/30 hover:text-[#E06C75] transition-colors"
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
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#4F8CFF]/10 to-[#4F8CFF]/5 flex items-center justify-center">
            <FileText className="h-5 w-5 text-[#4F8CFF]" />
          </div>
          <div>
            <DialogTitle className="text-xl sm:text-2xl">{template ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {template ? "Update your message template" : "Create a reusable message template for reactivation messages"}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-5 sm:space-y-6 py-4 sm:py-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold text-[#111827]">Template Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Casual Follow-up"
            required
            className="h-10 border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-semibold text-[#111827]">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="h-10 border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-semibold text-[#111827]">Type *</Label>
            <Select 
              id="type"
              value={type} 
              onChange={(e) => setType(e.target.value as "sms" | "email" | "both")}
              required
              className="h-10 border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
            >
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="both">Both</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-semibold text-[#111827]">Category</Label>
            <Select 
              id="category"
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
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
            <Label htmlFor="subject" className="text-sm font-semibold text-[#111827]">Email Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Following up on your interest"
              required={type === "email"}
              className="h-10 border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="body" className="text-sm font-semibold text-[#111827]">Message Body *</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter your message template. Use variables like {{deal_title}}, {{deal_value}}, {{contact_name}}"
            rows={6}
            required
            className="font-mono text-sm border-[#E5E7EB] focus:border-[#4F8CFF] focus:ring-[#4F8CFF]/20"
          />
          <div className="mt-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <p className="text-xs font-semibold text-[#111827] mb-2.5">Available variables:</p>
            <div className="flex flex-wrap gap-2">
              {["deal_title", "deal_value", "contact_name", "days_since_activity"].map((varName) => (
                <code
                  key={varName}
                  className="text-xs px-3 py-1.5 bg-white rounded-lg border border-[#E5E7EB] text-[#4F8CFF] cursor-pointer hover:bg-[#4F8CFF]/10 hover:border-[#4F8CFF]/30 transition-colors font-medium"
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
        <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded w-4 h-4 mt-0.5 text-[#4F8CFF] focus:ring-[#4F8CFF] border-[#E5E7EB]"
          />
          <div className="flex-1">
            <Label htmlFor="isPublic" className="cursor-pointer font-semibold text-sm text-[#111827]">
              Make this template public
            </Label>
            <p className="text-xs text-[#6B7280] mt-1">
              Visible to all team members
            </p>
          </div>
        </div>
      </div>
      <DialogFooter className="gap-3 sm:gap-4 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => onSuccess()}
          className="h-10 px-6 border-[#E5E7EB] hover:bg-[#F9FAFB]"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
          className="h-10 px-6 bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF] hover:from-[#6EA0FF] hover:to-[#4F8CFF] text-white shadow-sm hover:shadow-md font-semibold"
        >
          {loading ? "Saving..." : template ? "Update Template" : "Create Template"}
        </Button>
      </DialogFooter>
    </form>
  )
}

