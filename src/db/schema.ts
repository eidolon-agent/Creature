// Drizzle ORM Database Schema for CreatureQuest
// PostgreSQL with real-time multiplayer support

import { pgTable, text, integer, bigint, boolean, jsonb, timestamp, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// ============ PLAYERS ============
export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  fid: integer('fid').notNull().unique(), // Farcaster ID
  username: text('username').notNull(),
  level: integer('level').default(1).notNull(),
  experience: bigint('experience', { mode: 'number' }).default(0).notNull(),
  hp: integer('hp').default(100).notNull(),
  maxHp: integer('max_hp').default(100).notNull(),
  attack: integer('attack').default(10).notNull(),
  zone: text('zone').default('crystal_haven').notNull(),
  x: integer('x').default(0).notNull(),
  y: integer('y').default(0).notNull(),
  walletAddress: text('wallet_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ CREATURES (NFTs) ============
export const creatures = pgTable('creatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenId: integer('token_id').notNull().unique(),
  ownerFid: integer('owner_fid').notNull(),
  name: text('name').notNull(),
  species: text('species').notNull(), // glimmerblob, mooncap, etc
  level: integer('level').default(1).notNull(),
  xp: bigint('xp', { mode: 'number' }).default(0).notNull(),
  
  // Stats
  strength: integer('strength').default(10).notNull(),
  intelligence: integer('intelligence').default(10).notNull(),
  dexterity: integer('dexterity').default(10).notNull(),
  vitality: integer('vitality').default(10).notNull(),
  luck: integer('luck').default(10).notNull(),
  
  // Elemental modifiers (6 elements)
  fireRes: integer('fire_res').default(0).notNull(),
  waterRes: integer('water_res').default(0).notNull(),
  earthRes: integer('earth_res').default(0).notNull(),
  windRes: integer('wind_res').default(0).notNull(),
  lightRes: integer('light_res').default(0).notNull(),
  darkRes: integer('dark_res').default(0).notNull(),
  
  // Traits
  isMutant: boolean('is_mutant').default(false).notNull(),
  rarity: integer('rarity').default(1).notNull(), // 1-5
  metadataUri: text('metadata_uri').notNull(),
  
  // Breeding stats
  breedCount: integer('breed_count').default(0).notNull(),
  lastBreedTime: timestamp('last_breed_time'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ LEADERBOARD ============
export const leaderboard = pgTable('leaderboard', {
  id: uuid('id').primaryKey().defaultRandom(),
  fid: integer('fid').notNull().unique(),
  username: text('username').notNull(),
  score: bigint('score', { mode: 'number' }).default(0).notNull(),
  rank: integer('rank').default(0).notNull(),
  region: text('region').default('global').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

// ============ BATTLE LOG ============
export const battleLogs = pgTable('battle_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  winnerFid: integer('winner_fid').notNull(),
  loserFid: integer('loser_fid').notNull(),
  winnerCreatureId: uuid('winner_creature_id').references(() => creatures.id),
  loserCreatureId: uuid('loser_creature_id').references(() => creatures.id),
  battleType: text('battle_type').notNull(), // 'pve', 'pvp', 'arena'
  zone: text('zone').notNull(),
  rewards: jsonb('rewards').default({}).notNull(), // { xp: 100, items: [...] }
  damageDealt: integer('damage_dealt').notNull(),
  damageReceived: integer('damage_received').notNull(),
  duration: integer('duration_seconds').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ INVENTORY ============
export const inventories = pgTable('inventories', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerFid: integer('player_fid').notNull(),
  itemType: text('item_type').notNull(), // 'creature', 'weapon', 'armor', 'consumable'
  itemId: uuid('item_id').notNull(), // Reference to creature or item table
  quantity: integer('quantity').default(1).notNull(),
  slot: integer('slot').notNull(), // Inventory slot position
  equipped: boolean('equipped').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSlot: primaryKey(table.playerFid, table.slot),
}));

// ============ QUESTS ============
export const quests = pgTable('quests', {
  id: uuid('id').primaryKey().defaultRandom(),
  questId: text('quest_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'slay', 'gather', 'fetch', 'travel'
  targets: jsonb('targets').notNull(), // { creature: 'glimmerblob', count: 10 }
  rewards: jsonb('rewards').notNull(), // { xp: 100, items: [...], currency: 50 }
  difficulty: integer('difficulty').default(1).notNull(), // 1-5
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const playerQuests = pgTable('player_quests', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerFid: integer('player_fid').notNull(),
  questId: uuid('quest_id').references(() => quests.id).notNull(),
  status: text('status').default('active').notNull(), // 'active', 'completed', 'failed'
  progress: jsonb('progress').default({}).notNull(), // { 'glimmerblob': 5 }
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// ============ GUILDS ============
export const guilds = pgTable('guilds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  logo: text('logo_uri'),
  description: text('description').default('').notNull(),
  leaderFid: integer('leader_fid').notNull(),
  memberCount: integer('member_count').default(1).notNull(),
  level: integer('level').default(1).notNull(),
  xp: bigint('xp', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const guildMembers = pgTable('guild_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: uuid('guild_id').references(() => guilds.id).notNull(),
  playerFid: integer('player_fid').notNull(),
  role: text('role').default('member').notNull(), // 'leader', 'officer', 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  contribution: integer('contribution').default(0).notNull(),
}, (table) => ({
  uniqueMember: primaryKey(table.guildId, table.playerFid),
}));

// ============ CHAT ============
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderFid: integer('sender_fid').notNull(),
  senderName: text('sender_name').notNull(),
  message: text('message').notNull(),
  channel: text('channel').notNull(), // 'global', 'guild', 'party'
  channelId: uuid('channel_id'), // Guild ID or Party ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ MARKETPLACE ============
export const marketplaceListings = pgTable('marketplace_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerFid: integer('seller_fid').notNull(),
  itemType: text('item_type').notNull(), // 'creature', 'breeding_token', 'item'
  itemId: uuid('item_id').notNull(),
  price: bigint('price', { mode: 'number' }).notNull(),
  currency: text('currency').default('QTK').notNull(), // 'QTK', 'ETH'
  quantity: integer('quantity').default(1).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status').default('active').notNull(), // 'active', 'sold', 'expired', 'cancelled'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ KV STORE (for game state) ============
export const kvTable = pgTable('kv', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============ INDEXES ============
import { index } from 'drizzle-orm/pg-core';

export const playerFidIndex = index('player_fid_idx').on(players.fid);
export const creatureOwnerIndex = index('creature_owner_idx').on(creatures.ownerFid);
export const leaderboardScoreIndex = index('leaderboard_score_idx').on(leaderboard.score.desc());
export const battleLogTimeIndex = index('battle_log_time_idx').on(battleLogs.createdAt.desc());
export const guildLeaderIndex = index('guild_leader_idx').on(guilds.leaderFid);

// ============ SCHEMA EXPORTS ============
export const schema = {
  players,
  creatures,
  leaderboard,
  battleLogs,
  inventories,
  quests,
  playerQuests,
  guilds,
  guildMembers,
  chatMessages,
  marketplaceListings,
  kvTable,
};

// ============ INSERT/SELECT SCHEMAS ============
export const insertPlayerSchema = createInsertSchema(players);
export const selectPlayerSchema = createSelectSchema(players);
export const insertCreatureSchema = createInsertSchema(creatures);
export const selectCreatureSchema = createSelectSchema(creatures);
export const insertLeaderboardSchema = createInsertSchema(leaderboard);
export const selectLeaderboardSchema = createSelectSchema(leaderboard);
