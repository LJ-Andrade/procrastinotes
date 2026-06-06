import { useCallback, useEffect, useRef, useState } from "react";
import { store } from "./data";
import { Editor, type EditorChange } from "./editor/Editor";
import { TitleBar } from "./TitleBar";
import { PreferencesModal } from "./PreferencesModal";
import { usePreferences } from "./preferences";
import type { Page, Project, Section } from "./types";
import "./App.css";

const AUTOSAVE_DELAY = 600;

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);

  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [saving, setSaving] = useState(false);

  const { prefs, update: updatePrefs } = usePreferences();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("procrastinotes.sidebar") === "collapsed",
  );

  useEffect(() => {
    localStorage.setItem(
      "procrastinotes.sidebar",
      sidebarCollapsed ? "collapsed" : "expanded",
    );
  }, [sidebarCollapsed]);

  // Global shortcuts: toggle sidebar, open preferences, close modal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        setSidebarCollapsed((c) => !c);
      } else if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setPrefsOpen(true);
      } else if (e.key === "Escape") {
        setPrefsOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Refs hold the freshest values so the debounced save never reads stale data.
  const saveTimer = useRef<number | null>(null);
  const pageIdRef = useRef<string | null>(null);
  const titleRef = useRef("");
  const contentRef = useRef<EditorChange>({ json: "", text: "" });
  pageIdRef.current = pageId;
  titleRef.current = title;

  // --- Loaders -------------------------------------------------------------

  const loadProjects = useCallback(async () => {
    const list = await store.listProjects();
    setProjects(list);
    setProjectId((current) => current ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) {
      setSections([]);
      setSectionId(null);
      return;
    }
    store.listSections(projectId).then((list) => {
      setSections(list);
      setSectionId(list[0]?.id ?? null);
    });
  }, [projectId]);

  useEffect(() => {
    if (!sectionId) {
      setPages([]);
      setPageId(null);
      return;
    }
    store.listPages(sectionId).then((list) => {
      setPages(list);
      setPageId(list[0]?.id ?? null);
    });
  }, [sectionId]);

  // Load the full page (with content) when the selection changes.
  useEffect(() => {
    if (!pageId) {
      setTitle("");
      setPageContent("");
      contentRef.current = { json: "", text: "" };
      return;
    }
    store.getPage(pageId).then((page) => {
      if (!page) return;
      setTitle(page.title);
      setPageContent(page.contentJson);
      contentRef.current = { json: page.contentJson, text: page.contentText };
    });
  }, [pageId]);

  // --- Autosave ------------------------------------------------------------

  const scheduleSave = useCallback(() => {
    if (!pageIdRef.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = window.setTimeout(async () => {
      const id = pageIdRef.current;
      if (!id) return;
      const nextTitle = titleRef.current;
      await store.updatePage(
        id,
        nextTitle,
        contentRef.current.json,
        contentRef.current.text,
      );
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, title: nextTitle } : p)),
      );
      setSaving(false);
    }, AUTOSAVE_DELAY);
  }, []);

  function onEditorChange(change: EditorChange) {
    contentRef.current = change;
    scheduleSave();
  }

  // --- Actions -------------------------------------------------------------

  async function addProject() {
    const name = prompt("Project name")?.trim();
    if (!name) return;
    const project = await store.createProject(name);
    await loadProjects();
    setProjectId(project.id);
  }

  async function addSection() {
    if (!projectId) return;
    const name = prompt("Section name")?.trim();
    if (!name) return;
    const section = await store.createSection(projectId, name);
    setSections(await store.listSections(projectId));
    setSectionId(section.id);
  }

  async function addPage() {
    if (!sectionId) return;
    const page = await store.createPage(sectionId, "Untitled");
    setPages(await store.listPages(sectionId));
    setPageId(page.id);
  }

  // --- Render --------------------------------------------------------------

  return (
    <div className="root">
      <TitleBar
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        onOpenPreferences={() => setPrefsOpen(true)}
      />
      <div className={`app ${sidebarCollapsed ? "collapsed" : ""}`}>
        <aside className="col col-projects">
        <header className="col-header">
          <span>Projects</span>
          <button className="icon-btn" onClick={addProject} title="New project">
            +
          </button>
        </header>
        <nav className="list">
          {projects.map((p) => (
            <button
              key={p.id}
              className={`list-item ${p.id === projectId ? "active" : ""}`}
              onClick={() => setProjectId(p.id)}
            >
              {p.name}
            </button>
          ))}
          {projects.length === 0 && <p className="empty">No projects yet.</p>}
        </nav>
        <button
          className="profile"
          onClick={() => setPrefsOpen(true)}
          title="Preferences"
        >
          <span className="profile-avatar">{prefs.profileAvatar}</span>
          <span className="profile-name">{prefs.profileName}</span>
        </button>
      </aside>

      <aside className="col col-sections">
        <header className="col-header">
          <span>Sections</span>
          <button
            className="icon-btn"
            onClick={addSection}
            disabled={!projectId}
            title="New section"
          >
            +
          </button>
        </header>
        <nav className="list">
          {sections.map((s) => (
            <button
              key={s.id}
              className={`list-item ${s.id === sectionId ? "active" : ""}`}
              onClick={() => setSectionId(s.id)}
            >
              {s.name}
            </button>
          ))}
        </nav>

        <header className="col-header col-header-pages">
          <span>Pages</span>
          <button
            className="icon-btn"
            onClick={addPage}
            disabled={!sectionId}
            title="New page"
          >
            +
          </button>
        </header>
        <nav className="list">
          {pages.map((p) => (
            <button
              key={p.id}
              className={`list-item ${p.id === pageId ? "active" : ""}`}
              onClick={() => setPageId(p.id)}
            >
              {p.title || "Untitled"}
            </button>
          ))}
        </nav>
      </aside>

      <main className="col col-editor">
        {pageId ? (
          <>
            <input
              className="page-title"
              value={title}
              placeholder="Untitled"
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleSave();
              }}
            />
            <Editor
              docId={pageId}
              initialJson={pageContent}
              onChange={onEditorChange}
            />
            <footer className="status">{saving ? "Saving…" : "Saved"}</footer>
          </>
        ) : (
          <div className="placeholder">
            <p>Select or create a page to start writing.</p>
          </div>
        )}
      </main>
      </div>
      {prefsOpen && (
        <PreferencesModal
          prefs={prefs}
          update={updatePrefs}
          onClose={() => setPrefsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
