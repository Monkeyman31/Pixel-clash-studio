export interface LospecPalette {
  id: string;
  name: string;
  author: string;
  colors: string[]; // array of lowercase #rrggbb
  description?: string;
  category?: 'fighting' | 'classic' | 'retro_console' | 'neon';
}

// Built-in curated library of the most popular Lospec palettes for fighting game sprite artists
export const CURATED_LOSPEC_PALETTES: LospecPalette[] = [
  {
    id: 'capcom_cps2',
    name: 'Capcom CPS2 Arcade',
    author: 'Capcom / Retro Fighting',
    category: 'fighting',
    description: 'La paleta de los juegos de pelea arcade de los 90 (Street Fighter Alpha, Vampire Savior, X-Men vs Street Fighter).',
    colors: [
      '#000000', '#ffffff', '#e02020', '#ff6040', '#ffa060', '#ffd080',
      '#2040b0', '#3080e0', '#60b0ff', '#b0e0ff', '#108030', '#30b050',
      '#80e070', '#e0c030', '#f0e060', '#fffa90', '#702080', '#b040c0',
      '#e070e0', '#603020', '#905030', '#c08050', '#e0b080', '#202030',
      '#404050', '#707080', '#a0a0b0', '#d0d0e0', '#004050', '#008080',
      '#20c0a0', '#80ffd0'
    ]
  },
  {
    id: 'neogeo_mvs',
    name: 'SNK Neo Geo MVS',
    author: 'SNK Playmore',
    category: 'fighting',
    description: 'Tonos saturados y sombras oscuras usados en The King of Fighters 98, Garou: Mark of the Wolves y Metal Slug.',
    colors: [
      '#080810', '#181820', '#383840', '#606068', '#909098', '#c8c8d0',
      '#f8f8f8', '#981818', '#d02020', '#f85040', '#f89838', '#f8d050',
      '#103890', '#2868d8', '#50a0f8', '#90d0f8', '#106830', '#28a048',
      '#68d058', '#b8f870', '#681860', '#a82888', '#e858b8', '#583018',
      '#885028', '#b87840', '#e8b068', '#f8e0a0', '#282858', '#406080',
      '#105868', '#38b8c8'
    ]
  },
  {
    id: 'edg32',
    name: 'EDG 32 (Endesga 32)',
    author: 'ENDESGA',
    category: 'classic',
    description: 'La paleta de 32 colores más famosa y equilibrada de Lospec para sprites de personajes y texturas retro.',
    colors: [
      '#be4a2f', '#d77643', '#ead4aa', '#e4a672', '#b86f50', '#733e39',
      '#3e2731', '#a22633', '#e43b44', '#f77622', '#feae34', '#fee761',
      '#63c74d', '#3e8948', '#265c42', '#193c3e', '#124e89', '#0099db',
      '#2ce8f5', '#ffffff', '#c0cbdc', '#8b9bb4', '#5a6988', '#3a4466',
      '#262b44', '#181425', '#ff0044', '#68386c', '#b55088', '#f6757a',
      '#e8b796', '#c28569'
    ]
  },
  {
    id: 'db32',
    name: 'DawnBringer 32 (DB32)',
    author: 'DawnBringer',
    category: 'classic',
    description: 'Paleta legendaria de 32 colores de iluminación armónica para pixel art de alta precisión.',
    colors: [
      '#000000', '#222034', '#45283c', '#663931', '#8f563b', '#df7126',
      '#d9a066', '#eec39a', '#fbf236', '#99e550', '#6abe30', '#37946e',
      '#4b692f', '#524b24', '#323c39', '#3f3f74', '#306082', '#5b6ee1',
      '#639bff', '#5fcde4', '#cbdbfc', '#ffffff', '#9badb7', '#847e87',
      '#696a6a', '#595652', '#76428a', '#ac3232', '#d95763', '#d77bba',
      '#8f974a', '#8a6f30'
    ]
  },
  {
    id: 'sweetie16',
    name: 'Sweetie 16',
    author: 'GrafxKid',
    category: 'classic',
    description: 'Paleta de 16 colores con gran contraste y tonos vibrantes, perfecta para personajes animados con claridad.',
    colors: [
      '#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070',
      '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7',
      '#f4f4f4', '#94b0c2', '#566c86', '#333c57'
    ]
  },
  {
    id: 'pico8',
    name: 'PICO-8 Official',
    author: 'Lexaloffle',
    category: 'retro_console',
    description: 'Los 16 colores fundamentales de la consola virtual Pico-8.',
    colors: [
      '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f',
      '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436',
      '#29adff', '#83769c', '#ff77a8', '#ffccaa'
    ]
  },
  {
    id: 'cyberpunk16',
    name: 'Cyberpunk Neon 16',
    author: 'Polyducks',
    category: 'neon',
    description: 'Colores eléctricos cian, magenta, violeta y verde ácido para VFX futuristas de combate.',
    colors: [
      '#050505', '#1a0c28', '#38164a', '#6a206b', '#b32b6e', '#f04f78',
      '#ff8989', '#ffe2a6', '#092336', '#094d5c', '#15837d', '#2ec486',
      '#88f28f', '#222859', '#3b5dc9', '#82b5f7'
    ]
  },
  {
    id: 'ki_vfx14',
    name: 'VFX Fire & Ki Aura 14',
    author: 'PixelClash Studio',
    category: 'fighting',
    description: 'Gradiente de fuego Hadoken, ondas vitales de energía y chispas de impacto.',
    colors: [
      '#0b040e', '#29061c', '#610a2b', '#a81630', '#e03a24', '#f77622',
      '#ffae34', '#fff566', '#ffffff', '#0a2342', '#125488', '#269cdb',
      '#62e0f5', '#d4faff'
    ]
  },
  {
    id: 'gameboy_dmg',
    name: 'GameBoy Original (DMG-01)',
    author: 'Nintendo',
    category: 'retro_console',
    description: 'Los 4 tonos de fósforo verde de la clásica Game Boy de 1989.',
    colors: [
      '#0f380f', '#306230', '#8bac0f', '#9bbc0f'
    ]
  }
];

