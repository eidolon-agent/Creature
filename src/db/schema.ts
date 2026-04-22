import { pgTable, text, integer, timestamp, uuid, jsonb, real } from "drizzle-orm/pg-core";

/**
 * Key-Value Store Table
 *
 * Built-in table for simple key-value storage.
 * Available immediately without schema changes.
 *
 * ⚠️ CRITICAL: DO NOT DELETE OR EDIT THIS TABLE DEFINITION ⚠️
 * This table is required for the app to function properly.
 * DO NOT delete, modify, rename, or change any part of this table.
 * Removing or editing it will cause database schema conflicts and prevent
 * the app from starting.
 */
export const kv = pgTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/**
 * Leaderboard — one row per player, upserted on each game session end.
 * Tracks total QUEST earned and total battle wins across all sessions.
 */
export const leaderboard = pgTable("leaderboard", {
  fid:         integer("fid").primaryKey(),
  username:    text("username").notNull(),
  displayName: text("display_name").notNull().default(""),
  avatarUrl:   text("avatar_url").notNull().default(""),
  questEarned: integer("quest_earned").notNull().default(0),
  battleWins:  integer("battle_wins").notNull().default(0),
  bossKills:   integer("boss_kills").notNull().default(0),
  level:       integer("level").notNull().default(1),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Battle log — one row per notable combat event (boss kill, PvP kill, level-up).
 * Used for the "recent activity" feed on the leaderboard.
 */
export const battleLog = pgTable("battle_log", {
  id:        uuid("id").primaryKey().defaultRandom(),
  fid:       integer("fid").notNull(),
  username:  text("username").notNull(),
  eventType: text("event_type").notNull(), // "boss_kill" | "pvp_kill" | "level_up" | "quest_complete"
  detail:    text("detail").notNull().default(""),
  questGain: integer("quest_gain").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Creatures — NFT creature registry for breeding and battles
 */
export const creatures = pgTable("creatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: integer("owner_id").notNull(), // Farcaster fid
  name: text("name").notNull(),
  class: text("creature_class").notNull(), // beast, plant, aqua, bug, reptile
  rarity: text("rarity").notNull(), // common, rare, epic, legendary
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  hp: integer("hp").notNull().default(100),
  maxHp: integer("max_hp").notNull().default(100),
  damage: integer("damage").notNull().default(10),
  speed: integer("speed").notNull().default(100),
  element: text("element"), // fire, water, earth, air, dark, light
  skills: jsonb("skills").notNull().default([]), // Array of skill IDs
  statusEffects: jsonb("status_effects").notNull().default([]),
  personality: text("personality"), // farmer, aggressive, looter, scout, guardian
  imageUri: text("image_uri"), // NFT metadata URI
  tokenId: text("token_id"), // ERC-721 token ID
  breedingCount: integer("breeding_count").notNull().default(0),
  lastBredAt: timestamp("last_bred_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Breeding records — track all breeding pairs and offspring
 */
export const breedingRecords = pgTable("breeding_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  parent1Id: uuid("parent_1_id").notNull(),
  parent2Id: uuid("parent_2_id").notNull(),
  offspringId: uuid("offspring_id").notNull(),
  breedingCost: integer("breeding_cost").notNull(), // in QuestToken
  successRate: real("success_rate").notNull(),
  result: text("result").notNull(), // success, failure, mutation
  traits: jsonb("traits").notNull().default({}), // Inherited traits
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Guilds — multiplayer guild system
 */
export const guilds = pgTable("guilds", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  leaderId: integer("leader_id").notNull(),
  memberCount: integer("member_count").notNull().default(1),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  treasury: integer("treasury").notNull().default(0), // Guild shared gold
  perks: jsonb("perks").notNull().default([]), // Unlocked guild perks
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Guild members — many-to-many between guilds and players
 */
export const guildMembers = pgTable("guild_members", {
  guildId: uuid("guild_id").notNull(),
  playerId: integer("player_id").notNull(),
  role: text("role").notNull().default("member"), // leader, officer, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  contribution: integer("contribution").notNull().default(0),
});

/**
 * Chat messages — real-time guild and global chat
 */
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  channelId: text("channel_id").notNull(), // "global", "guild:{guildId}", "party:{partyId}"
  senderId: integer("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, emote, system, trade
  metadata: jsonb("metadata").notNull().default({}), // Extra data for trade, emote, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
