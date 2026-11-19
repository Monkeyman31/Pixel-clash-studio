import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Layers, 
  FileText, 
  Sparkles, 
  Check, 
  FileJson, 
  Grid, 
  Plus, 
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Target
} from 'lucide-react';
import { Frame, LayerGroup, ProjectState } from '../types';
import { 
  generateMovementSpriteSheet, 
  downloadCanvasAsPng, 
  downloadJsonFile, 
  SpriteSheetOptions 
} from '../utils/spriteSheetGenerator';

interface SpriteSheetTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  onApplyTemplateToProject?: (groups: LayerGroup[], frames: Frame[]) => void;
}

export const SpriteSheetTemplateModal: React.FC<SpriteSheetTemplateModalProps> = ({
  isOpen,
  onClose,
  project,
  onApplyTemplateToProject
}) => {
  const [sheetMode, setSheetMode] = useState<'current_moves' | 'blank_template'>('current_moves');
  const [scale, setScale] = useState<number>(2);
  const [includeLabels, setIncludeLabels] = useState<boolean>(true);
  const [includeGuides, setIncludeGuides] = useState<boolean>(true);
  const [includeHitboxes, setIncludeHitboxes] = useState<boolean>(false);
  const [bgStyle, setBgStyle] = useState<'transparent' | 'dark' | 'checker'>('dark');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Editable template movements for "blank_template" mode
  const [templateMovements, setTemplateMovements] = useState<{ id: string; name: string; color: string; count: number; category: string }[]>([
    { id: 't1', name: 'Idle Stand', color: '#3b82f6', count: 4, category: 'Idle' },
    { id: 't2', name: 'Walk Forward', color: '#10b981', count: 6, category: 'Movement' },
    { id: 't3', name: 'Light Punch', color: '#ef4444', count: 3, category: 'Normal' },
    { id: 't4', name: 'Heavy Kick', color: '#f59e0b', count: 4, category: 'Normal' },
    { id: 't5', name: 'Hadoken Projectile', color: '#06b6d4', count: 5, category: 'Special' },
    { id: 't6', name: 'Dragon Punch (Anti-Air)', color: '#8b5cf6', count: 6, category: 'Special' },
    { id: 't7', name: 'Hit Reaction / Hurt', color: '#ec4899', count: 3, category: 'Reaction' },
    { id: 't8', name: 'Knockdown / K.O.', color: '#64748b', count: 4, category: 'Reaction' },
  ]);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentSheetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentMetadataRef = useRef<any>(null);

  // Render sheet preview
  useEffect(() => {
    if (!isOpen) return;

    let groupsToRender: LayerGroup[] = [];
    let framesToRender: Frame[] = project.frames;
    let templateOnly = false;

    if (sheetMode === 'current_moves') {
      // Use project's unified movement groups
      if (project.layerGroups && project.layerGroups.length > 0) {
        groupsToRender = project.layerGroups;
      } else {
        // Fallback: group all frames in one default group
        groupsToRender = [
          {
            id: 'grp-default',
            name: 'Movimiento Base',
            color: '#3b82f6',
            category: 'Idle',
            frameIndices: project.frames.map((_, i) => i)
          }
        ];
      }
    } else {
      // Blank template mode
      templateOnly = true;
      let frameCounter = 0;
      groupsToRender = templateMovements.map((tm) => {
        const indices = Array.from({ length: tm.count }, (_, i) => frameCounter + i);
        frameCounter += tm.count;
        return {
          id: tm.id,
          name: tm.name,
          color: tm.color,
          category: tm.category as any,
          frameIndices: indices,
        };
      });
    }

    const options: SpriteSheetOptions = {
      scale,
      includeLabels,
      includeGuides,
      includeHitboxes,
      backgroundColor: bgStyle === 'dark' ? '#0e111a' : bgStyle === 'transparent' ? 'transparent' : '#141824',
      groundY: project.groundConfig?.groundY || Math.round(project.height * 0.88),
      globalPivot: project.globalPivot || { x: Math.round(project.width / 2), y: Math.round(project.height * 0.88) },
      templateOnly,
    };

    const { canvas, metadata } = generateMovementSpriteSheet(
      groupsToRender,
      framesToRender,
      project.width,
      project.height,
      options
    );

    currentSheetCanvasRef.current = canvas;
    currentMetadataRef.current = metadata;

    // Draw to visible preview
    const preview = previewCanvasRef.current;
    if (preview) {
      preview.width = canvas.width;
      preview.height = canvas.height;
      const ctx = preview.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, preview.width, preview.height);
        ctx.drawImage(canvas, 0, 0);
      }
    }
  }, [
    isOpen,
    sheetMode,
    scale,
    includeLabels,
    includeGuides,
    includeHitboxes,
    bgStyle,
    project,
    templateMovements
  ]);

  if (!isOpen) return null;

  // Download PNG
  const handleDownloadPng = () => {
    if (!currentSheetCanvasRef.current) return;
    const modeSuffix = sheetMode === 'current_moves' ? 'spritesheet' : 'plantilla_base';
    const filename = `${project.name.toLowerCase().replace(/\s+/g, '_')}_${modeSuffix}.png`;
    downloadCanvasAsPng(currentSheetCanvasRef.current, filename);
  };

  // Download JSON Atlas
  const handleDownloadJson = () => {
    if (!currentMetadataRef.current) return;
    const modeSuffix = sheetMode === 'current_moves' ? 'atlas' : 'plantilla_atlas';
    const filename = `${project.name.toLowerCase().replace(/\s+/g, '_')}_${modeSuffix}.json`;
    downloadJsonFile(currentMetadataRef.current, filename);
  };

  // Apply template to project
  const handleApplyTemplate = () => {
    if (!onApplyTemplateToProject) return;

    const newGroups: LayerGroup[] = [];
    const newFrames: Frame[] = [];
    let frameIdx = 0;

    templateMovements.forEach((tm) => {
      const frameIndices: number[] = [];
      for (let i = 0; i < tm.count; i++) {
        const frameId = `frame-tpl-${Date.now()}-${frameIdx}`;
        frameIndices.push(frameIdx);

        // Create empty frame with default layers
        const emptyFrame: Frame = {
          id: frameId,
          name: `${tm.name} #${i + 1}`,
          durationTicks: i === 0 ? 6 : 4,
          phase: 'neutral',
          groupId: tm.id,
          layers: [
            {
              id: `layer-${frameId}-char`,
              name: 'Personaje',
              visible: true,
              locked: false,
              opacity: 1,
              groupId: tm.id,
              pixels: Array.from({ length: project.height }, () => Array(project.width).fill(null))
            }
          ],
          hitboxes: []
        };
        newFrames.push(emptyFrame);
        frameIdx++;
      }

      newGroups.push({
        id: tm.id,
        name: tm.name,
        color: tm.color,
        category: tm.category as any,
        frameIndices,
        collapsed: false,
        visible: true,
        locked: false,
        playbackMode: 'loop'
      });
    });

    onApplyTemplateToProject(newGroups, newFrames);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#11141c] border border-[#273045] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#161a26] border-b border-[#22293b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Generador de Hoja de Sprites & Plantilla Base de Movimientos
              </h2>
              <p className="text-[11px] text-slate-400">
                Organiza cada movimiento en una fila horizontal (un movimiento sobre otro) con etiquetas impresas en la hoja
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-[#20273a] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Bar */}
        <div className="px-5 py-2.5 bg-[#141724] border-b border-[#1f2638] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSheetMode('current_moves')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                sheetMode === 'current_moves'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'bg-[#1a1f2e] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Hoja con Movimientos Actuales ({project.layerGroups?.length || 1} Movs)</span>
            </button>

            <button
              onClick={() => setSheetMode('blank_template')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                sheetMode === 'blank_template'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/50'
                  : 'bg-[#1a1f2e] text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Plantilla Base en Blanco (Para planificar)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Scale Selector */}
            <span className="text-slate-400 text-[11px]">Escala:</span>
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                  scale === s
                    ? 'bg-indigo-500 text-white'
                    : 'bg-[#1b2030] text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Left Settings & Right Canvas Preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Controls & Customizer */}
          <div className="w-80 bg-[#131622] border-r border-[#20273a] p-4 flex flex-col gap-4 overflow-y-auto shrink-0 text-xs">
            {/* Options Strip */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                Configuración de la Hoja
              </span>

              {/* Include Labels in Sheet */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#181d2a] border border-[#232a3d] cursor-pointer hover:bg-[#1d2334] transition-colors">
                <div>
                  <div className="text-slate-200 font-medium">Textos de Movimiento Impresos</div>
                  <div className="text-[10px] text-slate-400">Imprime el nombre de cada acción en la hoja</div>
                </div>
                <input
                  type="checkbox"
                  checked={includeLabels}
                  onChange={(e) => setIncludeLabels(e.target.checked)}
                  className="rounded border-[#353f57] text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Include Combat Guides */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#181d2a] border border-[#232a3d] cursor-pointer hover:bg-[#1d2334] transition-colors">
                <div>
                  <div className="text-slate-200 font-medium">Guías de Combate (Suelo & Pivote)</div>
                  <div className="text-[10px] text-slate-400">Línea de suelo verde y cruz de pivote morada</div>
                </div>
                <input
                  type="checkbox"
                  checked={includeGuides}
                  onChange={(e) => setIncludeGuides(e.target.checked)}
                  className="rounded border-[#353f57] text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Include Hitboxes */}
              {sheetMode === 'current_moves' && (
                <label className="flex items-center justify-between p-2 rounded-lg bg-[#181d2a] border border-[#232a3d] cursor-pointer hover:bg-[#1d2334] transition-colors">
                  <div>
                    <div className="text-slate-200 font-medium">Dibujar Hitboxes / Hurtboxes</div>
                    <div className="text-[10px] text-slate-400">Incluye cajas de colisión en la imagen</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeHitboxes}
                    onChange={(e) => setIncludeHitboxes(e.target.checked)}
                    className="rounded border-[#353f57] text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              )}

              {/* Background Color */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[11px] text-slate-400">Fondo de Exportación:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setBgStyle('transparent')}
                    className={`py-1.5 px-2 rounded-lg font-mono text-[10px] border transition-colors ${
                      bgStyle === 'transparent'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-[#181d2a] border-[#252c3f] text-slate-400'
                    }`}
                  >
                    Transparente
                  </button>
                  <button
                    onClick={() => setBgStyle('dark')}
                    className={`py-1.5 px-2 rounded-lg font-mono text-[10px] border transition-colors ${
                      bgStyle === 'dark'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-[#181d2a] border-[#252c3f] text-slate-400'
                    }`}
                  >
                    Oscuro Arcade
                  </button>
                  <button
                    onClick={() => setBgStyle('checker')}
                    className={`py-1.5 px-2 rounded-lg font-mono text-[10px] border transition-colors ${
                      bgStyle === 'checker'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-[#181d2a] border-[#252c3f] text-slate-400'
                    }`}
                  >
                    Dojo Gris
                  </button>
                </div>
              </div>
            </div>

            {/* Template Movements Builder (if in blank template mode) */}
            {sheetMode === 'blank_template' && (
              <div className="flex flex-col gap-2 border-t border-[#22293b] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase">
                    Movimientos Planificados
                  </span>
                  <button
                    onClick={() => {
                      const id = `t-${Date.now()}`;
                      setTemplateMovements((prev) => [
                        ...prev,
                        { id, name: `Ataque #${prev.length + 1}`, color: '#ef4444', count: 4, category: 'Normal' }
                      ]);
                    }}
                    className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {templateMovements.map((tm, idx) => (
                    <div
                      key={tm.id}
                      className="p-2 rounded-lg bg-[#181d2a] border border-[#232a3d] flex flex-col gap-1.5 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tm.color }} />
                        <input
                          type="text"
                          value={tm.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTemplateMovements((prev) =>
                              prev.map((m, i) => (i === idx ? { ...m, name: val } : m))
                            );
                          }}
                          className="bg-transparent font-semibold text-slate-200 focus:outline-none flex-1 text-xs"
                        />
                        <button
                          onClick={() => {
                            setTemplateMovements((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Fotogramas:</span>
                        <div className="flex items-center gap-1.5">
                          {[2, 3, 4, 5, 6, 8].map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                setTemplateMovements((prev) =>
                                  prev.map((m, i) => (i === idx ? { ...m, count: c } : m))
                                );
                              }}
                              className={`w-5 h-5 rounded font-mono font-bold flex items-center justify-center ${
                                tm.count === c ? 'bg-amber-400 text-slate-950' : 'bg-[#22283a] text-slate-300'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {onApplyTemplateToProject && (
                  <button
                    onClick={handleApplyTemplate}
                    className="w-full mt-2 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-amber-950/40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Cargar Plantilla en el Proyecto</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Live Canvas Viewport */}
          <div className="flex-1 bg-[#090b10] flex flex-col overflow-hidden relative">
            {/* Viewport Zoom Bar */}
            <div className="h-9 px-4 bg-[#11141c]/90 border-b border-[#1c2233] flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">Vista Previa de la Hoja</span>
                {currentMetadataRef.current && (
                  <span className="text-slate-400 text-[11px]">
                    {currentMetadataRef.current.dimensions.width} x {currentMetadataRef.current.dimensions.height} px · {currentMetadataRef.current.totalMovements} Movimientos
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.25, z - 0.25))}
                  className="p-1 rounded hover:bg-[#1e2436] text-slate-300"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-indigo-400 font-bold">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 rounded hover:bg-[#1e2436] text-slate-300"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-2 py-0.5 rounded bg-[#1c2233] text-[10px] text-slate-300 hover:text-white"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Scrollable Canvas Container */}
            <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
              <div
                className="shadow-2xl rounded border border-[#2b354c] overflow-hidden"
                style={{
                  backgroundImage:
                    bgStyle === 'transparent'
                      ? 'linear-gradient(45deg, #181c26 25%, transparent 25%), linear-gradient(-45deg, #181c26 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181c26 75%), linear-gradient(-45deg, transparent 75%, #181c26 75%)'
                      : 'none',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: bgStyle === 'dark' ? '#0e111a' : bgStyle === 'checker' ? '#141824' : '#11141c',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <canvas ref={previewCanvasRef} className="block" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 bg-[#141824] border-t border-[#22293b] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            La altura del lienzo se adapta automáticamente al apilar cada movimiento sobre el anterior.
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadJson}
              className="px-3 py-2 rounded-xl bg-[#1c2233] hover:bg-[#252d44] text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-[#2b354c]"
            >
              <FileJson className="w-3.5 h-3.5 text-indigo-400" />
              <span>Atlas JSON (Godot / Unity)</span>
            </button>

            <button
              onClick={handleDownloadPng}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-indigo-950/50"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Hoja de Sprites (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
