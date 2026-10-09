import { createClient } from "@supabase/supabase-js";
import { assertPublicUrl, SAFE_FETCH_INIT } from "./ssrf";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

async function fireWebhooks(userId: string, event: string, data: Record<string, unknown>) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("url, events")
    .eq("user_id", userId);

  if (!webhooks || webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const matching = webhooks.filter((w) => (w.events as string[]).includes(event));

  await Promise.allSettled(
    matching.map(async (webhook) => {
      // The URL is user-supplied and previously reachable internal services
      // (cloud metadata at 169.254.169.254, loopback, RFC1918). Validate the
      // scheme, resolve DNS, and reject any private address; do not follow
      // redirects, which would otherwise bypass all of the above.
      const check = await assertPublicUrl(webhook.url);
      if (!check.ok) {
        console.error(`Webhook rejected for ${webhook.url}: ${check.reason}`);
        return;
      }
      try {
        await fetch(check.url, {
          ...SAFE_FETCH_INIT,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error(`Webhook failed for ${webhook.url}:`, err);
      }
    })
  );
}

export async function fireDealCreated(userId: string, deal: Record<string, unknown>) {
  return fireWebhooks(userId, "deal.created", deal);
}

export async function fireDealStageChanged(userId: string, deal: Record<string, unknown>, oldStage: string, newStage: string) {
  return fireWebhooks(userId, "deal.stage_changed", { ...deal, old_stage: oldStage, new_stage: newStage });
}

export async function fireDealWon(userId: string, deal: Record<string, unknown>) {
  return fireWebhooks(userId, "deal.won", deal);
}

export async function fireDealLost(userId: string, deal: Record<string, unknown>) {
  return fireWebhooks(userId, "deal.lost", deal);
}

export async function fireContactCreated(userId: string, contact: Record<string, unknown>) {
  return fireWebhooks(userId, "contact.created", contact);
}
