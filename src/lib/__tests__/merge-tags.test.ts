import { describe, it, expect } from 'vitest';
import { mergeTemplate } from '../merge-tags';
import { Contact } from '../db';

describe('mergeTemplate', () => {
  const baseContact: Contact = {
    id: 'test-contact',
    user_id: 'user-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    company: 'Acme Corp',
    title: 'Software Engineer',
    source: 'Referral',
    tags: [],
    notes: null,
    is_opted_out: false,
    created_at: new Date().toISOString(),
  };

  it('should replace all merge tags with corresponding contact values', () => {
    const template = 'Hello {{first_name}} {{last_name}}, how is life at {{company}}? We sent this to {{email}} because you are the {{title}}.';
    const result = mergeTemplate(template, baseContact);
    expect(result).toBe(
      'Hello John Doe, how is life at Acme Corp? We sent this to john.doe@example.com because you are the Software Engineer.'
    );
  });

  it('should escape HTML characters to prevent injection', () => {
    const maliciousContact: Contact = {
      ...baseContact,
      first_name: '<script>alert("hack")</script>',
      last_name: 'O\'Connor & Sons',
      company: 'HTML<b>Corp</b>',
      title: '"CEO"',
    };

    const template = 'Name: {{first_name}} {{last_name}}, Company: {{company}}, Title: {{title}}';
    const result = mergeTemplate(template, maliciousContact);
    
    // Expected escaped values:
    // <script>alert("hack")</script> -> &lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;
    // O'Connor & Sons -> O&#x27;Connor &amp; Sons
    // HTML<b>Corp</b> -> HTML&lt;b&gt;Corp&lt;/b&gt;
    // "CEO" -> &quot;CEO&quot;
    expect(result).toBe(
      'Name: &lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt; O&#x27;Connor &amp; Sons, Company: HTML&lt;b&gt;Corp&lt;/b&gt;, Title: &quot;CEO&quot;'
    );
  });

  it('should handle null/missing contact fields by replacing with empty string', () => {
    const sparseContact: Contact = {
      ...baseContact,
      first_name: null,
      last_name: null,
      company: null,
      email: null,
      title: null,
    };

    const template = 'Hello {{first_name}} {{last_name}}, company: {{company}}, email: {{email}}, title: {{title}}';
    const result = mergeTemplate(template, sparseContact);
    expect(result).toBe('Hello  , company: , email: , title: ');
  });
});
