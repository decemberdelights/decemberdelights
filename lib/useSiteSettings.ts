"use client";

import { useState, useEffect } from "react";

interface SiteSettings {
  shop_enabled: boolean;
  franchise_enabled: boolean;
}

const defaults: SiteSettings = { shop_enabled: true, franchise_enabled: true };

// Module-level cache to deduplicate requests across components
let cachedSettings: SiteSettings | null = null;
let fetchPromise: Promise<SiteSettings> | null = null;

function fetchSettings(): Promise<SiteSettings> {
  if (cachedSettings) return Promise.resolve(cachedSettings);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/settings", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      cachedSettings = d;
      localStorage.setItem("dd_shop_enabled", String(d.shop_enabled));
      localStorage.setItem("dd_franchise_enabled", String(d.franchise_enabled));
      fetchPromise = null;
      return d as SiteSettings;
    })
    .catch(() => {
      fetchPromise = null;
      const fallback: SiteSettings = {
        shop_enabled: localStorage.getItem("dd_shop_enabled") !== "false",
        franchise_enabled: localStorage.getItem("dd_franchise_enabled") !== "false",
      };
      cachedSettings = fallback;
      return fallback;
    });

  return fetchPromise;
}

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(cachedSettings || defaults);

  useEffect(() => {
    let cancelled = false;
    fetchSettings().then((d) => {
      if (!cancelled) setSettings(d);
    });
    return () => { cancelled = true; };
  }, []);

  return settings;
}
