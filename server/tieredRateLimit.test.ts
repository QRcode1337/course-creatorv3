import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit, getUserTier, TIER_LIMITS } from "./rateLimit";

describe("Tiered Rate Limiting", () => {
  beforeEach(() => {
    // Reset rate limits before each test
    resetRateLimit("guest-ip");
    resetRateLimit("user-123");
    resetRateLimit("premium-user-456");
  });

  describe("Guest Rate Limiting (3 previews/hour)", () => {
    it("allows 3 previews for guests", () => {
      const ip = "guest-ip";
      
      // First 3 should be allowed
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(ip, "guest");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(TIER_LIMITS.guest - i - 1);
      }
    });

    it("blocks 4th preview for guests", () => {
      const ip = "guest-ip";
      
      // Use up 3 previews
      for (let i = 0; i < 3; i++) {
        checkRateLimit(ip, "guest");
      }
      
      // 4th should be blocked
      const result = checkRateLimit(ip, "guest");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it("returns correct retry time for guests", () => {
      const ip = "guest-ip";
      
      // Use up all previews
      for (let i = 0; i < 3; i++) {
        checkRateLimit(ip, "guest");
      }
      
      // Check retry time
      const result = checkRateLimit(ip, "guest");
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(3600); // Less than 1 hour
    });
  });

  describe("Authenticated User Rate Limiting (10 previews/hour)", () => {
    it("allows 10 previews for authenticated users", () => {
      const userId = "user-123";
      
      // First 10 should be allowed
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(userId, "authenticated");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(TIER_LIMITS.authenticated - i - 1);
      }
    });

    it("blocks 11th preview for authenticated users", () => {
      const userId = "user-123";
      
      // Use up 10 previews
      for (let i = 0; i < 10; i++) {
        checkRateLimit(userId, "authenticated");
      }
      
      // 11th should be blocked
      const result = checkRateLimit(userId, "authenticated");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("gives authenticated users more previews than guests", () => {
      const guestIp = "guest-ip";
      const userId = "user-123";
      
      // Guests get 3
      expect(TIER_LIMITS.guest).toBe(3);
      // Authenticated users get 10
      expect(TIER_LIMITS.authenticated).toBe(10);
      // Authenticated is more than guest
      expect(TIER_LIMITS.authenticated).toBeGreaterThan(TIER_LIMITS.guest);
    });
  });

  describe("Premium User Rate Limiting (Unlimited)", () => {
    it("allows unlimited previews for premium users", () => {
      const premiumUserId = "premium-user-456";
      
      // Try 100 previews
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit(premiumUserId, "premium");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
      }
    });

    it("never blocks premium users", () => {
      const premiumUserId = "premium-user-456";
      
      // Try many previews
      for (let i = 0; i < 50; i++) {
        const result = checkRateLimit(premiumUserId, "premium");
        expect(result.allowed).toBe(true);
      }
      
      // Should still be allowed
      const result = checkRateLimit(premiumUserId, "premium");
      expect(result.allowed).toBe(true);
    });
  });

  describe("User Tier Detection", () => {
    it("returns 'guest' tier for null user", () => {
      const tier = getUserTier(null);
      expect(tier).toBe("guest");
    });

    it("returns 'authenticated' tier for user ID", () => {
      const tier = getUserTier("user-123");
      expect(tier).toBe("authenticated");
    });

    it("returns 'authenticated' tier for any non-null user ID", () => {
      const tiers = [
        getUserTier("user-1"),
        getUserTier("user-abc"),
        getUserTier("user-xyz-123"),
      ];
      
      expect(tiers).toEqual(["authenticated", "authenticated", "authenticated"]);
    });
  });

  describe("Rate Limit Tier Limits", () => {
    it("exports correct tier limits", () => {
      expect(TIER_LIMITS.guest).toBe(3);
      expect(TIER_LIMITS.authenticated).toBe(10);
      expect(TIER_LIMITS.premium).toBe(Infinity);
    });

    it("tier limits are in ascending order", () => {
      expect(TIER_LIMITS.guest).toBeLessThan(TIER_LIMITS.authenticated);
      expect(TIER_LIMITS.authenticated).toBeLessThan(TIER_LIMITS.premium);
    });
  });

  describe("Separate Rate Limit Tracking", () => {
    it("tracks guests and authenticated users separately", () => {
      const guestIp = "guest-ip";
      const userId = "user-123";
      
      // Guest uses 2 previews
      checkRateLimit(guestIp, "guest");
      checkRateLimit(guestIp, "guest");
      
      // Authenticated user uses 5 previews
      for (let i = 0; i < 5; i++) {
        checkRateLimit(userId, "authenticated");
      }
      
      // Guest should have 1 remaining
      const guestResult = checkRateLimit(guestIp, "guest");
      expect(guestResult.remaining).toBe(0); // 3 - 2 - 1 = 0
      
      // Authenticated should have 4 remaining
      const authResult = checkRateLimit(userId, "authenticated");
      expect(authResult.remaining).toBe(4); // 10 - 5 - 1 = 4
    });

    it("uses user ID as identifier for authenticated users", () => {
      const userId = "user-123";
      
      // Use 5 previews
      for (let i = 0; i < 5; i++) {
        checkRateLimit(userId, "authenticated");
      }
      
      // Check remaining
      const result = checkRateLimit(userId, "authenticated");
      expect(result.remaining).toBe(4); // 10 - 5 - 1 = 4
    });

    it("uses IP as identifier for guests", () => {
      const ip = "192.168.1.1";
      
      // Use 2 previews
      checkRateLimit(ip, "guest");
      checkRateLimit(ip, "guest");
      
      // Check remaining
      const result = checkRateLimit(ip, "guest");
      expect(result.remaining).toBe(0); // 3 - 2 - 1 = 0
    });
  });
});
