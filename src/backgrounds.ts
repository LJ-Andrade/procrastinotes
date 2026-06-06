// Editor background presets.
//
// Every image dropped into `src/assets/backgrounds/` is picked up here
// automatically (jpg, jpeg, png, webp, svg, gif) and offered as a preset —
// no code change needed, just add the file.

const modules = import.meta.glob(
  "./assets/backgrounds/*.{jpg,jpeg,png,webp,svg,gif}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

export interface BackgroundPreset {
  id: string;
  label: string;
  url: string;
}

export const BACKGROUNDS: BackgroundPreset[] = Object.entries(modules)
  .map(([path, url]) => ({ id: path, label: prettyName(path), url }))
  .sort((a, b) => a.label.localeCompare(b.label));

function prettyName(path: string): string {
  const file = path.split("/").pop() ?? path;
  const base = file.replace(/\.[^.]+$/, "");
  return base.charAt(0).toUpperCase() + base.slice(1);
}
