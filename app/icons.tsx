import type { ReactNode, SVGProps } from "react";

export type OfmIconName =
  | "ai" | "bike" | "boot" | "center" | "chevron-down" | "close" | "compass" | "cursor"
  | "delete-point" | "elevation" | "expand" | "eye" | "eye-off"
  | "hike" | "info" | "leaf" | "logo-figure" | "lowest" | "map" | "pin" | "plus" | "route"
  | "run" | "send" | "settings" | "stats" | "sun" | "upload";

type Props = SVGProps<SVGSVGElement> & { name: OfmIconName; size?: number; title?: string };

const paths: Record<OfmIconName, ReactNode> = {
  ai: <><path d="M12 2.7c.5 4.7 2.6 6.8 7.3 7.3-4.7.5-6.8 2.6-7.3 7.3-.5-4.7-2.6-6.8-7.3-7.3 4.7-.5 6.8-2.6 7.3-7.3Z"/><path d="M18.3 15.7c.2 1.7 1 2.5 2.7 2.7-1.7.2-2.5 1-2.7 2.7-.2-1.7-1-2.5-2.7-2.7 1.7-.2 2.5-1 2.7-2.7Z"/></>,
  bike: <><circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="m6 16.5 4-7h4l4 7M9 6.5h3l2 3m-4 0 4 7m0-10h3"/></>,
  boot: <><path d="M7 3h7v7c0 2 1.5 3.5 3.5 4l2.5.6V20H5v-4.5l2-2V3Z"/><path d="M7 8h7M6 16h10m-9-5h3"/></>,
  center: <><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></>,
  "chevron-down": <path d="m7 10 5 5 5-5"/>,
  close: <path d="m7 7 10 10M17 7 7 17"/>,
  compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/><circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none"/></>,
  cursor: <path d="m5 3 13 8-6 1-3 6L5 3Z"/>,
  "delete-point": <><circle cx="12" cy="12" r="8"/><path d="M8.5 12h7"/></>,
  elevation: <><path d="m3 18 5.2-7 3.3 3.8L16 8l5 10"/><path d="m14.8 9.8 1.3-2 1.5 2.1"/></>,
  expand: <><path d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5"/></>,
  eye: <><path d="M2.5 12s3.3-5 9.5-5 9.5 5 9.5 5-3.3 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.5"/></>,
  "eye-off": <><path d="m4 4 16 16"/><path d="M10.6 7.2A11 11 0 0 1 12 7c6.2 0 9.5 5 9.5 5a15 15 0 0 1-2.3 2.7M7.2 8.4A15.2 15.2 0 0 0 2.5 12s3.3 5 9.5 5c.7 0 1.4-.1 2-.2"/></>,
  hike: <><circle cx="13" cy="4.5" r="1.8"/><path d="m10 21 2-7-3-3 2-4 4 2 2 4M12 14l4 3 2 4M9 11 5 14m4 0-3 7"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".7" fill="currentColor" stroke="none"/></>,
  leaf: <><path d="M20 4C10 4 5 9 5 15c0 3 2 5 5 5 6 0 10-6 10-16Z"/><path d="M4 21c3-6 7-9 12-12"/></>,
  "logo-figure": <><circle cx="13.8" cy="4.1" r="2"/><path d="M10.5 8.2c1-1.5 3.3-1.8 4.7-.6l2.4 2.1 2.4.4M11.2 8.1 8.8 12l3.5 2.2M12.3 14.2 9.7 20m2.6-5.8 4 2.5 1.6 3.3"/><path d="M8.7 8.3 6.2 7.1 4 10m14.3-1.2L20 20"/><path d="M10.2 7.2 8 5.9 6.5 8.7"/></>,
  lowest: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 20h14"/></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  route: <><path d="M5 18c0-5 14-3 14-9 0-2.2-1.8-4-4-4"/><circle cx="5" cy="18" r="2"/><circle cx="15" cy="5" r="2"/></>,
  run: <><circle cx="14" cy="4.5" r="1.8"/><path d="m12 8 3 3 4 1M12 8 8 12m7-1-3 4-5 1m5-1 4 6m-9-5-3 5"/></>,
  send: <><path d="m3 11 18-8-7 18-3-7-8-3Z"/><path d="m11 14 4-4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5 7 7m10 10 1.5 1.5m0-13L17 7M7 17l-1.5 1.5"/></>,
  stats: <><path d="M5 20v-6h3v6M10.5 20V9h3v11M16 20V4h3v16"/><path d="M3 20h18"/></>,
  sun: <><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2"/></>,
  upload: <><path d="M12 16V4m0 0 4 4m-4-4L8 8"/><path d="M5 20h14"/></>,
};

export function OfmIcon({ name, size = 18, title, className, ...props }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={`ofm-symbol${className ? ` ${className}` : ""}`}
      aria-hidden={title ? undefined : true} role={title ? "img" : undefined} {...props}>
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}
