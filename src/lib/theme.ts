import type { AppSettings } from "@/types";

const STORAGE_KEY = "xtrim_settings";

type ThemeMode = AppSettings["theme"];

type ResolvedTheme = "dark" | "light";

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "dark" || value === "light" || value === "auto";

const resolveTheme = (theme: ThemeMode, prefersDark: boolean): ResolvedTheme => {
  if (theme === "auto") {
    return prefersDark ? "dark" : "light";
  }
  return theme;
};

export const getStoredTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return "dark";
  }

  try {
    const parsed = JSON.parse(stored) as Partial<AppSettings>;
    if (isThemeMode(parsed.theme)) {
      return parsed.theme;
    }
  } catch {
    return "dark";
  }

  return "dark";
};

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === "undefined") {
    return;
  }

  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const resolved = resolveTheme(theme, prefersDark);
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.style.colorScheme = resolved;
};

export const subscribeToThemeChanges = (onChange: () => void) => {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (media?.addEventListener) {
    media.addEventListener("change", onChange);
  } else if (media?.addListener) {
    media.addListener(onChange);
  }

  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener("storage", storageHandler);

  return () => {
    if (media?.removeEventListener) {
      media.removeEventListener("change", onChange);
    } else if (media?.removeListener) {
      media?.removeListener(onChange);
    }
    window.removeEventListener("storage", storageHandler);
  };
};
