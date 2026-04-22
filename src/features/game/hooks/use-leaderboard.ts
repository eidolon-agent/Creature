"use client";

import { useState, useEffect, useCallback } from "react";
import type { PlayerScore, BattleLogEntry } from "@/db/actions/leaderboard-actions";

export interface LeaderboardData {
  board: PlayerScore[];
  feed: BattleLogEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLeaderboard(pollIntervalMs = 15000): LeaderboardData {
  const [board,   setBoard]   = useState<PlayerScore[]>([]);
  const [feed,    setFeed]    = useState<BattleLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBoard(data.board ?? []);
      setFeed(data.feed   ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchData, pollIntervalMs]);

  return { board, feed, loading, error, refetch: fetchData };
}

// ─── Submit score helper ───────────────────────────────────────────────────

export interface SubmitOpts {
  fid: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  questDelta?: number;
  winsDelta?: number;
  bossKillsDelta?: number;
  level?: number;
}

export async function submitScore(opts: SubmitOpts): Promise<void> {
  await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "submit_score", ...opts }),
  });
}

export async function logEvent(opts: {
  fid: number;
  username: string;
  eventType: "boss_kill" | "pvp_kill" | "level_up" | "quest_complete";
  detail: string;
  questGain?: number;
}): Promise<void> {
  await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "log_event", ...opts }),
  });
}
