import React, { useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Compass,
  Download,
  Film,
  Flame,
  Grid,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  Mountain,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  Swords,
  UserSquare2,
  Wand2,
  AlertTriangle,
} from 'lucide-react';
import {
  DummyBehaviorState,
  DummyOpponent,
  EditableFxRecipe,
  FightingGameProfileId,
  GuidesConfig,
  GuidesModalTab,
  Layer,
  ProjectWorkMode,
  StageBuilderRole,
  StageParallaxConfig,
  TilesetWorkspaceConfig,
  ToolType,
} from '../types';
import {
  analyzeTilesetSeams,
  PARALLAX_SPEED_PRESETS,
  WORK_MODE_ORDER,
  WORK_MODES_REGISTRY,
} from '../utils/workModesEngine';
import {
  FIGHTING_GAME_PROFILE_ORDER,
  FIGHTING_GAME_PROFILES,
} from '../utils/fightingGameProfiles';
import { StudioSlider } from './StudioSlider';

const STAGE_BUILDER_ROLES: {
  id: StageBuilderRole;
  label: string;
  speed: number;
  accent: string;
}[] = [
  { id: 'fondo', label: 'Fondo', speed: 0.15, accent: '#38bdf8' },
  { id: 'tiles', label: 'Tiles', speed: 1.0, accent: '#10b981' },
  { id: 'objetos', label: 'Objetos', speed: 0.75, accent: '#14b8a6' },
  { id: 'decoracion', label: 'Decoración', speed: 1.35, accent: '#f43f5e' },
  { id: 'parallax', label: 'Parallax', speed: 0.45, accent: '#6366f1' },
  { id: 'fx', label: 'Efectos ambientales', speed: 1.15, accent: '#22d3ee' },
];

interface WorkModeHubPanelProps {
  workMode: ProjectWorkMode;
  onChangeWorkMode: (mode: ProjectWorkMode) => void;
  canvasWidth: number;
  canvasHeight: number;
  layers: Layer[];
  compositeGrid: (string | null)[][];
  // Stage Parallax & Guides
  stageParallaxConfig: StageParallaxConfig;
  onChangeStageParallaxConfig: (next: StageParallaxConfig) => void;
  onUpdateLayerParallaxSpeed: (layerIndex: number, speed: number) => void;
  // Tileset Studio
  tilesetConfig: TilesetWorkspaceConfig;
  onChangeTilesetConfig: (next: TilesetWorkspaceConfig) => void;
  // Non-destructive actions
  onCreateSuggestedLayers: (mode: ProjectWorkMode) => void;
  onApplyModeGuides: (mode: ProjectWorkMode) => void;
  onInsertTemplate: (templateId: string) => void;
  onTriggerModeAi: (kind: 'stage' | 'hud' | 'fx', promptHint: string, categoryLabel: string) => void;
  // FX Studio shortcuts
  onOpenFxStudio: (tab?: 'generator' | 'lab' | 'library', recipe?: EditableFxRecipe | null) => void;
  lastGeneratedFxRecipe?: EditableFxRecipe | null;
  activeLayerFxRecipe?: EditableFxRecipe | null;
  onOpenExportModal: () => void;
  // Perspective & Stage Depth Guides integration
  guidesConfig?: GuidesConfig;
  onChangeGuidesConfig?: (next: GuidesConfig) => void;
  onOpenGuidesModal?: (tab?: GuidesModalTab) => void;
  // Stage Builder + Tiles + Optional Fighting Profile
  activeFightingProfile?: FightingGameProfileId;
  onApplyFightingProfile?: (id: FightingGameProfileId) => void;
  onAddStageRoleLayer?: (role: StageBuilderRole) => void;
  onSelectTool?: (tool: ToolType) => void;
  onFocusTilesetsPanel?: () => void;
  // Fighter Mode Practice Dummy
  dummyOpponent?: DummyOpponent;
  onChangeDummyOpponent?: (next: DummyOpponent) => void;
}

const MODE_ICON_MAP: Record<ProjectWorkMode, React.FC<{ className?: string }>> = {
  fighter: Swords,
  stage: Mountain,
  hud_ui: LayoutTemplate,
  fx: Flame,
  tileset: Grid,
  portrait: UserSquare2,
  cutscene: Film,
  custom: Sliders,
};

