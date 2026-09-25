"use client";

import { useEffect, useRef, useState } from "react";
import { publicEnv } from "@/config/publicEnv";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/**
 * Renders a Cloudflare Turnstile widget when NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * is configured; otherwise `widget` is null and `token` stays null, and the
 * server-side verifyTurnstile() skips verification the same way.
 * Bot protection lives entirely behind configuration; dev works without it.
 */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendered = useRef(false);

  useEffect(() => {
    const siteKey = publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return;

    function renderWidget() {
      if (rendered.current || !containerRef.current || !window.turnstile) return;
      rendered.current = true;
      window.turnstile.render(containerRef.current, { sitekey: siteKey!, callback: setToken });
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", renderWidget);
      return () => existing.removeEventListener("load", renderWidget);
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", renderWidget);
    document.body.appendChild(script);
  }, []);

  const widget = publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? <div ref={containerRef} className="my-1" /> : null;
  return { token, widget };
}
