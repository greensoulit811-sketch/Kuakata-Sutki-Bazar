/**
 * Image Optimization Utilities
 * Provides helper functions for optimized image loading
 */

export interface OptimizedImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Generate modern image format sources with WebP support
 * Converts image URL to multiple formats for better browser support
 */
export const generateImageSources = (
  imagePath: string
): { webp: string; fallback: string } => {
  const path = imagePath.replace(/\.[^.]+$/, ''); // Remove extension
  return {
    webp: `${path}.webp`,
    fallback: imagePath,
  };
};

/**
 * Generate srcset for responsive images
 * Creates multiple image sizes for different screen densities
 */
export const generateSrcSet = (imagePath: string): string => {
  const sizes = [320, 640, 960, 1280, 1600];
  return sizes
    .map((size) => `${imagePath}?w=${size} ${size}w`)
    .join(', ');
};

/**
 * Get optimal image URL with dimensions
 * Useful for lazy loading and responsive images
 */
export const getOptimizedImageUrl = (
  imagePath: string,
  width?: number,
  height?: number,
  quality: number = 80
): string => {
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  params.append('auto', 'format'); // Auto-select best format (WebP, AVIF, etc.)

  return `${imagePath}?${params.toString()}`;
};

/**
 * Blur hash placeholder generator
 * Creates a small blurred version for progressive loading
 */
export const generatePlaceholder = (width: number = 10, height: number = 10): string => {
  // Return a data URI for a simple gray placeholder
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22%3E%3Crect fill=%22%23e5e7eb%22/%3E%3C/svg%3E';

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, width, height);
  }
  return canvas.toDataURL();
};

/**
 * Image loading observer for intersection-based lazy loading
 * More efficient than simple lazy loading
 */
export const createImageObserver = (
  onIntersect: (element: HTMLImageElement) => void
): IntersectionObserver => {
  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        onIntersect(img);
      }
    });
  }, {
    rootMargin: '50px', // Start loading 50px before entering viewport
  });
};

/**
 * Best practices:
 * 1. Always use next-gen formats (WebP, AVIF)
 * 2. Implement lazy loading with intersection observer
 * 3. Use srcset for responsive images
 * 4. Optimize image dimensions before upload
 * 5. Compress images (use tools like TinyPNG, ImageOptim)
 * 6. Use CDN for image delivery
 * 7. Implement blur-up effect for better perceived performance
 * 8. Cache images appropriately
 */
