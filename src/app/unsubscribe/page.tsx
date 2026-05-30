"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "success" | "already" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No unsubscribe token provided.");
      return;
    }

    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setState("success");
          setMessage("You have been unsubscribed from all SoloCRM emails.");
        } else if (data.already) {
          setState("already");
          setMessage("You were already unsubscribed from SoloCRM emails.");
        } else {
          setState("error");
          setMessage(data.error || "Something went wrong.");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Failed to process your request. Please try again.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 p-8 text-center">
        {state === "loading" && (
          <p className="text-gray-400">Processing your request...</p>
        )}

        {state === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
              <svg
                className="h-6 w-6 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">Unsubscribed</h1>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
          </>
        )}

        {state === "already" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">Already Unsubscribed</h1>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">Something Went Wrong</h1>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
          </>
        )}

        <p className="mt-6 text-xs text-gray-600">
          SoloCRM — Every lead. Every deal. No BS pricing.
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
