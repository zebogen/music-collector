import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme-preference";

export function useThemeMode() {
  // Keep initial render hydration-safe; we resolve real mode in an effect.
  const [mode, setMode] = useState<ThemeMode>("light");

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
