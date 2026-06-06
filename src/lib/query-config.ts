/**
 * Optimized React Query Configuration
 * Provides best practices for caching and data management
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create optimized QueryClient with performance best practices
 */
export const createOptimizedQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Optimization: Increase stale time to reduce unnecessary refetches
        staleTime: 5 * 60 * 1000, // 5 minutes
        
        // Optimization: Keep previous data while fetching new data
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        
        // Optimization: Reduce retry attempts for failed queries
        retry: 1, // Only retry once on failure
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Optimization: Don't refetch when window regains focus
        refetchOnWindowFocus: false,
        
        // Optimization: Don't refetch on mount if data exists
        refetchOnMount: false,
        
        // Optimization: Don't refetch on reconnect
        refetchOnReconnect: false,
      },
      mutations: {
        // Optimization: Retry mutations with backoff
        retry: 1,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  });
};

/**
 * Best practices for React Query:
 * 
 * 1. Use staleTime appropriately:
 *    - Higher values = fewer refetches (better performance)
 *    - Lower values = fresher data (better consistency)
 * 
 * 2. Use gcTime (formerly cacheTime) appropriately:
 *    - Keep cache around after query becomes unused
 *    - Speeds up re-mounting of same query
 * 
 * 3. Implement optimistic updates for mutations:
 *    - Update UI immediately while request is in flight
 *    - Rollback on error
 * 
 * 4. Use query keys properly:
 *    - Create consistent, hierarchical keys
 *    - Use createQueryKey helper for better organization
 * 
 * 5. Implement pagination/infinite queries:
 *    - Don't load all data at once
 *    - Use useInfiniteQuery for pagination
 * 
 * 6. Use prefetching:
 *    - Prefetch data likely to be needed
 *    - Use router events to prefetch route data
 * 
 * 7. Monitor and debug:
 *    - Use React Query DevTools in development
 *    - Track query/mutation performance
 * 
 * 8. Set reasonable retry policies:
 *    - Too many retries = slow failures
 *    - Too few = poor resilience
 */

/**
 * Helper to create consistent query keys
 */
export const queryKeys = {
  all: () => ['queries'],
  products: () => [...queryKeys.all(), 'products'],
  productById: (id: string) => [...queryKeys.products(), { id }],
  productBySlug: (slug: string) => [...queryKeys.products(), { slug }],
  categories: () => [...queryKeys.all(), 'categories'],
  categoryBySlug: (slug: string) => [...queryKeys.categories(), { slug }],
  cart: () => [...queryKeys.all(), 'cart'],
  orders: () => [...queryKeys.all(), 'orders'],
  orderById: (id: string) => [...queryKeys.orders(), { id }],
  settings: () => [...queryKeys.all(), 'settings'],
  shippingZones: () => [...queryKeys.all(), 'shippingZones'],
  shippingMethods: () => [...queryKeys.all(), 'shippingMethods'],
  reviews: (productId: string) => [...queryKeys.all(), 'reviews', { productId }],
  coupons: () => [...queryKeys.all(), 'coupons'],
  paymentMethods: () => [...queryKeys.all(), 'paymentMethods'],
};
