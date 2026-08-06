// src/hooks/use-dark-mode.ts
import { useState, useEffect, useCallback } from "react";

const THEME_KEY = "nafex_dark_mode";

export default function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Initialise from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored !== null) {
      setIsDarkMode(stored === "true");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  // Apply theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = isDarkMode ? "dark" : "light";
    // Persist preference
    localStorage.setItem(THEME_KEY, String(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  return { isDarkMode, toggleDarkMode };
}
