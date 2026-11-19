import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Compass,
  HelpCircle,
  Keyboard,
  MapPin,
  PlayCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  HELP_CATALOG_ITEMS,
  HELP_TUTORIALS,
  HelpCatalogItem,
  HelpCategory,
  HelpDemoType,
} from '../utils/helpCatalog';

interface ToolGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFocusHelpId?: string | null;
  focusSearchNonce?: number;
  onLocateEntry?: (item: HelpCatalogItem) => void;
  onActivateWhatIsThis?: () => void;
}

const CATEGORIES: ('Todas' | HelpCategory)[] = [
  'Todas',
  'Herramientas',
  'Dibujo y Simetría',
  'Capas y Transformación',
  'Animación y Combate',
  'Referencias e IA',
  'Interfaz y Proyecto',
];

const HelpVisualDiagram: React.FC<{ demoType: HelpDemoType }> = ({ demoType }) => {
  switch (demoType) {
    case 'symmetry':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <defs>
            <pattern id="symGrid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="180" height="86" fill="url(#symGrid)" />
          <line x1="90" y1="6" x2="90" y2="80" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />
          <line x1="18" y1="43" x2="162" y2="43" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
          <rect x="44" y="20" width="10" height="10" fill="#fbbf24" rx="1" />
          <rect x="54" y="30" width="10" height="10" fill="#fbbf24" rx="1" />
          <rect x="126" y="20" width="10" height="10" fill="#38bdf8" opacity="0.85" rx="1" />
          <rect x="116" y="30" width="10" height="10" fill="#38bdf8" opacity="0.85" rx="1" />
          <circle cx="49" cy="25" r="9" fill="none" stroke="#fbbf24" strokeDasharray="2 2" />
          <circle cx="131" cy="25" r="9" fill="none" stroke="#38bdf8" strokeDasharray="2 2" />
          <text x="10" y="78" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            Eje + Réplica en vivo
          </text>
        </svg>
      );
    case 'transform_rotate':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <g transform="translate(90 44) rotate(-18)">
            <rect x="-26" y="-18" width="52" height="36" fill="rgba(56,189,248,0.14)" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="-29" y="-21" width="6" height="6" fill="#fff" stroke="#0284c7" />
            <rect x="23" y="-21" width="6" height="6" fill="#fff" stroke="#0284c7" />
            <rect x="-29" y="15" width="6" height="6" fill="#fff" stroke="#0284c7" />
            <rect x="23" y="15" width="6" height="6" fill="#fff" stroke="#0284c7" />
            <circle cx="0" cy="0" r="4" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#fbbf24" strokeWidth="1" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#fbbf24" strokeWidth="1" />
          </g>
          <path d="M 122 14 A 18 18 0 0 1 136 28" fill="none" stroke="#fbbf24" strokeWidth="1.8" />
          <polygon points="136,30 132,24 139,24" fill="#fbbf24" />
          <text x="10" y="78" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            Fuera de esquina = Rotar ↻ (Shift 15°)
          </text>
        </svg>
      );
    case 'references_board':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <rect x="14" y="12" width="38" height="28" rx="3" fill="#1e293b" stroke="#64748b" />
          <rect x="64" y="20" width="44" height="32" rx="3" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
          <rect x="122" y="10" width="32" height="24" rx="3" fill="#1e293b" stroke="#38bdf8" />
          <rect x="124" y="48" width="48" height="30" rx="2" fill="#090d16" stroke="#475569" />
          <rect x="136" y="54" width="18" height="12" fill="none" stroke="#fbbf24" strokeWidth="1" />
          <text x="127" y="75" fill="#94a3b8" fontSize="7" fontFamily="monospace">
            Minimapa
          </text>
          <text x="10" y="78" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            Mesa Infinita (Pan + Zoom)
          </text>
        </svg>
      );
    case 'layers_blend':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <rect x="24" y="14" width="132" height="16" rx="3" fill="#1e293b" stroke="#334155" />
          <rect x="30" y="18" width="8" height="8" rx="1" fill="#fbbf24" />
          <rect x="44" y="20" width="54" height="4" rx="2" fill="#e2e8f0" />
          <rect x="24" y="34" width="132" height="16" rx="3" fill="#172033" stroke="#38bdf8" />
          <rect x="30" y="38" width="8" height="8" rx="1" fill="#38bdf8" />
          <rect x="44" y="40" width="72" height="4" rx="2" fill="#bae6fd" />
          <rect x="24" y="54" width="132" height="16" rx="3" fill="#111726" stroke="#334155" />
          <rect x="30" y="58" width="8" height="8" rx="1" fill="#a855f7" />
          <rect x="44" y="60" width="46" height="4" rx="2" fill="#94a3b8" />
        </svg>
      );
    case 'hitbox_combat':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <rect x="42" y="18" width="34" height="52" fill="rgba(34,197,94,0.22)" stroke="#22c55e" strokeWidth="1.5" />
          <rect x="66" y="26" width="52" height="18" fill="rgba(239,68,68,0.28)" stroke="#ef4444" strokeWidth="1.5" />
          <rect x="114" y="20" width="32" height="48" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeDasharray="3 2" />
          <text x="12" y="14" fill="#86efac" fontSize="8" fontFamily="monospace">
            Hurtbox
          </text>
          <text x="72" y="21" fill="#fca5a5" fontSize="8" fontFamily="monospace">
            Hitbox
          </text>
        </svg>
      );
    case 'timeline_anim':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <rect x="12" y="14" width="54" height="12" rx="2" fill="#0ea5e9" opacity="0.3" stroke="#38bdf8" />
          <text x="18" y="23" fill="#bae6fd" fontSize="8" fontFamily="monospace">
            Grupo: Idle
          </text>
          <rect x="12" y="32" width="32" height="36" rx="3" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
          <rect x="48" y="32" width="32" height="36" rx="3" fill="#1e293b" stroke="#475569" />
          <rect x="84" y="32" width="32" height="36" rx="3" fill="#1e293b" stroke="#475569" />
          <rect x="120" y="32" width="32" height="36" rx="3" fill="#1e293b" stroke="#475569" />
          <text x="17" y="64" fill="#fbbf24" fontSize="7" fontFamily="monospace">
            0.1s
          </text>
          <text x="53" y="64" fill="#94a3b8" fontSize="7" fontFamily="monospace">
            0.05s
          </text>
        </svg>
      );
    case 'eyedropper_loupe':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <circle cx="62" cy="43" r="24" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
          <rect x="56" y="37" width="12" height="12" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
          <rect x="102" y="22" width="60" height="14" rx="2" fill="#f43f5e" />
          <rect x="102" y="42" width="28" height="12" rx="2" fill="#fb7185" />
          <rect x="134" y="42" width="28" height="12" rx="2" fill="#9f1239" />
          <text x="102" y="68" fill="#cbd5e1" fontSize="8" fontFamily="monospace">
            #F43F5E · Sombras
          </text>
        </svg>
      );
    case 'vector_curve':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <path d="M 24 62 C 52 16, 122 72, 156 22" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="24" y1="62" x2="52" y2="16" stroke="#94a3b8" strokeDasharray="2 2" />
          <line x1="156" y1="22" x2="122" y2="72" stroke="#94a3b8" strokeDasharray="2 2" />
          <circle cx="24" cy="62" r="4" fill="#fbbf24" />
          <circle cx="156" cy="22" r="4" fill="#fbbf24" />
          <circle cx="52" cy="16" r="3" fill="#fff" />
          <circle cx="122" cy="72" r="3" fill="#fff" />
        </svg>
      );
    case 'dummie_pose':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <circle cx="90" cy="18" r="7" fill="none" stroke="#fbbf24" strokeWidth="1.6" />
          <line x1="90" y1="25" x2="90" y2="48" stroke="#38bdf8" strokeWidth="2" />
          <line x1="90" y1="30" x2="66" y2="42" stroke="#38bdf8" strokeWidth="2" />
          <line x1="90" y1="30" x2="118" y2="26" stroke="#38bdf8" strokeWidth="2" />
          <line x1="90" y1="48" x2="72" y2="74" stroke="#38bdf8" strokeWidth="2" />
          <line x1="90" y1="48" x2="114" y2="70" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="90" cy="30" r="2.5" fill="#fbbf24" />
          <circle cx="90" cy="48" r="2.5" fill="#fbbf24" />
        </svg>
      );
    case 'ai_gen':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <rect x="20" y="20" width="44" height="44" rx="4" fill="#1e293b" stroke="#475569" />
          <path d="M 74 42 L 102 42" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="104,42 97,38 97,46" fill="#fbbf24" />
          <rect x="114" y="20" width="44" height="44" rx="4" fill="#1e293b" stroke="#a855f7" strokeWidth="1.6" />
          <rect x="126" y="32" width="20" height="20" fill="#fbbf24" opacity="0.85" />
          <text x="20" y="76" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            Paleta + Contexto ➔ Nueva Capa
          </text>
        </svg>
      );
    case 'workspace_ui':
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <rect x="10" y="10" width="24" height="66" rx="2" fill="#1e293b" stroke="#fbbf24" />
          <rect x="38" y="10" width="96" height="44" rx="2" fill="#0b101b" stroke="#334155" />
          <rect x="138" y="10" width="32" height="66" rx="2" fill="#1e293b" stroke="#38bdf8" />
          <rect x="38" y="58" width="96" height="18" rx="2" fill="#172033" stroke="#475569" />
          <text x="64" y="35" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            UI Modular
          </text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 180 86" className="w-full h-24 rounded-lg bg-[#0d101b] border border-slate-700/70">
          <defs>
            <pattern id="pixGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="180" height="86" fill="url(#pixGrid)" />
          <rect x="50" y="30" width="10" height="10" fill="#fbbf24" />
          <rect x="60" y="40" width="10" height="10" fill="#fbbf24" />
          <rect x="70" y="40" width="10" height="10" fill="#fbbf24" />
          <rect x="80" y="30" width="10" height="10" fill="#fbbf24" />
          <rect x="90" y="20" width="10" height="10" fill="#38bdf8" />
          <text x="12" y="76" fill="#94a3b8" fontSize="8" fontFamily="monospace">
            Pixel-Perfect · Cuadrícula 1:1
          </text>
        </svg>
      );
  }
};

