import { Message } from '../services/geminiService';

export interface UserProfile {
  name: string;
  preferences: string[];
  topics: string[];
  lastUpdate: number;
}

const STORAGE_KEYS = {
  MESSAGES: 'aura_messages',
  PROFILE: 'aura_profile',
};

export const storage = {
  getMessages: (): Message[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  saveMessages: (messages: Message[]) => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  getProfile: (): UserProfile => {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return data ? JSON.parse(data) : {
      name: 'User',
      preferences: [],
      topics: [],
      lastUpdate: Date.now(),
    };
  },

  saveProfile: (profile: UserProfile) => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  clearAll: () => {
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  }
};
