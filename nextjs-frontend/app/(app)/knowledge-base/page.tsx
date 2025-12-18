"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileText, Trash2, Search, X, Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react"
import {
  getDocuments,
  addDocument,
  deleteDocument,
  formatFileSize,
  formatDate,
  type KnowledgeBaseDocument,
} from "@/lib/knowledge-base"
import { getSubscription, getPlanLimits } from "@/lib/subscription"
import { cn } from "@/lib/utils"
import { showToast } from "@/lib/toast"

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>(getDocuments())
  const [subscription, setSubscription] = useState(getSubscription())
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeBaseDocument | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  const limits = getPlanLimits(subscription.plan)
  const maxDocs = limits.knowledgeBaseDocs === "unlimited" ? Infinity : limits.knowledgeBaseDocs
  const canUpload = documents.length < maxDocs

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
              
              const newDoc = addDocument({
                name: file.name,
                type: extension,
                size: file.size,
                content: displayContent,
                tags: [],
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
      const deletedDoc = documents.find(d => d.id === id)
      if (deletedDoc) {
        showToast.documentDeleted(deletedDoc.name)
      }
      showSuccess("Document deleted successfully")
    }
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
    <div className="flex flex-col h-full min-h-0 bg-[#0F1115]">
      {/* Header */}
      <div className="border-b border-[#2A2F3A] bg-[#0F1115] px-6 py-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h2 text-[#F5F7FA] mb-1">Knowledge Base</h1>
            <p className="text-body text-[#B8BDC9]">
              Upload documents to train AI on your sales style and product knowledge
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleUploadClick}
            disabled={isUploading || !canUpload}
            className="hover:bg-[#1B1F2A]"
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
            <div className="p-3 rounded-lg bg-[#1B1F2A] border border-[#3CCB7F]/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#3CCB7F]" />
                <p className="text-sm text-[#F5F7FA]">{success}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-[#1B1F2A] border border-[#E06C75]/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#E06C75]" />
                <p className="text-sm text-[#F5F7FA]">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden min-h-0 flex">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Plan Limit Warning */}
            {!canUpload && (
              <Card className="p-4 bg-[#1B1F2A] border border-[#F6C177]/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-[#F6C177] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#F5F7FA] mb-1">
                      Knowledge Base Limit Reached
                    </p>
                    <p className="text-xs text-[#B8BDC9] mb-3">
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
            {limits.knowledgeBaseDocs !== "unlimited" && (
              <div className="flex items-center gap-4 text-sm text-[#B8BDC9]">
                <span>
                  {documents.length} / {maxDocs} documents
                </span>
                <div className="flex-1 h-2 bg-[#1B1F2A] rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300",
                      documents.length >= maxDocs ? "bg-[#E06C75]" : "bg-[#4F8CFF]"
                    )}
                    style={{ width: `${Math.min(100, (documents.length / maxDocs) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Area */}
            <Card
              className={cn(
                "p-6 transition-colors bg-[#1B1F2A] border-[#2A2F3A]",
                isDragging && "border-[#4F8CFF] bg-[#4F8CFF]/5"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="mb-4">
                <CardTitle className="text-base font-semibold mb-1 text-[#F5F7FA]">Upload Documents</CardTitle>
                <CardDescription className="text-sm text-[#B8BDC9]">
                  Add sales scripts, FAQs, product docs, and more
                </CardDescription>
              </div>
              <div
                className={cn(
                  "rounded-lg border-2 border-dashed p-12 text-center transition-colors",
                  canUpload && "cursor-pointer",
                  isDragging
                    ? "border-[#4F8CFF] bg-[#4F8CFF]/10"
                    : canUpload
                    ? "border-[#2A2F3A] bg-[#1B1F2A] hover:border-[#4F8CFF]/50"
                    : "border-[#2A2F3A] bg-[#1B1F2A] opacity-50 cursor-not-allowed"
                )}
                onClick={canUpload ? handleUploadClick : undefined}
              >
                <Upload className={cn(
                  "mx-auto h-10 w-10 mb-3 transition-colors", 
                  isDragging ? "text-[#4F8CFF]" : canUpload ? "text-[#8A90A2]" : "text-[#5E6475]"
                )} />
                <p className="text-sm font-medium mb-1 text-[#F5F7FA]">
                  {isDragging 
                    ? "Drop files here" 
                    : canUpload
                    ? "Drag and drop files here, or click to browse"
                    : "Upload limit reached"}
                </p>
                <p className="text-xs text-[#8A90A2]">
                  Supports PDF, DOCX, TXT, MD, JSON, CSV, and more
                </p>
              </div>
            </Card>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A90A2]" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Documents List */}
            <div className="space-y-2">
              {filteredDocuments.length === 0 ? (
                <Card className="p-12 text-center bg-[#1B1F2A] border-[#2A2F3A]">
                  <FileText className="mx-auto h-12 w-12 text-[#8A90A2] mb-4" />
                  <p className="text-sm font-medium mb-1 text-[#F5F7FA]">No documents found</p>
                  <p className="text-xs text-[#8A90A2]">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Upload your first document to get started"}
                  </p>
                </Card>
              ) : (
                filteredDocuments.map((doc) => (
                  <Card 
                    key={doc.id} 
                    className={cn(
                      "p-4 bg-[#1B1F2A] hover:bg-[#151822] transition-colors cursor-pointer border-[#2A2F3A]",
                      selectedDoc?.id === doc.id && "bg-[#151822] border-[#4F8CFF]/30"
                    )}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <FileText className="h-6 w-6 text-[#8A90A2] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1 text-[#F5F7FA]">{doc.name}</p>
                          <div className="flex items-center gap-3 text-xs text-[#8A90A2]">
                            <span>{doc.type}</span>
                            <span>•</span>
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <span>{formatDate(doc.uploadedAt)}</span>
                            {doc.status === "processing" && (
                              <>
                                <span>•</span>
                                <span className="text-[#F6C177]">Processing...</span>
                              </>
                            )}
                            {doc.status === "ready" && (
                              <>
                                <span>•</span>
                                <span className="text-[#3CCB7F]">Ready</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="hover:bg-[#1B1F2A] text-[#8A90A2] hover:text-[#E06C75] flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Document Viewer Sidebar */}
        {selectedDoc && (
          <div className="w-96 border-l border-[#2A2F3A] bg-[#0F1115] flex flex-col flex-shrink-0">
            <div className="border-b border-[#2A2F3A] p-4 flex items-center justify-between flex-shrink-0">
              <h2 className="font-semibold text-sm text-[#F5F7FA]">Document Preview</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDoc(null)}
                className="hover:bg-[#1B1F2A]"
              >
                <X className="h-4 w-4 text-[#8A90A2]" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2 text-[#F5F7FA]">{selectedDoc.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#8A90A2] mb-3">
                    <span>{selectedDoc.type}</span>
                    <span>•</span>
                    <span>{formatFileSize(selectedDoc.size)}</span>
                    <span>•</span>
                    <span>{formatDate(selectedDoc.uploadedAt)}</span>
                  </div>
                </div>
                <div className="border-t border-[#2A2F3A] pt-4">
                  <h4 className="font-medium text-xs mb-2 text-[#8A90A2] uppercase">Content</h4>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-xs bg-[#1B1F2A] border border-[#2A2F3A] p-3 rounded-lg font-mono max-h-[600px] overflow-y-auto text-[#B8BDC9]">
                      {selectedDoc.content}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
