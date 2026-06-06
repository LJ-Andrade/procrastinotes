import ReactDOM from "react-dom/client";
import App from "./App";

// Note: not wrapped in React.StrictMode. StrictMode double-mounts effects in
// dev, which breaks Tiptap's drag-handle plugin registration (drops get
// rejected — the "no drop" cursor). StrictMode is a dev-only no-op for prod.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
);
