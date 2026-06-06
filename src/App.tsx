import { useCallback, useEffect, useRef, useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { store } from "./data";
import { Editor, type EditorChange } from "./editor/Editor";
import { TitleBar } from "./TitleBar";
import { PreferencesModal } from "./PreferencesModal";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { FindBar } from "./FindBar";
import { Ambient } from "./Ambient";
import { SidebarList } from "./SidebarList";
import { usePreferences } from "./preferences";
import type { Page, Project, Section } from "./types";
import "./App.css";

const AUTOSAVE_DELAY = 600;

/** True when the event target is an editable element (input/editor), so global
    single-key shortcuts like "?" don't fire while the user is typing. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.isContentEditable)
  );
}

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
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
      } else if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        saveNow();
      } else if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
        if (pageIdRef.current) {
          e.preventDefault();
          setFindOpen(true);
        }
      } else if (e.key === "?" && !isTyping(e.target)) {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.key === "Escape") {
        setPrefsOpen(false);
        setCommandOpen(false);
        setHelpOpen(false);
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

  const persistNow = useCallback(async () => {
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
  }, []);

  const scheduleSave = useCallback(() => {
    if (!pageIdRef.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = window.setTimeout(persistNow, AUTOSAVE_DELAY);
  }, [persistNow]);

  // Ctrl+S: flush any pending save immediately (autosave already covers it).
  const saveNow = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    void persistNow();
  }, [persistNow]);

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

  // Project management
  async function onRenameProject(id: string, name: string) {
    await store.renameProject(id, name);
    setProjects(await store.listProjects());
  }
  async function onDeleteProject(id: string) {
    await store.deleteProject(id);
    const list = await store.listProjects();
    setProjects(list);
    if (projectId === id) setProjectId(list[0]?.id ?? null);
  }
  async function onReorderProjects(ids: string[]) {
    await store.reorderProjects(ids);
    setProjects(await store.listProjects());
  }

  // Section management
  async function onRenameSection(id: string, name: string) {
    if (!projectId) return;
    await store.renameSection(id, name);
    setSections(await store.listSections(projectId));
  }
  async function onDeleteSection(id: string) {
    if (!projectId) return;
    await store.deleteSection(id);
    const list = await store.listSections(projectId);
    setSections(list);
    if (sectionId === id) setSectionId(list[0]?.id ?? null);
  }
  async function onReorderSections(ids: string[]) {
    if (!projectId) return;
    await store.reorderSections(ids);
    setSections(await store.listSections(projectId));
  }

  // Page management
  async function onRenamePage(id: string, name: string) {
    if (!sectionId) return;
    await store.renamePage(id, name);
    setPages(await store.listPages(sectionId));
    if (id === pageId) setTitle(name);
  }
  async function onDeletePage(id: string) {
    if (!sectionId) return;
    await store.deletePage(id);
    const list = await store.listPages(sectionId);
    setPages(list);
    if (pageId === id) setPageId(list[0]?.id ?? null);
  }
  async function onReorderPages(ids: string[]) {
    if (!sectionId) return;
    await store.reorderPages(ids);
    setPages(await store.listPages(sectionId));
  }

  // Backup
  async function exportBackup() {
    const path = await save({
      title: "Export backup",
      defaultPath: "procrastinotes-backup.db",
      filters: [{ name: "Procrastinotes backup", extensions: ["db"] }],
    });
    if (!path) return;
    await store.exportBackup(path);
  }

  async function importBackup() {
    const selected = await open({
      title: "Import backup",
      multiple: false,
      filters: [{ name: "Procrastinotes backup", extensions: ["db"] }],
    });
    const path = typeof selected === "string" ? selected : null;
    if (!path) return;
    if (
      !confirm(
        "Importing will replace ALL current data with this backup. Continue?",
      )
    )
      return;
    await store.importBackup(path);
    // Reload everything from the freshly imported data.
    setSectionId(null);
    setPageId(null);
    const list = await store.listProjects();
    setProjects(list);
    setProjectId(list[0]?.id ?? null);
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
      {prefs.ambient && <Ambient />}
      <TitleBar
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        onOpenPreferences={() => setPrefsOpen(true)}
        onShowHelp={() => setHelpOpen(true)}
      />
      <div className={`app ${sidebarCollapsed ? "collapsed" : ""}`}>
        <aside className="col col-projects">
        <header className="col-header">
          <span>Projects</span>
          <button className="icon-btn" onClick={addProject} title="New project">
            +
          </button>
        </header>
        <SidebarList
          items={projects.map((p) => ({ id: p.id, label: p.name }))}
          activeId={projectId}
          emptyText="No projects yet."
          onSelect={setProjectId}
          onRename={onRenameProject}
          onDelete={onDeleteProject}
          onReorder={onReorderProjects}
        />
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
        <SidebarList
          items={sections.map((s) => ({ id: s.id, label: s.name }))}
          activeId={sectionId}
          onSelect={setSectionId}
          onRename={onRenameSection}
          onDelete={onDeleteSection}
          onReorder={onReorderSections}
        />

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
        <SidebarList
          items={pages.map((p) => ({ id: p.id, label: p.title || "Untitled" }))}
          activeId={pageId}
          onSelect={setPageId}
          onRename={onRenamePage}
          onDelete={onDeletePage}
          onReorder={onReorderPages}
        />
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
          onShowShortcuts={() => {
            setCommandOpen(false);
            setHelpOpen(true);
          }}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
          onClose={() => setCommandOpen(false)}
        />
      )}
      {findOpen && pageId && <FindBar onClose={() => setFindOpen(false)} />}
      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}
      {prefsOpen && (
        <PreferencesModal
          prefs={prefs}
          update={updatePrefs}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
          onClose={() => setPrefsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