// Helper to normalize hex code to #rrggbb
export function normalizeHex(colorStr: string): string | null {
  let hex = colorStr.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex.toLowerCase()}`;
  }
  return null;
}

// Parse raw Lospec .hex format (1 hex color per line)
export function parseLospecHex(content: string, filename: string = 'Paleta Lospec'): LospecPalette {
  const lines = content.split(/[\r\n]+/);
  const colors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const hex = normalizeHex(trimmed);
    if (hex && !colors.includes(hex)) {
      colors.push(hex);
    }
  }

  const name = filename.replace(/\.(hex|txt)$/i, '').replace(/[_-]/g, ' ');
  return {
    id: `lospec-${Date.now()}`,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    author: 'Importado (.hex)',
    colors: colors.length > 0 ? colors : ['#000000', '#ffffff'],
    description: `${colors.length} colores importados de archivo Lospec .hex`
  };
}

// Parse GIMP/Aseprite .gpl palette format
export function parseGplPalette(content: string, filename: string = 'Paleta GPL'): LospecPalette {
  const lines = content.split(/[\r\n]+/);
  const colors: string[] = [];
  let paletteName = filename.replace(/\.gpl$/i, '').replace(/[_-]/g, ' ');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.toLowerCase().startsWith('name:')) {
      paletteName = trimmed.substring(5).trim();
      continue;
    }
    if (trimmed.toLowerCase().startsWith('gimp palette') || trimmed.toLowerCase().startsWith('columns:')) {
      continue;
    }

    // Match RGB values: " 255   0 128   Black"
    const match = trimmed.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);
    if (match) {
      const r = Math.min(255, parseInt(match[1], 10));
      const g = Math.min(255, parseInt(match[2], 10));
      const b = Math.min(255, parseInt(match[3], 10));
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toLowerCase()}`;
      if (!colors.includes(hex)) {
        colors.push(hex);
      }
    }
  }

  return {
    id: `gpl-${Date.now()}`,
    name: paletteName,
    author: 'Importado (.gpl)',
    colors: colors.length > 0 ? colors : ['#000000', '#ffffff'],
    description: `${colors.length} colores importados de archivo GIMP/Aseprite .gpl`
  };
}

// Parse JASC-PAL (.pal)
export function parseJascPal(content: string, filename: string = 'Paleta JASC'): LospecPalette {
  const lines = content.split(/[\r\n]+/);
  const colors: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'JASC-PAL' || trimmed === '0100') continue;
    const match = trimmed.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/);
    if (match) {
      const r = Math.min(255, parseInt(match[1], 10));
      const g = Math.min(255, parseInt(match[2], 10));
      const b = Math.min(255, parseInt(match[3], 10));
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toLowerCase()}`;
      if (!colors.includes(hex)) {
        colors.push(hex);
      }
    }
  }

  return {
    id: `pal-${Date.now()}`,
    name: filename.replace(/\.pal$/i, ''),
    author: 'Importado (.pal)',
    colors: colors.length > 0 ? colors : ['#000000', '#ffffff'],
    description: `${colors.length} colores importados de archivo JASC .pal`
  };
}

// Universal parser for any file or pasted text
export function parseAnyLospecText(text: string, filename: string = 'Paleta Personalizada'): LospecPalette {
  if (text.includes('GIMP Palette')) {
    return parseGplPalette(text, filename);
  }
  if (text.includes('JASC-PAL')) {
    return parseJascPal(text, filename);
  }

  // Check if it's multiple hex codes in text (comma, space, or newline separated)
  const matches = text.match(/#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
  if (matches && matches.length >= 2) {
    const colors: string[] = [];
    matches.forEach(m => {
      const hex = normalizeHex(m);
      if (hex && !colors.includes(hex)) {
        colors.push(hex);
      }
    });
    return {
      id: `custom-${Date.now()}`,
      name: filename.replace(/\.[a-zA-Z0-9]+$/, ''),
      author: 'Texto / Lospec',
      colors,
      description: `${colors.length} colores detectados en el texto`
    };
  }

  return parseLospecHex(text, filename);
}
