/**
 * The mobile chrome.
 *
 * The chrome itself lives with the rest of the mobile app, in
 * `@/mobile/chrome`. It is re-exported here because the fidelity guide
 * renders the phone header and tab bar on a desktop page, and it has always
 * found them at this address.
 */
export { MobileHeader, MobileTabBar, MobileShell } from "@/mobile/chrome";
export type {
  MobileHeaderProps,
  MobileTabItem,
  MobileTabBarProps,
  MobileShellProps,
} from "@/mobile/chrome";
