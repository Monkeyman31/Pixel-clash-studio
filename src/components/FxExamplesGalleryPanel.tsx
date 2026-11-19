import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Copy,
  Flame,
  GraduationCap,
  Layers,
  Search,
  Sparkles,
  Swords,
  Wrench,
} from 'lucide-react';
import { EditableFxRecipe, FxExampleCategory, FxExampleEntry } from '../types';
import {
  FX_EXAMPLES_GALLERY,
  FX_QUICK_TUTORIALS,
  renderRecipePreviewFrames,
} from '../utils/fxWorkshopEngine';

interface FxExamplesGalleryPanelProps {
  learningMode: boolean;
  onToggleLearningMode: () => void;
  onOpenExample: (example: FxExampleEntry, duplicateMode: boolean) => void;
  onSelectPreviewExample?: (recipe: EditableFxRecipe) => void;
}

const ExampleMiniCanvas: React.FC<{ recipe: EditableFxRecipe }> = ({ recipe }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useMemo(() => renderRecipePreviewFrames(recipe, 36, 36, 6), [recipe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let idx = 0;
    const draw = () => {
      const grid = frames[idx % frames.length];
      const h = grid.length;
      const w = grid[0]?.length || 36;
      const scale = 2;
      canvas.width = w * scale;
      canvas.height = h * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < h; y++) {
        const row = grid[y];
        if (!row) continue;
        for (let x = 0; x < w; x++) {
          const c = row[x];
          if (c) {
            ctx.fillStyle = c;
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }
      idx = (idx + 1) % frames.length;
    };

    draw();
    if (frames.length <= 1) return;
    const timer = window.setInterval(draw, 145);
    return () => window.clearInterval(timer);
  }, [frames]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[72px] h-[72px] rounded-lg border border-[#2a3450] bg-[#090d16] shrink-0"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export const FxExamplesGalleryPanel: React.FC<FxExamplesGalleryPanelProps> = ({
  learningMode,
  onToggleLearningMode,
  onOpenExample,
  onSelectPreviewExample,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | FxExampleCategory>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(FX_EXAMPLES_GALLERY[0].id);
  const [showTutorials, setShowTutorials] = useState<boolean>(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FX_EXAMPLES_GALLERY.filter((ex) => {
      if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.shortDesc.toLowerCase().includes(q) ||
        ex.componentsUsed.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [categoryFilter, search]);

  const selectedExample = useMemo(
    () => FX_EXAMPLES_GALLERY.find((e) => e.id === selectedId) || filtered[0] || FX_EXAMPLES_GALLERY[0],
    [selectedId, filtered]
  );

  const countByCat = useMemo(
    () => ({
      auras: FX_EXAMPLES_GALLERY.filter((e) => e.category === 'auras').length,
      attacks: FX_EXAMPLES_GALLERY.filter((e) => e.category === 'attacks').length,
      fighting: FX_EXAMPLES_GALLERY.filter((e) => e.category === 'fighting').length,
    }),
    []
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Top Hero Guide & Quick Tutorials ("¿Qué puedo crear?") */}
      <div className="p-3 rounded-xl border border-cyan-500/35 bg-gradient-to-r from-[#131a2e] to-[#171c2e] flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-slate-100">
                ¿Qué puedo crear en FX Lab? · Galería Interactiva y Fighting Game FX
              </h3>
              <p className="text-[10px] text-slate-400">
                25 ejemplos reales construidos con el taller modular, editor de auras, púas de roca y deformadores. Abre, estudia, duplica y modifica cualquiera.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleLearningMode}
              className={`px-2.5 py-1 rounded-md border text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                learningMode
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                  : 'bg-[#171d2f] border-[#2c3650] text-slate-300 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Modo Aprendizaje: {learningMode ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTutorials((v) => !v)}
              className="px-2.5 py-1 rounded-md border border-[#2c3650] bg-[#171d2f] hover:bg-[#1f2740] text-[10px] font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-300" />
              <span>{showTutorials ? 'Ocultar Tutoriales' : 'Ver Tutoriales Rápidos'}</span>
            </button>
          </div>
        </div>

        {showTutorials && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 pt-1">
            {FX_QUICK_TUTORIALS.map((tut) => {
              const targetEx = FX_EXAMPLES_GALLERY.find((e) => e.id === tut.recommendedExampleId);
              return (
                <div
                  key={tut.id}
                  className="p-2.5 rounded-lg border border-[#28324c] bg-[#0e1320] flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="text-[11px] font-bold text-cyan-200 leading-tight">{tut.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{tut.goal}</div>
                    <ol className="list-decimal list-inside mt-1.5 space-y-0.5 text-[10px] text-slate-300 leading-snug">
                      {tut.steps.map((st, idx) => (
                        <li key={idx}>{st}</li>
                      ))}
                    </ol>
                  </div>
                  {targetEx && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(targetEx.id);
                        onOpenExample(targetEx, false);
                      }}
                      className="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-200 text-[10px] font-semibold cursor-pointer text-center"
                    >
                      Probar ejemplo: {targetEx.name}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Filter + Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['all', `Todos (${FX_EXAMPLES_GALLERY.length})`, <Layers key="a" className="w-3 h-3" />],
              ['auras', `Auras (${countByCat.auras})`, <Sparkles key="b" className="w-3 h-3 text-amber-300" />],
              ['attacks', `Tipos de Ataques (${countByCat.attacks})`, <Flame key="c" className="w-3 h-3 text-orange-400" />],
              ['fighting', `Fighting Game FX (${countByCat.fighting})`, <Swords key="d" className="w-3 h-3 text-rose-400" />],
            ] as ['all' | FxExampleCategory, string, React.ReactNode][]
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategoryFilter(id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                categoryFilter === id
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                  : 'bg-[#151a2a] border-[#263049] text-slate-400 hover:text-slate-100'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[190px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aura, roca, hit spark..."
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-[#28324c] bg-[#0f1320] text-[11px] text-slate-100 outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Main Split: Cards Grid + Modo Aprendizaje Breakdown Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Examples Grid */}
        <div className={`${learningMode ? 'xl:col-span-7' : 'xl:col-span-12'} grid grid-cols-1 sm:grid-cols-2 gap-2.5`}>
          {filtered.map((ex) => {
            const isSelected = selectedExample?.id === ex.id;
            return (
              <div
                key={ex.id}
                onClick={() => {
                  setSelectedId(ex.id);
                  onSelectPreviewExample?.(ex.recipe);
                }}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'border-cyan-400 bg-[#172036]'
                    : 'border-[#242e47] bg-[#121725] hover:border-[#364469]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <ExampleMiniCanvas recipe={ex.recipe} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-slate-100 truncate">{ex.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0c101b] border border-[#28324c] text-slate-300 shrink-0 uppercase">
                        {ex.category === 'auras' ? 'Aura' : ex.category === 'attacks' ? 'Ataque' : 'Fighting'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                      {ex.shortDesc}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ex.componentsUsed.slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-[#1b2338] text-cyan-200 border border-[#2b3857]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#222b42]">
                  <span className="text-[9px] font-mono text-slate-400 truncate">
                    {ex.generationMethod}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(ex.id);
                        onOpenExample(ex, false);
                      }}
                      className="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Abrir</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(ex.id);
                        onOpenExample(ex, true);
                      }}
                      className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Duplicar este ejemplo como efecto personalizado editable"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Duplicar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODO APRENDIZAJE INSPECTOR */}
        {learningMode && selectedExample && (
          <div className="xl:col-span-5 p-3.5 rounded-xl border border-amber-500/35 bg-[#121726] flex flex-col gap-3 h-fit sticky top-0">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#252f49]">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="w-4 h-4 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase text-amber-300">Modo Aprendizaje · Anatomía del FX</div>
                  <h4 className="text-xs font-bold text-white truncate">{selectedExample.name}</h4>
                </div>
              </div>
              <ExampleMiniCanvas recipe={selectedExample.recipe} />
            </div>

            {selectedExample.inspiration && (
              <div className="text-[10px] text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5">
                <strong>Inspiración:</strong> {selectedExample.inspiration}
              </div>
            )}

            <div className="space-y-2 text-[11px]">
              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-300 font-semibold">
                  1. Cómo está construido
                </div>
                <p className="text-slate-300 leading-relaxed mt-0.5">{selectedExample.howBuilt}</p>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-300 font-semibold">
                  2. Componentes y Capas FX
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedExample.layersUsed.map((l) => (
                    <span
                      key={l}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#1b243b] border border-[#2d3b5e] text-slate-200"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-300 font-semibold">
                  3. Partículas y Modificadores
                </div>
                <p className="text-slate-300 text-[10px] mt-0.5">{selectedExample.particlesSummary}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedExample.modifiersUsed.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-300 font-semibold">
                  4. Qué parámetros alterar para personalizarlo
                </div>
                <ul className="list-disc list-inside text-[10px] text-slate-300 mt-0.5 space-y-0.5">
                  {selectedExample.keyParamsToTweak.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-[#222c44]">
                Método: <span className="text-emerald-300">{selectedExample.generationMethod}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onOpenExample(selectedExample, false)}
                className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Abrir en el Taller</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenExample(selectedExample, true)}
                className="px-3 py-2 rounded-lg border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicar y Modificar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
