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
import { FileText, Plus, Edit, Trash2, Search, Mail, MessageSquare, Copy } from "lucide-react"
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message Templates</h1>
          <p className="text-muted-foreground mt-1">Create and manage reusable message templates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <TemplateForm
              onSuccess={() => {
                setIsCreateDialogOpen(false)
                loadTemplates()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-[180px]">
          <option value="all">All Categories</option>
          <option value="reactivation">Reactivation</option>
          <option value="follow_up">Follow Up</option>
          <option value="value_proposition">Value Proposition</option>
          <option value="urgent">Urgent</option>
          <option value="casual">Casual</option>
          <option value="formal">Formal</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-[180px]">
          <option value="all">All Types</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="both">Both</option>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No templates found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {template.type === "email" ? (
                      <Mail className="h-4 w-4 text-blue-500" />
                    ) : template.type === "sms" ? (
                      <MessageSquare className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-purple-500" />
                    )}
                    <h3 className="font-semibold text-sm">{template.name}</h3>
                  </div>
                  {template.category && (
                    <Badge variant="secondary" className="text-xs mb-2">
                      {template.category.replace("_", " ")}
                    </Badge>
                  )}
                  {template.is_public && (
                    <Badge variant="outline" className="text-xs ml-1">
                      Public
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{template.body}</p>
              {template.subject && (
                <p className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">Subject:</span> {template.subject}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Used {template.usage_count} times</span>
                {template.success_rate !== null && (
                  <span>{template.success_rate}% success</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(template)}
                  className="flex-1"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Dialog open={editingTemplate?.id === template.id} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
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
                >
                  <Trash2 className="h-3 w-3" />
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
        <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
        <DialogDescription>
          Create a reusable message template for reactivation messages
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Casual Follow-up"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
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
          <div>
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
          <div>
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
        <div>
          <Label htmlFor="body">Message Body *</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter your message template. Use variables like {{deal_title}}, {{deal_value}}, {{contact_name}}"
            rows={6}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available variables: deal_title, deal_value, contact_name, days_since_activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="isPublic" className="cursor-pointer">
            Make this template public (visible to team)
          </Label>
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

