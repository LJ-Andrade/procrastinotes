import { invoke } from "@tauri-apps/api/core";
import type { DataStore } from "./DataStore";
import type {
  Page,
  Project,
  SearchHit,
  Section,
  SyncOutcome,
  SyncStatus,
} from "../types";

/**
 * DataStore implementation backed by the Rust + SQLite layer.
 * Each method maps to a Tauri command; camelCase args are converted to the
 * Rust snake_case parameters automatically.
 */
export const tauriDataStore: DataStore = {
  // Projects
  listProjects: () => invoke<Project[]>("list_projects"),
  createProject: (name) => invoke<Project>("create_project", { name }),
  renameProject: (id, name) => invoke("rename_project", { id, name }),
  deleteProject: (id) => invoke("delete_project", { id }),
  reorderProjects: (ids) => invoke("reorder_projects", { ids }),

  // Sections
  listSections: (projectId) => invoke<Section[]>("list_sections", { projectId }),
  createSection: (projectId, name) =>
    invoke<Section>("create_section", { projectId, name }),
  renameSection: (id, name) => invoke("rename_section", { id, name }),
  deleteSection: (id) => invoke("delete_section", { id }),
  reorderSections: (ids) => invoke("reorder_sections", { ids }),

  // Pages
  listPages: (sectionId) => invoke<Page[]>("list_pages", { sectionId }),
  getPage: (id) => invoke<Page | null>("get_page", { id }),
  createPage: (sectionId, title) =>
    invoke<Page>("create_page", { sectionId, title }),
  updatePage: (id, title, contentJson, contentText) =>
    invoke("update_page", { id, title, contentJson, contentText }),
  renamePage: (id, title) => invoke("rename_page", { id, title }),
  deletePage: (id) => invoke("delete_page", { id }),
  reorderPages: (ids) => invoke("reorder_pages", { ids }),

  // Search
  search: (query) => invoke<SearchHit[]>("search", { query }),

  // Backup
  exportBackup: (path) => invoke("export_backup", { path }),
  importBackup: (path) => invoke("import_backup", { path }),

  // Images
  readImageDataUrl: (path) => invoke<string>("read_image_data_url", { path }),

  // Drive sync
  driveStatus: () => invoke<SyncStatus>("drive_status"),
  driveConnect: () => invoke<SyncStatus>("drive_connect"),
  driveDisconnect: () => invoke("drive_disconnect"),
  syncMarkDirty: () => invoke("sync_mark_dirty"),
  syncNow: () => invoke<SyncOutcome>("sync_now"),
  syncResolve: (keep) => invoke<SyncOutcome>("sync_resolve", { keep }),
};
