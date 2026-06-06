import { useCallback, useEffect, useRef, useState } from "react";
import { store } from "./data";
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
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const saveTimer = useRef<number | null>(null);

  // --- Loaders -------------------------------------------------------------

  const loadProjects = useCallback(async () => {
    const list = await store.listProjects();
    setProjects(list);
    setProjectId((current) => current ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Reload sections whenever the selected project changes.
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

  // Reload pages whenever the selected section changes.
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
      setBody("");
      return;
    }
    store.getPage(pageId).then((page) => {
      if (!page) return;
      setTitle(page.title);
      setBody(page.contentText);
    });
  }, [pageId]);

  // --- Autosave ------------------------------------------------------------

  const scheduleSave = useCallback(
    (nextTitle: string, nextBody: string) => {
      if (!pageId) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setSaving(true);
      saveTimer.current = window.setTimeout(async () => {
        // Placeholder content shape until the Tiptap editor lands in Phase 2.
        const contentJson = JSON.stringify({ type: "plain", text: nextBody });
        await store.updatePage(pageId, nextTitle, contentJson, nextBody);
        setPages((prev) =>
          prev.map((p) => (p.id === pageId ? { ...p, title: nextTitle } : p)),
        );
        setSaving(false);
      }, AUTOSAVE_DELAY);
    },
    [pageId],
  );

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
    const list = await store.listSections(projectId);
    setSections(list);
    setSectionId(section.id);
  }

  async function addPage() {
    if (!sectionId) return;
    const page = await store.createPage(sectionId, "Untitled");
    const list = await store.listPages(sectionId);
    setPages(list);
    setPageId(page.id);
  }

  // --- Render --------------------------------------------------------------

  return (
    <div className="app">
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
          {projects.length === 0 && (
            <p className="empty">No projects yet.</p>
          )}
        </nav>
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
                scheduleSave(e.target.value, body);
              }}
            />
            <textarea
              className="page-body"
              value={body}
              placeholder="Start writing…"
              onChange={(e) => {
                setBody(e.target.value);
                scheduleSave(title, e.target.value);
              }}
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
  );
}

export default App;
