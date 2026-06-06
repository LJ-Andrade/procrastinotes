import type { DataStore } from "./DataStore";
import { tauriDataStore } from "./TauriDataStore";

/**
 * The active data store for this build.
 *
 * For now this is always the Tauri/SQLite store. When the web build lands,
 * this is the single place that selects an IndexedDB-backed store instead —
 * no UI code needs to change.
 */
export const store: DataStore = tauriDataStore;

export type { DataStore };
