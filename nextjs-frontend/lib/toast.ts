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
      duration: 3000,
    })
  },

  error: (title: string, description?: string) => {
    toast({
      variant: "error",
      title,
      description,
      duration: 5000,
    })
  },

  warning: (title: string, description?: string) => {
    toast({
      variant: "warning",
      title,
      description,
      duration: 4000,
    })
  },

  info: (title: string, description?: string) => {
    toast({
      variant: "info",
      title,
      description,
      duration: 3000,
    })
  },

  // Quick action toasts
  saved: (section?: string) => {
    toast({
      variant: "success",
      title: "Settings saved",
      description: section ? `${section} settings have been saved successfully.` : "Your changes have been saved.",
      duration: 2000,
    })
  },

  apiKeySaved: () => {
    toast({
      variant: "success",
      title: "API key saved",
      description: "Your API key has been saved and the backend is now connected.",
      duration: 3000,
    })
  },

  messageApproved: () => {
    toast({
      variant: "success",
      title: "Message approved",
      description: "The message has been approved and is ready to send.",
      duration: 2000,
    })
  },

  messageRejected: () => {
    toast({
      variant: "info",
      title: "Message rejected",
      description: "The message has been rejected and will not be sent.",
      duration: 2000,
    })
  },

  messageSent: () => {
    toast({
      variant: "success",
      title: "Message sent",
      description: "The revival message has been sent successfully.",
      duration: 3000,
    })
  },

  documentUploaded: (filename: string) => {
    toast({
      variant: "success",
      title: "Document uploaded",
      description: `${filename} has been added to your knowledge base.`,
      duration: 3000,
    })
  },

  documentDeleted: (filename: string) => {
    toast({
      variant: "info",
      title: "Document deleted",
      description: `${filename} has been removed from your knowledge base.`,
      duration: 2000,
    })
  },

  planUpgraded: (planName: string) => {
    toast({
      variant: "success",
      title: "Plan upgraded",
      description: `You've successfully upgraded to the ${planName} plan.`,
      duration: 3000,
    })
  },

  subscriptionCancelled: () => {
    toast({
      variant: "warning",
      title: "Subscription cancelled",
      description: "Your subscription will remain active until the end of the current billing period.",
      duration: 4000,
    })
  },

  subscriptionReactivated: () => {
    toast({
      variant: "success",
      title: "Subscription reactivated",
      description: "Your subscription has been reactivated successfully.",
      duration: 3000,
    })
  },
}

