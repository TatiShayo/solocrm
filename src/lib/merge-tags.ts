import { Contact } from './db';

/**
 * Escapes special HTML characters to prevent HTML injection.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Replaces merge tags like {{first_name}}, {{last_name}}, {{company}}, {{email}},
 * and {{title}} in the template with escaped contact field values.
 */
export function mergeTemplate(template: string, contact: Contact): string {
  return template
    .replace(/\{\{first_name\}\}/g, escapeHtml(contact.first_name || ''))
    .replace(/\{\{last_name\}\}/g, escapeHtml(contact.last_name || ''))
    .replace(/\{\{company\}\}/g, escapeHtml(contact.company || ''))
    .replace(/\{\{email\}\}/g, escapeHtml(contact.email || ''))
    .replace(/\{\{title\}\}/g, escapeHtml(contact.title || ''));
}
