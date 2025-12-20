"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Bot, User, Loader2, X, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { showToast } from "@/lib/toast"
import { chatWithKnowledgeBase } from "@/lib/api"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isProcessing?: boolean
}

interface KnowledgeBaseChatProps {
  onDocumentCreated?: () => void
}

export function KnowledgeBaseChat({ onDocumentCreated }: KnowledgeBaseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I can help you update your knowledge base. You can tell me about your products, sales scripts, FAQs, or any information you'd like to add. What would you like to add?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Add placeholder assistant message
    const assistantMessageId = `msg-${Date.now() + 1}`
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isProcessing: true,
    }
    setMessages((prev) => [...prev, assistantMessage])

    try {
      // Call API to process chat message
      const data = await chatWithKnowledgeBase(
        userMessage.content,
        messages
          .filter((m) => !m.isProcessing)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }))
      )

      // Update assistant message with response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: data.response || "I've processed your message and updated the knowledge base.",
                isProcessing: false,
              }
            : msg
        )
      )

      // If a document was created, notify parent and show success
      if (data.document_created) {
        if (onDocumentCreated) {
          onDocumentCreated()
        }
        showToast.success(
          "Document created", 
          data.document_title 
            ? `"${data.document_title}" has been added to your knowledge base.`
            : "Your knowledge base has been updated!"
        )
      }
    } catch (error) {
      console.error("Error sending message:", error)
      
      // Update assistant message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: "I'm sorry, I encountered an error processing your message. Please try again.",
                isProcessing: false,
              }
            : msg
        )
      )
      
      showToast.error("Error", "Failed to process message. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="flex flex-col h-full bg-white border border-[#E5E7EB]">
      <div className="border-b border-[#E5E7EB] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#4F8CFF]" />
          <h3 className="font-semibold text-sm text-[#111827]">Chat with Knowledge Base</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[#4F8CFF]/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-[#4F8CFF]" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                message.role === "user"
                  ? "bg-[#4F8CFF] text-white"
                  : "bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB]"
              )}
            >
              {message.isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#4F8CFF]" />
                  <span className="text-sm text-[#6B7280]">Processing...</span>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-[#4F8CFF]/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-[#4F8CFF]" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#E5E7EB] p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (e.g., 'Add a FAQ about pricing')"
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="default"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-[#6B7280] mt-2">
          Example: "Add information about our Enterprise package pricing" or "Create a sales script for cold outreach"
        </p>
      </div>
    </Card>
  )
}

