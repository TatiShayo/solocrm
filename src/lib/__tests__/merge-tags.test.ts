import { describe, it, expect } from "vitest";
import { resolveMergeTags } from "@/lib/sequence-engine";

describe("merge tag replacement", () => {
  const contact = {
    name: "Jane Doe",
    email: "jane@example.com",
    company: "Acme Corp",
    title: "CEO",
  };

  it("replaces {{firstName}}", () => {
    expect(resolveMergeTags("Hello {{firstName}},", contact)).toBe("Hello Jane,");
  });

  it("replaces {{lastName}}", () => {
    expect(resolveMergeTags("Dear Ms. {{lastName}}", contact)).toBe("Dear Ms. Doe");
  });

  it("replaces {{company}}", () => {
    expect(resolveMergeTags("I saw {{company}} is growing", contact)).toBe(
      "I saw Acme Corp is growing"
    );
  });

  it("replaces {{email}}", () => {
    expect(resolveMergeTags("Contact: {{email}}", contact)).toBe("Contact: jane@example.com");
  });

  it("replaces {{title}}", () => {
    expect(resolveMergeTags("Role: {{title}}", contact)).toBe("Role: CEO");
  });

  it("handles first name only (no last name)", () => {
    const c = { name: "Prince", email: null, company: null, title: null };
    expect(resolveMergeTags("{{firstName}} {{lastName}}", c)).toBe("Prince ");
  });

  it("handles multi-word last names", () => {
    const c = { name: "Ana de la Cruz", email: null, company: null, title: null };
    expect(resolveMergeTags("{{firstName}} {{lastName}}", c)).toBe("Ana de la Cruz");
  });

  it("replaces {{dealTitle}} when deal provided", () => {
    expect(
      resolveMergeTags("Re: {{dealTitle}}", contact, { title: "Big Sale" })
    ).toBe("Re: Big Sale");
  });

  it("replaces {{dealTitle}} with empty when no deal", () => {
    expect(resolveMergeTags("{{dealTitle}}", contact)).toBe("");
  });

  it("replaces null fields with empty string", () => {
    const c = { name: "Bob", email: null, company: null, title: null };
    expect(resolveMergeTags("{{company}} - {{title}} - {{email}}", c)).toBe(" -  - ");
  });

  it("handles multiple tags in one text", () => {
    expect(
      resolveMergeTags("{{firstName}} from {{company}} ({{title}})", contact)
    ).toBe("Jane from Acme Corp (CEO)");
  });
});
