"use client";

import { useState, useEffect } from "react";
import { Bot, Mail, FileText, Lightbulb, Loader2, Copy, Check } from "lucide-react";

type Contact = { id: string; name: string; email: string | null; company: string | null };
type Deal = { id: string; title: string; value: number; status: string };

export default function AIAssistantPage() {
  const [tab, setTab] = useState<"email" | "summary" | "next-step">("email");

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="h-8 w-8 text-cyan-500" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground mt-1">
            Let AI help you write emails, summarize deals, and suggest next actions.
          </p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        {[
          { id: "email" as const, label: "Email Writer", icon: Mail },
          { id: "summary" as const, label: "Deal Summary", icon: FileText },
          { id: "next-step" as const, label: "Next Step", icon: Lightbulb },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "email" && <EmailWriter />}
      {tab === "summary" && <DealSummary />}
      {tab === "next-step" && <NextStep />}
    </div>
  );
}

function EmailWriter() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(data.contacts || []));
  }, []);

  const generate = async () => {
    if (!prompt.trim()) {
      setError("Describe what kind of email you want to write.");
      return;
    }
    setError("");
    setLoading(true);
    setDraft("");
    try {
      const res = await fetch("/api/ai/write-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contactId || undefined, prompt }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDraft(data.draft);
      }
    } catch {
      setError("Failed to generate email. Check that OpenAI is configured.");
    } finally {
      setLoading(false);
    }
  };

  const copyDraft = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label className="text-sm font-medium">Contact (optional)</label>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">General email (no contact)</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` (${c.company})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">What should the email be about?</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='e.g. "Write a follow-up email for a contact who showed interest in our consulting services after a demo last week"'
          rows={3}
          className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-cyan-600 text-white h-10 px-4 py-2 text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        Generate Email Draft
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {draft && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Generated Draft</span>
            <button
              onClick={copyDraft}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{draft}</p>
        </div>
      )}
    </div>
  );
}

function DealSummary() {
  return (
    <div className="max-w-2xl">
      <DealSummaryInner />
    </div>
  );
}

function DealSummaryInner() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealId, setDealId] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      setLoaded(true);
      fetch("/api/ai/deals")
        .then((r) => r.json())
        .then((data) => setDeals(data.deals || []));
    }
  }, [loaded]);

  const generate = async () => {
    if (!dealId) {
      setError("Select a deal first.");
      return;
    }
    setError("");
    setLoading(true);
    setSummary("");
    try {
      const res = await fetch("/api/ai/deal-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSummary(data.summary);
      }
    } catch {
      setError("Failed to generate summary. Check that OpenAI is configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Select a deal to summarize</label>
        <select
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Choose a deal...</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} — ${d.value.toLocaleString()} ({d.status})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-cyan-600 text-white h-10 px-4 py-2 text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Generate Summary
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {summary && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Deal Summary</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(summary);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}

function NextStep() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealId, setDealId] = useState("");
  const [result, setResult] = useState<{
    suggestion: string;
    daysInStage: number;
    daysSinceCreated: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      setLoaded(true);
      fetch("/api/ai/deals")
        .then((r) => r.json())
        .then((data) =>
          setDeals((data.deals || []).filter((d: Deal) => d.status === "open"))
        );
    }
  }, [loaded]);

  const generate = async () => {
    if (!dealId) {
      setError("Select an open deal first.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/next-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to generate suggestion. Check that OpenAI is configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <label className="text-sm font-medium">Select an open deal</label>
        <select
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Choose a deal...</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} — ${d.value.toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-cyan-600 text-white h-10 px-4 py-2 text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
        Suggest Next Step
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Suggested Next Action</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(result.suggestion);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm leading-relaxed">{result.suggestion}</p>
          <p className="text-xs text-muted-foreground">
            In this stage for {result.daysInStage} days · Deal created {result.daysSinceCreated} days ago
          </p>
        </div>
      )}
    </div>
  );
}
