/**
 * API Helper for Framer Grid Pattern Plugin
 * Ensures proper API connectivity with Framer's services
 */
(function() {
  // Store the plugin ID for reference
  window.PLUGIN_ID = "2feb9a";
  
  // When the DOM is loaded, set up the necessary handlers
  document.addEventListener('DOMContentLoaded', () => {
    // Ensure API requests are properly handled
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const [resource, config] = args;
      
      // Add CORS and credentials for Framer API requests
      if (typeof resource === 'string' && resource.includes('api.framer.com')) {
        const newConfig = {
          ...config,
          credentials: 'include',
          mode: 'cors'
        };
        return originalFetch(resource, newConfig);
      }
      
      return originalFetch(...args);
    };
    
    // Notify parent frame when the plugin is ready
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'PLUGIN_LOADED',
        pluginId: window.PLUGIN_ID
      }, '*');
    }
  });
  
  // Handle errors gracefully
  window.addEventListener('error', (event) => {
    if (event.filename && event.filename.includes('api.framer.com')) {
      console.warn('API Error handled:', event.message);
      event.preventDefault();
      return true;
    }
  });
})(); 