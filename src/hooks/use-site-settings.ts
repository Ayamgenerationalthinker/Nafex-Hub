import { useState, useEffect } from "react";

export type SiteSettings = {
  logo?: string;
  whatsappNumber?: string;
  instagramLink?: string;
  facebookLink?: string;
  email?: string;
};

const DEFAULTS: SiteSettings = {
  whatsappNumber: "",
  instagramLink: "",
  facebookLink: "",
  email: "",
};

let cache: SiteSettings | null = null;
const listeners = new Set<(s: SiteSettings) => void>();

export function invalidateSettingsCache() {
  cache = null;
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  if (cache) return cache;
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return DEFAULTS;
    const data = await res.json();
    cache = { ...DEFAULTS, ...data };
    listeners.forEach(fn => fn(cache!));
    return cache!;
  } catch {
    return DEFAULTS;
  }
}

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(cache ?? DEFAULTS);

  useEffect(() => {
    listeners.add(setSettings);
    fetchSiteSettings().then(setSettings);
    return () => { listeners.delete(setSettings); };
  }, []);

  return settings;
}
