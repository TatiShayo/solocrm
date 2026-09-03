import { describe, it, expect } from "vitest";
import { computeCsvImportDiff, type ContactRecord } from "../csv-preview";

describe("CSV Import Diff & Pre-Commit Preview", () => {
  const existing: ContactRecord[] = [
    {
      id: "c_1",
      name: "Alice Johnson",
      email: "alice@acme.com",
      company: "Acme Corp",
    },
    {
      id: "c_2",
      name: "Bob Smith",
      email: "bob@builder.com",
      company: "Bob Builds",
    },
  ];

  it("classifies identical records as DUPLICATE_IDENTICAL", () => {
    const incoming = [
      { name: "Alice Johnson", email: "alice@acme.com", company: "Acme Corp" },
    ];

    const diff = computeCsvImportDiff(incoming, existing);
    expect(diff.length).toBe(1);
    expect(diff[0].action).toBe("DUPLICATE_IDENTICAL");
    expect(diff[0].changedFields).toBeUndefined();
  });

  it("classifies existing email with updated fields as UPDATE with field diffs", () => {
    const incoming = [
      { name: "Alice Johnson", email: "alice@acme.com", company: "Acme International" },
    ];

    const diff = computeCsvImportDiff(incoming, existing);
    expect(diff.length).toBe(1);
    expect(diff[0].action).toBe("UPDATE");
    expect(diff[0].changedFields).toEqual(["company"]);
  });

  it("classifies new emails as NEW", () => {
    const incoming = [
      { name: "Charlie Chaplin", email: "charlie@silent.com" },
    ];

    const diff = computeCsvImportDiff(incoming, existing);
    expect(diff.length).toBe(1);
    expect(diff[0].action).toBe("NEW");
  });

  it("flags rows with missing or invalid emails as INVALID", () => {
    const incoming = [
      { name: "Broken Row", email: "notanemail" },
      { name: "Empty Row", email: "" },
    ];

    const diff = computeCsvImportDiff(incoming, existing);
    expect(diff.length).toBe(2);
    expect(diff[0].action).toBe("INVALID");
    expect(diff[1].action).toBe("INVALID");
  });
});
