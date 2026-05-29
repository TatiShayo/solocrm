"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Loader2, Check, ArrowRight } from "lucide-react";
import { parseCSVFile, importContacts, type ParseResult } from "./actions";

const CRM_FIELDS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "title", label: "Title" },
  { value: "source", label: "Source" },
  { value: "tags", label: "Tags" },
  { value: "notes", label: "Notes" },
];

function guessMapping(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    if (lower === "name" || lower === "full name" || lower === "contact name")
      map[header] = "name";
    else if (lower === "email" || lower === "e-mail" || lower === "email address")
      map[header] = "email";
    else if (lower === "phone" || lower === "phone number" || lower === "telephone")
      map[header] = "phone";
    else if (lower === "company" || lower === "organization" || lower === "org")
      map[header] = "company";
    else if (lower === "title" || lower === "job title" || lower === "position")
      map[header] = "title";
    else if (lower === "source" || lower === "lead source")
      map[header] = "source";
    else if (lower === "tags" || lower === "categories")
      map[header] = "tags";
    else if (lower === "notes" || lower === "description" || lower === "comments")
      map[header] = "notes";
  }
  return map;
}

export default function ImportContactsPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "map" | "importing">("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await parseCSVFile(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setParseResult(result.data);
        setColumnMap(guessMapping(result.data.headers));
        setStep("map");
      }
    } catch {
      setError("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;
    setError(null);
    setStep("importing");

    try {
      const result = await importContacts(columnMap, parseResult.rows);
      if (result?.error) {
        setError(result.error);
        setStep("map");
      }
    } catch {
      setError("Import failed. Please try again.");
      setStep("map");
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/dashboard/contacts")}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Upload a CSV file to bulk import contacts
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {step === "upload" && (
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div className="rounded-lg border-2 border-dashed p-12 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop a CSV file here, or click to browse
            </p>
            <input
              type="file"
              name="file"
              accept=".csv"
              required
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-3">
              CSV should have headers. Maximum file size: 10MB
            </p>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload and Parse
          </button>
        </form>
      )}

      {step === "map" && parseResult && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="text-sm">
              <span className="font-medium">{parseResult.fileName}</span> —{" "}
              {parseResult.rowCount} row{parseResult.rowCount !== 1 ? "s" : ""},{" "}
              {parseResult.headers.length} column
              {parseResult.headers.length !== 1 ? "s" : ""}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Map your CSV columns to SoloCRM contact fields. Columns with
            automatic matches are pre-selected.
          </p>

          <div className="rounded-lg border">
            <div className="grid grid-cols-2 gap-0">
              <div className="p-3 border-b font-medium text-sm bg-muted/50">
                CSV Column
              </div>
              <div className="p-3 border-b font-medium text-sm bg-muted/50">
                Maps To
              </div>
              {parseResult.headers.map((header) => (
                <div key={header} className="contents">
                  <div className="p-3 border-b text-sm">{header}</div>
                  <div className="p-3 border-b">
                    <select
                      value={columnMap[header] || ""}
                      onChange={(e) =>
                        setColumnMap((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">— Don&#39;t import —</option>
                      {CRM_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90"
            >
              <Check className="h-4 w-4 mr-2" />
              Import {parseResult.rowCount} Contact
              {parseResult.rowCount !== 1 ? "s" : ""}
            </button>
            <button
              onClick={() => {
                setStep("upload");
                setParseResult(null);
              }}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Back
            </button>
          </div>

          <details className="rounded-lg border">
            <summary className="p-3 text-sm font-medium cursor-pointer hover:bg-muted/50">
              Preview data
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    {parseResult.headers.map((h) => (
                      <th key={h} className="p-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {parseResult.headers.map((h) => (
                        <td key={h} className="p-2">
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.rows.length > 5 && (
                <p className="p-2 text-xs text-muted-foreground">
                  Showing first 5 of {parseResult.rowCount} rows
                </p>
              )}
            </div>
          </details>
        </div>
      )}

      {step === "importing" && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Importing {parseResult?.rowCount} contacts...
        </div>
      )}
    </div>
  );
}
