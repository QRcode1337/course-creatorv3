/**
 * Rate limiting utility for IP-based throttling
 * Prevents abuse of public endpoints like course preview generation
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limit tracking
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 3; // 3 previews per hour per IP

/**
 * Extract client IP from request
 * Handles proxied requests (X-Forwarded-For, CF-Connecting-IP, etc.)
 * Works with both Express and Fetch API request objects
 */
export function getClientIp(request: any): string {
  const headers = request.headers;
  
  // Helper to get header value (works with both Express and Fetch API)
  const getHeader = (name: string): string | null => {
    if (typeof headers.get === 'function') {
      // Fetch API Headers object
      return headers.get(name);
    } else if (typeof headers === 'object') {
      // Express headers object (plain object)
      return headers[name] || null;
    }
    return null;
  };
  
  // Check for X-Forwarded-For header (most common for proxies)
  const forwarded = getHeader('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Check for Cloudflare IP
  const cfIp = getHeader('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }
  
  // Check for other common proxy headers
  const realIp = getHeader('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to connection IP (may not work in all environments)
  return 'unknown';
}

/**
 * Check if an IP has exceeded rate limit
 * Returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  
  // If no entry exists or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(ip, newEntry);
    
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: newEntry.resetTime,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000); // seconds
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }
  
  // Increment count and allow request
  entry.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Clean up expired rate limit entries
 * Call periodically to prevent memory leaks
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let cleaned = 0;
  const ipsToDelete: string[] = [];
  
  rateLimitStore.forEach((entry, ip) => {
    if (now > entry.resetTime) {
      ipsToDelete.push(ip);
      cleaned++;
    }
  });
  
  ipsToDelete.forEach(ip => rateLimitStore.delete(ip));
  return cleaned;
}

/**
 * Reset rate limit for a specific IP (admin function)
 */
export function resetRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Get current rate limit stats (for monitoring)
 */
export function getRateLimitStats(): {
  totalTrackedIps: number;
  store: Record<string, { count: number; resetTime: string }>;
} {
  const store: Record<string, { count: number; resetTime: string }> = {};
  
  rateLimitStore.forEach((entry, ip) => {
    store[ip] = {
      count: entry.count,
      resetTime: new Date(entry.resetTime).toISOString(),
    };
  });
  
  return {
    totalTrackedIps: rateLimitStore.size,
    store,
  };
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const cleaned = cleanupExpiredEntries();
  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);
