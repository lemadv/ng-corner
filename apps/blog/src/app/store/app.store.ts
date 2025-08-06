import { signalStore, withState } from '@ngrx/signals';

/**
 * Main application store interface
 */
export interface AppState {
  isLoading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  isOnline: boolean;
}

/**
 * Initial state for the main application store
 */
export const initialAppState: AppState = {
  isLoading: false,
  error: null,
  theme: 'light',
  isOnline: true,
};

/**
 * Main Application Store
 * This is the root store that manages global application state
 */
export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialAppState)
);

export type AppStoreType = InstanceType<typeof AppStore>;