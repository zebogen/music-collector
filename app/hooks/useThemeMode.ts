import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme-preference";

function resolveInitialMode(): ThemeMode {
  if (typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
  return "light";
}

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(resolveInitialMode);

  useEffect(() => {
    const root = document.documentElement;
    const saved = localStorage.getItem(STORAGE_KEY);
    const nextMode =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    root.classList.remove("light", "dark");
    root.classList.add(nextMode);
    root.style.colorScheme = nextMode;
    setMode(nextMode);
  }, []);

  function setThemeMode(nextMode: ThemeMode) {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(nextMode);
    root.style.colorScheme = nextMode;
    localStorage.setItem(STORAGE_KEY, nextMode);
    setMode(nextMode);
  }

  function toggleThemeMode() {
    setThemeMode(mode === "dark" ? "light" : "dark");
  }

  return { mode, setThemeMode, toggleThemeMode };
}

