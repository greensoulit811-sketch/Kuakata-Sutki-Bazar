/**
 * Performance Monitoring Utilities
 * Tracks and reports performance metrics
 */

export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  navigationTiming: number;
  resourceTiming: PerformanceResourceTiming[];
}

/**
 * Initialize performance monitoring
 * Reports metrics to console and optional analytics endpoint
 */
export const initPerformanceMonitoring = (analyticsEndpoint?: string) => {
  if (typeof window === 'undefined') return;

  // Use PerformanceObserver for modern metrics
  if ('PerformanceObserver' in window) {
    // Observe First Contentful Paint
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log(`FCP: ${Math.round(entry.startTime)}ms`);
            reportMetric('fcp', entry.startTime, analyticsEndpoint);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.log('Paint timing not supported');
    }

    // Observe Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`LCP: ${Math.round(lastEntry.renderTime || lastEntry.loadTime)}ms`);
        reportMetric('lcp', lastEntry.renderTime || lastEntry.loadTime, analyticsEndpoint);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.log('LCP timing not supported');
    }

    // Observe Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            console.log(`CLS: ${clsValue.toFixed(3)}`);
            reportMetric('cls', clsValue, analyticsEndpoint);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.log('Layout shift timing not supported');
    }
  }

  // Log navigation timing when page loads
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const connectTime = perfData.responseEnd - perfData.requestStart;
      const renderTime = perfData.domComplete - perfData.domLoading;
      const domContentLoadedTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;

      console.log('Performance Metrics:');
      console.log(`Page Load Time: ${pageLoadTime}ms`);
      console.log(`Connect Time: ${connectTime}ms`);
      console.log(`Render Time: ${renderTime}ms`);
      console.log(`DOM Content Loaded: ${domContentLoadedTime}ms`);

      if (analyticsEndpoint) {
        reportMetrics({
          pageLoadTime,
          connectTime,
          renderTime,
          domContentLoadedTime,
        }, analyticsEndpoint);
      }
    }, 0);
  });
};

/**
 * Report single metric to analytics endpoint
 */
const reportMetric = (
  name: string,
  value: number,
  endpoint?: string
) => {
  if (!endpoint) return;

  const data = {
    metric: name,
    value: Math.round(value),
    timestamp: new Date().toISOString(),
    url: window.location.href,
  };

  // Use sendBeacon for reliability (won't be cancelled on page unload)
  if ('sendBeacon' in navigator) {
    navigator.sendBeacon(endpoint, JSON.stringify(data));
  } else {
    fetch(endpoint, { method: 'POST', body: JSON.stringify(data) }).catch(() => {
      // Silently fail
    });
  }
};

/**
 * Report multiple metrics
 */
const reportMetrics = (metrics: Record<string, number>, endpoint: string) => {
  const data = {
    metrics,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  if ('sendBeacon' in navigator) {
    navigator.sendBeacon(endpoint, JSON.stringify(data));
  }
};

/**
 * Measure execution time of a function
 * Useful for performance profiling
 */
export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`${name} took ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`${name} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

/**
 * Mark and measure custom performance points
 */
export const markPerformance = (name: string) => {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(name);
  }
};

export const measurePerformancePoint = (name: string, startMark: string, endMark: string) => {
  if ('performance' in window && 'measure' in performance) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
    } catch (e) {
      console.log(`Could not measure ${name}`);
    }
  }
};

/**
 * Best practices for performance:
 * 1. Monitor Core Web Vitals (FCP, LCP, CLS, FID, TTFB)
 * 2. Set performance budgets
 * 3. Use performance observer for real-time monitoring
 * 4. Report metrics to analytics service
 * 5. Optimize above-the-fold content
 * 6. Defer non-critical JavaScript
 * 7. Use service workers for caching
 * 8. Implement route-based code splitting
 * 9. Optimize database queries
 * 10. Use CDN for static assets
 */
