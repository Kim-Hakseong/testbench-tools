"use client";

import { useEffect, useRef, useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — leave button state unchanged
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`rounded-btn border px-2.5 py-1 font-mono text-xs transition active:scale-95 ${
        copied
          ? "border-ok text-ok"
          : "border-line-strong text-mute hover:border-mute hover:text-body"
      }`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
