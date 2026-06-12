import { useEffect, useState } from "react";
import type { Strings } from "./i18n";
import { KOFI_URL, PAYPAL_URL, openExternal } from "./links";

/**
 * A small, non-invasive "support the project" toast that slides in at the
 * bottom-left shortly after launch. Designed to never nag:
 *  - never on the first few launches (let the app prove useful first),
 *  - then at most once a week,
 *  - auto-dismisses on its own, and
 *  - "don't show again" hides it forever.
 * All state lives in localStorage (device-local, like other preferences).
 */
const KEY_DISMISSED = "procrastinotes.support.dismissed";
const KEY_LAUNCHES = "procrastinotes.support.launches";
const KEY_LAST_SHOWN = "procrastinotes.support.lastShown";

const MIN_LAUNCHES = 3;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // once a week at most
const SHOW_DELAY_MS = 1500;
const AUTO_DISMISS_MS = 9000;

export function SupportToast({ strings }: { strings: Strings["support"] }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Decide once, on mount, whether to show this session.
  useEffect(() => {
    if (localStorage.getItem(KEY_DISMISSED) === "1") return;

    const launches = Number(localStorage.getItem(KEY_LAUNCHES) ?? "0") + 1;
    localStorage.setItem(KEY_LAUNCHES, String(launches));
    if (launches < MIN_LAUNCHES) return;

    const lastShown = Number(localStorage.getItem(KEY_LAST_SHOWN) ?? "0");
    if (Date.now() - lastShown < COOLDOWN_MS) return;

    const t = window.setTimeout(() => {
      localStorage.setItem(KEY_LAST_SHOWN, String(Date.now()));
      setVisible(true);
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Auto-dismiss after a while once shown.
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(close, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [visible]);

  function close() {
    setLeaving(true);
    window.setTimeout(() => setVisible(false), 250);
  }

  function dismissForever() {
    localStorage.setItem(KEY_DISMISSED, "1");
    close();
  }

  if (!visible) return null;

  return (
    <div className={`support-toast ${leaving ? "leaving" : ""}`}>
      <button
        className="support-toast-close"
        onClick={close}
        aria-label="✕"
      >
        ✕
      </button>
      <p className="support-toast-title">{strings.toastTitle}</p>
      <p className="support-toast-body">{strings.toastBody}</p>
      <div className="support-toast-actions">
        <button
          className="support-btn kofi"
          onClick={() => openExternal(KOFI_URL)}
        >
          ☕ Ko-fi
        </button>
        <button
          className="support-btn paypal"
          onClick={() => openExternal(PAYPAL_URL)}
        >
          PayPal
        </button>
      </div>
      <button className="support-toast-dismiss" onClick={dismissForever}>
        {strings.dismiss}
      </button>
    </div>
  );
}
