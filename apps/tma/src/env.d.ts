/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Telegram Stars invoice link for the detailed report (created by the bot backend). */
  readonly VITE_INVOICE_URL?: string;
  /** Bot username without "@", used in share texts. */
  readonly VITE_BOT_USERNAME?: string;
  /** Report price label shown on the paywall, e.g. "150 ⭐". */
  readonly VITE_REPORT_PRICE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** package.json version, injected by vite.config.ts `define`. */
declare const __APP_VERSION__: string;
