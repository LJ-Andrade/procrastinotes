// Domain types shared across the app. These mirror the Rust models
// (serialized as camelCase) so the same shapes flow end to end.

export interface Project {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  cover: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Section {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Page {
  id: string;
  sectionId: string;
  parentId: string | null;
  title: string;
  /** Tiptap JSON. Empty until the page has been edited. */
  contentJson: string;
  /** Derived plain text, used for search. */
  contentText: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SearchHit {
  pageId: string;
  sectionId: string;
  projectId: string;
  title: string;
  snippet: string;
}