export const ToolGuideModal: React.FC<ToolGuideModalProps> = ({
  isOpen,
  onClose,
  initialFocusHelpId,
  focusSearchNonce,
  onLocateEntry,
  onActivateWhatIsThis,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'tutorials'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | HelpCategory>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>(HELP_CATALOG_ITEMS[0]?.id || 'tool.pencil');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && initialFocusHelpId) {
      const exact = HELP_CATALOG_ITEMS.find((i) => i.id === initialFocusHelpId);
      if (exact) {
        setActiveTab('catalog');
        setSelectedCategory('Todas');
        setSearchQuery('');
        setSelectedId(exact.id);
      }
    }
  }, [isOpen, initialFocusHelpId]);

  useEffect(() => {
    if (isOpen && focusSearchNonce) {
      setActiveTab('catalog');
      setSelectedCategory('Todas');
      window.setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [isOpen, focusSearchNonce]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return HELP_CATALOG_ITEMS.filter((item) => {
      const matchesCat = selectedCategory === 'Todas' || item.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.searchKeywords && item.searchKeywords.toLowerCase().includes(q)) ||
        (item.locationHierarchy && item.locationHierarchy.some((seg) => seg.toLowerCase().includes(q))) ||
        (item.panelLocation && item.panelLocation.toLowerCase().includes(q)) ||
        (item.menuLocation && item.menuLocation.toLowerCase().includes(q)) ||
        (item.controlsLocation && item.controlsLocation.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q) ||
        item.hotkey.toLowerCase().includes(q) ||
        item.useCases.some((u) => u.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  const selectedItem =
    filteredItems.find((i) => i.id === selectedId) ||
    filteredItems[0] ||
    HELP_CATALOG_ITEMS.find((i) => i.id === selectedId) ||
    HELP_CATALOG_ITEMS[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121521] border border-[#2a324a] rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#242b40] bg-[#0f121d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Manual Interactivo &amp; Buscador de Herramientas
              </h3>
              <p className="text-[11px] text-slate-400">
                Descubre dónde está cada función, qué hace, ejemplos visuales y acceso directo al espacio de trabajo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onActivateWhatIsThis && (
              <button
                onClick={() => {
                  onClose();
                  onActivateWhatIsThis();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-xs font-semibold cursor-pointer"
                title="Pasa el cursor sobre cualquier parte del programa para identificarla (F1)"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Modo &quot;¿Dónde está?&quot; (F1)
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Cerrar manual"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Bar: Tabs + Search */}
        <div className="px-5 py-3 border-b border-[#21273b] bg-[#10131e] flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-[#0b0e17] p-1 rounded-lg border border-[#242b40]">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'catalog'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Buscar Herramienta ({HELP_CATALOG_ITEMS.length})
              </button>
              <button
                onClick={() => setActiveTab('tutorials')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'tutorials'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Tutoriales Rápidos ({HELP_TUTORIALS.length})
              </button>
            </div>

            {activeTab === 'catalog' && (
              <div className="relative flex-1 min-w-[230px] max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="¿Dónde está...? Ej. Cámara, Temblor, Keyframes, Simetría, Ctrl+T..."
                  className="w-full bg-[#161a28] border border-[#2a334d] rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {activeTab === 'catalog' && (
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-semibold'
                      : 'bg-[#151926] border-[#252c40] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        {activeTab === 'catalog' ? (
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[310px_1fr] overflow-hidden">
            {/* Left Results List */}
            <div className="border-r border-[#21273b] bg-[#0e111a] overflow-y-auto p-2.5 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No se encontraron herramientas para &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSel = selectedItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-amber-400/15 border-amber-400/70 text-white'
                          : 'bg-transparent border-transparent hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{item.name}</span>
                        {item.hotkey && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 shrink-0">
                            {item.hotkey}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.location}</div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Detail Inspector */}
            {selectedItem && (
              <div className="overflow-y-auto p-5 space-y-4 bg-[#121521]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {selectedItem.category}
                    </div>
                    <h4 className="text-base font-bold text-white mt-0.5">{selectedItem.name}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedItem.hotkey && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d101b] border border-slate-700 text-amber-300 font-mono text-xs font-bold">
                        <Keyboard className="w-3.5 h-3.5" />
                        {selectedItem.hotkey}
                      </div>
                    )}
                    {onLocateEntry && (
                      <button
                        onClick={() => {
                          onLocateEntry(selectedItem);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shadow-lg"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        Mostrar ubicación
                      </button>
                    )}
                  </div>
                </div>

                {/* Hierarchical Breadcrumb Path */}
                {selectedItem.locationHierarchy && selectedItem.locationHierarchy.length > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-[#0d101b] border border-[#26304b] flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-400 mr-1">Ruta exacta:</span>
                    {selectedItem.locationHierarchy.map((step, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-slate-500">→</span>}
                        <span className={i === selectedItem.locationHierarchy!.length - 1 ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                          {step}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* Visual Diagram */}
                <HelpVisualDiagram demoType={selectedItem.demoType} />

                {/* Description */}
                <div className="p-3 rounded-lg bg-[#161a28] border border-[#242c42] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ¿Qué hace?
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{selectedItem.description}</p>
                </div>

                {/* Location & How to Access */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[#161a28] border border-[#242c42] space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Dónde se encuentra
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{selectedItem.location}</p>
                    {(selectedItem.panelLocation || selectedItem.menuLocation || selectedItem.controlsLocation) && (
                      <div className="pt-1.5 border-t border-[#242c42] space-y-1 text-[11px] text-slate-300">
                        {selectedItem.panelLocation && (
                          <div><span className="text-slate-400 font-semibold">Panel:</span> {selectedItem.panelLocation}</div>
                        )}
                        {selectedItem.menuLocation && (
                          <div><span className="text-slate-400 font-semibold">Menú:</span> {selectedItem.menuLocation}</div>
                        )}
                        {selectedItem.controlsLocation && (
                          <div><span className="text-slate-400 font-semibold">Controles:</span> {selectedItem.controlsLocation}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-[#161a28] border border-[#242c42] space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Cómo acceder
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{selectedItem.howToAccess}</p>
                  </div>
                </div>

                {/* Use Cases */}
                <div className="p-3 rounded-lg bg-[#161a28] border border-[#242c42] space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Ejemplos prácticos de uso
                  </div>
                  <ul className="space-y-1.5">
                    {selectedItem.useCases.map((u, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Quick Tutorials Tab */
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#121521]">
            {HELP_TUTORIALS.map((tut) => (
              <div
                key={tut.id}
                className="rounded-xl border border-[#273049] bg-[#161a28] p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                    {tut.level}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{tut.duration}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{tut.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tut.summary}</p>
                </div>

                <div className="space-y-2.5 flex-1">
                  {tut.steps.map((step, i) => {
                    const targetItem = step.targetHelpId
                      ? HELP_CATALOG_ITEMS.find((h) => h.id === step.targetHelpId)
                      : undefined;
                    return (
                      <div key={i} className="p-2.5 rounded-lg bg-[#10131e] border border-[#22283d] space-y-1">
                        <div className="text-[11px] font-bold text-slate-100">{step.title}</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{step.detail}</p>
                        {targetItem && onLocateEntry && (
                          <button
                            onClick={() => {
                              onLocateEntry(targetItem);
                              onClose();
                            }}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                          >
                            <Compass className="w-3 h-3" />
                            Mostrar ubicación ({targetItem.name})
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#242b40] bg-[#0f121d] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">
            Consejo: Pulsa <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold">F1</kbd> en cualquier momento para inspeccionar botones al pasar el cursor.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Cerrar Manual
          </button>
        </div>
      </div>
    </div>
  );
};
