import React, { useState, useEffect, useRef } from 'react';
import { STUDIO_Z } from './StudioTopLayer';
import {
  Camera,
  Check,
  Compass,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  FolderPlus,
  Layers,
  LayoutGrid,
  Lock,
  Magnet,
  Monitor,
  Mountain,
  Plus,
  Ruler,
  Save,
  Trash2,
  Unlock,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  CanvasGuide,
  GuideGroup,
  GuideOrientation,
  GuidePresetKind,
  GuidesConfig,
  GuidesModalTab,
  PerspectiveGuideType,
  RulerUnit,
  SavedPerspectiveConfiguration,
  ScenarioGuidePresetId,
  VanishingPoint,
} from '../types';
import {
  createVanishingPointsForType,
  deleteUserPerspectiveConfig,
  formatRulerCoordinate,
  getDefaultAxonometricAngles,
  loadSavedPerspectiveConfigs,
  parseUnitValueToPx,
  PERSPECTIVE_TYPE_META,
  pxToUnitValue,
  saveUserPerspectiveConfig,
  SCENARIO_GUIDE_PRESETS,
} from '../utils/guidesEngine';
import { StudioSlider } from './StudioSlider';

interface GuidesManagerModalProps {
  isOpen: boolean;
  initialTab?: GuidesModalTab;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
  guides: CanvasGuide[];
  guidesConfig: GuidesConfig;
  onChangeGuidesConfig: (next: GuidesConfig) => void;
  onAddGuide: (guide: CanvasGuide) => void;
  onUpdateGuide: (id: string, patch: Partial<CanvasGuide>) => void;
  onDuplicateGuide: (id: string) => void;
  onDeleteGuide: (id: string) => void;
  onApplyPreset: (kind: GuidePresetKind, replaceExisting: boolean) => void;
  onClearAllGuides: () => void;
  onSyncDummiePerspective?: (enabled: boolean) => void;
}

const GUIDE_COLORS = ['#38bdf8', '#f59e0b', '#10b981', '#f43f5e', '#a855f7', '#ec4899', '#e2e8f0'];

