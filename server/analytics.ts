import { getDb } from "./db";
import { previewEvents, guestSignupTracking, users } from "../drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * Track a preview generation event (guest or authenticated)
 */
export async function trackPreviewEvent(input: {
  userId?: number;
  clientIp: string;
  userTier: "guest" | "authenticated" | "premium";
  topic: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db.insert(previewEvents).values({
      userId: input.userId || null,
      clientIp: input.clientIp,
      userTier: input.userTier,
      topic: input.topic,
      success: input.success,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    });

    // Update guest signup tracking if guest
    if (!input.userId && input.userTier === "guest") {
      const existing = await db
        .select()
        .from(guestSignupTracking)
        .where(eq(guestSignupTracking.clientIp, input.clientIp))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(guestSignupTracking)
          .set({
            previewCount: existing[0].previewCount + 1,
            lastPreviewAt: new Date(),
          })
          .where(eq(guestSignupTracking.clientIp, input.clientIp));
      } else {
        await db.insert(guestSignupTracking).values({
          clientIp: input.clientIp,
          previewCount: 1,
          lastPreviewAt: new Date(),
        });
      }
    }
  } catch (error) {
    console.error("[analytics] Error tracking preview event:", error);
    // Don't throw - analytics should not break the main flow
  }
}

/**
 * Get analytics stats for a time period
 */
export async function getAnalyticsStats(options: {
  startDate?: Date;
  endDate?: Date;
  userTier?: "guest" | "authenticated" | "premium";
} = {}) {
  const db = await getDb();
  if (!db) return { period: {}, totalEvents: 0, successStats: [], byTier: [], topTopics: [] };
  
  const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const endDate = options.endDate || new Date();

  const conditions = [gte(previewEvents.createdAt, startDate), gte(previewEvents.createdAt, startDate)];
  if (options.userTier) {
    conditions.push(eq(previewEvents.userTier, options.userTier));
  }

  // Get total preview events
  const totalEvents = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(previewEvents)
    .where(and(...conditions));

  // Get successful vs failed
  const successStats = await db
    .select({
      success: previewEvents.success,
      count: sql<number>`COUNT(*)`,
    })
    .from(previewEvents)
    .where(and(...conditions))
    .groupBy(previewEvents.success);

  // Get by tier
  const byTier = await db
    .select({
      tier: previewEvents.userTier,
      count: sql<number>`COUNT(*)`,
      successCount: sql<number>`SUM(CASE WHEN ${previewEvents.success} = true THEN 1 ELSE 0 END)`,
    })
    .from(previewEvents)
    .where(and(...conditions))
    .groupBy(previewEvents.userTier);

  // Get top topics
  const topTopics = await db
    .select({
      topic: previewEvents.topic,
      count: sql<number>`COUNT(*)`,
    })
    .from(previewEvents)
    .where(and(...conditions))
    .groupBy(previewEvents.topic)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(10);

  return {
    period: { startDate, endDate },
    totalEvents: totalEvents[0]?.count || 0,
    successStats,
    byTier,
    topTopics,
  };
}

/**
 * Get guest to signup conversion stats
 */
export async function getConversionStats() {
  const db = await getDb();
  if (!db) return { totalGuests: 0, convertedGuests: 0, conversionRate: 0, avgPreviewsBeforeSignup: 0 };
  
  // Total guests who previewed
  const totalGuests = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${guestSignupTracking.clientIp})` })
    .from(guestSignupTracking);

  // Guests who signed up
  const convertedGuests = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${guestSignupTracking.signedUpUserId})` })
    .from(guestSignupTracking)
    .where(sql`${guestSignupTracking.signedUpUserId} IS NOT NULL`);

  const conversionRate =
    (totalGuests[0]?.count as number) > 0
      ? (((convertedGuests[0]?.count as number) || 0) / ((totalGuests[0]?.count as number) || 1)) * 100
      : 0;

  // Average previews before signup
  const avgPreviewsBeforeSignup = await db
    .select({
      avgCount: sql<number>`AVG(${guestSignupTracking.previewCount})`,
    })
    .from(guestSignupTracking)
    .where(sql`${guestSignupTracking.signedUpUserId} IS NOT NULL`);

  return {
    totalGuests: (totalGuests[0]?.count as number) || 0,
    convertedGuests: (convertedGuests[0]?.count as number) || 0,
    conversionRate: Math.round(conversionRate * 100) / 100,
    avgPreviewsBeforeSignup: Math.round((((avgPreviewsBeforeSignup[0]?.avgCount as number) || 0) * 100) / 100,
  };
}

/**
 * Mark a guest as signed up
 */
export async function markGuestAsSignedUp(clientIp: string, userId: number) {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db
      .update(guestSignupTracking)
      .set({
        signedUpUserId: userId,
        signedUpAt: new Date(),
      })
      .where(eq(guestSignupTracking.clientIp, clientIp));
  } catch (error) {
    console.error("[analytics] Error marking guest as signed up:", error);
  }
}

/**
 * Get error rate by tier
 */
export async function getErrorRateByTier(options: {
  startDate?: Date;
  endDate?: Date;
} = {}) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = options.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  const endDate = options.endDate || new Date();

  const errorStats = await db
    .select({
      tier: previewEvents.userTier,
      errorCode: previewEvents.errorCode,
      count: sql<number>`COUNT(*)`,
    })
    .from(previewEvents)
    .where(
      and(
        gte(previewEvents.createdAt, startDate),
        gte(previewEvents.createdAt, startDate),
        sql`${previewEvents.success} = false`
      )
    )
    .groupBy(previewEvents.userTier, previewEvents.errorCode)
    .orderBy(sql`COUNT(*) DESC`);

  return errorStats;
}
