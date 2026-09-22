import type { ComponentType } from 'react';
import type { SvgIconProps } from '@mui/material/SvgIcon';

export type MuiIconComponent = ComponentType<SvgIconProps>;

/**
 * Vite 8 / Rolldown prebundles `@mui/icons-material/*` as CJS and can export
 * the whole module (`{ default: Icon }`) instead of the icon itself.
 * MUI icons are also React.forwardRef objects (typeof === 'object'), so we
 * must not use a simple `typeof === 'function'` check.
 */
export function resolveIcon(icon: unknown): MuiIconComponent {
  let current = icon;

  // Unwrap interop modules until we hit a real React component.
  while (
    current &&
    typeof current === 'object' &&
    'default' in (current as object) &&
    !('$$typeof' in (current as object)) &&
    !('render' in (current as object))
  ) {
    current = (current as { default: unknown }).default;
  }

  return current as MuiIconComponent;
}
