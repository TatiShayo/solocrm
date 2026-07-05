import { z } from "zod";
import { NextResponse } from "next/server";

export function validateBody<T extends z.ZodType>(body: unknown, schema: T): z.infer<T> | NextResponse {
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
  }
  return result.data;
}

export const dealIdSchema = z.object({
  dealId: z.string().uuid("Invalid deal ID"),
});

export const contactIdSchema = z.object({
  contactId: z.string().uuid("Invalid contact ID"),
});

export const writeEmailSchema = z.object({
  contactId: z.string().uuid("Invalid contact ID"),
  prompt: z.string().min(1, "Prompt is required"),
});

export const apiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const webhookSchema = z.object({
  url: z.string().url("Invalid URL"),
  events: z
    .array(
      z.enum(["deal.created", "deal.stage_changed", "deal.won", "deal.lost", "contact.created"])
    )
    .min(1, "At least one event is required"),
});
