/**
 * The lock screen moved into the auth feature.
 *
 * Unlocking a device is signing in again, and a feature may not reach into
 * another one — so the screen lives with the action it calls.
 */
export { LockScreen, PinLock } from "@/features/auth";
