import { openUrl } from "@tauri-apps/plugin-opener";

/** Where the "support" buttons point. Kept in one place so both the toast and
 *  the Preferences section stay in sync. */
export const KOFI_URL = "https://ko-fi.com/moubix";
export const PAYPAL_URL = "https://paypal.me/moubixgames";

/** Open a URL in the user's default browser (never inside the app webview). */
export function openExternal(url: string): void {
  void openUrl(url).catch(() => {});
}
