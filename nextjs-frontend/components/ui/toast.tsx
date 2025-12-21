"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Try to import toast primitives, with graceful fallback
let ToastPrimitives: any = null
if (typeof window !== "undefined") {
  try {
    ToastPrimitives = require("@radix-ui/react-toast")
  } catch (e) {
    // Package not installed - will use fallback components
    console.warn("@radix-ui/react-toast not installed. Toast notifications will be disabled.")
  }
}

// Fallback components if ToastPrimitives is not available
const ToastProviderFallback = ({ children }: { children: React.ReactNode }) => <>{children}</>
const ToastViewportFallback = React.forwardRef<HTMLDivElement, any>((props, ref) => null)
const ToastRootFallback = React.forwardRef<HTMLDivElement, any>((props, ref) => null)
const ToastActionFallback = React.forwardRef<HTMLButtonElement, any>((props, ref) => null)
const ToastCloseFallback = React.forwardRef<HTMLButtonElement, any>((props, ref) => null)
const ToastTitleFallback = React.forwardRef<HTMLDivElement, any>((props, ref) => null)
const ToastDescriptionFallback = React.forwardRef<HTMLDivElement, any>((props, ref) => null)

const ToastProvider = ToastPrimitives?.Provider || ToastProviderFallback

const ToastViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  if (!ToastPrimitives) {
    return null
  }
  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className
      )}
      {...props}
    />
  )
})
ToastViewport.displayName = "ToastViewport"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-[#E5E7EB] bg-white text-[#111827]",
        success: "border-[#3CCB7F]/20 bg-white text-[#111827]",
        error: "border-[#E06C75]/20 bg-white text-[#111827]",
        warning: "border-[#F6C177]/20 bg-white text-[#111827]",
        info: "border-[#4F8CFF]/20 bg-white text-[#111827]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  if (!ToastPrimitives) {
    return null
  }
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = "Toast"

const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  if (!ToastPrimitives) {
    return null
  }
  return (
    <ToastPrimitives.Action
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#4F8CFF] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-[#E06C75]/50 group-[.destructive]:hover:border-[#E06C75] group-[.destructive]:hover:bg-[#E06C75]/10 group-[.destructive]:hover:text-[#E06C75] group-[.destructive]:focus:ring-[#E06C75]",
        className
      )}
      {...props}
    />
  )
})
ToastAction.displayName = "ToastAction"

const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  if (!ToastPrimitives) {
    return null
  }
  return (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-[#6B7280] opacity-0 transition-opacity hover:text-[#111827] focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-[#E06C75] group-[.destructive]:hover:text-[#E06C75]",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitives.Close>
  )
})
ToastClose.displayName = "ToastClose"

const ToastTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  if (!ToastPrimitives) {
    return null
  }
  return (
    <ToastPrimitives.Title
      ref={ref}
      className={cn("text-sm font-semibold text-[#111827]", className)}
      {...props}
    />
  )
})
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  if (!ToastPrimitives) {
    return null
  }
  return (
    <ToastPrimitives.Description
      ref={ref}
      className={cn("text-sm opacity-90 text-[#6B7280]", className)}
      {...props}
    />
  )
})
ToastDescription.displayName = "ToastDescription"

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
