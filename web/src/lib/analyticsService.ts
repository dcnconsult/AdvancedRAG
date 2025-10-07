"use client";

import { supabase } from "@/lib/supabase";

export interface AnalyticsPayload {
  [key: string]: any;
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

async function insertEvent(
  eventName: string,
  payload: AnalyticsPayload = {},
  sessionId?: string
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    await supabase.from("analytics_events").insert({
      user_id: userId,
      session_id: sessionId || null,
      event_name: eventName,
      event_data: payload,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    // Best-effort logging only
    console.warn("analytics insert failed", e);
  }
}

function gtagEvent(eventName: string, payload: AnalyticsPayload = {}): void {
  try {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", eventName, payload);
    }
  } catch {
    // ignore
  }
}

export const analytics = {
  async track(eventName: string, payload: AnalyticsPayload = {}, sessionId?: string) {
    gtagEvent(eventName, payload);
    await insertEvent(eventName, payload, sessionId);
  },
  async trackWithSession(sessionId: string, eventName: string, payload: AnalyticsPayload = {}) {
    gtagEvent(eventName, payload);
    await insertEvent(eventName, payload, sessionId);
  }
};

export default analytics;


