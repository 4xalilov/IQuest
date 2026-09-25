/**
 * Minimal hand-written typing of the parts of `window.Telegram.WebApp` IQuest uses.
 * See https://core.telegram.org/bots/webapps. Methods added in newer Bot API
 * versions are optional; always guard with `isVersionAtLeast` or a presence check.
 */

export type ColorScheme = 'light' | 'dark';

export interface SafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface BottomButtonParams {
  text?: string;
  color?: string;
  text_color?: string;
  is_active?: boolean;
  is_visible?: boolean;
}

export interface BottomButton {
  text: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText(text: string): BottomButton;
  onClick(cb: () => void): BottomButton;
  offClick(cb: () => void): BottomButton;
  show(): BottomButton;
  hide(): BottomButton;
  enable(): BottomButton;
  disable(): BottomButton;
  showProgress(leaveActive?: boolean): BottomButton;
  hideProgress(): BottomButton;
  setParams(params: BottomButtonParams): BottomButton;
}

export interface BackButton {
  isVisible: boolean;
  onClick(cb: () => void): BackButton;
  offClick(cb: () => void): BackButton;
  show(): BackButton;
  hide(): BackButton;
}

export interface HapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): HapticFeedback;
  notificationOccurred(type: 'error' | 'success' | 'warning'): HapticFeedback;
  selectionChanged(): HapticFeedback;
}

export interface CloudStorage {
  setItem(key: string, value: string, cb?: (err: string | null, ok?: boolean) => void): CloudStorage;
  getItem(key: string, cb: (err: string | null, value?: string) => void): CloudStorage;
  removeItem(key: string, cb?: (err: string | null, ok?: boolean) => void): CloudStorage;
}

export interface WebAppUser {
  id: number;
  first_name?: string;
  language_code?: string;
}

export type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

export type WebAppEvent =
  | 'themeChanged'
  | 'viewportChanged'
  | 'safeAreaChanged'
  | 'contentSafeAreaChanged'
  | 'fullscreenChanged'
  | 'fullscreenFailed'
  | 'activated'
  | 'deactivated'
  | 'invoiceClosed';

export interface WebApp {
  version: string;
  platform: string;
  colorScheme: ColorScheme;
  themeParams: Record<string, string | undefined>;
  initData: string;
  initDataUnsafe: { user?: WebAppUser; start_param?: string };
  isExpanded: boolean;
  isFullscreen?: boolean;
  isActive?: boolean;
  safeAreaInset?: SafeAreaInset;
  contentSafeAreaInset?: SafeAreaInset;

  MainButton: BottomButton;
  BackButton: BackButton;
  HapticFeedback?: HapticFeedback;
  CloudStorage?: CloudStorage;

  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  close(): void;
  requestFullscreen?(): void;
  exitFullscreen?(): void;
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
  enableVerticalSwipes?(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  setBottomBarColor?(color: string): void;
  openInvoice?(url: string, cb?: (status: InvoiceStatus) => void): void;
  openLink?(url: string): void;
  openTelegramLink?(url: string): void;
  switchInlineQuery?(query: string, chooseChatTypes?: ('users' | 'bots' | 'groups' | 'channels')[]): void;
  onEvent(event: WebAppEvent | string, cb: (...args: unknown[]) => void): void;
  offEvent(event: WebAppEvent | string, cb: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}
