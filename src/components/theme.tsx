"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

function isDark(): boolean {
  const forced = document.documentElement.dataset.theme;
  if (forced === "dark") return true;
  if (forced === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Whether the page is currently dark, following both the toggle and the OS. */
export function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}

const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = { system: "Theme: system", light: "Theme: light", dark: "Theme: dark" };

function forcedTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  return forced === "light" || forced === "dark" ? forced : "system";
}

export function ThemeToggle() {
  // The pre-paint script in the layout restores the saved choice onto <html>.
  const theme = useSyncExternalStore(subscribe, forcedTheme, () => "system" as Theme);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    try {
      if (next === "system") localStorage.removeItem("aula-theme");
      else localStorage.setItem("aula-theme", next);
    } catch {
      // ignore
    }
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={cycle}
      title={LABEL[theme]}
      aria-label={LABEL[theme]}
      className="rounded-md p-2 text-muted hover:bg-sunken hover:text-ink"
    >
      <Icon size={17} />
    </button>
  );
}
