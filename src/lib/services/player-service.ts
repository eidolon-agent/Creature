/**
 * Player Service - Handles player data with fallback to mock data
 * If Supabase is unavailable, falls back to localStorage mock
 */

import { createClient } from '../supabase/supabase';

export interface Player {
  id: string;
  fid: number;
  username: string;
  name: string;
  class: 'warrior' | 'mage' | 'rogue' | 'healer';
  level: number;
  experience: number;
  hp: number;
  maxHp: number;
  attack: number;
  zone: string;
  x: number;
  y: number;
  createdAt: string;
}

export class PlayerService {
  private supabase: ReturnType<typeof createClient> | null = null;
  private useMock = false;

  constructor() {
    try {
      this.supabase = createClient();
      this.useMock = false;
    } catch (err) {
      console.warn('Supabase client failed, using mock data');
      this.useMock = true;
    }
  }

  async getPlayer(fid: number): Promise<Player | null> {
    if (this.useMock || !this.supabase) {
      return this.getMockPlayer(fid);
    }

    try {
      const { data, error } = await this.supabase
        .from('players')
        .select('*')
        .eq('fid', fid)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Player;
    } catch (err) {
      console.warn('Failed to fetch player, using mock:', err);
      this.useMock = true;
      return this.getMockPlayer(fid);
    }
  }

  async createPlayer(fid: number, username: string, name: string, playerClass: string): Promise<Player> {
    if (this.useMock || !this.supabase) {
      return this.createMockPlayer(fid, username, name, playerClass);
    }

    try {
      const { data, error } = await this.supabase
        .from('players')
        .insert({
          fid,
          username,
          name,
          class: playerClass,
          level: 1,
          experience: 0,
          hp: 100,
          max_hp: 100,
          attack: 10,
          zone: 'crystal_haven',
          x: 0,
          y: 0,
        })
        .select()
        .single();

      if (error) throw error;

      return data as Player;
    } catch (err) {
      console.warn('Failed to create player, using mock:', err);
      this.useMock = true;
      return this.createMockPlayer(fid, username, name, playerClass);
    }
  }

  async updatePlayer(fid: number, updates: Partial<Player>): Promise<Player | null> {
    if (this.useMock || !this.supabase) {
      const player = await this.getMockPlayer(fid);
      if (player) {
        Object.assign(player, updates);
        this.saveMockPlayer(fid, player);
      }
      return player;
    }

    try {
      const { data, error } = await this.supabase
        .from('players')
        .update(updates)
        .eq('fid', fid)
        .select()
        .single();

      if (error) throw error;

      return data as Player;
    } catch (err) {
      console.warn('Failed to update player:', err);
      return null;
    }
  }

  private getMockPlayer(fid: number): Player | null {
    const stored = localStorage.getItem(`player_${fid}`);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  }

  private saveMockPlayer(fid: number, player: Player): void {
    localStorage.setItem(`player_${fid}`, JSON.stringify(player));
  }

  private createMockPlayer(fid: number, username: string, name: string, playerClass: string): Player {
    const player: Player = {
      id: `mock_${fid}_${Date.now()}`,
      fid,
      username,
      name,
      class: playerClass as Player['class'],
      level: 1,
      experience: 0,
      hp: 100,
      maxHp: 100,
      attack: 10,
      zone: 'crystal_haven',
      x: 0,
      y: 0,
      createdAt: new Date().toISOString(),
    };

    this.saveMockPlayer(fid, player);
    return player;
  }
}

// Export singleton
export const playerService = new PlayerService();