export const GuidesManagerModal: React.FC<GuidesManagerModalProps> = ({
  isOpen,
  initialTab = 'perspective',
  onClose,
  canvasWidth,
  canvasHeight,
  guides,
  guidesConfig,
  onChangeGuidesConfig,
  onAddGuide,
  onUpdateGuide,
  onDuplicateGuide,
  onDeleteGuide,
  onApplyPreset,
  onClearAllGuides,
  onSyncDummiePerspective,
}) => {
  const [tab, setTab] = useState<GuidesModalTab>(initialTab === 'list' ? 'groups' : initialTab);
  const [orientation, setOrientation] = useState<GuideOrientation>('vertical');
  const [positionPx, setPositionPx] = useState<number>(Math.round(canvasWidth / 2));
  const [rawInput, setRawInput] = useState<string>('');
  const [label, setLabel] = useState<string>('');
  const [color, setColor] = useState<string>('#38bdf8');
  const [guideGroupId, setGuideGroupId] = useState<string>(guidesConfig.activeGroupId || 'grp-stage');
  const [guideThickness, setGuideThickness] = useState<number>(guidesConfig.defaultGuideThickness || 1);
  const [guideOpacity, setGuideOpacity] = useState<number>(guidesConfig.defaultGuideOpacity || 0.8);
  const [replaceOnPreset, setReplaceOnPreset] = useState<boolean>(false);

  // Saved perspective configs
  const [savedConfigs, setSavedConfigs] = useState<SavedPerspectiveConfiguration[]>(() =>
    loadSavedPerspectiveConfigs(canvasWidth, canvasHeight)
  );
  const [saveConfigName, setSaveConfigName] = useState<string>('');
  const [saveConfigCategory, setSaveConfigCategory] = useState<string>('Fighting Games');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupColor, setNewGroupColor] = useState<string>('#38bdf8');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const importConfigInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab === 'list' ? 'groups' : initialTab);
      const axisLen = orientation === 'vertical' ? canvasWidth : canvasHeight;
      const defaultPos = Math.round(axisLen / 2);
      setPositionPx(defaultPos);
      setRawInput(
        String(pxToUnitValue(defaultPos, guidesConfig.unit, axisLen, guidesConfig.customScale))
      );
      setSavedConfigs(loadSavedPerspectiveConfigs(canvasWidth, canvasHeight));
      setGuideGroupId(guidesConfig.activeGroupId || guidesConfig.groups?.[0]?.id || 'grp-stage');
    }
  }, [isOpen, initialTab, canvasWidth, canvasHeight]);

  useEffect(() => {
    const axisLen = orientation === 'vertical' ? canvasWidth : canvasHeight;
    setRawInput(
      String(pxToUnitValue(positionPx, guidesConfig.unit, axisLen, guidesConfig.customScale))
    );
  }, [orientation, guidesConfig.unit, guidesConfig.customScale, positionPx, canvasWidth, canvasHeight]);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 2600);
  };

  const persp = guidesConfig.perspective;
  const cam = guidesConfig.cameraGuides;
  const stageD = guidesConfig.stageDepth;
  const groups = guidesConfig.groups || [];

  const updatePerspective = (patch: Partial<typeof persp>) => {
    onChangeGuidesConfig({
      ...guidesConfig,
      showGuides: true,
      perspective: { ...persp, ...patch },
    });
  };

  const updateFloorGrid = (patch: Partial<typeof persp.floorGrid>) => {
    onChangeGuidesConfig({
      ...guidesConfig,
      showGuides: true,
      perspective: {
        ...persp,
        enabled: patch.enabled ? true : persp.enabled,
        floorGrid: { ...persp.floorGrid, ...patch },
      },
    });
  };

  const updateCameraGuides = (patch: Partial<typeof cam>) => {
    onChangeGuidesConfig({
      ...guidesConfig,
      showGuides: true,
      cameraGuides: { ...cam, ...patch },
    });
  };

  const updateStageDepth = (patch: Partial<typeof stageD>) => {
    onChangeGuidesConfig({
      ...guidesConfig,
      showGuides: true,
      stageDepth: { ...stageD, ...patch },
    });
  };

  const handleSelectPerspectiveType = (nextType: PerspectiveGuideType) => {
    const nextVps = createVanishingPointsForType(nextType, canvasWidth, canvasHeight, persp.horizonY);
    const angles = getDefaultAxonometricAngles(nextType);
    updatePerspective({
      enabled: true,
      type: nextType,
      vanishingPoints: nextVps,
      isoAngleLeft: angles.isoAngleLeft,
      isoAngleRight: angles.isoAngleRight,
      showHorizon:
        nextType !== 'isometric' && nextType !== 'dimetric' && nextType !== 'trimetric',
    });
  };

  const handleAddVanishingPoint = () => {
    const idx = persp.vanishingPoints.length + 1;
    const newVp: VanishingPoint = {
      id: `vp-custom-${Date.now()}`,
      label: `PF ${idx}`,
      x: Math.round(canvasWidth * (idx % 2 === 0 ? 1.25 : -0.25)),
      y: Math.round(persp.horizonY),
      locked: false,
      visible: true,
      color: GUIDE_COLORS[idx % GUIDE_COLORS.length],
    };
    updatePerspective({
      enabled: true,
      vanishingPoints: [...persp.vanishingPoints, newVp],
    });
  };

  const handleUpdateVp = (vpId: string, patch: Partial<VanishingPoint>) => {
    updatePerspective({
      vanishingPoints: persp.vanishingPoints.map((vp) =>
        vp.id === vpId ? { ...vp, ...patch } : vp
      ),
    });
  };

  const handleDeleteVp = (vpId: string) => {
    updatePerspective({
      vanishingPoints: persp.vanishingPoints.filter((vp) => vp.id !== vpId),
    });
  };

  const handleApplyScenarioPreset = (presetId: ScenarioGuidePresetId) => {
    const def = SCENARIO_GUIDE_PRESETS.find((p) => p.id === presetId);
    if (!def) return;
    const built = def.build(canvasWidth, canvasHeight);
    onChangeGuidesConfig({
      ...guidesConfig,
      showGuides: true,
      showRulers: true,
      perspective: built.perspective,
      cameraGuides: built.cameraGuides,
      stageDepth: built.stageDepth,
    });
    notify(`Preset "${def.label}" aplicado al lienzo ${canvasWidth}×${canvasHeight} px.`);
  };

  const handleSaveCurrentPerspective = () => {
    const cleanName = saveConfigName.trim();
    if (!cleanName) return;
    const entry: SavedPerspectiveConfiguration = {
      id: `persp-saved-${Date.now()}`,
      name: cleanName,
      category: saveConfigCategory,
      createdAt: new Date().toISOString(),
      perspective: { ...persp, configName: cleanName },
      cameraGuides: { ...cam },
      stageDepth: { ...stageD },
    };
    saveUserPerspectiveConfig(entry);
    setSavedConfigs(loadSavedPerspectiveConfigs(canvasWidth, canvasHeight));
    setSaveConfigName('');
    notify(`Configuración "${cleanName}" guardada.`);
  };

  const handleLoadSavedConfig = (cfg: SavedPerspectiveConfiguration) => {
    onChangeGuidesConfig({
      ...guidesConfig,
      showGuides: true,
      perspective: { ...cfg.perspective, enabled: true },
      cameraGuides: cfg.cameraGuides ? { ...cfg.cameraGuides } : guidesConfig.cameraGuides,
      stageDepth: cfg.stageDepth ? { ...cfg.stageDepth } : guidesConfig.stageDepth,
    });
    notify(`Configuración "${cfg.name}" cargada.`);
  };

  const handleExportCurrentConfigJson = () => {
    const exportObj: SavedPerspectiveConfiguration = {
      id: `persp-exp-${Date.now()}`,
      name: saveConfigName.trim() || persp.configName || 'Perspectiva_PixelClash',
      category: saveConfigCategory,
      createdAt: new Date().toISOString(),
      perspective: persp,
      cameraGuides: cam,
      stageDepth: stageD,
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportObj.name.replace(/\s+/g, '_')}.perspective.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exportado "${a.download}".`);
  };

  const handleImportConfigJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || ''));
        if (parsed && parsed.perspective) {
          const entry: SavedPerspectiveConfiguration = {
            id: `persp-imp-${Date.now()}`,
            name: parsed.name || file.name.replace(/\.json$/i, ''),
            category: parsed.category || 'Importada',
            createdAt: new Date().toISOString(),
            perspective: { ...persp, ...parsed.perspective, enabled: true },
            cameraGuides: parsed.cameraGuides ? { ...cam, ...parsed.cameraGuides } : cam,
            stageDepth: parsed.stageDepth ? { ...stageD, ...parsed.stageDepth } : stageD,
          };
          saveUserPerspectiveConfig(entry);
          setSavedConfigs(loadSavedPerspectiveConfigs(canvasWidth, canvasHeight));
          handleLoadSavedConfig(entry);
        }
      } catch {
        notify('Archivo JSON de perspectiva no válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddGroup = () => {
    const nm = newGroupName.trim();
    if (!nm) return;
    const grp: GuideGroup = {
      id: `grp-${Date.now()}`,
      name: nm,
      visible: true,
      locked: false,
      color: newGroupColor,
      thickness: 1,
      opacity: 0.82,
    };
    onChangeGuidesConfig({
      ...guidesConfig,
      groups: [...groups, grp],
      activeGroupId: grp.id,
    });
    setNewGroupName('');
    notify(`Grupo "${nm}" creado.`);
  };

  const handleUpdateGroup = (groupId: string, patch: Partial<GuideGroup>) => {
    onChangeGuidesConfig({
      ...guidesConfig,
      groups: groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    if (groups.length <= 1) return;
    const remaining = groups.filter((g) => g.id !== groupId);
    onChangeGuidesConfig({
      ...guidesConfig,
      groups: remaining,
      activeGroupId: guidesConfig.activeGroupId === groupId ? remaining[0].id : guidesConfig.activeGroupId,
    });
  };

  const axisLen = orientation === 'vertical' ? canvasWidth : canvasHeight;
  const unitSuffix =
    guidesConfig.unit === 'px'
      ? 'px'
      : guidesConfig.unit === 'percent'
      ? '%'
      : guidesConfig.customLabel || 'u';

  const handleAddExact = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(rawInput.replace(',', '.'));
    const finalPx = Number.isFinite(numeric)
      ? parseUnitValueToPx(numeric, guidesConfig.unit, axisLen, guidesConfig.customScale)
      : positionPx;

    onAddGuide({
      id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orientation,
      position: finalPx,
      label: label.trim() || undefined,
      color,
      thickness: guideThickness,
      opacity: guideOpacity,
      groupId: guideGroupId,
      locked: false,
    });
    if (!guidesConfig.showGuides) {
      onChangeGuidesConfig({ ...guidesConfig, showGuides: true });
    }
    setLabel('');
    notify(`Guía creada en ${orientation === 'vertical' ? 'X' : 'Y'} = ${finalPx} px.`);
  };

  const classicPresetCards: {
    kind: GuidePresetKind;
    title: string;
    desc: string;
    icon: React.FC<{ className?: string }>;
    accent: string;
  }[] = [
    {
      kind: 'horizon',
      title: 'Línea de horizonte',
      desc: 'Cielo lejano, horizonte principal y plano de suelo.',
      icon: Mountain,
      accent: 'text-amber-400',
    },
    {
      kind: 'hud',
      title: 'Guías para HUD',
      desc: 'Márgenes seguros, barras de vida, timer central y barra súper.',
      icon: Monitor,
      accent: 'text-rose-400',
    },
    {
      kind: 'character',
      title: 'Guías para personajes',
      desc: 'Eje central X, cabeza, hombros, cadera y línea exacta de pies.',
      icon: User,
      accent: 'text-sky-400',
    },
    {
      kind: 'stage',
      title: 'Guías para escenarios',
      desc: 'Tercios (spawns P1/P2), esquinas de cámara, horizonte y piso.',
      icon: LayoutGrid,
      accent: 'text-emerald-400',
    },
  ];

  const navTabs: { id: GuidesModalTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'perspective', label: 'Perspectiva', icon: Compass },
    { id: 'floor_stage', label: 'Piso y Escenario', icon: Mountain },
    { id: 'camera', label: 'Cámara', icon: Camera },
    { id: 'presets', label: 'Presets / Exportar', icon: Save },
    { id: 'groups', label: `Grupos y Lista (${guides.length})`, icon: Layers },
    { id: 'exact', label: 'Guía Exacta', icon: Ruler },
  ];

  const isAxonometric =
    persp.type === 'isometric' || persp.type === 'dimetric' || persp.type === 'trimetric';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3"
      style={{ zIndex: STUDIO_Z.MODAL }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <input
        ref={importConfigInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportConfigJson}
      />

      <div
        className="w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--studio-bg-header)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Compass className="w-4 h-4 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">
                Sistema Avanzado de Reglas, Guías y Perspectiva
              </h2>
              <p className="text-[11px] font-mono tabular-nums truncate" style={{ color: 'var(--studio-text-muted)' }}>
                Lienzo {canvasWidth}×{canvasHeight} px · {guides.length} guía(s) ·{' '}
                {persp.enabled ? `Perspectiva ${PERSPECTIVE_TYPE_META.find((t) => t.id === persp.type)?.shortLabel}` : 'Perspectiva inactiva'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {statusNotice && (
              <span className="text-[11px] font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-1 rounded-md">
                {statusNotice}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div
          className="px-4 pt-2.5 pb-2 border-b flex items-center gap-1 overflow-x-auto"
          style={{ borderColor: 'var(--studio-border)' }}
        >
          {navTabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors shrink-0 ${
                  active
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* ===================== TAB 1: PERSPECTIVA ===================== */}
          {tab === 'perspective' && (
            <div className="space-y-4">
              {/* Top Controls Bar */}
              <div
                className="p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3"
                style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={persp.enabled}
                    onChange={(e) => updatePerspective({ enabled: e.target.checked })}
                    className="accent-amber-400 w-4 h-4"
                  />
                  <span>Activar Guías de Perspectiva</span>
                </label>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-sky-300">
                    <input
                      type="checkbox"
                      checked={guidesConfig.snapToPerspective}
                      onChange={(e) =>
                        onChangeGuidesConfig({
                          ...guidesConfig,
                          snapToPerspective: e.target.checked,
                        })
                      }
                      className="accent-sky-400"
                    />
                    <Magnet className="w-3.5 h-3.5" />
                    <span>Ajustar a perspectiva</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-emerald-300">
                    <input
                      type="checkbox"
                      checked={guidesConfig.dummieFollowPerspective}
                      onChange={(e) => {
                        onChangeGuidesConfig({
                          ...guidesConfig,
                          dummieFollowPerspective: e.target.checked,
                        });
                        onSyncDummiePerspective?.(e.target.checked);
                      }}
                      className="accent-emerald-400"
                    />
                    <User className="w-3.5 h-3.5" />
                    <span>Dummie respeta perspectiva</span>
                  </label>
                </div>
              </div>

              {/* 7 Perspective Types Grid */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">Tipo de Perspectiva (7 modos)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PERSPECTIVE_TYPE_META.map((item) => {
                    const active = persp.type === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectPerspectiveType(item.id)}
                        className={`p-2 rounded-lg border text-left transition-colors ${
                          active
                            ? 'border-amber-400 bg-amber-400/15 text-amber-100'
                            : 'border-white/10 hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-semibold">{item.shortLabel}</div>
                        <div className="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horizon & Line Styling */}
              <div
                className="p-3 rounded-lg border space-y-3"
                style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(0,0,0,0.18)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    {isAxonometric ? 'Parámetros Axonométricos' : 'Horizonte, Líneas y Rejilla de Construcción'}
                  </span>
                  <div className="flex items-center gap-3 text-[11px]">
                    {!isAxonometric && (
                      <>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={persp.showHorizon}
                            onChange={(e) => updatePerspective({ showHorizon: e.target.checked })}
                            className="accent-amber-400"
                          />
                          <span>Horizonte</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={persp.showRays}
                            onChange={(e) => updatePerspective({ showRays: e.target.checked })}
                            className="accent-amber-400"
                          />
                          <span>Líneas guía</span>
                        </label>
                      </>
                    )}
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={persp.showConstructionGrid}
                        onChange={(e) =>
                          updatePerspective({ showConstructionGrid: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>Rejilla construcción</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!isAxonometric ? (
                    <>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <StudioSlider
                            label="Línea de Horizonte (Y)"
                            value={Math.round(persp.horizonY)}
                            min={-Math.round(canvasHeight * 0.6)}
                            max={Math.round(canvasHeight * 1.6)}
                            step={1}
                            unit=" px"
                            onChange={(v) => {
                              if (persp.horizonLocked) return;
                              const deltaY = v - persp.horizonY;
                              updatePerspective({
                                horizonY: v,
                                vanishingPoints: persp.vanishingPoints.map((vp) =>
                                  !vp.locked && Math.abs(vp.y - persp.horizonY) <= 4
                                    ? { ...vp, y: vp.y + deltaY }
                                    : vp
                                ),
                              });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => updatePerspective({ horizonLocked: !persp.horizonLocked })}
                          className="p-1.5 rounded border border-white/15 hover:bg-white/10"
                          title={persp.horizonLocked ? 'Desbloquear horizonte' : 'Bloquear horizonte'}
                        >
                          {persp.horizonLocked ? (
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                      <StudioSlider
                        label="Densidad de Líneas Guía"
                        value={persp.rayDensity}
                        min={4}
                        max={32}
                        step={2}
                        unit=" rayos"
                        onChange={(v) => updatePerspective({ rayDensity: v })}
                      />
                    </>
                  ) : (
                    <>
                      <StudioSlider
                        label="Ángulo Izquierdo"
                        value={Math.round(persp.isoAngleLeft * 10) / 10}
                        min={5}
                        max={60}
                        step={0.5}
                        unit="°"
                        onChange={(v) => updatePerspective({ isoAngleLeft: v })}
                      />
                      <StudioSlider
                        label="Ángulo Derecho"
                        value={Math.round(persp.isoAngleRight * 10) / 10}
                        min={5}
                        max={60}
                        step={0.5}
                        unit="°"
                        onChange={(v) => updatePerspective({ isoAngleRight: v })}
                      />
                      <StudioSlider
                        label="Tamaño de Celda"
                        value={persp.isoCellSize}
                        min={4}
                        max={48}
                        step={1}
                        unit=" px"
                        onChange={(v) => updatePerspective({ isoCellSize: v })}
                      />
                    </>
                  )}

                  <StudioSlider
                    label="Grosor de Línea"
                    value={persp.thickness}
                    min={1}
                    max={4}
                    step={0.5}
                    unit=" px"
                    onChange={(v) => updatePerspective({ thickness: v })}
                  />
                  <StudioSlider
                    label="Opacidad"
                    value={Math.round(persp.opacity * 100)}
                    min={15}
                    max={100}
                    step={5}
                    unit="%"
                    onChange={(v) => updatePerspective({ opacity: v / 100 })}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Color principal de perspectiva:</span>
                  <div className="flex items-center gap-1.5">
                    {GUIDE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updatePerspective({ color: c })}
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          persp.color === c ? 'border-white scale-110' : 'border-white/20 opacity-80'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {persp.color === c && <Check className="w-3 h-3 text-slate-950" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={persp.color}
                      onChange={(e) => updatePerspective({ color: e.target.value })}
                      className="w-6 h-5 rounded cursor-pointer bg-transparent border border-white/20"
                      title="Color personalizado"
                    />
                  </div>
                </div>
              </div>

              {/* Vanishing Points Editor (supports outside-canvas coordinates!) */}
              {!isAxonometric && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Puntos de Fuga ({persp.vanishingPoints.length})
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Arrastra cualquier punto en el lienzo (incluso fuera de los bordes) o escribe coordenadas exactas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVanishingPoint}
                      className="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/60 text-amber-200 hover:bg-amber-400/30 text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nuevo PF</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {persp.vanishingPoints.map((vp) => (
                      <div
                        key={vp.id}
                        className="px-2.5 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs"
                        style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(0,0,0,0.22)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="color"
                            value={vp.color || persp.color}
                            onChange={(e) => handleUpdateVp(vp.id, { color: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent shrink-0"
                          />
                          <input
                            type="text"
                            value={vp.label}
                            onChange={(e) => handleUpdateVp(vp.id, { label: e.target.value })}
                            className="w-28 px-1.5 py-0.5 rounded border bg-black/30 text-xs"
                            style={{ borderColor: 'var(--studio-border-strong)' }}
                          />
                          <label className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-slate-400">X</span>
                            <input
                              type="number"
                              value={Math.round(vp.x)}
                              disabled={vp.locked}
                              onChange={(e) => handleUpdateVp(vp.id, { x: Number(e.target.value) || 0 })}
                              className="w-16 px-1.5 py-0.5 rounded border bg-black/30 tabular-nums disabled:opacity-50"
                              style={{ borderColor: 'var(--studio-border-strong)' }}
                            />
                          </label>
                          <label className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-slate-400">Y</span>
                            <input
                              type="number"
                              value={Math.round(vp.y)}
                              disabled={vp.locked}
                              onChange={(e) => handleUpdateVp(vp.id, { y: Number(e.target.value) || 0 })}
                              className="w-16 px-1.5 py-0.5 rounded border bg-black/30 tabular-nums disabled:opacity-50"
                              style={{ borderColor: 'var(--studio-border-strong)' }}
                            />
                          </label>
                          {(vp.x < 0 || vp.x > canvasWidth || vp.y < 0 || vp.y > canvasHeight) && (
                            <span className="text-[10px] font-mono text-sky-300">Exterior</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateVp(vp.id, { visible: !vp.visible })}
                            className="p-1 rounded hover:bg-white/10"
                            title={vp.visible ? 'Ocultar punto de fuga' : 'Mostrar punto de fuga'}
                          >
                            {vp.visible ? (
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateVp(vp.id, { locked: !vp.locked })}
                            className="p-1 rounded hover:bg-white/10"
                            title={vp.locked ? 'Desbloquear punto de fuga' : 'Bloquear punto de fuga'}
                          >
                            {vp.locked ? (
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVp(vp.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                            title="Eliminar punto de fuga"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 2: PISO Y ESCENARIO ===================== */}
          {tab === 'floor_stage' && (
            <div className="space-y-4">
              {/* Auto Floor Grid Card */}
              <div
                className="p-3.5 rounded-lg border space-y-3"
                style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-emerald-300">
                      Guía de Piso Automática en Perspectiva
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Genera y actualiza en tiempo real la cuadrícula de suelo a partir de los puntos de fuga activos.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={persp.floorGrid.enabled}
                      onChange={(e) => updateFloorGrid({ enabled: e.target.checked })}
                      className="accent-emerald-400 w-4 h-4"
                    />
                    <span>Activar Piso</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StudioSlider
                    label="Separación"
                    value={persp.floorGrid.spacing}
                    min={4}
                    max={48}
                    step={1}
                    unit=" px"
                    accentColor="#10b981"
                    onChange={(v) => updateFloorGrid({ spacing: v })}
                  />
                  <StudioSlider
                    label="Densidad (Columnas)"
                    value={persp.floorGrid.density}
                    min={3}
                    max={24}
                    step={1}
                    unit=" lín."
                    accentColor="#10b981"
                    onChange={(v) => updateFloorGrid({ density: v })}
                  />
                  <StudioSlider
                    label="Filas de Profundidad"
                    value={persp.floorGrid.depthRows}
                    min={2}
                    max={16}
                    step={1}
                    unit=" filas"
                    accentColor="#10b981"
                    onChange={(v) => updateFloorGrid({ depthRows: v })}
                  />
                  <StudioSlider
                    label="Opacidad del Piso"
                    value={Math.round(persp.floorGrid.opacity * 100)}
                    min={15}
                    max={100}
                    step={5}
                    unit="%"
                    accentColor="#10b981"
                    onChange={(v) => updateFloorGrid({ opacity: v / 100 })}
                  />
                  <StudioSlider
                    label="Línea Base del Suelo"
                    value={Math.round(persp.floorGrid.floorYRatio * 100)}
                    min={65}
                    max={110}
                    step={1}
                    unit="%"
                    accentColor="#10b981"
                    onChange={(v) => updateFloorGrid({ floorYRatio: v / 100 })}
                  />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-300">Color de cuadrícula</span>
                    <div className="flex items-center gap-1.5">
                      {['#10b981', '#38bdf8', '#f59e0b', '#a855f7', '#f43f5e'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateFloorGrid({ color: c })}
                          className={`w-5 h-5 rounded border ${
                            persp.floorGrid.color === c ? 'border-white scale-110' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={persp.floorGrid.color}
                        onChange={(e) => updateFloorGrid({ color: e.target.value })}
                        className="w-6 h-5 rounded cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Scenario / Stage Mode Depth Planes */}
              <div
                className="p-3.5 rounded-lg border space-y-3"
                style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-amber-300">
                      Guías de Profundidad de Escenario (Stage Mode)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Planos de profundidad visual, fondos lejanos, medios, suelo y primer plano.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stageD.autoShowInStageMode}
                        onChange={(e) => updateStageDepth({ autoShowInStageMode: e.target.checked })}
                        className="accent-amber-400"
                      />
                      <span>Auto en Stage Mode</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={stageD.enabled}
                        onChange={(e) => updateStageDepth({ enabled: e.target.checked })}
                        className="accent-amber-400 w-4 h-4"
                      />
                      <span>Mostrar ahora</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      ['showHorizon', 'Línea de horizonte'],
                      ['showGroundPlane', 'Plano del suelo'],
                      ['showVisualDepth', 'Profundidad visual'],
                      ['showFarBackground', 'Fondos lejanos'],
                      ['showMidBackground', 'Fondos medios'],
                      ['showForeground', 'Primer plano'],
                    ] as const
                  ).map(([key, lbl]) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stageD[key]}
                        onChange={(e) => updateStageDepth({ [key]: e.target.checked })}
                        className="accent-amber-400"
                      />
                      <span>{lbl}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <StudioSlider
                    label="Fondos lejanos"
                    value={stageD.farBgPct}
                    min={5}
                    max={60}
                    step={1}
                    unit="%"
                    onChange={(v) => updateStageDepth({ farBgPct: v })}
                  />
                  <StudioSlider
                    label="Horizonte escenario"
                    value={stageD.horizonPct}
                    min={15}
                    max={85}
                    step={1}
                    unit="%"
                    onChange={(v) => updateStageDepth({ horizonPct: v })}
                  />
                  <StudioSlider
                    label="Fondos medios"
                    value={stageD.midBgPct}
                    min={25}
                    max={90}
                    step={1}
                    unit="%"
                    onChange={(v) => updateStageDepth({ midBgPct: v })}
                  />
                  <StudioSlider
                    label="Plano del suelo"
                    value={stageD.groundPlanePct}
                    min={45}
                    max={96}
                    step={1}
                    unit="%"
                    onChange={(v) => updateStageDepth({ groundPlanePct: v })}
                  />
                  <StudioSlider
                    label="Primer plano"
                    value={stageD.foregroundPct}
                    min={65}
                    max={99}
                    step={1}
                    unit="%"
                    onChange={(v) => updateStageDepth({ foregroundPct: v })}
                  />
                  <StudioSlider
                    label="Opacidad de planos"
                    value={Math.round(stageD.opacity * 100)}
                    min={15}
                    max={100}
                    step={5}
                    unit="%"
                    onChange={(v) => updateStageDepth({ opacity: v / 100 })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 3: GUÍAS DE CÁMARA ===================== */}
          {tab === 'camera' && (
            <div className="space-y-4">
              <div
                className="p-3.5 rounded-lg border space-y-3"
                style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-amber-300">
                      Guías de Cámara (Fighting Mode & Stage Mode)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Define el área visible del juego, márgenes seguros, zona de combate, scroll y centro óptico.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cam.enabled}
                      onChange={(e) => updateCameraGuides({ enabled: e.target.checked })}
                      className="accent-amber-400 w-4 h-4"
                    />
                    <span>Activar Cámara</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      ['showVisibleArea', 'Área visible de juego'],
                      ['showSafeMargins', 'Márgenes de seguridad'],
                      ['showCombatZone', 'Zona de combate'],
                      ['showScrollLimits', 'Límites de scroll'],
                      ['showCameraCenter', 'Centro de cámara'],
                    ] as const
                  ).map(([key, lbl]) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cam[key]}
                        onChange={(e) => updateCameraGuides({ [key]: e.target.checked })}
                        className="accent-amber-400"
                      />
                      <span>{lbl}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <StudioSlider
                    label="Margen Área Visible"
                    value={cam.visibleAreaInsetPct}
                    min={0}
                    max={20}
                    step={1}
                    unit="%"
                    onChange={(v) => updateCameraGuides({ visibleAreaInsetPct: v })}
                  />
                  <StudioSlider
                    label="Márgenes de Seguridad"
                    value={cam.safeMarginPct}
                    min={2}
                    max={22}
                    step={1}
                    unit="%"
                    onChange={(v) => updateCameraGuides({ safeMarginPct: v })}
                  />
                  <StudioSlider
                    label="Margen Lateral Combate"
                    value={cam.combatZoneInsetXPct}
                    min={4}
                    max={30}
                    step={1}
                    unit="%"
                    onChange={(v) => updateCameraGuides({ combatZoneInsetXPct: v })}
                  />
                  <StudioSlider
                    label="Piso Zona Combate"
                    value={cam.combatZoneFloorPct}
                    min={65}
                    max={96}
                    step={1}
                    unit="%"
                    onChange={(v) => updateCameraGuides({ combatZoneFloorPct: v })}
                  />
                  <StudioSlider
                    label="Límites de Scroll"
                    value={cam.scrollLimitInsetPct}
                    min={2}
                    max={20}
                    step={1}
                    unit="%"
                    onChange={(v) => updateCameraGuides({ scrollLimitInsetPct: v })}
                  />
                  <StudioSlider
                    label="Opacidad Guías Cámara"
                    value={Math.round(cam.opacity * 100)}
                    min={15}
                    max={100}
                    step={5}
                    unit="%"
                    onChange={(v) => updateCameraGuides({ opacity: v / 100 })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 4: PRESETS Y EXPORTACIÓN ===================== */}
          {tab === 'presets' && (
            <div className="space-y-4">
              {/* 5 Genre Scenario Presets */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">
                  Guías para Escenarios por Género
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SCENARIO_GUIDE_PRESETS.map((sp) => {
                    const isActive = persp.activeScenarioPreset === sp.id && persp.enabled;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => handleApplyScenarioPreset(sp.id)}
                        className="p-2.5 rounded-lg border text-left transition-colors hover:bg-white/5"
                        style={{
                          borderColor: isActive ? sp.accent : 'var(--studio-border-strong)',
                          backgroundColor: isActive ? `${sp.accent}1a` : 'rgba(0,0,0,0.18)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-100">{sp.label}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: sp.accent }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug mt-1">{sp.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save / Export / Import Named Perspective Configurations */}
              <div
                className="p-3 rounded-lg border space-y-3"
                style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Guardar y Exportar Configuraciones de Perspectiva
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportCurrentConfigJson}
                      className="px-2.5 py-1 rounded-md border border-white/15 hover:bg-white/10 text-[11px] flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>Exportar JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => importConfigInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-md border border-white/15 hover:bg-white/10 text-[11px] flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Importar JSON</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={saveConfigName}
                    onChange={(e) => setSaveConfigName(e.target.value)}
                    placeholder="Ej: Perspectiva_KOF_Stage01"
                    className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded-lg border bg-black/30 text-xs focus:outline-none focus:border-amber-400"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  />
                  <select
                    value={saveConfigCategory}
                    onChange={(e) => setSaveConfigCategory(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border bg-black/30 text-xs"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  >
                    <option value="Fighting Games">Fighting Games</option>
                    <option value="Arquitectura">Arquitectura</option>
                    <option value="Urbano">Urbano</option>
                    <option value="RPG / Tileset">RPG / Tileset</option>
                    <option value="Personalizada">Personalizada</option>
                  </select>
                  <button
                    type="button"
                    disabled={!saveConfigName.trim()}
                    onClick={handleSaveCurrentPerspective}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {savedConfigs.map((cfg) => (
                    <div
                      key={cfg.id}
                      className="p-2 rounded-lg border flex flex-col justify-between gap-1.5"
                      style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(15,23,42,0.45)' }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-mono font-semibold text-slate-100 truncate">
                            {cfg.name}
                          </span>
                          {!cfg.builtIn && (
                            <button
                              type="button"
                              onClick={() => {
                                deleteUserPerspectiveConfig(cfg.id);
                                setSavedConfigs(loadSavedPerspectiveConfigs(canvasWidth, canvasHeight));
                              }}
                              className="text-rose-400 hover:text-rose-300 p-0.5"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {cfg.category} · {PERSPECTIVE_TYPE_META.find((t) => t.id === cfg.perspective.type)?.shortLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLoadSavedConfig(cfg)}
                        className="w-full py-1 rounded border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 text-amber-200 text-[11px] font-medium"
                      >
                        Cargar en lienzo
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classic Linear Animation / Fighting Guide Presets */}
              <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">Guías Lineales Clásicas (Horizontales / Verticales)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={replaceOnPreset}
                      onChange={(e) => setReplaceOnPreset(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>Reemplazar guías lineales</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {classicPresetCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.kind}
                        type="button"
                        onClick={() => onApplyPreset(card.kind, replaceOnPreset)}
                        className="p-2.5 rounded-lg border text-left hover:border-amber-400/70 hover:bg-white/5 transition-colors flex flex-col gap-1"
                        style={{ borderColor: 'var(--studio-border-strong)' }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${card.accent}`} />
                          <span className="text-[11px] font-semibold text-slate-100">{card.title}</span>
                        </div>
                        <p className="text-[10px] leading-snug text-slate-400">{card.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TAB 5: GRUPOS, REGLAS Y LISTA ===================== */}
          {(tab === 'groups' || tab === 'list') && (
            <div className="space-y-4">
              {/* Guide Groups Manager */}
              <div
                className="p-3 rounded-lg border space-y-2.5"
                style={{ borderColor: 'var(--studio-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Grupos de Guías (Color, Grosor y Opacidad por conjunto)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={newGroupColor}
                      onChange={(e) => setNewGroupColor(e.target.value)}
                      className="w-6 h-6 rounded bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Nuevo grupo..."
                      className="w-32 px-2 py-1 rounded border bg-black/30 text-xs"
                      style={{ borderColor: 'var(--studio-border-strong)' }}
                    />
                    <button
                      type="button"
                      disabled={!newGroupName.trim()}
                      onClick={handleAddGroup}
                      className="px-2 py-1 rounded bg-amber-400/20 border border-amber-400/50 text-amber-200 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Crear</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {groups.map((grp) => {
                    const count = guides.filter((g) => g.groupId === grp.id).length;
                    const isActive = guidesConfig.activeGroupId === grp.id;
                    return (
                      <div
                        key={grp.id}
                        className="px-2.5 py-1.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs"
                        style={{
                          borderColor: isActive ? grp.color : 'var(--studio-border)',
                          backgroundColor: isActive ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.22)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={grp.color}
                            onChange={(e) => handleUpdateGroup(grp.id, { color: e.target.value })}
                            className="w-5 h-5 rounded bg-transparent cursor-pointer"
                            title="Color del grupo"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onChangeGuidesConfig({ ...guidesConfig, activeGroupId: grp.id })
                            }
                            className="font-medium text-left hover:underline"
                          >
                            {grp.name}
                          </button>
                          <span className="text-[10px] font-mono text-slate-400">({count})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                            <span>Gr:</span>
                            <input
                              type="number"
                              min={1}
                              max={4}
                              step={0.5}
                              value={grp.thickness}
                              onChange={(e) =>
                                handleUpdateGroup(grp.id, {
                                  thickness: Math.max(1, Math.min(4, Number(e.target.value) || 1)),
                                })
                              }
                              className="w-11 px-1 py-0.5 rounded border bg-black/30 tabular-nums text-slate-200"
                              style={{ borderColor: 'var(--studio-border-strong)' }}
                            />
                          </label>
                          <label className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                            <span>Op:</span>
                            <input
                              type="number"
                              min={10}
                              max={100}
                              step={10}
                              value={Math.round(grp.opacity * 100)}
                              onChange={(e) =>
                                handleUpdateGroup(grp.id, {
                                  opacity: Math.max(0.1, Math.min(1, (Number(e.target.value) || 80) / 100)),
                                })
                              }
                              className="w-12 px-1 py-0.5 rounded border bg-black/30 tabular-nums text-slate-200"
                              style={{ borderColor: 'var(--studio-border-strong)' }}
                            />
                            <span>%</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleUpdateGroup(grp.id, { visible: !grp.visible })}
                            className="p-1 rounded hover:bg-white/10"
                            title={grp.visible ? 'Ocultar grupo' : 'Mostrar grupo'}
                          >
                            {grp.visible ? (
                              <Eye className="w-3.5 h-3.5 text-sky-400" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateGroup(grp.id, { locked: !grp.locked })}
                            className="p-1 rounded hover:bg-white/10"
                            title={grp.locked ? 'Desbloquear grupo' : 'Bloquear grupo'}
                          >
                            {grp.locked ? (
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          {groups.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(grp.id)}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                              title="Eliminar grupo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Units & Snap Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b" style={{ borderColor: 'var(--studio-border)' }}>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unidades de regla</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        ['px', 'Píxeles (px)'],
                        ['percent', 'Porcentaje (%)'],
                        ['custom', 'Personalizado'],
                      ] as [RulerUnit, string][]
                    ).map(([u, labelTxt]) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => onChangeGuidesConfig({ ...guidesConfig, unit: u })}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          guidesConfig.unit === u
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                            : 'border-white/10 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {labelTxt}
                      </button>
                    ))}
                  </div>
                  {guidesConfig.unit === 'custom' && (
                    <div className="flex items-center gap-2 pt-1">
                      <label className="text-[11px] text-slate-400">1 unidad =</label>
                      <input
                        type="number"
                        min={1}
                        max={256}
                        value={guidesConfig.customScale}
                        onChange={(e) =>
                          onChangeGuidesConfig({
                            ...guidesConfig,
                            customScale: Math.max(1, Number(e.target.value) || 16),
                          })
                        }
                        className="w-16 px-2 py-1 rounded border bg-black/30 text-xs font-mono tabular-nums"
                        style={{ borderColor: 'var(--studio-border-strong)' }}
                      />
                      <span className="text-[11px] text-slate-400">px ·</span>
                      <input
                        type="text"
                        value={guidesConfig.customLabel}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, customLabel: e.target.value })
                        }
                        className="w-16 px-2 py-1 rounded border bg-black/30 text-xs"
                        style={{ borderColor: 'var(--studio-border-strong)' }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Magnet className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ajuste magnético (Snap)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={guidesConfig.snapToGuides}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, snapToGuides: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>A guías</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-sky-300">
                      <input
                        type="checkbox"
                        checked={guidesConfig.snapToPerspective}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, snapToPerspective: e.target.checked })
                        }
                        className="accent-sky-400"
                      />
                      <span>A perspectiva</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={guidesConfig.snapToRulers}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, snapToRulers: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>A reglas</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={guidesConfig.snapToGrid}
                        onChange={(e) =>
                          onChangeGuidesConfig({ ...guidesConfig, snapToGrid: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>A cuadrícula ({guidesConfig.gridStep}px)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Active Guides List */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuidesConfig({ ...guidesConfig, showRulers: !guidesConfig.showRulers })
                    }
                    className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-xs flex items-center gap-1.5"
                  >
                    <Ruler className="w-3.5 h-3.5 text-amber-400" />
                    <span>{guidesConfig.showRulers ? 'Ocultar reglas' : 'Mostrar reglas'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuidesConfig({ ...guidesConfig, showGuides: !guidesConfig.showGuides })
                    }
                    className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-xs flex items-center gap-1.5"
                  >
                    {guidesConfig.showGuides ? (
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{guidesConfig.showGuides ? 'Guías visibles' : 'Guías ocultas'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuidesConfig({ ...guidesConfig, lockGuides: !guidesConfig.lockGuides })
                    }
                    className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-xs flex items-center gap-1.5"
                  >
                    {guidesConfig.lockGuides ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{guidesConfig.lockGuides ? 'Bloqueadas' : 'Bloquear todas'}</span>
                  </button>
                </div>

                {guides.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAllGuides}
                    className="px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar todas</span>
                  </button>
                )}
              </div>

              {guides.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-400 border border-dashed rounded-lg border-white/10">
                  No hay guías lineales activas. Arrastra desde una regla o crea una en «Guía Exacta».
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {guides.map((g) => {
                    const len = g.orientation === 'vertical' ? canvasWidth : canvasHeight;
                    return (
                      <div
                        key={g.id}
                        className="px-2.5 py-1.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs"
                        style={{
                          borderColor: 'var(--studio-border)',
                          backgroundColor: 'rgba(0,0,0,0.2)',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="color"
                            value={g.color || '#38bdf8'}
                            onChange={(e) => onUpdateGuide(g.id, { color: e.target.value })}
                            className="w-4 h-4 rounded bg-transparent cursor-pointer shrink-0"
                          />
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            {g.orientation === 'vertical' ? 'X' : 'Y'}
                          </span>
                          <input
                            type="number"
                            step={1}
                            value={g.position}
                            disabled={Boolean(g.locked || guidesConfig.lockGuides)}
                            onChange={(e) =>
                              onUpdateGuide(g.id, { position: Number(e.target.value) || 0 })
                            }
                            className="w-16 px-1.5 py-0.5 rounded border bg-black/30 font-mono tabular-nums text-xs disabled:opacity-50"
                            style={{ borderColor: 'var(--studio-border-strong)' }}
                          />
                          <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                            ({formatRulerCoordinate(
                              g.position,
                              guidesConfig.unit,
                              len,
                              guidesConfig.customScale,
                              guidesConfig.customLabel
                            )})
                          </span>
                          <select
                            value={g.groupId || groups[0]?.id || ''}
                            onChange={(e) => onUpdateGuide(g.id, { groupId: e.target.value })}
                            className="px-1.5 py-0.5 rounded border bg-black/30 text-[10px] max-w-[125px]"
                            style={{ borderColor: 'var(--studio-border-strong)' }}
                          >
                            {groups.map((grp) => (
                              <option key={grp.id} value={grp.id}>
                                {grp.name}
                              </option>
                            ))}
                          </select>
                          {g.label && (
                            <span className="text-slate-300 truncate max-w-[110px]">{g.label}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateGuide(g.id, { locked: !g.locked })}
                            className="p-1 rounded hover:bg-white/10 text-slate-300"
                            title={g.locked ? 'Desbloquear' : 'Bloquear'}
                          >
                            {g.locked ? (
                              <Lock className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateGuide(g.id)}
                            className="p-1 rounded hover:bg-white/10 text-slate-300"
                            title="Duplicar"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteGuide(g.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 6: CREAR GUÍA EXACTA ===================== */}
          {tab === 'exact' && (
            <form onSubmit={handleAddExact} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrientation('vertical');
                    setPositionPx(Math.round(canvasWidth / 2));
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    orientation === 'vertical'
                      ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                      : 'border-white/10 hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <span>Vertical (X)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrientation('horizontal');
                    setPositionPx(Math.round(canvasHeight / 2));
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    orientation === 'horizontal'
                      ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                      : 'border-white/10 hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <span>Horizontal (Y)</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-300">
                    Posición exacta ({orientation === 'vertical' ? 'X' : 'Y'})
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step={guidesConfig.unit === 'px' ? 1 : 0.5}
                      value={rawInput}
                      onChange={(e) => {
                        setRawInput(e.target.value);
                        const num = Number(e.target.value);
                        if (Number.isFinite(num)) {
                          setPositionPx(
                            parseUnitValueToPx(
                              num,
                              guidesConfig.unit,
                              axisLen,
                              guidesConfig.customScale
                            )
                          );
                        }
                      }}
                      className="w-24 px-2 py-1 rounded-md border bg-black/30 text-xs font-mono tabular-nums text-right focus:outline-none focus:border-amber-400"
                      style={{ borderColor: 'var(--studio-border-strong)' }}
                    />
                    <span className="text-xs font-mono text-slate-400 min-w-[28px]">
                      {unitSuffix}
                    </span>
                  </div>
                </div>

                <StudioSlider
                  label={orientation === 'vertical' ? 'Eje X en píxeles' : 'Eje Y en píxeles'}
                  value={Math.max(0, Math.min(axisLen, Math.round(positionPx)))}
                  min={0}
                  max={axisLen}
                  step={1}
                  unit=" px"
                  onChange={(v) => setPositionPx(v)}
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Rápidos:</span>
                  {[0, 0.25, 0.3333, 0.5, 0.6667, 0.75, 1].map((ratio) => {
                    const pxVal = Math.round(axisLen * ratio);
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setPositionPx(pxVal)}
                        className="px-2 py-0.5 rounded border border-white/10 hover:border-amber-400/60 hover:bg-white/5 text-[11px] font-mono tabular-nums text-slate-300"
                      >
                        {Math.round(ratio * 100)}%
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Grupo de guías</label>
                  <select
                    value={guideGroupId}
                    onChange={(e) => {
                      setGuideGroupId(e.target.value);
                      const grp = groups.find((g) => g.id === e.target.value);
                      if (grp) {
                        setColor(grp.color);
                        setGuideThickness(grp.thickness);
                        setGuideOpacity(grp.opacity);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-black/30 text-xs"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  >
                    {groups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        {grp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Etiqueta opcional</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={orientation === 'vertical' ? 'Ej: Eje central' : 'Ej: Suelo / Horizonte'}
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-black/30 text-xs focus:outline-none focus:border-amber-400"
                    style={{ borderColor: 'var(--studio-border-strong)' }}
                  />
                </div>

                <StudioSlider
                  label="Grosor"
                  value={guideThickness}
                  min={1}
                  max={4}
                  step={0.5}
                  unit=" px"
                  onChange={(v) => setGuideThickness(v)}
                />
                <StudioSlider
                  label="Opacidad"
                  value={Math.round(guideOpacity * 100)}
                  min={15}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(v) => setGuideOpacity(v / 100)}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-300">Color de guía</span>
                <div className="flex items-center gap-1.5">
                  {GUIDE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-transform ${
                        color === c ? 'border-white scale-110' : 'border-white/20 opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-3.5 h-3.5 text-slate-950" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              <div
                className="flex items-center justify-between pt-2 border-t"
                style={{ borderColor: 'var(--studio-border)' }}
              >
                <span className="text-[11px] font-mono tabular-nums text-slate-400">
                  {orientation === 'vertical' ? 'X' : 'Y'} ={' '}
                  {formatRulerCoordinate(
                    positionPx,
                    guidesConfig.unit,
                    axisLen,
                    guidesConfig.customScale,
                    guidesConfig.customLabel
                  )}{' '}
                  ({positionPx} px)
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear guía</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-[11px]"
          style={{
            borderColor: 'var(--studio-border)',
            backgroundColor: 'var(--studio-bg-header)',
            color: 'var(--studio-text-muted)',
          }}
        >
          <span className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>Arrastra puntos de fuga incluso fuera del lienzo · Shift alinea al horizonte · Alt duplica guías</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md border border-white/10 hover:bg-white/10 text-slate-200 font-medium shrink-0"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
