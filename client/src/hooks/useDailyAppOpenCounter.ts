import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UsageEventCounterRow {
  created_at: string;
  event_payload: unknown;
}

const getLocalDayKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parsePayloadLocalDate = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const maybeLocalDate = (payload as { local_date?: unknown }).local_date;
  return typeof maybeLocalDate === "string" && maybeLocalDate.length > 0 ? maybeLocalDate : null;
};

export const useDailyAppOpenCounter = (userId: string | null | undefined) => {
  const [detoxDays, setDetoxDays] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const syncDailyCounter = async () => {
      if (!supabase || !userId) {
        if (!cancelled) setDetoxDays(0);
        return;
      }

      const now = new Date();
      const localDay = getLocalDayKey(now);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

      const { data: todayRows } = await supabase
        .from("usage_events")
        .select("created_at, event_payload")
        .eq("user_id", userId)
        .eq("event_name", "app_open")
        .gte("created_at", startOfToday.toISOString())
        .lt("created_at", startOfTomorrow.toISOString())
        .limit(200);

      const hasTodayEntry = (todayRows ?? []).some((row) => {
        const payloadDay = parsePayloadLocalDate((row as UsageEventCounterRow).event_payload);
        if (payloadDay) return payloadDay === localDay;
        return typeof (row as UsageEventCounterRow).created_at === "string" && (row as UsageEventCounterRow).created_at.slice(0, 10) === localDay;
      });

      if (!hasTodayEntry) {
        await supabase.from("usage_events").insert({
          user_id: userId,
          event_name: "app_open",
          event_payload: {
            local_date: localDay,
            source: "right_panel_counter",
            client_timestamp: now.toISOString(),
          },
        });
      }

      const { data } = await supabase
        .from("usage_events")
        .select("created_at, event_payload")
        .eq("user_id", userId)
        .eq("event_name", "app_open")
        .order("created_at", { ascending: false })
        .limit(5000);

      const rows = (data ?? []) as UsageEventCounterRow[];
      const uniqueDays = new Set<string>();

      rows.forEach((row) => {
        const payloadDay = parsePayloadLocalDate(row.event_payload);
        if (payloadDay) {
          uniqueDays.add(payloadDay);
          return;
        }

        if (typeof row.created_at !== "string" || row.created_at.length < 10) return;
        uniqueDays.add(row.created_at.slice(0, 10));
      });

      if (!cancelled) setDetoxDays(uniqueDays.size);
    };

    void syncDailyCounter();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return detoxDays;
};
