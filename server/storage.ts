import type { InsertProfile, Profile } from "@shared/schema";

// Storage interface minima de ejemplo; la app hoy usa Supabase directo en frontend.
export interface IStorage {
  getProfile(id: string): Promise<Profile | undefined>;
  getProfileByUsername(username: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
}

export class MemStorage implements IStorage {
  private profiles = new Map<string, Profile>();

  async getProfile(id: string): Promise<Profile | undefined> {
    return this.profiles.get(id);
  }

  async getProfileByUsername(username: string): Promise<Profile | undefined> {
    return Array.from(this.profiles.values()).find((profile) => profile.username === username);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const profile: Profile = {
      ...insertProfile,
      fullName: insertProfile.fullName ?? null,
      avatarUrl: insertProfile.avatarUrl ?? null,
      bio: insertProfile.bio ?? null,
      isPrivate: insertProfile.isPrivate ?? false,
      dailyLimitMinutes: insertProfile.dailyLimitMinutes ?? 90,
      quietHoursStart: insertProfile.quietHoursStart ?? null,
      quietHoursEnd: insertProfile.quietHoursEnd ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }
}

export const storage = new MemStorage();
