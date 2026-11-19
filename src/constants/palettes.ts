import { PalettePreset } from '../types';

export const FIGHTING_GAME_PALETTES: PalettePreset[] = [
  {
    id: 'capcom-cps2',
    name: 'Capcom CPS-2 Arcade',
    description: 'Iconic Street Fighter Alpha & Darkstalkers high-contrast vibrant ramp',
    colors: [
      '#10121a', '#1e202e', '#36394f', '#565c7a', '#858ea6', '#c4cbe0', '#ffffff',
      '#7a1824', '#b32b35', '#eb4f46', '#ff8459', '#ffb875',
      '#8f532b', '#c77e38', '#f2ae4b', '#ffde6a', '#fff6aa',
      '#214a34', '#337a4c', '#54b069', '#85e086', '#c6ffb8',
      '#1b3252', '#285185', '#3d7cbd', '#69b0f0', '#b0dcff',
      '#471f54', '#752f87', '#aa47bd', '#dd70eb', '#f7b5ff',
      '#ffe0cc', '#e6a885', '#b36d52', '#7a3e30'
    ]
  },
  {
    id: 'snk-neogeo',
    name: 'SNK Neo-Geo 90s',
    description: 'Punchy King of Fighters & Samurai Shodown classic tones',
    colors: [
      '#08080c', '#181820', '#303038', '#505058', '#888890', '#c8c8d0', '#f8f8ff',
      '#581018', '#881820', '#c82830', '#f84840', '#f88860',
      '#684018', '#986020', '#d89030', '#f8c850', '#f8f090',
      '#184028', '#206838', '#389848', '#68d068', '#a8f898',
      '#102848', '#184878', '#2870b0', '#50a0f0', '#90d0f8',
      '#401838', '#682058', '#983080', '#d050b0', '#f890e0'
    ]
  },
  {
    id: 'guilty-gear',
    name: 'ArcSys Anime Clash',
    description: 'High-octane metallic shadows, electric sparks, and dramatic anime contrast',
    colors: [
      '#0e0f17', '#1b1d28', '#2e3144', '#494e6b', '#7c84a8', '#c0c8e6', '#ffffff',
      '#991b1b', '#dc2626', '#ef4444', '#f87171', '#fca5a5',
      '#d97706', '#f59e0b', '#fbbf24', '#fde68a', '#fef3c7',
      '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0',
      '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd',
      '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe',
      '#db2777', '#ec4899', '#f472b6', '#fbcfe8'
    ]
  },
  {
    id: 'vfx-energy',
    name: 'Ki & Fireball VFX',
    description: 'Dedicated spectrum for Hadoken, energy auras, explosions, and hit sparks',
    colors: [
      '#050814', '#0d1d36', '#123e6b', '#1868a8', '#2399eb', '#5ed2ff', '#c2f2ff', '#ffffff',
      '#260408', '#540913', '#8f1521', '#cf2725', '#f06429', '#fca338', '#ffdf54', '#ffffc2',
      '#1c0429', '#460d66', '#761aa3', '#b130e6', '#d668ff', '#f1a8ff', '#fbe0ff'
    ]
  },
  {
    id: 'gameboy-dmg',
    name: 'Pocket Fighter 4-Tone',
    description: 'Classic monochrome handheld fighting games',
    colors: [
      '#0f380f', '#306230', '#8bac0f', '#9bbc0f'
    ]
  },
  {
    id: 'darkstalkers-gothic',
    name: 'Darkstalkers Nocturno',
    description: 'Tonos vampíricos, púrpuras intensos, neón lunar y acentos escarlata',
    colors: [
      '#0b0814', '#1a112b', '#2f1f4a', '#53387d', '#8764b8', '#c8aee8', '#f6edff',
      '#610b24', '#9e1538', '#db274b', '#ff596f', '#ffb0b8',
      '#0b3b3c', '#13635c', '#209e89', '#4fe3bd', '#b5fff0',
      '#3a2a12', '#6b4e22', '#b08238', '#edc153', '#fff0a6'
    ]
  },
  {
    id: 'sf3-third-strike',
    name: 'CPS-3 3rd Strike Urbano',
    description: 'Sombreado realista cálido/frío con pieles ricas y contraste urbano',
    colors: [
      '#120f12', '#261e21', '#423537', '#695555', '#96817c', '#cab8ad', '#faf3eb',
      '#4f2318', '#85402b', '#ba6343', '#e08d63', '#f7b992', '#ffe0c4',
      '#1b2a47', '#2b4775', '#426ea8', '#68a2db', '#a8d7ff',
      '#283d19', '#456b26', '#6fa33b', '#a8db5c', '#dbff9e'
    ]
  },
  {
    id: 'cyber-neon-clash',
    name: 'Cyberpunk Neon Arena',
    description: 'Alto contraste neón cian/magenta sobre sombras abisales para escenarios y VFX',
    colors: [
      '#05050d', '#111024', '#231f42', '#3f396e', '#7470a8', '#b8b8e6', '#ffffff',
      '#59063c', '#9e0b62', '#e01686', '#ff47ab', '#ffa8d8',
      '#06384d', '#0b6885', '#13a8c7', '#3de8ff', '#b5f9ff',
      '#4d3204', '#996809', '#e6a817', '#ffe247', '#ffffb8'
    ]
  },
  {
    id: 'pico-arcade-16',
    name: 'Arcade Punchy 16',
    description: 'Paleta compacta saturada de 16 colores de alto contraste para sprites nítidos',
    colors: [
      '#000000', '#1d2b53', '#7e2553', '#008751',
      '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
      '#ff004d', '#ffa300', '#ffec27', '#00e436',
      '#29adff', '#83769c', '#ff77a8', '#ffccaa'
    ]
  }
];

export const CANVAS_SIZE_PRESETS = [
  { label: '32 × 32', width: 32, height: 32, description: 'Retro Mini / Pocket' },
  { label: '48 × 48', width: 48, height: 48, description: '16-bit Standard Fighter' },
  { label: '64 × 64', width: 64, height: 64, description: 'Capcom CPS2 Standard' },
  { label: '80 × 80', width: 80, height: 80, description: 'High-Impact Striker' },
  { label: '96 × 96', width: 96, height: 96, description: 'SNK Neo-Geo Boss' }
];
