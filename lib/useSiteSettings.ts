"use client";

import { useState, useEffect } from "react";

interface SiteSettings {
  shop_enabled: boolean;
  franchise_enabled: boolean;
}

const defaults: SiteSettings = { shop_enabled: true, franchise_enabled: true };

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(defaults);

  useEffect(() => {
    let cancelled = false;
    const backendBase = process.env.NEXT_PUBLIC_API_URL || "";
    if (!backendBase) {
      setSettings({
        shop_enabled: localStorage.getItem("dd_shop_enabled") !== "false",
        franchise_enabled: localStorage.getItem("dd_franchise_enabled") !== "false",
      });
      return;
    }
    fetch(`${backendBase}/api/settings`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setSettings(d);
          localStorage.setItem("dd_shop_enabled", String(d.shop_enabled));
          localStorage.setItem("dd_franchise_enabled", String(d.franchise_enabled));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettings({
            shop_enabled: localStorage.getItem("dd_shop_enabled") !== "false",
            franchise_enabled: localStorage.getItem("dd_franchise_enabled") !== "false",
          });
        }
      });
    return () => { cancelled = true; };
  }, []);

  return settings;
}
