"use client";

import { useEffect, useRef } from "react";

export function SequenceTrigger() {
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    fetch("/api/cron/sequences").catch(() => {
      // silently fail - cron will pick up
    });
  }, []);

  return null;
}
