import type { SVGProps } from 'react'

/** Icônes au trait (24×24), dessinées à la main pour ne dépendre d'aucune bibliothèque. */
const paths = {
  dashboard: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z',
  inbox: 'M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z',
  clients: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M15.5 3.1a3.5 3.5 0 0 1 0 6.8',
  site: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6',
  tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8M7.5 7.5h.01',
  invoice: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6M9 9h2',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  users: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M16.5 13.5h.01',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'M5 12.5 10 17l9-10',
  x: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  key: 'M14 10a4 4 0 1 0-4 4M12 12l9 9M17 16l2-2M15 18l1.5-1.5',
  power: 'M12 3v8M6.3 7a8 8 0 1 0 11.4 0',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6C3.7 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  mail: 'M3 5h18v14H3zM3 5l9 7 9-7',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 1 1 14 0c0 5.8-7 12-7 12M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  euro: 'M18 6.5A7 7 0 1 0 18 17.5M4 10h10M4 14h10',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  sheet: 'M4 4h16v16H4zM4 9h16M4 14h16M9 4v16',
  // Site vitrine : métiers de l'électricité
  shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6zM8.5 12l2.5 2.5 4.5-5',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5zM3 21l6-6',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3',
  plug: 'M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5',
  snow: 'M12 2v20M4.9 7l14.2 10M4.9 17 19.1 7M9 4l3 2 3-2M9 20l3-2 3 2',
  battery: 'M3 8h15v8H3zM21 11v2M7 11h4M9 9.5v3',
  home: 'M3 11 12 4l9 7M5 10v10h14V10M10 20v-5h4v5',
  building: 'M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3M3 21h18',
  chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
  gauge: 'M12 20a8 8 0 1 1 8-8M12 12l4-4M4 12h2M12 4v2M18 12h2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4',
  whatsapp: 'M3.5 20.5 4.9 16.4A8.5 8.5 0 1 1 8 19.3zM9.2 8.3c-.4 2.9 2.6 6.4 6 6.4l.9-1.5-2-1-.9.8a4.4 4.4 0 0 1-2.2-2.2l.8-.9-1-2z',
  team: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 14h1a4 4 0 0 1 4 4v2',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 18, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      <path d={paths[name]} />
    </svg>
  )
}
