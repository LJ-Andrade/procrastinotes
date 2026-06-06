import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "auto";

export interface Preferences {
  theme: Theme;
  /** Accent palette id (see ACCENTS). */
  accent: string;
  /** Local display name. Purely cosmetic — no accounts, no login. */
  profileName: string;
  /** Emoji avatar. */
  profileAvatar: string;
}

export const ACCENTS: { id: string; label: string; color: string; soft: string }[] =
  [
    { id: "clay", label: "Clay", color: "#b08968", soft: "rgba(176,137,104,0.18)" },
    { id: "blue", label: "Blue", color: "#5b8fd6", soft: "rgba(91,143,214,0.18)" },
    { id: "green", label: "Green", color: "#6aa87a", soft: "rgba(106,168,122,0.18)" },
    { id: "violet", label: "Violet", color: "#9a7bd0", soft: "rgba(154,123,208,0.18)" },
    { id: "rose", label: "Rose", color: "#d07b9a", soft: "rgba(208,123,154,0.18)" },
  ];

export const AVATARS = ["🦊", "🐱", "🐼", "🦉", "🐙", "🌿", "⭐", "🌙", "🔥", "🍂"];

const STORAGE_KEY = "procrastinotes.prefs";

const DEFAULTS: Preferences = {
  theme: "auto",
  accent: "clay",
  profileName: "You",
  profileAvatar: "🦊",
};

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/**
 * Device-local preferences (theme, accent, local profile), persisted to
 * localStorage. These are personalization, not synced data, so they live
 * outside SQLite. Applying them sets a `data-theme` attribute and overrides
 * the accent CSS variables on the document root.
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    const accent = ACCENTS.find((a) => a.id === prefs.accent) ?? ACCENTS[0];
    root.style.setProperty("--accent", accent.color);
    root.style.setProperty("--accent-soft", accent.soft);
  }, [prefs]);

  function update(patch: Partial<Preferences>) {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }

  return { prefs, update };
}
