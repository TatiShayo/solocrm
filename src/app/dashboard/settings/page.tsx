"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Trash2, Key, Plus, Webhook } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  last_used_at: string | null;
  created_at: string;
}

interface WebhookDef {
  id: string;
  url: string;
  events: string[];
  created_at: string;
}

const WEBHOOK_EVENTS = [
  { value: "deal.created", label: "Deal Created" },
  { value: "deal.stage_changed", label: "Deal Stage Changed" },
  { value: "deal.won", label: "Deal Won" },
  { value: "deal.lost", label: "Deal Lost" },
  { value: "contact.created", label: "Contact Created" },
];

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  const [webhooks, setWebhooks] = useState<WebhookDef[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [webhookSaving, setWebhookSaving] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/settings/api-keys");
    if (res.ok) {
      const data = await res.json();
      setApiKeys(data.keys);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const fetchWebhooks = useCallback(async () => {
    const res = await fetch("/api/webhooks");
    if (res.ok) {
      const data = await res.json();
      setWebhooks(data.webhooks);
    }
    setWebhooksLoading(false);
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  async function createWebhook() {
    if (!webhookUrl.trim() || selectedEvents.length === 0) return;
    setWebhookSaving(true);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl.trim(), events: selectedEvents }),
    });
    if (res.ok) {
      const data = await res.json();
      setWebhooks([data.webhook, ...webhooks]);
      setWebhookUrl("");
      setSelectedEvents([]);
      toast.success("Webhook created");
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create webhook");
    }
    setWebhookSaving(false);
  }

  async function deleteWebhook(id: string) {
    const res = await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setWebhooks(webhooks.filter((w) => w.id !== id));
      toast.success("Webhook deleted");
    } else {
      toast.error("Failed to delete webhook");
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setApiKeys([data.key, ...apiKeys]);
      setNewKeyName("");
      toast.success("API key created");
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create key");
    }
    setCreating(false);
  }

  async function deleteKey(id: string) {
    const res = await fetch(`/api/settings/api-keys?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setApiKeys(apiKeys.filter((k) => k.id !== id));
      toast.success("API key deleted");
    } else {
      toast.error("Failed to delete key");
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Create API keys for integrations like the Chrome extension. Keys have full access to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g. Chrome Extension)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
            />
            <Button onClick={createKey} disabled={creating || !newKeyName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Generate
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Generate one for the Chrome extension.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      sk_{key.key.slice(0, 8)}...
                    </p>
                    {key.last_used_at && (
                      <p className="text-xs text-muted-foreground">
                        Last used: {new Date(key.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => copyKey(key.key)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteKey(key.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chrome Extension</CardTitle>
          <CardDescription>
            Capture LinkedIn profiles and add them as contacts in one click.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
            <li>Generate an API key above</li>
            <li>Install the SoloCRM Chrome extension (coming soon to Chrome Web Store)</li>
            <li>Open the extension, paste your API key, and enter your SoloCRM domain</li>
            <li>Browse LinkedIn — click the extension button on any profile to capture it</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Send events to Zapier or any HTTP endpoint when deals change or contacts are created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <div>
              <p className="text-xs font-medium mb-2">Events to send:</p>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <button
                    key={ev.value}
                    type="button"
                    onClick={() => toggleEvent(ev.value)}
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                      selectedEvents.includes(ev.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={createWebhook}
              disabled={webhookSaving || !webhookUrl.trim() || selectedEvents.length === 0}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Webhook
            </Button>
          </div>

          {webhooksLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
          ) : (
            <div className="space-y-2">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">{wh.url}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {wh.events.map((e) => (
                        <span
                          key={e}
                          className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs"
                        >
                          {WEBHOOK_EVENTS.find((ev) => ev.value === e)?.label || e}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteWebhook(wh.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
