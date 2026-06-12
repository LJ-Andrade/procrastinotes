import type {
  Page,
  Project,
  SearchHit,
  Section,
  SyncOutcome,
  SyncStatus,
} from "../types";

/**
 * The single boundary between the UI and persistence.
 *
 * The UI never talks to SQLite (or any storage) directly — it depends only on
 * this interface. Native builds use a SQLite-backed implementation through
 * Rust; a future web build can implement the same interface over IndexedDB
 * without touching any UI code.
 */
export interface DataStore {
  // Projects
  listProjects(): Promise<Project[]>;
  createProject(name: string): Promise<Project>;
  renameProject(id: string, name: string): Promise<void>;
  deleteProject(id: string): Promise<void>;
  reorderProjects(ids: string[]): Promise<void>;

  // Sections
  listSections(projectId: string): Promise<Section[]>;
  createSection(projectId: string, name: string): Promise<Section>;
  renameSection(id: string, name: string): Promise<void>;
  deleteSection(id: string): Promise<void>;
  reorderSections(ids: string[]): Promise<void>;

  // Pages
  listPages(sectionId: string): Promise<Page[]>;
  getPage(id: string): Promise<Page | null>;
  createPage(sectionId: string, title: string): Promise<Page>;
  updatePage(
    id: string,
    title: string,
    contentJson: string,
    contentText: string,
  ): Promise<void>;
  renamePage(id: string, title: string): Promise<void>;
  deletePage(id: string): Promise<void>;
  reorderPages(ids: string[]): Promise<void>;

  // Search
  search(query: string): Promise<SearchHit[]>;

  // Backup
  /** Write a portable snapshot of the database to `path`. */
  exportBackup(path: string): Promise<void>;
  /** Replace all data with the backup at `path` (destructive). */
  importBackup(path: string): Promise<void>;

  // Images
  /** Read an image file and return it as a `data:` URL. */
  readImageDataUrl(path: string): Promise<string>;

  // Assets (images embedded in page content)
  /**
   * Store an image (already resized) as a binary asset and return its id.
   * `dataBase64` is the raw base64 payload (no `data:` prefix).
   */
  putAsset(
    mime: string,
    dataBase64: string,
    width: number | null,
    height: number | null,
  ): Promise<string>;
  /** Resolve a stored asset id to a `data:` URL for display. */
  getAsset(id: string): Promise<string>;
  /**
   * Delete image blobs no page references any more. Returns how many were
   * removed. Safe to call on startup; never call mid-edit.
   */
  cleanupAssets(): Promise<number>;

  // Drive sync
  driveStatus(): Promise<SyncStatus>;
  driveConnect(): Promise<SyncStatus>;
  driveDisconnect(): Promise<void>;
  /** Flag that local data changed since the last sync. */
  syncMarkDirty(): Promise<void>;
  /** Run a sync pass; returns what happened. */
  syncNow(): Promise<SyncOutcome>;
  /** Resolve a conflict by keeping one side. */
  syncResolve(keep: "local" | "remote"): Promise<SyncOutcome>;
}
