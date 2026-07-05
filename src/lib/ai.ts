import { db } from './db';

/**
 * Calls OpenAI chat completions if OPENAI_API_KEY is present,
 * otherwise falls back to a template/rule-based generator to produce
 * a personalized email draft.
 */
export async function generateEmailDraft(
  contactId: string,
  prompt: string
): Promise<{ subject: string; body: string }> {
  const contact = await db.contacts.findById(contactId);
  if (!contact) {
    throw new Error('Contact not found');
  }

  const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'there';
  const company = contact.company || 'your company';
  const title = contact.title || 'Professional';

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a professional sales AI assistant. Generate a personalized email draft including a subject line and body. Format your response exactly as a JSON object with keys "subject" and "body". Do not wrap the JSON in markdown code blocks. Keep the style professional, direct, and concise.',
            },
            {
              role: 'user',
              content: `Write an email to:
Name: ${name}
Company: ${company}
Title: ${title}

Prompt/Guidelines: ${prompt}`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const jsonContent = JSON.parse(data.choices[0].message.content);
        return {
          subject: jsonContent.subject || `Following up - ${company}`,
          body: jsonContent.body || `Hi ${name},\n\n...`,
        };
      } else {
        console.warn(`OpenAI returned status ${response.status}. Falling back to rule-based generation.`);
      }
    } catch (error) {
      console.error('Failed to generate email draft via OpenAI:', error);
    }
  }

  // Robust Template-based Fallback Generator
  const subject = `Regarding ${company} and SoloCRM`;
  let body = `Hi ${name},\n\n`;

  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('follow up') || lowerPrompt.includes('following up')) {
    body += `I hope you are having a productive week. I'm following up on our previous conversation regarding how we can support ${company} with their current operations. As the ${title}, I know optimizing efficiency is likely a priority for you.\n\n`;
  } else if (lowerPrompt.includes('intro') || lowerPrompt.includes('introduce') || lowerPrompt.includes('pitch')) {
    body += `I wanted to briefly introduce myself. I've been following ${company}'s work and noticed your role as ${title}. We help organizations like yours simplify their sales pipelines and customer relationship management.\n\n`;
  } else if (lowerPrompt.includes('pricing') || lowerPrompt.includes('proposal') || lowerPrompt.includes('quote')) {
    body += `Following up on our discussions, I've prepared some details regarding pricing and proposal options for ${company}. Given your requirements, we can tailor a plan that works best for your team.\n\n`;
  } else {
    body += `I wanted to reach out regarding: ${prompt}. Given your expertise as ${title} at ${company}, I believe this is highly relevant to your ongoing initiatives.\n\n`;
  }

  body += `Do you have 10 minutes next Tuesday or Wednesday for a quick discussion?\n\nBest regards,\n[Your Name]`;

  return { subject, body };
}

/**
 * Summarizes the status of a deal based on its timeline events, transitions,
 * age of deal, and total value. Falls back to a local summarizer script if no OpenAI API key.
 */
export async function generateDealSummary(dealId: string): Promise<string> {
  const deal = await db.deals.findById(dealId);
  if (!deal) {
    throw new Error('Deal not found');
  }

  const timeline = await db.dealTimeline.list(t => t.deal_id === dealId);
  const sortedTimeline = [...timeline].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const createdEvent = sortedTimeline.find(e => e.event_type === 'created');
  const creationDate = createdEvent ? new Date(createdEvent.created_at) : new Date();
  const ageDays = Math.max(0, Math.floor((Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24)));

  const stageChangesCount = timeline.filter(e => e.event_type === 'stage_change').length;
  const timelineDescription = sortedTimeline
    .map(e => `[${new Date(e.created_at).toLocaleDateString()}] ${e.description}`)
    .join('\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert sales analyst. Summarize the status and progress of this deal in exactly 2-3 sentences based on the provided history. Keep it concise, highlighting its age, value, stage, and recent activity.',
            },
            {
              role: 'user',
              content: `Deal: ${deal.title}
Value: $${deal.value}
Current Stage ID: ${deal.stage_id}
Age: ${ageDays} days
Timeline Events:
${timelineDescription}`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content.trim();
      } else {
        console.warn(`OpenAI returned status ${response.status}. Using fallback script.`);
      }
    } catch (error) {
      console.error('Failed to generate deal summary via OpenAI:', error);
    }
  }

  // Fallback Summary Script
  const stageName = deal.stage_id.replace('stage-', '').replace(/^\w/, c => c.toUpperCase());
  let summary = `The deal "${deal.title}" valued at $${deal.value.toLocaleString()} is currently in the ${stageName} stage. `;
  summary += `It was created ${ageDays} days ago and has gone through ${stageChangesCount} stage transition${
    stageChangesCount === 1 ? '' : 's'
  }. `;

  if (deal.won_at) {
    summary += `It has been successfully closed as Won.`;
  } else if (deal.lost_at) {
    summary += `It was marked as Lost. Reason: ${deal.lost_reason || 'Not specified'}.`;
  } else {
    summary += `The deal remains active with further steps pending to advance it toward closure.`;
  }

  return summary;
}

/**
 * Suggests a concrete next action based on the deal's current stage, notes, and timeline.
 */
export async function suggestNextStep(dealId: string): Promise<string> {
  const deal = await db.deals.findById(dealId);
  if (!deal) {
    throw new Error('Deal not found');
  }

  const timeline = await db.dealTimeline.list(t => t.deal_id === dealId);
  const sortedTimeline = [...timeline].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Find last stage change or default to creation
  const lastChange = sortedTimeline.find(e => e.event_type === 'stage_change' || e.event_type === 'created');
  const lastChangeDate = lastChange ? new Date(lastChange.created_at) : new Date();
  const daysInCurrentStage = Math.max(0, Math.floor((Date.now() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24)));

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a sales coach. Analyze the deal details, notes, and time in stage, and suggest exactly one concrete next action. Keep it to one actionable sentence.',
            },
            {
              role: 'user',
              content: `Deal: ${deal.title}
Stage ID: ${deal.stage_id}
Days in this Stage: ${daysInCurrentStage}
Notes: ${deal.notes || 'None'}
Last timeline update: ${lastChange?.description || 'None'}`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content.trim();
      } else {
        console.warn(`OpenAI returned status ${response.status}. Using fallback script.`);
      }
    } catch (error) {
      console.error('Failed to generate next step via OpenAI:', error);
    }
  }

  // Fallback Logic
  const stage = deal.stage_id;
  if (stage === 'stage-won') {
    return 'Schedule a client onboarding call and hand over the project details to the customer success team.';
  }
  if (stage === 'stage-lost') {
    return `Analyze why the deal was lost (reason: "${deal.lost_reason || 'not specified'}"), and set a reminder to re-engage in 3-6 months.`;
  }
  if (stage === 'stage-lead') {
    return 'Conduct preliminary company research and prepare a personalized introductory cold email or LinkedIn message.';
  }
  if (stage === 'stage-contacted') {
    return `Follow up on the introductory message with a product demo invitation, as the deal has been in Contacted for ${daysInCurrentStage} days.`;
  }
  if (stage === 'stage-proposal') {
    if (daysInCurrentStage >= 10) {
      return `Follow up since it's in Proposal stage for ${daysInCurrentStage} days, and address any potential pricing concerns.`;
    }
    return 'Draft a detailed project proposal matching their specific needs and schedule a proposal review meeting.';
  }
  if (stage === 'stage-negotiation') {
    return 'Address final contract terms or redlines, align on discounts if needed, and send for final signature.';
  }

  return 'Schedule a call to re-establish contact and discuss how to move forward.';
}
