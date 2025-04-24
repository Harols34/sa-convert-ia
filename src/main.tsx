import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Clear any app cache on startup to prevent login issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log('Unregistering service worker:', registration);
      registration.unregister();
    });
  });
}

// Clear potentially problematic storage data
const clearStorageOnStart = () => {
  try {
    // Don't delete auth tokens that are still valid
    const storedSession = localStorage.getItem('supabase.auth.token');
    let validSession = false;
    
    // Check if we have a valid session before clearing
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        const expiryTime = sessionData.expires_at ? sessionData.expires_at * 1000 : 0;
        
        // Only consider valid if not expired and has at least 5 minutes left
        validSession = Date.now() < expiryTime - (5 * 60 * 1000);
        
        if (!validSession) {
          console.log('Found expired or soon-to-expire session, will clear it');
          localStorage.removeItem('supabase.auth.token');
        } else {
          console.log('Valid session found, preserving token');
        }
      } catch (e) {
        console.error('Error parsing session data:', e);
      }
    }
    
    // Clean any problematic auth states but keep valid tokens
    Object.keys(localStorage).forEach(key => {
      // Remove any session-related flags except session-related flags we want to keep
      if (key === 'session_expired_shown') {
        localStorage.removeItem(key);
      }
      
      // Remove only expired auth tokens or problematic tokens
      if (key.includes('supabase.auth') && key !== 'supabase.auth.token') {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.expires_at && Date.now() > data.expires_at * 1000) {
            console.log(`Removing expired token: ${key}`);
            localStorage.removeItem(key);
          }
        } catch (e) {
          // If we can't parse it, better be safe and keep it
        }
      }
    });
    
    // Clear app_cache_cleaned flag so we clean on every load
    localStorage.removeItem('app_cache_cleaned');
    
    // Mark as cleaned
    localStorage.setItem('app_cache_cleaned', 'true');
    console.log('Application cache cleaned on startup');
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
};

// Handle localStorage event dispatch for sidebar collapsed state
const setupSidebarEvents = () => {
  // Create a custom event to notify about sidebar state changes
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    // Call the original function first
    const result = originalSetItem.apply(this, arguments);
    
    // Create and dispatch a custom event
    if (key === 'sidebar-collapsed') {
      const event = new StorageEvent('storage', {
        key: key,
        newValue: value,
        oldValue: localStorage.getItem(key),
        storageArea: localStorage,
        url: window.location.href
      });
      window.dispatchEvent(event);
    }
    
    return result;
  };
};

// Execute cleanup at startup
clearStorageOnStart();
setupSidebarEvents();

// Render the application with cache version to avoid problems
const appVersion = Date.now(); // Use timestamp as version
console.log(`App version: ${appVersion}`);

// Render the application normally
createRoot(document.getElementById("root")!).render(<App key={`app-${appVersion}`} />);
