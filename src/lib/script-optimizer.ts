/**
 * Third-party Script Optimization
 * Defers loading of analytics and tracking scripts
 * Prevents them from blocking page rendering
 */

/**
 * Defer loading third-party scripts
 * Uses requestIdleCallback or setTimeout to load scripts
 * after main content has been rendered
 * 
 * Note: We exclude Facebook Pixel and Google Analytics here
 * as they are handled by their respective providers (FacebookPixelProvider, etc.)
 */
export const deferThirdPartyScripts = () => {
  if (typeof window === 'undefined') return;

  // List of third-party scripts to defer
  // Note: Facebook Pixel and Google Analytics are handled by React providers
  // to ensure proper initialization order
  const scriptsToDefer: Array<{
    src: string;
    async: boolean;
    name: string;
  }> = [
    // Add additional third-party scripts here if needed
    // Example:
    // {
    //   src: 'https://example.com/script.js',
    //   async: true,
    //   name: 'example-script',
    // },
  ];

  // Function to load a script
  const loadScript = (script: typeof scriptsToDefer[0]) => {
    const scriptEl = document.createElement('script');
    scriptEl.src = script.src;
    scriptEl.async = script.async;
    scriptEl.id = script.name;
    
    // Skip if already loaded
    if (document.getElementById(script.name)) return;
    
    document.body.appendChild(scriptEl);
  };

  // Use requestIdleCallback if available, otherwise use setTimeout
  if ('requestIdleCallback' in window) {
    scriptsToDefer.forEach(script => {
      requestIdleCallback(
        () => loadScript(script),
        { timeout: 2000 } // Max wait 2 seconds
      );
    });
  } else {
    // Fallback: defer scripts by 3 seconds
    scriptsToDefer.forEach(script => {
      setTimeout(() => loadScript(script), 3000);
    });
  }
};

/**
 * Optimize script loading with defer attribute
 * Called from main.tsx to ensure scripts load efficiently
 */
export const optimizeScriptLoading = () => {
  if (typeof window === 'undefined') return;

  // Convert scripts to use defer if they don't already
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach(script => {
    if (!script.hasAttribute('defer') && !script.hasAttribute('async')) {
      script.setAttribute('defer', '');
    }
  });
};

/**
 * Monitor and log third-party script performance
 */
export const monitorScriptPerformance = () => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Monitor performance of scripts (excluding internal ones)
        if (entry.name.includes('googletagmanager') || entry.name.includes('facebook')) {
          console.log(`Third-party script: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      }
    });
    observer.observe({ entryTypes: ['resource'] });
  } catch (e) {
    console.log('Script performance monitoring not supported');
  }
};
