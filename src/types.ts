import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  username: string;
  nickname?: string;
  color: string;
  vibe?: string;
  tags: string[];
  signal: string;
  x: number;
  y: number;
  createdAt: any;
  lastActive: any;
  pronouns?: string;
  lookingFor?: string[];
  blockedUsers: string[];
  onboarded?: boolean;
  favorites?: string[];
  signalUpdatedAt?: any;
  constellationId?: string;
  location?: {
    city: string;
    region: string;
    country: string;
    lat: number;
    lng: number;
  };
  hideLocation?: boolean;
  relationshipStatus?: string;
  zodiacSign?: string;
  mbti?: string;
  identity?: string;
  sexualRole?: string;
  usernameChanged?: boolean;
  isGuest?: boolean;
}

export interface UnsaidThought {
  id: string;
  userId: string;
  text: string;
  type: 'whisper';
  username?: string;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  vibe?: string;
  isAnonymous?: boolean;
  x?: number;
  y?: number;
  lat?: number;
  lng?: number;
  viewCount?: number;
  city?: string;
  region?: string;
  country?: string;
  visibility?: 'nearby' | 'global';
}

export interface Memory {
  id: string;
  userId: string;
  text: string;
  type: 'memory';
  lat: number;
  lng: number;
  region: string;
  createdAt: Timestamp;
  viewCount: number;
  date?: Timestamp;
  vibe?: string;
}
