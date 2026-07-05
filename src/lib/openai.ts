import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a helpful AI assistant for SoloCRM, a CRM for solopreneurs. 
You help users write professional follow-up emails, summarize deal progress, and suggest next actions.
Be concise, direct, and actionable. Use a professional but friendly tone.`;

export function createChatCompletion(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const openai = getOpenAI();
  return openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.7,
    max_tokens: 1000,
  });
}
