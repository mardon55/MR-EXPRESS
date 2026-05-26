import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import {
  applyThemeToDocument,
  DEFAULT_THEME_ID,
  getTheme,
  THEME_STORAGE_KEY,
} from '../themes/themeConfig';

const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const id = localStorage.getItem(THEME_STORAGE_KEY);
    return getTheme(id).id;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function ThemeProvider({ children }) {
  const [savedThemeId, setSavedThemeId] = useState(readStoredTheme);
  const [previewThemeId, setPreviewThemeId] = useState(savedThemeId);

  const applyPreview = useCallback((id) => {
    const theme = getTheme(id);
    applyThemeToDocument(theme);
    if (WebApp.setHeaderColor) WebApp.setHeaderColor(theme.bg);
    if (WebApp.setBackgroundColor) WebApp.setBackgroundColor(theme.bg);
  }, []);

  useEffect(() => {
    applyPreview(previewThemeId);
  }, [previewThemeId, applyPreview]);

  const saveTheme = useCallback(() => {
    localStorage.setItem(THEME_STORAGE_KEY, previewThemeId);
    setSavedThemeId(previewThemeId);
    if (WebApp.HapticFeedback?.notificationOccurred) {
      WebApp.HapticFeedback.notificationOccurred('success');
    }
    return getTheme(previewThemeId);
  }, [previewThemeId]);

  const resetPreview = useCallback(() => {
    setPreviewThemeId(savedThemeId);
  }, [savedThemeId]);

  return (
    <ThemeContext.Provider
      value={{
        savedThemeId,
        previewThemeId,
        setPreviewThemeId,
        saveTheme,
        resetPreview,
        theme: getTheme(previewThemeId),
        savedTheme: getTheme(savedThemeId),
        hasUnsavedChanges: previewThemeId !== savedThemeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