export const WorkModeHubPanel: React.FC<WorkModeHubPanelProps> = ({
  workMode,
  onChangeWorkMode,
  canvasWidth,
  canvasHeight,
  layers,
  compositeGrid,
  stageParallaxConfig,
  onChangeStageParallaxConfig,
  onUpdateLayerParallaxSpeed,
  tilesetConfig,
  onChangeTilesetConfig,
  onCreateSuggestedLayers,
  onApplyModeGuides,
  onInsertTemplate,
  onTriggerModeAi,
  onOpenFxStudio,
  lastGeneratedFxRecipe,
  activeLayerFxRecipe,
  onOpenExportModal,
  guidesConfig,
  onChangeGuidesConfig,
  onOpenGuidesModal,
  activeFightingProfile = 'custom',
  onApplyFightingProfile,
  onAddStageRoleLayer,
  onSelectTool,
  onFocusTilesetsPanel,
  dummyOpponent,
  onChangeDummyOpponent,
}) => {
  const modeDef = WORK_MODES_REGISTRY[workMode];
  const repeatCanvasRef = useRef<HTMLCanvasElement>(null);
  const autotileCanvasRef = useRef<HTMLCanvasElement>(null);

  const seamReport = useMemo(() => {
    if (workMode !== 'tileset') return null;
    return analyzeTilesetSeams(compositeGrid, canvasWidth, canvasHeight);
  }, [workMode, compositeGrid, canvasWidth, canvasHeight]);

  // Render live 3x3 Tileset Seamless Repeat Preview
  useEffect(() => {
    if (workMode !== 'tileset') return;
    const canvas = repeatCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    const tileW = cw / 3;
    const tileH = ch / 3;
    const cellW = tileW / Math.max(1, canvasWidth);
    const cellH = tileH / Math.max(1, canvasHeight);

    for (let ty = 0; ty < 3; ty++) {
      for (let tx = 0; tx < 3; tx++) {
        const ox = tx * tileW;
        const oy = ty * tileH;
        for (let y = 0; y < canvasHeight; y++) {
          const row = compositeGrid[y];
          if (!row) continue;
          for (let x = 0; x < canvasWidth; x++) {
            const col = row[x];
            if (!col) continue;
            ctx.fillStyle = col;
            ctx.fillRect(
              Math.floor(ox + x * cellW),
              Math.floor(oy + y * cellH),
              Math.ceil(cellW),
              Math.ceil(cellH)
            );
          }
        }
      }
    }

    // Center tile frame indicator
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.floor(tileW) + 0.5, Math.floor(tileH) + 0.5, Math.floor(tileW), Math.floor(tileH));
  }, [workMode, compositeGrid, canvasWidth, canvasHeight]);

  // Render 16-tile Autotile bitmask preview (4x4 island / corridor / corner configurations)
  useEffect(() => {
    if (workMode !== 'tileset' || !tilesetConfig.showAutotilePreview) return;
    const canvas = autotileCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, cw, ch);

    // Build offscreen tile bitmap first
    const off = document.createElement('canvas');
    off.width = canvasWidth;
    off.height = canvasHeight;
    const octx = off.getContext('2d');
    if (!octx) return;
    for (let y = 0; y < canvasHeight; y++) {
      const row = compositeGrid[y];
      if (!row) continue;
      for (let x = 0; x < canvasWidth; x++) {
        if (row[x]) {
          octx.fillStyle = row[x]!;
          octx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Draw 4x4 autotile layout (N/E/S/W bitmask visualization)
    const slotW = Math.floor(cw / 4);
    const slotH = Math.floor(ch / 4);
    ctx.imageSmoothingEnabled = false;
    for (let mask = 0; mask < 16; mask++) {
      const col = mask % 4;
      const row = Math.floor(mask / 4);
      const x = col * slotW + 2;
      const y = row * slotH + 2;
      const w = slotW - 4;
      const h = slotH - 4;
      ctx.drawImage(off, x, y, w, h);

      // Highlight open edges according to bitmask (1=N, 2=E, 4=S, 8=W)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.5;
      if ((mask & 1) === 0) {
        ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + w, y + 0.5); ctx.stroke();
      }
      if ((mask & 2) === 0) {
        ctx.beginPath(); ctx.moveTo(x + w - 0.5, y); ctx.lineTo(x + w - 0.5, y + h); ctx.stroke();
      }
      if ((mask & 4) === 0) {
        ctx.beginPath(); ctx.moveTo(x, y + h - 0.5); ctx.lineTo(x + w, y + h - 0.5); ctx.stroke();
      }
      if ((mask & 8) === 0) {
        ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + h); ctx.stroke();
      }
    }
  }, [workMode, tilesetConfig.showAutotilePreview, compositeGrid, canvasWidth, canvasHeight]);

  const editableRecipe = activeLayerFxRecipe || lastGeneratedFxRecipe;

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      {/* 8-Mode Non-Destructive Selector Grid */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="uppercase tracking-wider opacity-75">Modo de Proyecto</span>
          <span className="text-[9px] text-emerald-400">No destructivo</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {WORK_MODE_ORDER.map((id) => {
            const def = WORK_MODES_REGISTRY[id];
            const Icon = MODE_ICON_MAP[id];
            const active = workMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChangeWorkMode(id)}
                title={def.description}
                className="py-1.5 px-1 rounded-md border flex flex-col items-center gap-0.5 transition-colors"
                style={{
                  backgroundColor: active ? `color-mix(in srgb, ${def.accentColor} 20%, var(--studio-bg-elevated))` : 'var(--studio-bg-elevated)',
                  borderColor: active ? def.accentColor : 'var(--studio-border)',
                  color: active ? 'var(--studio-text)' : 'var(--studio-text-muted)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[9px] font-semibold truncate w-full text-center">{def.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Active Mode Summary Banner */}
        <div
          className="p-2 rounded-lg border text-[10px] leading-snug"
          style={{
            backgroundColor: `color-mix(in srgb, ${modeDef.accentColor} 10%, var(--studio-bg-elevated))`,
            borderColor: `color-mix(in srgb, ${modeDef.accentColor} 40%, var(--studio-border))`,
          }}
        >
          <div className="flex items-center justify-between font-bold mb-0.5">
            <span>Modo {modeDef.label}</span>
            <span
              className="px-1.5 py-0.2 rounded text-[9px] font-mono"
              style={{ backgroundColor: modeDef.accentColor, color: '#090d16' }}
            >
              {modeDef.badge}
            </span>
          </div>
          <p className="opacity-80">{modeDef.description}</p>
        </div>

        {/* Quick Mode Setup Actions */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onCreateSuggestedLayers(workMode)}
            className="py-1.5 px-2 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-white/5"
            style={{ borderColor: 'var(--studio-border-strong)', backgroundColor: 'var(--studio-bg-elevated)' }}
            title={`Añadir ${modeDef.suggestedLayers.length} capas sugeridas sin borrar las existentes`}
          >
            <Layers className="w-3 h-3 text-sky-400" />
            <span>+{modeDef.suggestedLayers.length} Capas Base</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyModeGuides(workMode)}
            className="py-1.5 px-2 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-white/5"
            style={{ borderColor: 'var(--studio-border-strong)', backgroundColor: 'var(--studio-bg-elevated)' }}
            title="Aplicar guías inteligentes para este modo"
          >
            <Compass className="w-3 h-3 text-amber-400" />
            <span>Guías del Modo</span>
          </button>
        </div>
      </div>

      {/* ===================== STAGE MODE CONTROLS ===================== */}
      {workMode === 'stage' && (
        <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          {/* Stage Builder Modular by Roles + Quick Tiles Launch */}
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-2"
            style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Stage Builder Modular
              </span>
              <span className="text-[10px] font-mono tabular-nums opacity-70">
                {layers.length} capas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {STAGE_BUILDER_ROLES.map((role) => {
                const count = layers.filter((l) => l.stageRole === role.id).length;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => onAddStageRoleLayer?.(role.id)}
                    title={`Añadir capa modular de ${role.label} (Parallax ${role.speed.toFixed(2)}×)`}
                    className="h-7 px-2 rounded border text-[10px] font-medium flex items-center justify-between gap-1 hover:bg-white/5 transition-colors"
                    style={{
                      borderColor: count > 0 ? role.accent : 'var(--studio-border)',
                      backgroundColor: 'var(--studio-bg-card)',
                    }}
                  >
                    <span className="truncate">{role.label}</span>
                    <span className="font-mono tabular-nums text-[9px] opacity-80 flex items-center gap-0.5 shrink-0">
                      {count > 0 ? `${count}·` : ''}+
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
              <button
                type="button"
                onClick={() => onSelectTool?.('tile')}
                className="h-7 px-2 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap hover:bg-white/5"
                style={{
                  borderColor: 'rgba(16,185,129,0.45)',
                  backgroundColor: 'rgba(16,185,129,0.14)',
                  color: '#6ee7b7',
                }}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Herramienta Tiles</span>
              </button>
              <button
                type="button"
                onClick={() => onFocusTilesetsPanel?.()}
                className="h-7 px-2 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 whitespace-nowrap hover:bg-white/5"
                style={{
                  borderColor: 'var(--studio-border-strong)',
                  backgroundColor: 'var(--studio-bg-card)',
                }}
              >
                <Grid className="w-3 h-3 text-sky-400" />
                <span>Panel Tilesets</span>
              </button>
            </div>
          </div>

          {/* Parallax Controller */}
          <div className="p-2.5 rounded-lg border flex flex-col gap-2" style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Sistema Parallax en Vivo
              </span>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={stageParallaxConfig.enabled}
                  onChange={(e) =>
                    onChangeStageParallaxConfig({ ...stageParallaxConfig, enabled: e.target.checked })
                  }
                  style={{ accentColor: '#10b981' }}
                />
                <span>Activo</span>
              </label>
            </div>

            <StudioSlider
              variant="panel"
              label="Desplazamiento Cámara"
              value={Math.round(stageParallaxConfig.scrollOffset)}
              min={-canvasWidth * 2}
              max={canvasWidth * 2}
              step={1}
              unit="px"
              defaultValue={0}
              accentColor="#10b981"
              onChange={(v) =>
                onChangeStageParallaxConfig({ ...stageParallaxConfig, enabled: true, scrollOffset: v })
              }
            />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChangeStageParallaxConfig({
                    ...stageParallaxConfig,
                    enabled: true,
                    autoScroll: !stageParallaxConfig.autoScroll,
                  })
                }
                className="flex-1 py-1 px-2 rounded border text-[10px] font-semibold flex items-center justify-center gap-1"
                style={{
                  backgroundColor: stageParallaxConfig.autoScroll ? '#10b981' : 'var(--studio-bg-card)',
                  borderColor: stageParallaxConfig.autoScroll ? '#10b981' : 'var(--studio-border)',
                  color: stageParallaxConfig.autoScroll ? '#020617' : 'var(--studio-text)',
                }}
              >
                {stageParallaxConfig.autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{stageParallaxConfig.autoScroll ? 'Detener Scroll' : 'Auto-Parallax'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeStageParallaxConfig({ ...stageParallaxConfig, autoScroll: false, scrollOffset: 0 })
                }
                className="p-1.5 rounded border hover:bg-white/10"
                style={{ borderColor: 'var(--studio-border)' }}
                title="Centrar cámara (0 px)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Per-layer Parallax Speed Matrix */}
            <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
              <span className="text-[9px] font-mono opacity-70">Velocidad Parallax por Capa:</span>
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5">
                {layers.map((layer, idx) => {
                  const spd = layer.parallaxSpeed ?? 1.0;
                  return (
                    <div
                      key={layer.id}
                      className="p-1.5 rounded border flex flex-col gap-1"
                      style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-card)' }}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="truncate font-medium">{layer.name}</span>
                        <span className="font-mono tabular-nums text-emerald-400 font-bold">{spd.toFixed(2)}×</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {PARALLAX_SPEED_PRESETS.map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => onUpdateLayerParallaxSpeed(idx, p.speed)}
                            className="flex-1 py-0.5 rounded text-[8px] font-mono border transition-colors"
                            style={{
                              backgroundColor: Math.abs(spd - p.speed) < 0.05 ? '#10b981' : 'transparent',
                              borderColor: Math.abs(spd - p.speed) < 0.05 ? '#10b981' : 'var(--studio-border)',
                              color: Math.abs(spd - p.speed) < 0.05 ? '#020617' : 'var(--studio-text-muted)',
                            }}
                            title={`${p.label} (${p.desc})`}
                          >
                            {p.desc}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stage Composition Guides */}
          <div className="p-2.5 rounded-lg border flex flex-col gap-1.5" style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Guías de Escenario</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {(
                [
                  ['horizon', 'Línea horizonte'],
                  ['playableArea', 'Área jugable'],
                  ['sideBounds', 'Límites laterales'],
                  ['jumpHeight', 'Altura de salto'],
                  ['cameraZone', 'Zona de cámara'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stageParallaxConfig.guides[key]}
                    onChange={(e) =>
                      onChangeStageParallaxConfig({
                        ...stageParallaxConfig,
                        guides: { ...stageParallaxConfig.guides, [key]: e.target.checked },
                      })
                    }
                    style={{ accentColor: '#10b981' }}
                  />
                  <span className="truncate">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Automatic Stage Depth Planes & Perspective Quick Controls (Stage Mode Integration) */}
          {guidesConfig && onChangeGuidesConfig && (
            <div
              className="p-2.5 rounded-lg border flex flex-col gap-2"
              style={{
                borderColor: 'rgba(16, 185, 129, 0.35)',
                backgroundColor: 'var(--studio-bg-elevated)',
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  Perspectiva y Profundidad Visual
                </span>
                <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(guidesConfig.stageDepth.enabled || guidesConfig.stageDepth.autoShowInStageMode)}
                    onChange={(e) =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        showGuides: true,
                        stageDepth: {
                          ...guidesConfig.stageDepth,
                          enabled: e.target.checked,
                          autoShowInStageMode: e.target.checked,
                        },
                      })
                    }
                    style={{ accentColor: '#38bdf8' }}
                  />
                  <span>Auto Stage</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {(
                  [
                    ['showHorizon', 'Línea de horizonte'],
                    ['showGroundPlane', 'Plano del suelo'],
                    ['showVisualDepth', 'Profundidad visual'],
                    ['showFarBackground', 'Fondos lejanos'],
                    ['showMidBackground', 'Fondos medios'],
                    ['showForeground', 'Primer plano'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(guidesConfig.stageDepth[field])}
                      onChange={(e) =>
                        onChangeGuidesConfig({
                          ...guidesConfig,
                          showGuides: true,
                          stageDepth: {
                            ...guidesConfig.stageDepth,
                            enabled: true,
                            [field]: e.target.checked,
                          },
                        })
                      }
                      style={{ accentColor: '#38bdf8' }}
                    />
                    <span className="truncate">{label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <StudioSlider
                  variant="panel"
                  label="Horizonte"
                  value={guidesConfig.stageDepth.horizonPct}
                  min={15}
                  max={85}
                  step={1}
                  unit="%"
                  defaultValue={54}
                  accentColor="#38bdf8"
                  onChange={(v) =>
                    onChangeGuidesConfig({
                      ...guidesConfig,
                      showGuides: true,
                      stageDepth: { ...guidesConfig.stageDepth, enabled: true, horizonPct: v },
                      perspective: {
                        ...guidesConfig.perspective,
                        horizonY: Math.round((v / 100) * canvasHeight),
                      },
                    })
                  }
                />
                <StudioSlider
                  variant="panel"
                  label="Plano Suelo"
                  value={guidesConfig.stageDepth.groundPlanePct}
                  min={50}
                  max={98}
                  step={1}
                  unit="%"
                  defaultValue={84}
                  accentColor="#10b981"
                  onChange={(v) =>
                    onChangeGuidesConfig({
                      ...guidesConfig,
                      showGuides: true,
                      stageDepth: { ...guidesConfig.stageDepth, enabled: true, groundPlanePct: v },
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(guidesConfig.perspective.enabled)}
                    onChange={(e) =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        showGuides: true,
                        perspective: { ...guidesConfig.perspective, enabled: e.target.checked },
                      })
                    }
                    style={{ accentColor: '#38bdf8' }}
                  />
                  <span className="truncate">Guía Perspectiva</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(guidesConfig.perspective.floorGrid.enabled)}
                    onChange={(e) =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        showGuides: true,
                        perspective: {
                          ...guidesConfig.perspective,
                          enabled: e.target.checked ? true : guidesConfig.perspective.enabled,
                          floorGrid: {
                            ...guidesConfig.perspective.floorGrid,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    style={{ accentColor: '#10b981' }}
                  />
                  <span className="truncate">Piso Automático</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(guidesConfig.cameraGuides.enabled)}
                    onChange={(e) =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        showGuides: true,
                        cameraGuides: { ...guidesConfig.cameraGuides, enabled: e.target.checked },
                      })
                    }
                    style={{ accentColor: '#f59e0b' }}
                  />
                  <span className="truncate">Guías Cámara</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(guidesConfig.snapToPerspective)}
                    onChange={(e) =>
                      onChangeGuidesConfig({
                        ...guidesConfig,
                        snapToPerspective: e.target.checked,
                      })
                    }
                    style={{ accentColor: '#a855f7' }}
                  />
                  <span className="truncate">Snap Perspectiva</span>
                </label>
              </div>

              {onOpenGuidesModal && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenGuidesModal('perspective')}
                    className="py-1 px-2 rounded border text-[10px] font-semibold hover:bg-white/5 text-sky-300"
                    style={{ borderColor: 'rgba(56,189,248,0.4)', backgroundColor: 'var(--studio-bg-card)' }}
                  >
                    Puntos de Fuga...
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenGuidesModal('floor_stage')}
                    className="py-1 px-2 rounded border text-[10px] font-semibold hover:bg-white/5 text-emerald-300"
                    style={{ borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'var(--studio-bg-card)' }}
                  >
                    Piso y Escenario...
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Stage Templates */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Plantillas Parallax (Multi-Capa)
            </span>
            <div className="grid grid-cols-2 gap-1">
              {modeDef.templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onInsertTemplate(tpl.id)}
                  className="p-1.5 rounded border text-left hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
                >
                  <div className="text-[10px] font-semibold truncate">{tpl.name}</div>
                  <div className="text-[9px] opacity-65 truncate">{tpl.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Stage AI Biomes */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Generar Escenario con IA</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {modeDef.aiCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onTriggerModeAi('stage', cat.promptHint, cat.label)}
                  className="px-2 py-1 rounded border text-[9px] font-medium hover:border-emerald-400 transition-colors"
                  style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== HUD / UI MODE CONTROLS ===================== */}
      {workMode === 'hud_ui' && (
        <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Plantillas HUD / UI ({modeDef.templates.length})
            </span>
            <div className="grid grid-cols-2 gap-1">
              {modeDef.templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onInsertTemplate(tpl.id)}
                  className="p-1.5 rounded border text-left hover:border-sky-400/70 transition-colors"
                  style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
                >
                  <div className="text-[10px] font-semibold truncate">{tpl.name}</div>
                  <div className="text-[9px] opacity-65 truncate">{tpl.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Generar Elemento UI con IA</span>
            </span>
            <div className="grid grid-cols-3 gap-1">
              {modeDef.aiCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onTriggerModeAi('hud', cat.promptHint, cat.label)}
                  className="py-1 px-1.5 rounded border text-[10px] font-medium hover:border-sky-400 transition-colors"
                  style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== FX MODE CONTROLS ===================== */}
      {workMode === 'fx' && (
        <div className="flex flex-col gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          <button
            type="button"
            onClick={() => onOpenFxStudio('generator')}
            className="w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
            style={{ backgroundColor: '#f97316', color: '#090d16' }}
          >
            <Flame className="w-4 h-4" />
            <span>Abrir Generador de Efectos (IA FX)</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenFxStudio('lab')}
            className="w-full py-2 px-3 rounded-lg border font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-white/5"
            style={{ borderColor: '#fb923c', color: '#fed7aa', backgroundColor: 'rgba(249,115,22,0.12)' }}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Abrir FX Lab (Editor Visual Modular)</span>
          </button>

          {editableRecipe && (
            <button
              type="button"
              onClick={() =>
                onOpenFxStudio(editableRecipe.source === 'lab' ? 'lab' : 'generator', editableRecipe)
              }
              className="w-full py-1.5 px-2.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/5"
              style={{ borderColor: 'var(--studio-border-strong)', backgroundColor: 'var(--studio-bg-elevated)' }}
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">Re-editar: {editableRecipe.name}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenFxStudio('library')}
            className="w-full py-1.5 px-2.5 rounded-lg border text-[10px] font-medium flex items-center justify-center gap-1.5 hover:bg-white/5"
            style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Explorar Biblioteca FX (.pxfx.json)</span>
          </button>
        </div>
      )}

      {/* ===================== TILESET MODE CONTROLS ===================== */}
      {workMode === 'tileset' && (
        <div className="flex flex-col gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          <div className="p-2.5 rounded-lg border flex flex-col gap-2" style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Tileset Studio · Repetición 3×3
              </span>
              <select
                value={tilesetConfig.tileSize}
                onChange={(e) =>
                  onChangeTilesetConfig({ ...tilesetConfig, tileSize: Number(e.target.value) || 16 })
                }
                className="px-1.5 py-0.5 rounded border text-[10px] font-mono"
                style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
              >
                {[8, 16, 24, 32, 48, 64].map((sz) => (
                  <option key={sz} value={sz} style={{ backgroundColor: '#131722' }}>
                    {sz}×{sz} px
                  </option>
                ))}
              </select>
            </div>

            {/* Live 3x3 seamless preview */}
            <canvas
              ref={repeatCanvasRef}
              width={180}
              height={180}
              className="w-full max-w-[180px] mx-auto aspect-square rounded border"
              style={{ imageRendering: 'pixelated', borderColor: 'var(--studio-border-strong)' }}
            />

            {/* Seam Checker Readout */}
            {seamReport && (
              <div className="p-2 rounded border text-[10px] font-mono flex flex-col gap-1" style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-card)' }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-semibold">
                    {seamReport.overallScore >= 85 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Encaje Seamless</span>
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      seamReport.overallScore >= 85 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {seamReport.overallScore}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] opacity-75 tabular-nums">
                  <span>Izq ↔ Der: {seamReport.horizontalScore}%</span>
                  <span>Sup ↔ Inf: {seamReport.verticalScore}%</span>
                </div>
              </div>
            )}

            {/* Tileset Canvas Overlay Toggles */}
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {(
                [
                  ['showBlockGrid', 'Vista bloques'],
                  ['showRepeat3x3', 'Repetir 3×3 lienzo'],
                  ['showSeamChecker', 'Marcar costuras'],
                  ['showAutotilePreview', 'Autotiling 16'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tilesetConfig[key]}
                    onChange={(e) =>
                      onChangeTilesetConfig({ ...tilesetConfig, [key]: e.target.checked })
                    }
                    style={{ accentColor: '#a855f7' }}
                  />
                  <span className="truncate">{label}</span>
                </label>
              ))}
            </div>

            {tilesetConfig.showAutotilePreview && (
              <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <span className="text-[9px] font-mono opacity-70">Vista Autotiling (16 bitmasks N/E/S/O):</span>
                <canvas
                  ref={autotileCanvasRef}
                  width={160}
                  height={160}
                  className="w-full max-w-[160px] mx-auto aspect-square rounded border"
                  style={{ imageRendering: 'pixelated', borderColor: 'var(--studio-border)' }}
                />
              </div>
            )}
          </div>

          {/* Tileset Starter Templates */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
              Bases Modulares (RPG / Plataforma / Metroidvania)
            </span>
            {modeDef.templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onInsertTemplate(tpl.id)}
                className="p-1.5 rounded border text-left hover:border-purple-400 transition-colors flex items-center justify-between"
                style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
              >
                <div>
                  <div className="text-[10px] font-semibold">{tpl.name}</div>
                  <div className="text-[9px] opacity-65">{tpl.subtitle}</div>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {tpl.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================== PORTRAIT & CUTSCENE TEMPLATES ===================== */}
      {(workMode === 'portrait' || workMode === 'cutscene') && modeDef.templates.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            Plantillas de {modeDef.label}
          </span>
          {modeDef.templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onInsertTemplate(tpl.id)}
              className="p-2 rounded border text-left hover:bg-white/5 transition-colors flex items-center justify-between"
              style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
            >
              <div>
                <div className="text-[10px] font-semibold">{tpl.name}</div>
                <div className="text-[9px] opacity-65">{tpl.subtitle}</div>
              </div>
              <span className="text-[9px] font-mono opacity-75">{tpl.category}</span>
            </button>
          ))}
        </div>
      )}

      {/* ===================== FIGHTER QUICK ACTIONS & PRACTICE DUMMY ===================== */}
      {workMode === 'fighter' && (
        <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          {dummyOpponent && onChangeDummyOpponent && (
            <div
              className="p-2.5 rounded-lg border flex flex-col gap-2"
              style={{
                borderColor: dummyOpponent.enabled ? 'rgba(244, 63, 94, 0.5)' : 'var(--studio-border)',
                backgroundColor: 'var(--studio-bg-elevated)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Herramientas · Dummy de Práctica
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeDummyOpponent({ ...dummyOpponent, enabled: !dummyOpponent.enabled })
                  }
                  className="px-2 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor: dummyOpponent.enabled ? 'rgba(244, 63, 94, 0.2)' : 'var(--studio-bg-card)',
                    borderColor: dummyOpponent.enabled ? '#f43f5e' : 'var(--studio-border-strong)',
                    color: dummyOpponent.enabled ? '#fda4af' : 'var(--studio-text)',
                  }}
                >
                  {dummyOpponent.enabled ? 'Desactivar Dummy' : 'Activar Sparring Dummy'}
                </button>
              </div>

              {dummyOpponent.enabled && (
                <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'idle', label: 'Idle' },
                        { id: 'walk', label: 'Walk' },
                        { id: 'block', label: 'Block' },
                        { id: 'jump', label: 'Jump' },
                        { id: 'hitstun', label: 'Hitstun' },
                        { id: 'counter_hit', label: 'Counter' },
                      ] as { id: DummyBehaviorState; label: string }[]
                    ).map((st) => {
                      const active = (dummyOpponent.state || 'idle') === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => onChangeDummyOpponent({ ...dummyOpponent, state: st.id })}
                          className="py-1 rounded border text-[9.5px] font-semibold transition-colors"
                          style={{
                            backgroundColor: active ? 'rgba(244, 63, 94, 0.22)' : 'var(--studio-bg-card)',
                            borderColor: active ? '#f43f5e' : 'var(--studio-border)',
                            color: active ? '#fecdd3' : 'var(--studio-text-muted)',
                          }}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dummyOpponent.showHurtbox}
                        onChange={(e) =>
                          onChangeDummyOpponent({ ...dummyOpponent, showHurtbox: e.target.checked })
                        }
                        className="accent-rose-500"
                      />
                      <span>Mostrar Hurtbox P2</span>
                    </label>
                    <span className="font-mono tabular-nums opacity-75">
                      Dist: {dummyOpponent.distance}px
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onOpenFxStudio('generator')}
              className="p-2 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-white/5"
              style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>FX Combate</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenFxStudio('lab')}
              className="p-2 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 hover:bg-white/5"
              style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>FX Lab</span>
            </button>
          </div>
        </div>
      )}

      {/* Optional Fighting Game Profile Quick Configurator */}
      {(workMode === 'fighter' || workMode === 'stage' || workMode === 'fx') &&
        onApplyFightingProfile && (
          <div
            className="p-2.5 rounded-lg border flex flex-col gap-1.5"
            style={{ borderColor: 'var(--studio-border)', backgroundColor: 'var(--studio-bg-elevated)' }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Perfil Juego de Pelea
              </span>
              <span className="text-[9px] font-mono tabular-nums opacity-70">
                {FIGHTING_GAME_PROFILES[activeFightingProfile]?.fighterLayout.recommendedFps || 12} FPS
              </span>
            </div>
            <div className="flex items-center gap-1">
              <select
                value={activeFightingProfile}
                onChange={(e) => onApplyFightingProfile(e.target.value as FightingGameProfileId)}
                className="flex-1 h-7 px-2 rounded border text-[10px] font-medium outline-none min-w-0"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border-strong)',
                  color: 'var(--studio-text)',
                }}
              >
                {FIGHTING_GAME_PROFILE_ORDER.map((pid) => (
                  <option key={pid} value={pid} style={{ backgroundColor: '#131722' }}>
                    {FIGHTING_GAME_PROFILES[pid].shortName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onApplyFightingProfile(activeFightingProfile)}
                className="h-7 px-2 rounded border text-[10px] font-semibold whitespace-nowrap shrink-0 hover:bg-white/5"
                style={{
                  borderColor: FIGHTING_GAME_PROFILES[activeFightingProfile]?.accentColor || 'var(--studio-accent)',
                  backgroundColor: 'var(--studio-bg-card)',
                }}
                title="Aplicar paleta, FPS y guías del perfil seleccionado sin borrar el dibujo"
              >
                <Plus className="w-3 h-3 inline mr-0.5" />
                Aplicar
              </button>
            </div>
          </div>
        )}

      {/* Mode-Specialized Export Button */}
      <div className="pt-2 border-t" style={{ borderColor: 'var(--studio-border)' }}>
        <button
          type="button"
          onClick={onOpenExportModal}
          className="w-full py-1.5 px-2.5 rounded-lg border text-[10px] font-semibold flex items-center justify-center gap-1.5 hover:bg-white/5"
          style={{ borderColor: 'var(--studio-border-strong)', backgroundColor: 'var(--studio-bg-elevated)' }}
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exportación Especializada ({modeDef.shortLabel})</span>
        </button>
      </div>
    </div>
  );
};
