import { create } from 'zustand';
import {
  ConsentPreferences,
  ConsentRecord,
  CONSENT_VERSION,
  DEFAULT_PREFERENCES,
  CONSENT_STORAGE_KEY,
} from './types';

interface ConsentState {
  /** Whether consent has been determined (loaded from storage or user made choice) */
  isLoaded: boolean;
  /** Whether to show the consent banner */
  showBanner: boolean;
  /** Whether to show the preferences modal */
  showPreferences: boolean;
  /** Current consent preferences */
  preferences: ConsentPreferences;
  /** Consent record with timestamp and version */
  record: ConsentRecord | null;
}

interface ConsentActions {
  /** Initialize consent state from localStorage */
  initialize: () => void;
  /** Accept all cookies */
  acceptAll: () => void;
  /** Reject all non-essential cookies */
  rejectNonEssential: () => void;
  /** Save custom preferences */
  savePreferences: (preferences: Partial<Omit<ConsentPreferences, 'necessary'>>) => void;
  /** Open preferences modal */
  openPreferences: () => void;
  /** Close preferences modal */
  closePreferences: () => void;
  /** Close banner without making a choice (not recommended, but needed for UI) */
  closeBanner: () => void;
  /** Check if a specific category has consent */
  hasConsent: (category: keyof ConsentPreferences) => boolean;
  /** Reset consent (for testing or user request) */
  resetConsent: () => void;
}

type ConsentStore = ConsentState & ConsentActions;

const saveToStorage = (record: ConsentRecord): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  }
};

const loadFromStorage = (): ConsentRecord | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    
    const record = JSON.parse(stored) as ConsentRecord;
    return record;
  } catch {
    return null;
  }
};

const clearStorage = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  }
};

export const useConsentStore = create<ConsentStore>((set, get) => ({
  // Initial state
  isLoaded: false,
  showBanner: false,
  showPreferences: false,
  preferences: DEFAULT_PREFERENCES,
  record: null,

  initialize: () => {
    const stored = loadFromStorage();
    
    if (stored) {
      // Check if consent version is outdated - re-prompt if policy changed
      if (stored.version < CONSENT_VERSION) {
        set({
          isLoaded: true,
          showBanner: true,
          preferences: DEFAULT_PREFERENCES,
          record: null,
        });
      } else {
        // Valid consent exists
        set({
          isLoaded: true,
          showBanner: false,
          preferences: stored.preferences,
          record: stored,
        });
      }
    } else {
      // No consent stored - show banner
      set({
        isLoaded: true,
        showBanner: true,
        preferences: DEFAULT_PREFERENCES,
        record: null,
      });
    }
  },

  acceptAll: () => {
    const preferences: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    
    const record: ConsentRecord = {
      preferences,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    
    saveToStorage(record);
    
    set({
      showBanner: false,
      showPreferences: false,
      preferences,
      record,
    });
  },

  rejectNonEssential: () => {
    const preferences: ConsentPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    
    const record: ConsentRecord = {
      preferences,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    
    saveToStorage(record);
    
    set({
      showBanner: false,
      showPreferences: false,
      preferences,
      record,
    });
  },

  savePreferences: (customPreferences) => {
    const preferences: ConsentPreferences = {
      necessary: true, // Always true
      analytics: customPreferences.analytics ?? get().preferences.analytics,
      marketing: customPreferences.marketing ?? get().preferences.marketing,
    };
    
    const record: ConsentRecord = {
      preferences,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    
    saveToStorage(record);
    
    set({
      showBanner: false,
      showPreferences: false,
      preferences,
      record,
    });
  },

  openPreferences: () => {
    set({ showPreferences: true });
  },

  closePreferences: () => {
    set({ showPreferences: false });
  },

  closeBanner: () => {
    // Note: This just hides the banner but doesn't save consent
    // User will see banner again on next visit
    set({ showBanner: false });
  },

  hasConsent: (category) => {
    return get().preferences[category];
  },

  resetConsent: () => {
    clearStorage();
    set({
      isLoaded: true,
      showBanner: true,
      showPreferences: false,
      preferences: DEFAULT_PREFERENCES,
      record: null,
    });
  },
}));
