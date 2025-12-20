// Toast notification utilities
// Provides easy-to-use functions for showing notifications

import { toast } from "@/hooks/use-toast"
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"

export const showToast = {
  success: (title: string, description?: string) => {
    toast({
      variant: "success",
      title,
      description,
    })
  },

  error: (title: string, description?: string) => {
    toast({
      variant: "error",
      title,
      description,
    })
  },

  warning: (title: string, description?: string) => {
    toast({
      variant: "warning",
      title,
      description,
    })
  },

  info: (title: string, description?: string) => {
    toast({
      variant: "info",
      title,
      description,
    })
  },

  // Quick action toasts
  saved: (section?: string) => {
    toast({
      variant: "success",
      title: "Settings saved",
      description: section ? `${section} settings have been saved successfully.` : "Your changes have been saved.",
    })
  },

  apiKeySaved: () => {
    toast({
      variant: "success",
      title: "API key saved",
      description: "Your API key has been saved and the backend is now connected.",
    })
  },

  messageApproved: () => {
    toast({
      variant: "success",
      title: "Message approved",
      description: "The message has been approved and is ready to send.",
    })
  },

  messageRejected: () => {
    toast({
      variant: "info",
      title: "Message rejected",
      description: "The message has been rejected and will not be sent.",
    })
  },

  messageSent: () => {
    toast({
      variant: "success",
      title: "Message sent",
      description: "The revival message has been sent successfully.",
    })
  },

  documentUploaded: (filename: string) => {
    toast({
      variant: "success",
      title: "Document uploaded",
      description: `${filename} has been added to your knowledge base.`,
    })
  },

  documentDeleted: (filename: string) => {
    toast({
      variant: "info",
      title: "Document deleted",
      description: `${filename} has been removed from your knowledge base.`,
    })
  },

  planUpgraded: (planName: string) => {
    toast({
      variant: "success",
      title: "Plan upgraded",
      description: `You've successfully upgraded to the ${planName} plan.`,
    })
  },

  subscriptionCancelled: () => {
    toast({
      variant: "warning",
      title: "Subscription cancelled",
      description: "Your subscription will remain active until the end of the current billing period.",
    })
  },

  subscriptionReactivated: () => {
    toast({
      variant: "success",
      title: "Subscription reactivated",
      description: "Your subscription has been reactivated successfully.",
    })
  },
}

