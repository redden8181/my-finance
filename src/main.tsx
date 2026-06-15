import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const swUrl = new URL('./sw.js', window.location.href).href;

      const registration = await navigator.serviceWorker.register(swUrl, {
        updateViaCache: 'none', // Never cache sw.js itself
      });

      // Check for updates every 60 seconds
      setInterval(() => registration.update(), 60 * 1000);

      // If new SW is already waiting — activate it now
      if (registration.waiting) {
        registration.waiting.postMessage('skipWaiting');
      }

      // When new SW is found and installed — activate immediately
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('skipWaiting');
          }
        });
      });

      // When new SW takes control — reload page to get new version
      // Data in localStorage is NOT affected by reload
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

    } catch (err) {
      console.log('[SW] Registration failed:', err);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
