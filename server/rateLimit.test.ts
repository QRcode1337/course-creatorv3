import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getClientIp,
  checkRateLimit,
  cleanupExpiredEntries,
  resetRateLimit,
  getRateLimitStats,
} from "./rateLimit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    // Reset rate limits before each test
    resetRateLimit("192.168.1.1");
    resetRateLimit("192.168.1.2");
    resetRateLimit("192.168.1.3");
  });

  describe("getClientIp", () => {
    it("should extract IP from X-Forwarded-For header", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "203.0.113.1, 198.51.100.2",
        },
      });
      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.1");
    });

    it("should extract IP from CF-Connecting-IP header", () => {
      const request = new Request("http://localhost", {
        headers: {
          "cf-connecting-ip": "203.0.113.5",
        },
      });
      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.5");
    });

    it("should extract IP from X-Real-IP header", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-real-ip": "203.0.113.10",
        },
      });
      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.10");
    });

    it("should return unknown if no IP headers present", () => {
      const request = new Request("http://localhost");
      const ip = getClientIp(request);
      expect(ip).toBe("unknown");
    });
  });

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const result = checkRateLimit("192.168.1.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("should allow up to 3 requests per hour", () => {
      const ip = "192.168.1.1";
      
      const result1 = checkRateLimit(ip);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      
      const result2 = checkRateLimit(ip);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
      
      const result3 = checkRateLimit(ip);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it("should block requests after limit exceeded", () => {
      const ip = "192.168.1.2";
      
      // Use up all 3 requests
      checkRateLimit(ip);
      checkRateLimit(ip);
      checkRateLimit(ip);
      
      // Fourth request should be blocked
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it("should track different IPs independently", () => {
      const ip1 = "192.168.1.1";
      const ip2 = "192.168.1.2";
      
      // Use up requests for ip1
      checkRateLimit(ip1);
      checkRateLimit(ip1);
      checkRateLimit(ip1);
      
      // ip2 should still have requests available
      const result = checkRateLimit(ip2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("should return resetTime for blocked requests", () => {
      const ip = "192.168.1.3";
      
      // Use up all requests
      checkRateLimit(ip);
      checkRateLimit(ip);
      checkRateLimit(ip);
      
      // Check blocked request
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeDefined();
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe("cleanupExpiredEntries", () => {
    it("should clean up expired entries", () => {
      const ip = "192.168.1.1";
      checkRateLimit(ip);
      
      // Get initial stats
      let stats = getRateLimitStats();
      expect(stats.totalTrackedIdentifiers).toBe(1);
      
      // Mock time to move past the window
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now + 61 * 60 * 1000); // 61 minutes later
      
      // Cleanup should remove the entry
      const cleaned = cleanupExpiredEntries();
      expect(cleaned).toBe(1);
      
      // Stats should show no tracked IPs
      stats = getRateLimitStats();
      expect(stats.totalTrackedIdentifiers).toBe(0);
      
      vi.useRealTimers();
    });

    it("should not clean up active entries", () => {
      const ip = "192.168.1.1";
      checkRateLimit(ip);
      
      // Cleanup should not remove active entries
      const cleaned = cleanupExpiredEntries();
      expect(cleaned).toBe(0);
      
      // Stats should still show the entry
      const stats = getRateLimitStats();
      expect(stats.totalTrackedIdentifiers).toBe(1);
    });
  });

  describe("resetRateLimit", () => {
    it("should reset rate limit for an IP", () => {
      const ip = "192.168.1.1";
      
      // Use up all requests
      checkRateLimit(ip);
      checkRateLimit(ip);
      checkRateLimit(ip);
      
      // Should be blocked
      let result = checkRateLimit(ip);
      expect(result.allowed).toBe(false);
      
      // Reset
      resetRateLimit(ip);
      
      // Should be allowed again
      result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });
  });

  describe("getRateLimitStats", () => {
    it("should return stats for tracked IPs", () => {
      checkRateLimit("192.168.1.1");
      checkRateLimit("192.168.1.1");
      checkRateLimit("192.168.1.2");
      
      const stats = getRateLimitStats();
      expect(stats.totalTrackedIdentifiers).toBe(2);
      expect(stats.store["192.168.1.1"]).toBeDefined();
      expect(stats.store["192.168.1.1"].count).toBe(2);
      expect(stats.store["192.168.1.2"]).toBeDefined();
      expect(stats.store["192.168.1.2"].count).toBe(1);
    });

    it("should return empty stats when no IPs tracked", () => {
      const stats = getRateLimitStats();
      expect(stats.totalTrackedIdentifiers).toBe(0);
      expect(Object.keys(stats.store).length).toBe(0);
    });
  });
});
