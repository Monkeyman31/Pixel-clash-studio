import React, { useState, useRef } from 'react';
import { 
  X, 
  Palette, 
  Upload, 
  Download, 
  Check, 
  Search, 
  Flame, 
  Gamepad2, 
  Sparkles, 
  Copy, 
  FileText 
} from 'lucide-react';
import { 
  CURATED_LOSPEC_PALETTES, 
  LospecPalette, 
  parseAnyLospecText 
} from '../utils/lospecImporter';

interface LospecPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPalette: (colors: string[], name: string) => void;
  currentColor: string;
}

export const LospecPaletteModal: React.FC<LospecPaletteModalProps> = ({
  isOpen,
  onClose,
  onApplyPalette,
  currentColor,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'upload' | 'paste'>('browse');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'fighting' | 'classic' | 'retro_console' | 'neon'>('all');
  const [selectedPalette, setSelectedPalette] = useState<LospecPalette>(CURATED_LOSPEC_PALETTES[0]);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [pasteText, setPasteText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredPalettes = CURATED_LOSPEC_PALETTES.filter((p) => {
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleApply = (palette: LospecPalette) => {
    onApplyPalette(palette.colors, palette.name);
    setStatusMessage(`¡Paleta "${palette.name}" (${palette.colors.length} colores) aplicada con éxito!`);
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1200);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseAnyLospecText(text, file.name);
      setSelectedPalette(parsed);
      setCustomColors(parsed.colors);
      setStatusMessage(`¡Paleta "${parsed.name}" importada (${parsed.colors.length} colores)!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Error al leer archivo: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleParsePastedText = () => {
    if (!pasteText.trim()) return;
    const parsed = parseAnyLospecText(pasteText, 'Paleta Pegada');
    if (parsed.colors.length > 0) {
      setSelectedPalette(parsed);
      setCustomColors(parsed.colors);
      setStatusMessage(`¡Detectados ${parsed.colors.length} colores!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage('No se encontraron códigos hexadecimales válidos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141724] border border-[#2b334a] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#252c3f] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Importador de Paletas Lospec</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                  .hex / .gpl / .pal
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Carga paletas de la comunidad Lospec o importa tus archivos de color
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-[#22283a] bg-[#11131c] px-5 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'browse'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Biblioteca Lospec Retro</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Archivo Lospec</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Pegar Códigos HEX</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className="px-5 py-2 bg-amber-950/40 border-b border-amber-900/50 text-xs text-amber-300 font-mono flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* TAB 1: BROWSE CURATED LOSPEC PALETTES */}
          {activeTab === 'browse' && (
            <div className="flex flex-col gap-3.5">
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar paleta (ej. Capcom, NeoGeo, EDG, DB32)..."
                    className="w-full bg-[#10121a] border border-[#262e42] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono shrink-0 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: 'Todas' },
                    { id: 'fighting', label: 'Fighting' },
                    { id: 'classic', label: 'Pixel Clásico' },
                    { id: 'retro_console', label: 'Consolas' },
                    { id: 'neon', label: 'Neón' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategoryFilter(c.id as any)}
                      className={`px-2.5 py-1 rounded-lg border transition-colors ${
                        categoryFilter === c.id
                          ? 'bg-[#222a3d] border-amber-400 text-amber-300 font-bold'
                          : 'bg-[#12141c] border-[#22293b] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Palette Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredPalettes.map((p) => {
                  const isSelected = selectedPalette.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPalette(p)}
                      className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#1c2233] border-amber-400/90 shadow-md ring-1 ring-amber-400/30'
                          : 'bg-[#161a26] border-[#242c3f] hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                            {p.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.author} · {p.colors.length} tonos
                          </span>
                        </div>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold text-[10px]">
                            Seleccionada
                          </span>
                        )}
                      </div>

                      {/* Swatch Ribbon */}
                      <div className="flex h-5 rounded-md overflow-hidden border border-[#2b354d]">
                        {p.colors.map((c, i) => (
                          <div
                            key={i}
                            className="flex-1 h-full"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>

                      {p.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                          {p.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD FILE (.hex, .gpl, .pal, .txt) */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".hex,.gpl,.pal,.txt"
                onChange={handleFileUpload}
                className="sr-only"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#2f3952] hover:border-amber-400/80 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-[#12141c] hover:bg-[#151926] transition-all text-center"
              >
                <div className="p-3 rounded-full bg-amber-400/10 text-amber-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-200">
                    Haz clic o arrastra un archivo de paleta Lospec
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Soporta formatos oficiales de Lospec: <span className="font-mono text-amber-300">.HEX</span>, <span className="font-mono text-amber-300">.GPL</span> (Aseprite / GIMP) y <span className="font-mono text-amber-300">.PAL</span>
                  </span>
                </div>
              </div>

              {customColors.length > 0 && (
                <div className="bg-[#161a26] p-3 rounded-xl border border-[#252c3f] flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200">{selectedPalette.name}</span>
                    <span className="text-amber-400 font-mono text-[11px]">{selectedPalette.colors.length} colores</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPalette.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded border border-black/40"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE RAW HEX CODES */}
          {activeTab === 'paste' && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-slate-400">
                Pega directamente la lista de colores en código hexadecimal (separados por renglones, comas o espacios) copiados de la página de Lospec.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={5}
                placeholder={`#000000\n#ffffff\n#e02020\n#2040b0\n#30b050`}
                className="w-full bg-[#10121a] border border-[#293246] rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleParsePastedText}
                className="py-2 rounded-lg bg-[#222a3d] hover:bg-[#2e3954] text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Analizar y Cargar Colores</span>
              </button>
            </div>
          )}
        </div>

        {/* Selected Palette Preview Bar & Actions */}
        <div className="p-4 border-t border-[#252c3f] bg-[#10121a] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex -space-x-1 overflow-hidden shrink-0">
              {selectedPalette.colors.slice(0, 8).map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border border-[#141724]"
                  style={{ backgroundColor: c }}
                />
              ))}
              {selectedPalette.colors.length > 8 && (
                <div className="w-6 h-6 rounded-full bg-[#20273a] text-slate-400 text-[10px] flex items-center justify-center border border-[#141724] font-mono">
                  +{selectedPalette.colors.length - 8}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 line-clamp-1">{selectedPalette.name}</span>
              <span className="text-[10px] text-amber-400 font-mono">{selectedPalette.colors.length} tonos Lospec</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleApply(selectedPalette)}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Paleta al Proyecto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
