import { SvgIcon, type SvgIconProps } from '@mui/material';

/**
 * The compliance badges use a thin stroked style, which MUI's filled icon set
 * cannot express — and it ships no plain hard hat or leaf glyph at all.
 */
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function ShieldIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path {...stroke} d="M12 21c4.5-1.9 7-5.3 7-9.5V5.7L12 3 5 5.7v5.8c0 4.2 2.5 7.6 7 9.5z" />
    </SvgIcon>
  );
}

export function HardHatIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path {...stroke} d="M6.2 16.8v-3.4a5.8 5.8 0 0 1 11.6 0v3.4" />
      <path {...stroke} d="M3 16.8h18" />
      <path {...stroke} d="M10.3 7.9V6.3h3.4v1.6" />
    </SvgIcon>
  );
}

export function LeafIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path {...stroke} d="M4.6 19.4C3.5 12 8.6 5.1 19.4 4.6c.5 10.8-6.4 15.9-14.8 14.8z" />
      <path {...stroke} d="m4.6 19.4 9.2-9.2" />
    </SvgIcon>
  );
}
