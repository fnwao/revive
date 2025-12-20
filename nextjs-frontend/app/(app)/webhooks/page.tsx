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
import { Webhook, Plus, Edit, Trash2, CheckCircle, XCircle, Clock, Activity } from "lucide-react"
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, getWebhookDeliveries, type Webhook as WebhookType, type WebhookDelivery } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const WEBHOOK_EVENTS = [
  { value: "deal.detected", label: "Deal Detected" },
  { value: "message.generated", label: "Message Generated" },
  { value: "message.approved", label: "Message Approved" },
  { value: "message.sent", label: "Message Sent" },
  { value: "message.rejected", label: "Message Rejected" },
  { value: "deal.updated", label: "Deal Updated" },
  { value: "deal.closed", label: "Deal Closed" },
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookType | null>(null)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null)
  const { toast } = useToast()

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      const response = await getWebhooks()
      setWebhooks(response.webhooks)
    } catch (error) {
      console.error("Error loading webhooks:", error)
      toast({
        title: "Error",
        description: "Failed to load webhooks",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDeliveries = async (webhookId: string) => {
    try {
      const deliveries = await getWebhookDeliveries(webhookId, { limit: 20 })
      setDeliveries(deliveries)
    } catch (error) {
      console.error("Error loading deliveries:", error)
    }
  }

  useEffect(() => {
    loadWebhooks()
  }, [])

  useEffect(() => {
    if (selectedWebhook) {
      loadDeliveries(selectedWebhook.id)
    }
  }, [selectedWebhook])

  const handleDelete = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return

    try {
      await deleteWebhook(webhookId)
      toast({
        title: "Success",
        description: "Webhook deleted successfully",
      })
      loadWebhooks()
      if (selectedWebhook?.id === webhookId) {
        setSelectedWebhook(null)
      }
    } catch (error) {
      console.error("Error deleting webhook:", error)
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "error",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground mt-1">Configure webhooks to receive real-time events</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <WebhookForm
              onSuccess={() => {
                setIsCreateDialogOpen(false)
                loadWebhooks()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading webhooks...</div>
      ) : webhooks.length === 0 ? (
        <Card className="p-8 text-center">
          <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No webhooks configured</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Webhook
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {webhooks.map((webhook) => (
            <Card
              key={webhook.id}
              className={cn(
                "p-4 cursor-pointer hover:shadow-md transition-shadow",
                selectedWebhook?.id === webhook.id && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedWebhook(webhook)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Webhook className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{webhook.name}</h3>
                    {getStatusBadge(webhook.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 font-mono break-all">{webhook.url}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {WEBHOOK_EVENTS.find((e) => e.value === event)?.label || event}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Total: {webhook.total_requests}</span>
                    <span className="text-green-600">Success: {webhook.successful_requests}</span>
                    <span className="text-red-600">Failed: {webhook.failed_requests}</span>
                    {webhook.last_triggered_at && (
                      <span>Last: {new Date(webhook.last_triggered_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog open={editingWebhook?.id === webhook.id} onOpenChange={(open) => !open && setEditingWebhook(null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingWebhook(webhook)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <WebhookForm
                        webhook={webhook}
                        onSuccess={() => {
                          setEditingWebhook(null)
                          loadWebhooks()
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(webhook.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedWebhook && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Delivery History</h2>
            <Button variant="outline" size="sm" onClick={() => setSelectedWebhook(null)}>
              Close
            </Button>
          </div>
          <div className="space-y-2">
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deliveries yet</p>
            ) : (
              deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getDeliveryStatusBadge(delivery.status)}
                    <div>
                      <p className="font-medium text-sm">
                        {WEBHOOK_EVENTS.find((e) => e.value === delivery.event_type)?.label || delivery.event_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(delivery.triggered_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {delivery.response_status && (
                      <Badge variant={delivery.response_status >= 200 && delivery.response_status < 300 ? "default" : "destructive"}>
                        {delivery.response_status}
                      </Badge>
                    )}
                    {delivery.error_message && (
                      <span className="text-xs text-red-600 max-w-xs truncate">{delivery.error_message}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function WebhookForm({ webhook, onSuccess }: { webhook?: WebhookType; onSuccess: () => void }) {
  const [name, setName] = useState(webhook?.name || "")
  const [url, setUrl] = useState(webhook?.url || "")
  const [secret, setSecret] = useState((webhook as any)?.secret || "")
  const [events, setEvents] = useState<string[]>(webhook?.events || [])
  const [retryCount, setRetryCount] = useState(webhook?.retry_count || 3)
  const [timeoutSeconds, setTimeoutSeconds] = useState(webhook?.timeout_seconds || 30)
  const [status, setStatus] = useState(webhook?.status || "active")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const toggleEvent = (eventValue: string) => {
    setEvents((prev) =>
      prev.includes(eventValue) ? prev.filter((e) => e !== eventValue) : [...prev, eventValue]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !url || events.length === 0) {
      toast({
        title: "Error",
        description: "Name, URL, and at least one event are required",
        variant: "error",
      })
      return
    }

    try {
      setLoading(true)
      if (webhook) {
        const updates: any = {
          name,
          url,
          events,
          retry_count: retryCount,
          timeout_seconds: timeoutSeconds,
          status,
        }
        if (secret) {
          updates.secret = secret
        }
        await updateWebhook(webhook.id, updates)
        toast({
          title: "Success",
          description: "Webhook updated successfully",
        })
      } else {
        await createWebhook({
          name,
          url,
          secret: secret || undefined,
          events,
          retry_count: retryCount,
          timeout_seconds: timeoutSeconds,
        })
        toast({
          title: "Success",
          description: "Webhook created successfully",
        })
      }
      onSuccess()
    } catch (error) {
      console.error("Error saving webhook:", error)
      toast({
        title: "Error",
        description: "Failed to save webhook",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{webhook ? "Edit Webhook" : "Create Webhook"}</DialogTitle>
        <DialogDescription>
          Configure a webhook to receive real-time events from Revive.ai
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="webhook-name">Webhook Name *</Label>
          <Input
            id="webhook-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Production Webhook"
            required
          />
        </div>
        <div>
          <Label htmlFor="webhook-url">Webhook URL *</Label>
          <Input
            id="webhook-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            required
          />
        </div>
        <div>
          <Label htmlFor="webhook-secret">Secret (Optional)</Label>
          <Input
            id="webhook-secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Secret for signature verification"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used to verify webhook authenticity
          </p>
        </div>
        <div>
          <Label>Events *</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {WEBHOOK_EVENTS.map((event) => (
              <div key={event.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`event-${event.value}`}
                  checked={events.includes(event.value)}
                  onChange={() => toggleEvent(event.value)}
                  className="rounded"
                />
                <Label htmlFor={`event-${event.value}`} className="cursor-pointer text-sm">
                  {event.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="retry-count">Retry Count</Label>
            <Input
              id="retry-count"
              type="number"
              min="1"
              max="10"
              value={retryCount}
              onChange={(e) => setRetryCount(parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="timeout">Timeout (seconds)</Label>
            <Input
              id="timeout"
              type="number"
              min="5"
              max="120"
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(parseInt(e.target.value))}
            />
          </div>
        </div>
        {webhook && (
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive" | "failed")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || events.length === 0}>
          {loading ? "Saving..." : webhook ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}

