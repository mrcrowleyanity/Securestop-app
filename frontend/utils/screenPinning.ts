/**
 * @deprecated
 *
 * This file previously contained a standalone screen-pinning implementation
 * using @akbaraditamasp/expo-lock-task directly.
 *
 * The canonical implementation now lives in:
 *   frontend/modules/screen-pinning/index.ts
 *
 * This file is kept as a thin re-export so that any existing imports of
 * '../utils/screenPinning' continue to resolve without requiring a find-and-
 * replace across the codebase. New code should import from the module directly:
 *
 *   import ScreenPinning from '../modules/screen-pinning';
 */

export { default } from '../modules/screen-pinning';
