"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileText, Trash2, Search, X, Loader2, CheckCircle2, AlertCircle, AlertTriangle, MessageSquare, Edit2, Copy, Tag, Filter, SortAsc, SortDesc, Download, MoreVertical, Calendar, FileType } from "lucide-react"
import {
  getDocuments,
  addDocument,
  deleteDocument,
  updateDocument,
  formatFileSize,
  formatDate,
  type KnowledgeBaseDocument,
} from "@/lib/knowledge-base"
import { getSubscription, getPlanLimits } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { showToast } from "@/lib/toast"
import { KnowledgeBaseChat } from "@/components/knowledge-base-chat"

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>(getDocuments())
  const [subscription, setSubscription] = useState(getSubscription())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeBaseDocument | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [editingDoc, setEditingDoc] = useState<KnowledgeBaseDocument | null>(null)
  const [editContent, setEditContent] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Listen for subscription updates
  useEffect(() => {
    const handleSubscriptionUpdate = () => {
      setSubscription(getSubscription())
    }
    
    window.addEventListener("subscriptionUpdated", handleSubscriptionUpdate)
    return () => {
      window.removeEventListener("subscriptionUpdated", handleSubscriptionUpdate)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      }
      // Escape to close preview/edit
      if (e.key === "Escape") {
        if (editingDoc) {
          setEditingDoc(null)
          setEditContent("")
        } else if (selectedDoc) {
          setSelectedDoc(null)
        }
      }
      // Cmd/Ctrl + E to edit selected document
      if ((e.metaKey || e.ctrlKey) && e.key === "e" && selectedDoc && !editingDoc) {
        e.preventDefault()
        setEditingDoc(selectedDoc)
        setEditContent(selectedDoc.content)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedDoc, editingDoc])

  const limits = getPlanLimits(subscription.plan)
  const maxDocs = limits.knowledgeBaseDocs === "unlimited" ? Infinity : limits.knowledgeBaseDocs
  const canUpload = documents.length < maxDocs

  // Get unique document types for filter
  const documentTypes = Array.from(new Set(documents.map(doc => doc.type))).sort()

  // Filter documents
  let filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === "" || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === null || doc.type === filterType
    return matchesSearch && matchesType
  })

  // Sort documents
  filteredDocuments = [...filteredDocuments].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "date":
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
        break
      case "size":
        comparison = a.size - b.size
        break
      case "type":
        comparison = a.type.localeCompare(b.type)
        break
    }
    return sortOrder === "asc" ? comparison : -comparison
  })

  const showSuccess = (message: string) => {
    showToast.success(message)
    setSuccess(message)
    setTimeout(() => setSuccess(null), 3000)
  }

  const showError = (message: string) => {
    showToast.error(message)
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      console.log("No files selected")
      return
    }

    console.log("Files selected:", files.length)

    // Get current document count
    const currentDocs = getDocuments()
    const currentCount = currentDocs.length
    const limits = getPlanLimits(subscription.plan)
    const maxDocs = limits.knowledgeBaseDocs === "unlimited" ? Infinity : limits.knowledgeBaseDocs
    const canUpload = currentCount < maxDocs

    // Check if user can upload more documents
    if (!canUpload) {
      showError(`You've reached your plan limit of ${maxDocs} documents. Upgrade to upload more.`)
      return
    }

    // Check if adding these files would exceed the limit
    const filesToAdd = Array.from(files)
    if (currentCount + filesToAdd.length > maxDocs) {
      showError(`You can only upload ${maxDocs - currentCount} more document(s). Upgrade to upload more.`)
      return
    }

    setIsUploading(true)
    setError(null)
    
    try {
      // Process each file
      const filePromises = Array.from(files).map(async (file) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader()
          
          reader.onload = (e) => {
            try {
              const content = e.target?.result as string
              
              // Extract file extension
              const extension = file.name.split(".").pop()?.toUpperCase() || "TXT"
              
              // Limit content size for display (keep first 50000 chars)
              const displayContent = typeof content === 'string' 
                ? content.substring(0, 50000) 
                : `[Binary file: ${file.name}]`
              
              // Calculate word count
              const wordCount = typeof content === 'string' 
                ? content.split(/\s+/).filter(Boolean).length 
                : 0
              
              const newDoc = addDocument({
                name: file.name,
                type: extension,
                size: file.size,
                content: displayContent,
                tags: [],
                wordCount: wordCount,
              })
              
              console.log("Document added:", newDoc.name)
              resolve()
            } catch (error) {
              console.error("Error processing file:", error)
              reject(error)
            }
          }
          
          reader.onerror = () => {
            console.error("Error reading file")
            reject(new Error(`Failed to read ${file.name}`))
          }
          
          // Read text files as text, others as data URL
          const isTextFile = file.type.startsWith("text/") || 
            file.name.endsWith(".txt") || 
            file.name.endsWith(".md") ||
            file.name.endsWith(".json") ||
            file.name.endsWith(".csv") ||
            file.name.endsWith(".js") ||
            file.name.endsWith(".ts") ||
            file.name.endsWith(".py") ||
            file.name.endsWith(".html") ||
            file.name.endsWith(".css") ||
            file.name.endsWith(".pdf")
          
          if (isTextFile) {
            reader.readAsText(file)
          } else {
            // For binary files, create a placeholder
            const newDoc = addDocument({
              name: file.name,
              type: file.name.split(".").pop()?.toUpperCase() || "FILE",
              size: file.size,
              content: `[Binary file: ${file.name}]\n\nThis file type cannot be previewed, but it has been uploaded and will be processed.`,
              tags: [],
              wordCount: 0,
            })
            console.log("Binary document added:", newDoc.name)
            resolve()
          }
        })
      })

      await Promise.all(filePromises)
      
      // Refresh documents list
      const updatedDocs = getDocuments()
      setDocuments(updatedDocs)
      
      // Show toast for each uploaded file
      if (files.length === 1) {
        showToast.documentUploaded(files[0].name)
      } else {
        showToast.success(`Successfully uploaded ${files.length} documents`)
      }
      showSuccess(`Successfully uploaded ${files.length} document(s)`)
    } catch (error) {
      console.error("Error uploading files:", error)
      showError(error instanceof Error ? error.message : "Failed to upload files. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }, [subscription.plan])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canUpload) {
      setIsDragging(true)
    }
  }, [canUpload])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteDocument(id)
      const updatedDocs = getDocuments()
      setDocuments(updatedDocs)
      if (selectedDoc?.id === id) {
        setSelectedDoc(null)
      }
      if (editingDoc?.id === id) {
        setEditingDoc(null)
        setEditContent("")
      }
      const deletedDoc = documents.find(d => d.id === id)
      if (deletedDoc) {
        showToast.documentDeleted(deletedDoc.name)
      }
      showSuccess("Document deleted successfully")
    }
  }

  const handleEdit = (doc: KnowledgeBaseDocument, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingDoc(doc)
    setEditContent(doc.content)
  }

  const handleSaveEdit = () => {
    if (!editingDoc) return
    
    const updated = updateDocument(editingDoc.id, { content: editContent })
    if (updated) {
      const updatedDocs = getDocuments()
      setDocuments(updatedDocs)
      if (selectedDoc?.id === editingDoc.id) {
        setSelectedDoc(updated)
      }
      setEditingDoc(null)
      setEditContent("")
      showSuccess("Document updated successfully")
    } else {
      showError("Failed to update document")
    }
  }

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content)
    showSuccess("Content copied to clipboard")
  }

  const handleUploadClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const currentDocs = getDocuments()
    const limits = getPlanLimits(subscription.plan)
    const maxDocs = limits.knowledgeBaseDocs === "unlimited" ? Infinity : limits.knowledgeBaseDocs
    const canUpload = currentDocs.length < maxDocs
    
    if (!canUpload) {
      showError(`You've reached your plan limit of ${maxDocs} documents. Upgrade to upload more.`)
      return
    }
    
    console.log("Upload button clicked, opening file picker")
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <div className="border-b border-[#E5E7EB] bg-white px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h2 text-[#111827] mb-1">Knowledge Base</h1>
            <p className="text-body text-[#6B7280]">
              Upload documents or chat to train AI on your sales style and product knowledge
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowChat(!showChat)}
              className={showChat ? "bg-[#4F8CFF]/10" : ""}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {showChat ? "Hide Chat" : "Chat"}
            </Button>
            <Button
              variant="outline"
              onClick={handleUploadClick}
              disabled={isUploading || !canUpload}
              className="hover:bg-[#F9FAFB]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              console.log("File input onChange triggered")
              const files = e.target.files
              if (files && files.length > 0) {
                console.log("Processing files:", files.length)
                handleFileSelect(files)
              }
              // Reset input so same file can be uploaded again
              e.target.value = ""
            }}
            accept=".pdf,.doc,.docx,.txt,.md,.json,.csv,.js,.ts,.py,.html,.css"
          />
        </div>
      </div>

      {/* Success/Error Messages */}
      {(success || error) && (
        <div className="px-6 py-3 flex-shrink-0">
          {success && (
            <div className="p-3 rounded-lg bg-white border border-[#3CCB7F]/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                <p className="text-sm text-[#111827]">{success}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-white border border-[#E06C75]/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#E06C75]" />
                <p className="text-sm text-[#111827]">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-0 flex">
        {/* Main Content */}
        <div className={cn("flex-1 overflow-y-auto p-6 min-h-0", showChat && "hidden")}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Plan Limit Warning */}
            {!canUpload && (
              <Card className="p-4 bg-white border border-[#F6C177]/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-[#F6C177] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111827] mb-1">
                      Knowledge Base Limit Reached
                    </p>
                    <p className="text-xs text-[#6B7280] mb-3">
                      You've reached your plan limit of {maxDocs} document{maxDocs !== 1 ? "s" : ""}. 
                      {subscription.plan !== "professional" && " Upgrade to Professional for unlimited documents."}
                    </p>
                    {subscription.plan !== "professional" && (
                      <Button size="sm" asChild>
                        <a href="/pricing">Upgrade Plan</a>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Usage Stats */}
            {limits.knowledgeBaseDocs !== "unlimited" && documents.length > 0 && (
              <Card className="p-4 bg-gradient-to-r from-[#4F8CFF]/5 to-transparent border-[#4F8CFF]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#111827]">
                    {documents.length} / {maxDocs} documents
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    {Math.round((documents.length / maxDocs) * 100)}% used
                  </span>
                </div>
                <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden border border-[#E5E7EB]">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      documents.length >= maxDocs ? "bg-[#E06C75]" : "bg-gradient-to-r from-[#4F8CFF] to-[#6EA0FF]"
                    )}
                    style={{ width: `${Math.min(100, (documents.length / maxDocs) * 100)}%` }}
                  />
                </div>
              </Card>
            )}

            {/* Upload Area */}
            <Card
              className={cn(
                "p-6 transition-all bg-white border-[#E5E7EB]",
                isDragging && "border-[#4F8CFF] bg-gradient-to-br from-[#4F8CFF]/5 to-transparent shadow-lg"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="mb-4">
                <CardTitle className="text-base font-semibold mb-1 text-[#111827]">Upload Documents</CardTitle>
                <CardDescription className="text-sm text-[#6B7280]">
                  Add sales scripts, FAQs, product docs, and more. AI will use these to generate better messages.
                </CardDescription>
              </div>
              <div
                className={cn(
                  "rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200",
                  canUpload && "cursor-pointer",
                  isDragging
                    ? "border-[#4F8CFF] bg-[#4F8CFF]/10 scale-[1.02]"
                    : canUpload
                    ? "border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#4F8CFF]/50 hover:bg-[#4F8CFF]/5"
                    : "border-[#E5E7EB] bg-[#F9FAFB] opacity-50 cursor-not-allowed"
                )}
                onClick={canUpload ? handleUploadClick : undefined}
              >
                <div className={cn(
                  "mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-all",
                  isDragging 
                    ? "bg-[#4F8CFF]/20 scale-110" 
                    : canUpload
                    ? "bg-[#4F8CFF]/10"
                    : "bg-[#E5E7EB]"
                )}>
                  <Upload className={cn(
                    "h-8 w-8 transition-colors", 
                    isDragging ? "text-[#4F8CFF]" : canUpload ? "text-[#4F8CFF]" : "text-[#9CA3AF]"
                  )} />
                </div>
                <p className="text-sm font-semibold mb-1 text-[#111827]">
                  {isDragging 
                    ? "Drop files here to upload" 
                    : canUpload
                    ? "Drag and drop files here, or click to browse"
                    : "Upload limit reached"}
                </p>
                <p className="text-xs text-[#6B7280] mb-2">
                  Supports PDF, DOCX, TXT, MD, JSON, CSV, and more
                </p>
                {canUpload && (
                  <p className="text-xs text-[#6B7280]">
                    {documents.length === 0 
                      ? "Get started by uploading your first document"
                      : `You can upload ${maxDocs === Infinity ? "unlimited" : maxDocs - documents.length} more document${maxDocs - documents.length !== 1 ? "s" : ""}`}
                  </p>
                )}
              </div>
            </Card>

            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              <Input
                type="text"
                placeholder="Search documents by name or content... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              </div>
              
              {/* Filter and Sort Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters || filterType !== null ? "bg-[#4F8CFF]/10" : ""}
                >
                  <Filter className="h-4 w-4 mr-1.5" />
                  Filters
                  {filterType && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#4F8CFF]/20 text-xs">
                      1
                    </span>
                  )}
                </Button>
                
                <div className="flex items-center gap-1 border border-[#E5E7EB] rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const order = sortOrder === "asc" ? "desc" : "asc"
                      setSortOrder(order)
                    }}
                    className="h-7 px-2"
                  >
                    {sortOrder === "asc" ? (
                      <SortAsc className="h-3.5 w-3.5" />
                    ) : (
                      <SortDesc className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs border-0 bg-transparent focus:outline-none cursor-pointer px-2"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="type">Type</option>
                  </select>
                </div>

                {filterType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilterType(null)}
                    className="h-7 text-xs"
                  >
                    Clear filter
                    <X className="h-3 w-3 ml-1" />
                  </Button>
                )}

                <div className="ml-auto text-xs text-[#6B7280]">
                  {filteredDocuments.length} of {documents.length} documents
                </div>
              </div>

              {/* Filter Panel */}
              {showFilters && (
                <Card className="p-4 bg-white border-[#E5E7EB]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[#111827]">Document Type</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={filterType === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType(null)}
                        className="h-7 text-xs"
                      >
                        All Types
                      </Button>
                      {documentTypes.map(type => (
                        <Button
                          key={type}
                          variant={filterType === type ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilterType(type)}
                          className="h-7 text-xs"
                        >
                          <FileType className="h-3 w-3 mr-1" />
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Documents List */}
            <div className="space-y-2">
              {filteredDocuments.length === 0 ? (
                <Card className="p-12 text-center bg-white border-[#E5E7EB]">
                  <FileText className="mx-auto h-12 w-12 text-[#6B7280] mb-4" />
                  <p className="text-sm font-medium mb-1 text-[#111827]">No documents found</p>
                  <p className="text-xs text-[#6B7280] mb-4">
                    {searchQuery || filterType
                      ? "Try adjusting your search or filters"
                      : "Upload your first document to get started"}
                  </p>
                  {(searchQuery || filterType) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("")
                        setFilterType(null)
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Card>
              ) : (
                filteredDocuments.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id
                  const searchMatch = searchQuery && (
                    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  
                  return (
                    <Card 
                      key={doc.id} 
                      className={cn(
                        "p-4 bg-white hover:bg-[#F9FAFB] transition-all cursor-pointer border-[#E5E7EB] group",
                        isSelected && "bg-[#F9FAFB] border-[#4F8CFF]/30 shadow-sm"
                      )}
                      onClick={() => {
                        setSelectedDoc(doc)
                        setEditingDoc(null)
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            isSelected ? "bg-[#4F8CFF]/20" : "bg-[#F9FAFB] group-hover:bg-[#4F8CFF]/10"
                          )}>
                            <FileText className={cn(
                              "h-5 w-5",
                              isSelected ? "text-[#4F8CFF]" : "text-[#6B7280]"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="font-semibold text-sm text-[#111827] truncate">{doc.name}</p>
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {doc.tags.slice(0, 2).map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 rounded bg-[#4F8CFF]/10 text-[10px] text-[#4F8CFF] font-medium"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {doc.tags.length > 2 && (
                                    <span className="text-[10px] text-[#6B7280]">+{doc.tags.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#6B7280] flex-wrap">
                              <span className="flex items-center gap-1">
                                <FileType className="h-3 w-3" />
                                {doc.type}
                              </span>
                              <span>•</span>
                              <span>{formatFileSize(doc.size)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(doc.uploadedAt)}
                              </span>
                              {doc.wordCount && (
                                <>
                                  <span>•</span>
                                  <span>{doc.wordCount.toLocaleString()} words</span>
                                </>
                              )}
                              {doc.status === "processing" && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-[#F6C177]">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Processing...
                                  </span>
                                </>
                              )}
                              {doc.status === "ready" && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#3CCB7F]">Ready</span>
                                </>
                              )}
                            </div>
                            {searchMatch && searchQuery && (
                              <p className="text-xs text-[#6B7280] mt-1.5 line-clamp-1">
                                {doc.content.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={(e) => handleEdit(doc, e)}
                            className="h-8 w-8 text-[#6B7280] hover:text-[#4F8CFF]"
                            title="Edit document"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="h-8 w-8 text-[#6B7280] hover:text-[#E06C75]"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="flex-1 border-l border-[#E5E7EB] bg-white flex flex-col flex-shrink-0">
            <KnowledgeBaseChat
              onDocumentCreated={() => {
                // Refresh documents list
                const updatedDocs = getDocuments()
                setDocuments(updatedDocs)
                // Optionally close chat after document creation
                // setShowChat(false)
              }}
            />
          </div>
        )}

        {/* Document Viewer Sidebar */}
        {selectedDoc && !showChat && (
          <div className="w-96 border-l border-[#E5E7EB] bg-white flex flex-col flex-shrink-0">
            <div className="border-b border-[#E5E7EB] p-4 flex items-center justify-between flex-shrink-0">
              <h2 className="font-semibold text-sm text-[#111827]">Document Preview</h2>
              <div className="flex items-center gap-1">
                {!editingDoc && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyContent(selectedDoc.content)}
                      className="h-8 w-8"
                      title="Copy content"
                    >
                      <Copy className="h-4 w-4 text-[#6B7280]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleEdit(selectedDoc, e)}
                      className="h-8 w-8"
                      title="Edit document"
                    >
                      <Edit2 className="h-4 w-4 text-[#6B7280]" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedDoc(null)
                    setEditingDoc(null)
                    setEditContent("")
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4 text-[#6B7280]" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {editingDoc && editingDoc.id === selectedDoc.id ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-[#111827]">{selectedDoc.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-3">
                      <span>{selectedDoc.type}</span>
                      <span>•</span>
                      <span>{formatFileSize(selectedDoc.size)}</span>
                      <span>•</span>
                      <span>{formatDate(selectedDoc.uploadedAt)}</span>
                    </div>
                  </div>
                  <div className="border-t border-[#E5E7EB] pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-xs text-[#6B7280] uppercase">Edit Content</h4>
                      <span className="text-xs text-[#6B7280]">
                        {editContent.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[400px] p-3 text-sm rounded-lg border border-[#E5E7EB] bg-white font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#4F8CFF]/20"
                      placeholder="Edit document content... (Press Esc to cancel)"
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-[#6B7280]">
                        {editContent.split(/\s+/).filter(Boolean).length} words • {editContent.length} characters
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDoc(null)
                            setEditContent("")
                          }}
                        >
                          Cancel (Esc)
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-[#111827]">{selectedDoc.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <FileType className="h-3 w-3" />
                        {selectedDoc.type}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(selectedDoc.size)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(selectedDoc.uploadedAt)}
                      </span>
                      {selectedDoc.wordCount && (
                        <>
                          <span>•</span>
                          <span>{selectedDoc.wordCount.toLocaleString()} words</span>
                        </>
                      )}
                    </div>
                    {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Tag className="h-3 w-3 text-[#6B7280]" />
                        {selectedDoc.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-[#4F8CFF]/10 text-xs text-[#4F8CFF] font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t border-[#E5E7EB] pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-xs text-[#6B7280] uppercase">Content</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyContent(selectedDoc.content)}
                          className="h-7 text-xs"
                          title="Copy content to clipboard"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEdit(selectedDoc, e)}
                          className="h-7 text-xs"
                          title="Edit document (⌘E)"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {selectedDoc.type === "MD" || selectedDoc.name.endsWith(".md") ? (
                        <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-4 rounded-lg max-h-[600px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm text-[#111827] font-sans leading-relaxed">
                            {selectedDoc.content}
                          </pre>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap text-xs bg-[#F9FAFB] border border-[#E5E7EB] p-4 rounded-lg font-mono max-h-[600px] overflow-y-auto text-[#111827] leading-relaxed">
                          {selectedDoc.content}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
