/**
 * Optimized localStorage utilities with debouncing
 * Prevents performance issues from synchronous storage access
 */

import { useState, useEffect } from 'react';

interface StorageOptions {
  debounceMs?: number;
  expireMs?: number;
}

const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * Optimized localStorage getter - doesn't block main thread
 */
export const getStorageAsync = async (
  key: string,
  fallback: any = null
): Promise<any> => {
  return new Promise((resolve) => {
    // Use setTimeout to defer to next event loop
    setTimeout(() => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const data = JSON.parse(item);
          
          // Check expiration
          if (data.expireAt && Date.now() > data.expireAt) {
            localStorage.removeItem(key);
            resolve(fallback);
          } else {
            resolve(data.value || data);
          }
        } else {
          resolve(fallback);
        }
      } catch (e) {
        console.error(`Failed to parse storage key ${key}:`, e);
        resolve(fallback);
      }
    }, 0);
  });
};

/**
 * Optimized localStorage setter with debouncing
 * Prevents excessive writes
 */
export const setStorageDebounced = (
  key: string,
  value: any,
  options?: StorageOptions
): void => {
  // Clear existing debounce timer
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key)!);
  }

  // Set new debounce timer
  const timer = setTimeout(() => {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        expireAt: options?.expireMs ? Date.now() + options.expireMs : null,
      };
      localStorage.setItem(key, JSON.stringify(data));
      debounceTimers.delete(key);
    } catch (e) {
      console.error(`Failed to set storage key ${key}:`, e);
    }
  }, options?.debounceMs ?? 300);

  debounceTimers.set(key, timer);
};

/**
 * React Hook for async storage
 */
export const useAsyncStorage = (key: string, initialValue: any) => {
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage
  useEffect(() => {
    setIsLoading(true);
    getStorageAsync(key, initialValue)
      .then(setValue)
      .finally(() => setIsLoading(false));
  }, [key, initialValue]);

  // Save to storage with debouncing
  const setValueWithStorage = (newValue: any) => {
    setValue(newValue);
    setStorageDebounced(key, newValue);
  };

  return [value, setValueWithStorage, isLoading] as const;
};
