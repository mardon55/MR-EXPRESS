import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {
  applyThemeToDocument,
  DEFAULT_THEME_ID,
  getTheme,
  THEME_STORAGE_KEY,
} from './themes/themeConfig';

try {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  applyThemeToDocument(getTheme(stored || DEFAULT_THEME_ID));
} catch {
  applyThemeToDocument(getTheme(DEFAULT_THEME_ID));
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
