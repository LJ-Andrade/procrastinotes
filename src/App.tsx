import { useCallback, useEffect, useRef, useState } from "react";
import { store } from "./data";
import { Editor, type EditorChange } from "./editor/Editor";
import { TitleBar } from "./TitleBar";
import { PreferencesModal } from "./PreferencesModal";
import { CommandPalette } from "./CommandPalette";
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
  const [commandOpen, setCommandOpen] = useState(false);
  // Bumped to ask the editor to take focus (used by quick capture).
  const [focusSignal, setFocusSignal] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("procrastinotes.sidebar") === "collapsed",
  );

  useEffect(() => {
    localStorage.setItem(
      "procrastinotes.sidebar",
      sidebarCollapsed ? "collapsed" : "expanded",
    );
  }, [sidebarCollapsed]);

  // Global shortcuts. Uses refs/stable setters so the handler never goes stale.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCommandOpen(true);
      } else if (e.ctrlKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        const s = sectionIdRef.current;
        if (s) {
          store.createPage(s, "Untitled").then(async (page) => {
            setPages(await store.listPages(s));
            setPageId(page.id);
            setFocusSignal((n) => n + 1);
          });
        }
      } else if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        setSidebarCollapsed((c) => !c);
      } else if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        setPrefsOpen(true);
      } else if (e.key === "Escape") {
        setPrefsOpen(false);
        setCommandOpen(false);
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

  // When navigating to a specific page (e.g. from search), these hold the
  // target section/page so the cascading loaders select them instead of the
  // first item.
  const pendingSection = useRef<string | null>(null);
  const pendingPage = useRef<string | null>(null);
  const sectionIdRef = useRef<string | null>(null);
  sectionIdRef.current = sectionId;

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
      const target = pendingSection.current;
      pendingSection.current = null;
      setSectionId(
        target && list.some((s) => s.id === target) ? target : list[0]?.id ?? null,
      );
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
      const target = pendingPage.current;
      pendingPage.current = null;
      setPageId(
        target && list.some((p) => p.id === target) ? target : list[0]?.id ?? null,
      );
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

  /** Jump to a specific page, loading its project and section along the way.
      Only the pending refs that a cascading loader will actually consume are
      set, so nothing leaks into later navigation. */
  function navigateTo(targetProject: string, targetSection: string, targetPage: string) {
    if (targetProject !== projectId) {
      pendingSection.current = targetSection;
      pendingPage.current = targetPage;
      setProjectId(targetProject);
    } else if (targetSection !== sectionId) {
      pendingPage.current = targetPage;
      setSectionId(targetSection);
    } else {
      setPageId(targetPage);
    }
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
              focusSignal={focusSignal}
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
      {commandOpen && (
        <CommandPalette
          projects={projects}
          onNavigate={navigateTo}
          onCreatePage={addPage}
          onCreateProject={addProject}
          onClose={() => setCommandOpen(false)}
        />
      )}
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
