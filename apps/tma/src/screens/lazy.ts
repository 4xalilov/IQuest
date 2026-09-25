import { lazyScreen } from '../lazy';

/* Everything outside the Home → Intro → Question path is a separate chunk. */
export const ResultScreen = lazyScreen<{ id?: string }>(() => import('./Result'));
export const PaywallScreen = lazyScreen<{ id: string }>(() => import('./Paywall'));
export const ResultsScreen = lazyScreen<Record<string, never>>(() => import('./MyResults'));
export const ProfileScreen = lazyScreen<Record<string, never>>(() => import('./Profile'));
export const SettingsScreen = lazyScreen<Record<string, never>>(() => import('./Settings'));
export const MethodologyScreen = lazyScreen<Record<string, never>>(() => import('./Methodology'));
export const HelpScreen = lazyScreen<{ topic?: string }>(() => import('./Help'));
export const LanguageScreen = lazyScreen<Record<string, never>>(() => import('./Language'));
