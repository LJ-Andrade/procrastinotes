import type { Page, Project, SearchHit, Section } from "../types";

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
}
