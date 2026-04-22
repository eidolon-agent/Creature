"use server";

import { db } from "@/neynar-db-sdk/db";
import { leaderboard, battleLogs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface PlayerScore {
  fid: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  questEarned: number;
  battleWins: number;
  bossKills: number;
  level: number;
  updatedAt: Date;
}

export interface BattleLogEntry {
  id: string;
  fid: number;
  username: string;
  eventType: string;
  detail: string;
  questGain: number;
  createdAt: Date;
}

export interface SubmitScoreInput {
  fid: number;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  questDelta: number;
  winsDelta: number;
  bossKillsDelta: number;
  level: number;
}

export interface LogEventInput {
  fid: number;
  username: string;
  eventType: "boss_kill" | "pvp_kill" | "level_up" | "quest_complete";
  detail: string;
  questGain: number;
}

/**
 * Upsert a player's cumulative score.
 * Adds deltas to existing totals — never overwrites.
 */
export async function submitScore(input: SubmitScoreInput): Promise<void> {
  await db
    .insert(leaderboard)
    .values({
      fid:         input.fid,
      username:    input.username,
      displayName: input.displayName ?? input.username,
      avatarUrl:   input.avatarUrl ?? "",
      questEarned: input.questDelta,
      battleWins:  input.winsDelta,
      bossKills:   input.bossKillsDelta,
      level:       input.level,
      updatedAt:   new Date(),
    })
    .onConflictDoUpdate({
      target: leaderboard.fid,
      set: {
        username:    input.username,
        displayName: input.displayName ?? input.username,
        avatarUrl:   input.avatarUrl ?? "",
        questEarned: sql`${leaderboard.questEarned} + ${input.questDelta}`,
        battleWins:  sql`${leaderboard.battleWins}  + ${input.winsDelta}`,
        bossKills:   sql`${leaderboard.bossKills}   + ${input.bossKillsDelta}`,
        level:       input.level,
        updatedAt:   new Date(),
      },
    });
}

/**
 * Log a notable combat event to the battle feed.
 * Keeps only the 200 most recent entries per cleanup.
 */
export async function logBattleEvent(input: LogEventInput): Promise<void> {
  await db.insert(battleLogs).values({
    fid:       input.fid,
    username:  input.username,
    eventType: input.eventType,
    detail:    input.detail,
    questGain: input.questGain,
  });
}

/**
 * Fetch the top 50 players sorted by QUEST earned.
 */
export async function getLeaderboard(): Promise<PlayerScore[]> {
  const rows = await db
    .select()
    .from(leaderboard)
    .orderBy(desc(leaderboard.questEarned))
    .limit(50);
  return rows;
}

/**
 * Fetch a single player's row.
 */
export async function getPlayerScore(fid: number): Promise<PlayerScore | null> {
  const rows = await db
    .select()
    .from(leaderboard)
    .where(eq(leaderboard.fid, fid))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Fetch the 20 most recent battle log entries (global feed).
 */
export async function getRecentBattleLog(): Promise<BattleLogEntry[]> {
  const rows = await db
    .select()
    .from(battleLogs)
    .orderBy(desc(battleLogs.createdAt))
    .limit(20);
  return rows;
}
