import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  ImagePlus,
  Lock,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Unlock,
  Upload,
  User,
  Wand2,
} from 'lucide-react';
import {
  DummieDisplayMode,
  DummieOverlayMode,
  DummiePerspectiveMode,
  DummiePose,
  DummieRigType,
  ReferenceItem,
} from '../types';
import {
  BUILTIN_POSE_PRESETS,
  DUMMIE_RIG_TEMPLATES,
  analyzeDummieBalance,
  applyPresetToDummiePose,
  computeDummieVolumes25D,
  generateDummiePoseFromImageDataUrl,
  getEffectivePoseJoints,
} from '../utils/dummieRigEngine';
import { StudioSlider } from './StudioSlider';

interface DummiePosePanelProps {
  pose: DummiePose;
  onChangePose: (next: DummiePose) => void;
  savedPoses: DummiePose[];
  onSavePose: (pose: DummiePose) => void;
  onDeleteSavedPose: (id: string) => void;
  onOpenApplyModal: () => void;
  references?: ReferenceItem[];
}

const DISPLAY_MODE_OPTIONS: { id: DummieDisplayMode; label: string }[] = [
  { id: 'joints_and_volumes', label: 'Artic. + Vol 2.5D' },
  { id: 'volumes_only', label: 'Solo Volúmenes' },
  { id: 'joints_only', label: 'Solo Articulaciones' },
  { id: 'simple_silhouette', label: 'Silueta Simple' },
  { id: 'solid_silhouette', label: 'Silueta Sólida' },
];

export const DummiePosePanel: React.FC<DummiePosePanelProps> = ({
  pose,
  onChangePose,
  savedPoses,
  onSavePose,
  onDeleteSavedPose,
  onOpenApplyModal,
  references = [],
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePoseInputRef = useRef<HTMLInputElement>(null);
  const [draggingJointId, setDraggingJointId] = useState<string | null>(null);
  const [selectedJointId, setSelectedJointId] = useState<string | null>('chest');
  const [saveName, setSaveName] = useState('');
  const [saveCat, setSaveCat] = useState('Combate');
  const [isGeneratingFromImg, setIsGeneratingFromImg] = useState(false);

  const effectiveJoints = useMemo(() => getEffectivePoseJoints(pose), [pose]);
  const selectedJoint = pose.joints.find((j) => j.id === selectedJointId) || null;
  const effectiveSelected = effectiveJoints.find((j) => j.id === selectedJointId) || null;

  const w = 240;
  const h = 230;
  const volumes25D = useMemo(() => computeDummieVolumes25D(pose, w, h), [pose]);
  const balanceReport = useMemo(() => analyzeDummieBalance(pose), [pose]);

  const displayMode: DummieDisplayMode =
    pose.modifiers.displayMode ||
    (pose.modifiers.skeletonMode ? 'joints_only' : 'joints_and_volumes');
  const perspMode: DummiePerspectiveMode = pose.modifiers.perspectiveMode || 'light';

  useEffect(() => {
    if (!draggingJointId) return;
    const handleMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const nx = Math.max(0.04, Math.min(0.96, (e.clientX - rect.left) / rect.width));
      const ny = Math.max(0.04, Math.min(0.96, (e.clientY - rect.top) / rect.height));
      onChangePose({
        ...pose,
        joints: pose.joints.map((j) => {
          if (j.id === draggingJointId && !j.locked) {
            return { ...j, x: nx, y: ny };
          }
          if (
            pose.modifiers.autoSymmetry &&
            j.mirrorId === draggingJointId &&
            !j.locked
          ) {
            return { ...j, x: Math.max(0.04, Math.min(0.96, 1 - nx)), y: ny };
          }
          return j;
        }),
      });
    };
    const handleUp = () => setDraggingJointId(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggingJointId, pose, onChangePose]);

  const updateSelectedJointProp = (patch: Partial<{ rx: number; ry: number; rz: number; depth: number; locked: boolean }>) => {
    if (!selectedJoint) return;
    onChangePose({
      ...pose,
      joints: pose.joints.map((j) =>
        j.id === selectedJoint.id ? { ...j, ...patch } : j
      ),
    });
  };

  const handleExportPose = () => {
    const blob = new Blob([JSON.stringify(pose, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pose.name.replace(/\s+/g, '_').toLowerCase()}.pose`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || ''));
        if (parsed && Array.isArray(parsed.joints)) {
          onChangePose({ ...pose, ...parsed, id: `pose-imp-${Date.now()}` });
        }
      } catch {
        // ignore invalid pose file
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGenerateFromImageFile = async (file: File) => {
    setIsGeneratingFromImg(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (url) {
        const nextPose = await generateDummiePoseFromImageDataUrl(
          url,
          pose.rigType,
          file.name.replace(/\.[^.]+$/, '')
        );
        onChangePose({
          ...nextPose,
          overlayMode: pose.overlayMode,
          overlayColor: pose.overlayColor,
          overlayOpacity: pose.overlayOpacity,
          lineWidth: pose.lineWidth,
          modifiers: {
            ...nextPose.modifiers,
            perspectiveMode: perspMode,
            displayMode,
            pixelArtSimplified: pose.modifiers.pixelArtSimplified,
            showTail: pose.modifiers.showTail,
            showEars: pose.modifiers.showEars,
            showWings: pose.modifiers.showWings,
            showHorns: pose.modifiers.showHorns,
          },
        });
      }
      setIsGeneratingFromImg(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateFromReference = async (refItem: ReferenceItem) => {
    setIsGeneratingFromImg(true);
    const nextPose = await generateDummiePoseFromImageDataUrl(
      refItem.dataUrl,
      pose.rigType,
      refItem.name
    );
    onChangePose({
      ...nextPose,
      overlayMode: pose.overlayMode,
      overlayColor: pose.overlayColor,
      overlayOpacity: pose.overlayOpacity,
      lineWidth: pose.lineWidth,
      modifiers: {
        ...nextPose.modifiers,
        perspectiveMode: perspMode,
        displayMode,
        pixelArtSimplified: pose.modifiers.pixelArtSimplified,
        showTail: pose.modifiers.showTail,
        showEars: pose.modifiers.showEars,
        showWings: pose.modifiers.showWings,
        showHorns: pose.modifiers.showHorns,
      },
    });
    setIsGeneratingFromImg(false);
  };

  const showVolumes = displayMode !== 'joints_only';
  const showJointHandles = displayMode === 'joints_only' || displayMode === 'joints_and_volumes';
  const isSolidSilhouette = displayMode === 'solid_silhouette';
  const isSimpleSilhouette = displayMode === 'simple_silhouette';

  return (
    <div className="flex flex-col gap-2 text-[11px] select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pose,.json"
        className="hidden"
        onChange={handleImportPose}
      />
      <input
        ref={imagePoseInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleGenerateFromImageFile(f);
          e.target.value = '';
        }}
      />

      {/* Body Type & Apply Pose CTA */}
      <div className="flex items-center justify-between gap-1.5">
        <select
          value={pose.rigType}
          onChange={(e) => {
            const nextRig = e.target.value as DummieRigType;
            const next = applyPresetToDummiePose(nextRig, 'idle');
            onChangePose({
              ...next,
              overlayMode: pose.overlayMode,
              overlayColor: pose.overlayColor,
              overlayOpacity: pose.overlayOpacity,
              modifiers: {
                ...next.modifiers,
                perspectiveMode: perspMode,
                displayMode,
                pixelArtSimplified: pose.modifiers.pixelArtSimplified,
              },
            });
          }}
          className="flex-1 px-2 py-1 rounded border text-[11px] font-semibold"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-border-strong)',
            color: 'var(--studio-text)',
          }}
          title="Tipo de Cuerpo Base 2.5D"
        >
          {DUMMIE_RIG_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              Cuerpo: {t.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onOpenApplyModal}
          className="px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 shadow-sm hover:opacity-90"
          style={{
            backgroundColor: 'var(--studio-accent)',
            color: 'var(--studio-accent-text)',
          }}
          title="Aplicar esta pose a un sprite / personaje de forma no destructiva"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Aplicar Pose</span>
        </button>
      </div>

      {/* Generate Dummie From Image / Reference */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isGeneratingFromImg}
          onClick={() => imagePoseInputRef.current?.click()}
          className="flex-1 py-1 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: 'var(--studio-border-strong)',
            color: 'var(--studio-accent)',
          }}
          title="Analiza la silueta de cualquier imagen o foto y genera una pose editable"
        >
          <ImagePlus className="w-3.5 h-3.5" />
          <span>{isGeneratingFromImg ? 'Analizando silueta...' : 'Generar Dummie desde Imagen'}</span>
        </button>

        {references.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => {
              const refItem = references.find((r) => r.id === e.target.value);
              if (refItem) void handleGenerateFromReference(refItem);
              e.target.value = '';
            }}
            className="px-1.5 py-1 rounded-lg border text-[10px] max-w-[96px]"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
            title="Generar Dummie directamente desde una referencia cargada"
          >
            <option value="" disabled>
              Desde Ref...
            </option>
            {references.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Interactive 2.5D Volumetric Mannequin Viewport */}
      <div
        className="rounded-lg border relative overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--studio-bg-canvas)',
          borderColor: 'var(--studio-border-strong)',
        }}
      >
        <div
          className="px-2 py-1 border-b flex items-center justify-between text-[10px]"
          style={{ backgroundColor: 'var(--studio-bg-bar)', borderColor: 'var(--studio-border)' }}
        >
          <span className="font-mono font-bold truncate">
            {pose.name} · 2.5D
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangePose(applyPresetToDummiePose(pose.rigType, 'idle'))}
              title="Restablecer pose neutral"
              className="p-0.5 rounded hover:opacity-80"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleExportPose}
              title="Exportar archivo .pose"
              className="p-0.5 rounded hover:opacity-80"
            >
              <Download className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Importar archivo .pose"
              className="p-0.5 rounded hover:opacity-80"
            >
              <Upload className="w-3 h-3" />
            </button>
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-56 cursor-crosshair touch-none"
        >
          {/* Perspective floor grid & center gravity line */}
          <line x1={12} y1={h * 0.89} x2={w - 12} y2={h * 0.89} stroke="rgba(148,163,184,0.22)" strokeWidth={1} />
          <ellipse
            cx={balanceReport.centerX * w}
            cy={h * 0.89}
            rx={28}
            ry={6}
            fill="rgba(15,23,42,0.45)"
            stroke={balanceReport.balanced ? 'rgba(52,211,153,0.45)' : 'rgba(251,191,36,0.6)'}
            strokeWidth={1}
          />
          {pose.modifiers.showBalanceLine && (
            <line
              x1={balanceReport.centerX * w}
              y1={12}
              x2={balanceReport.centerX * w}
              y2={h * 0.89}
              stroke={balanceReport.balanced ? 'rgba(52,211,153,0.35)' : 'rgba(251,191,36,0.55)'}
              strokeWidth={1.1}
              strokeDasharray="3 3"
            />
          )}

          {/* 2.5D Volumetric Shapes (Z-Sorted) */}
          {showVolumes &&
            volumes25D.map((shape) => {
              const fillCol = isSolidSilhouette
                ? pose.overlayColor
                : isSimpleSilhouette
                ? 'rgba(56, 189, 248, 0.14)'
                : shape.fill;
              const strokeCol = isSolidSilhouette ? pose.overlayColor : shape.stroke;
              const strokeW = isSimpleSilhouette ? 1.5 : 1.1;

              if (shape.kind === 'box' && shape.faces) {
                return (
                  <g
                    key={shape.id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedJointId(shape.jointId);
                    }}
                    className="cursor-pointer"
                  >
                    {shape.faces.map((f) => (
                      <polygon
                        key={f.id}
                        points={f.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                        fill={isSolidSilhouette ? pose.overlayColor : isSimpleSilhouette ? 'rgba(56,189,248,0.12)' : f.fill}
                        stroke={strokeCol}
                        strokeWidth={strokeW}
                        strokeLinejoin="round"
                        opacity={isSolidSilhouette ? 0.88 : 0.92}
                      />
                    ))}
                    {!isSolidSilhouette && shape.frontAxisEnd && shape.cx !== undefined && shape.cy !== undefined && (
                      <line
                        x1={shape.cx}
                        y1={shape.cy}
                        x2={shape.frontAxisEnd.x}
                        y2={shape.frontAxisEnd.y}
                        stroke="#fbbf24"
                        strokeWidth={1.4}
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              }

              if (shape.kind === 'sphere' && shape.cx !== undefined && shape.cy !== undefined && shape.rx) {
                const yawShift = Math.sin(((shape.yawDeg || 0) * Math.PI) / 180) * shape.rx * 0.65;
                const pitchShift = Math.sin(((shape.pitchDeg || 0) * Math.PI) / 180) * (shape.ry || shape.rx) * 0.5;
                return (
                  <g
                    key={shape.id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedJointId(shape.jointId);
                    }}
                  >
                    <ellipse
                      cx={shape.cx}
                      cy={shape.cy}
                      rx={shape.rx}
                      ry={shape.ry || shape.rx}
                      fill={fillCol}
                      stroke={strokeCol}
                      strokeWidth={1.4}
                      opacity={isSolidSilhouette ? 0.9 : 1}
                    />
                    {/* Loomis facial center crosshairs */}
                    {!isSolidSilhouette && (
                      <>
                        <line
                          x1={shape.cx - shape.rx * 0.9}
                          y1={shape.cy + pitchShift}
                          x2={shape.cx + shape.rx * 0.9}
                          y2={shape.cy + pitchShift}
                          stroke="#fbbf24"
                          strokeWidth={1}
                          opacity={0.75}
                        />
                        <line
                          x1={shape.cx + yawShift}
                          y1={shape.cy - (shape.ry || shape.rx) * 0.85}
                          x2={shape.cx + yawShift}
                          y2={shape.cy + (shape.ry || shape.rx) * 0.85}
                          stroke="#fbbf24"
                          strokeWidth={1.1}
                          opacity={0.8}
                        />
                      </>
                    )}
                  </g>
                );
              }

              if (shape.polyPoints && shape.polyPoints.length > 0) {
                return (
                  <polygon
                    key={shape.id}
                    points={shape.polyPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                    fill={fillCol}
                    stroke={strokeCol}
                    strokeWidth={strokeW}
                    strokeLinejoin="round"
                    opacity={isSolidSilhouette ? 0.88 : 0.94}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedJointId(shape.jointId);
                    }}
                  />
                );
              }
              return null;
            })}

          {/* Skeleton / Articulation Bones */}
          {(showJointHandles || displayMode === 'simple_silhouette') &&
            effectiveJoints.map((j) => {
              if (!j.parentId) return null;
              const parent = effectiveJoints.find((p) => p.id === j.parentId);
              if (!parent) return null;
              return (
                <line
                  key={`bone-${j.id}`}
                  x1={parent.x * w}
                  y1={parent.y * h}
                  x2={j.x * w}
                  y2={j.y * h}
                  stroke={pose.overlayColor}
                  strokeWidth={displayMode === 'joints_only' ? 1.6 : Math.max(1.2, pose.lineWidth * 0.7)}
                  strokeLinecap="round"
                  opacity={displayMode === 'simple_silhouette' ? 0.45 : 0.85}
                />
              );
            })}

          {/* Interactive 2.5D X/Y/Z Axis Gizmo around Selected Joint */}
          {effectiveSelected && !isSolidSilhouette && (
            <g className="pointer-events-none">
              <ellipse
                cx={effectiveSelected.x * w}
                cy={effectiveSelected.y * h}
                rx={16}
                ry={6}
                fill="none"
                stroke="#34d399"
                strokeWidth={1.2}
                strokeDasharray="2 2"
              />
              <ellipse
                cx={effectiveSelected.x * w}
                cy={effectiveSelected.y * h}
                rx={6}
                ry={16}
                fill="none"
                stroke="#f87171"
                strokeWidth={1.2}
                strokeDasharray="2 2"
              />
              <circle
                cx={effectiveSelected.x * w}
                cy={effectiveSelected.y * h}
                r={13}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={1.1}
                opacity={0.75}
              />
            </g>
          )}

          {/* Interactive Joint Handles */}
          {showJointHandles &&
            effectiveJoints.map((j) => {
              const isSelected = j.id === selectedJointId;
              return (
                <g
                  key={j.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedJointId(j.id);
                    if (!j.locked) setDraggingJointId(j.id);
                  }}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <circle
                    cx={j.x * w}
                    cy={j.y * h}
                    r={isSelected ? 5 : 3.6}
                    fill={j.locked ? '#ef4444' : isSelected ? '#fbbf24' : '#ffffff'}
                    stroke="#090d16"
                    strokeWidth={1.3}
                  />
                </g>
              );
            })}
        </svg>

        {/* Active Joint 2.5D Rotation & Depth Controls */}
        {selectedJoint && (
          <div
            className="px-2 py-1.5 border-t flex flex-col gap-1 text-[10px]"
            style={{ backgroundColor: 'var(--studio-bg-bar)', borderColor: 'var(--studio-border)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold truncate">
                <User className="w-3 h-3 inline mr-1 opacity-70" />
                {selectedJoint.label}
              </span>
              <button
                type="button"
                onClick={() => updateSelectedJointProp({ locked: !selectedJoint.locked })}
                className="px-1.5 py-0.5 rounded border flex items-center gap-1"
                style={{
                  borderColor: 'var(--studio-border-strong)',
                  color: selectedJoint.locked ? '#f87171' : 'var(--studio-text)',
                }}
              >
                {selectedJoint.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{selectedJoint.locked ? 'Fija' : 'Libre'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5">
              <StudioSlider
                variant="panel"
                label="Giro Y (Yaw)"
                value={selectedJoint.ry ?? 0}
                min={-90}
                max={90}
                step={1}
                unit="°"
                defaultValue={0}
                accentColor="#34d399"
                onChange={(v) => updateSelectedJointProp({ ry: v })}
              />
              <StudioSlider
                variant="panel"
                label="Inclin. X"
                value={selectedJoint.rx ?? 0}
                min={-75}
                max={75}
                step={1}
                unit="°"
                defaultValue={0}
                accentColor="#f87171"
                onChange={(v) => updateSelectedJointProp({ rx: v })}
              />
              <StudioSlider
                variant="panel"
                label="Rotac. Z"
                value={selectedJoint.rz ?? 0}
                min={-180}
                max={180}
                step={1}
                unit="°"
                defaultValue={0}
                accentColor="#38bdf8"
                onChange={(v) => updateSelectedJointProp({ rz: v })}
              />
              <StudioSlider
                variant="panel"
                label="Profundidad Z"
                value={selectedJoint.depth ?? 0}
                min={-0.35}
                max={0.35}
                step={0.02}
                defaultValue={0}
                formatValue={(v) => v.toFixed(2)}
                onChange={(v) => updateSelectedJointProp({ depth: v })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Balance Assistant Readout */}
      <div
        className="px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[10px]"
        style={{
          backgroundColor: balanceReport.balanced ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)',
          borderColor: balanceReport.balanced ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.45)',
          color: balanceReport.balanced ? '#6ee7b7' : '#fcd34d',
        }}
      >
        {balanceReport.balanced ? (
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="truncate">{balanceReport.message}</span>
      </div>

      {/* 2.5D Display Mode, Perspective, Appendages & Pixel Art Mode */}
      <div
        className="p-2 rounded-lg border flex flex-col gap-1.5"
        style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
      >
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex flex-col gap-0.5 text-[10px]">
            <span style={{ color: 'var(--studio-text-muted)' }}>Modo Visual 2.5D</span>
            <select
              value={displayMode}
              onChange={(e) =>
                onChangePose({
                  ...pose,
                  modifiers: {
                    ...pose.modifiers,
                    displayMode: e.target.value as DummieDisplayMode,
                    skeletonMode: e.target.value === 'joints_only',
                  },
                })
              }
              className="px-1.5 py-1 rounded border text-[10px]"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              {DISPLAY_MODE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5 text-[10px]">
            <span style={{ color: 'var(--studio-text-muted)' }}>Perspectiva</span>
            <select
              value={perspMode}
              onChange={(e) =>
                onChangePose({
                  ...pose,
                  modifiers: {
                    ...pose.modifiers,
                    perspectiveMode: e.target.value as DummiePerspectiveMode,
                  },
                })
              }
              className="px-1.5 py-1 rounded border text-[10px]"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <option value="off">Ortográfica (Off)</option>
              <option value="light">Perspectiva Ligera</option>
              <option value="dynamic">Dinámica / Escorzo</option>
            </select>
          </label>
        </div>

        {/* Overlay Placement */}
        <div className="flex items-center justify-between gap-1 text-[10px]">
          <span style={{ color: 'var(--studio-text-muted)' }}>Sobre Lienzo:</span>
          <div className="flex gap-1">
            {(
              [
                ['panel', 'Panel'],
                ['canvas', 'Lienzo'],
                ['floating', 'Flotante'],
              ] as [DummieOverlayMode, string][]
            ).map(([m, lbl]) => (
              <button
                key={m}
                type="button"
                onClick={() => onChangePose({ ...pose, overlayMode: m })}
                className="px-1.5 py-0.5 rounded border font-semibold"
                style={{
                  backgroundColor: pose.overlayMode === m ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  color: pose.overlayMode === m ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                  borderColor: 'var(--studio-border-strong)',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 items-center text-[10px] font-mono tabular-nums">
          <StudioSlider
            variant="panel"
            label="Opac."
            value={Math.round(pose.overlayOpacity * 100)}
            min={15}
            max={100}
            step={1}
            unit="%"
            defaultValue={75}
            onChange={(v) => onChangePose({ ...pose, overlayOpacity: v / 100 })}
          />
          <StudioSlider
            variant="panel"
            label="Grosor"
            value={pose.lineWidth}
            min={1}
            max={6}
            step={0.5}
            unit="px"
            defaultValue={2}
            onChange={(v) => onChangePose({ ...pose, lineWidth: v })}
          />
          <label className="flex items-center justify-between gap-1">
            <span style={{ color: 'var(--studio-text-muted)' }}>Color:</span>
            <input
              type="color"
              value={pose.overlayColor}
              onChange={(e) => onChangePose({ ...pose, overlayColor: e.target.value })}
              className="w-6 h-5 rounded cursor-pointer bg-transparent"
            />
          </label>
        </div>

        {/* Optional Appendages & Helpers */}
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(pose.modifiers.pixelArtSimplified)}
              onChange={(e) =>
                onChangePose({ ...pose, modifiers: { ...pose.modifiers, pixelArtSimplified: e.target.checked } })
              }
              className="accent-amber-400"
            />
            <span className="font-semibold text-sky-300">Pixel Art Simplificado</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={pose.modifiers.autoSymmetry}
              onChange={(e) =>
                onChangePose({ ...pose, modifiers: { ...pose.modifiers, autoSymmetry: e.target.checked } })
              }
              className="accent-amber-400"
            />
            <span>Simetría</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={pose.modifiers.showBalanceLine}
              onChange={(e) =>
                onChangePose({ ...pose, modifiers: { ...pose.modifiers, showBalanceLine: e.target.checked } })
              }
              className="accent-amber-400"
            />
            <span>Equilibrio</span>
          </label>
          {(
            [
              ['showTail', 'Cola'],
              ['showEars', 'Orejas'],
              ['showWings', 'Alas'],
              ['showHorns', 'Cuernos'],
            ] as const
          ).map(([key, lbl]) => (
            <label key={key} className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(pose.modifiers[key])}
                onChange={(e) =>
                  onChangePose({ ...pose, modifiers: { ...pose.modifiers, [key]: e.target.checked } })
                }
                className="accent-amber-400"
              />
              <span>{lbl}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Posture Modifiers */}
      <div
        className="p-2 rounded-lg border flex flex-col gap-1.5"
        style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
      >
        <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: 'var(--studio-text-muted)' }}>
          <Sliders className="w-3 h-3" /> Modificadores Anatómicos
        </span>
        <div className="grid grid-cols-2 gap-2">
          <StudioSlider
            variant="panel"
            label="Inclinación"
            value={pose.modifiers.bodyLean}
            min={-30}
            max={30}
            step={1}
            unit="°"
            defaultValue={0}
            onChange={(v) =>
              onChangePose({ ...pose, modifiers: { ...pose.modifiers, bodyLean: v } })
            }
          />
          <StudioSlider
            variant="panel"
            label="Cabeza"
            value={pose.modifiers.headTilt}
            min={-30}
            max={30}
            step={1}
            unit="°"
            defaultValue={0}
            onChange={(v) =>
              onChangePose({ ...pose, modifiers: { ...pose.modifiers, headTilt: v } })
            }
          />
          <StudioSlider
            variant="panel"
            label="Apertura Brazos"
            value={pose.modifiers.armSpread}
            min={0.5}
            max={1.6}
            step={0.1}
            unit="×"
            defaultValue={1.0}
            formatValue={(v) => v.toFixed(1)}
            onChange={(v) =>
              onChangePose({ ...pose, modifiers: { ...pose.modifiers, armSpread: v } })
            }
          />
          <StudioSlider
            variant="panel"
            label="Escala Extrem."
            value={pose.modifiers.limbLengthScale}
            min={0.75}
            max={1.35}
            step={0.05}
            unit="×"
            defaultValue={1.0}
            formatValue={(v) => v.toFixed(2)}
            onChange={(v) =>
              onChangePose({ ...pose, modifiers: { ...pose.modifiers, limbLengthScale: v } })
            }
          />
        </div>
      </div>

      {/* 14 Built-in Pose Presets */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: 'var(--studio-text-muted)' }}>
          <Activity className="w-3 h-3" /> Poses Preestablecidas ({BUILTIN_POSE_PRESETS.length})
        </span>
        <div className="grid grid-cols-3 gap-1">
          {BUILTIN_POSE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                const next = applyPresetToDummiePose(pose.rigType, p.id);
                onChangePose({
                  ...next,
                  overlayMode: pose.overlayMode,
                  overlayColor: pose.overlayColor,
                  overlayOpacity: pose.overlayOpacity,
                  lineWidth: pose.lineWidth,
                  modifiers: {
                    ...next.modifiers,
                    perspectiveMode: perspMode,
                    displayMode,
                    pixelArtSimplified: pose.modifiers.pixelArtSimplified,
                    showTail: pose.modifiers.showTail,
                    showEars: pose.modifiers.showEars,
                    showWings: pose.modifiers.showWings,
                    showHorns: pose.modifiers.showHorns,
                  },
                });
              }}
              className="px-1.5 py-1 rounded border text-[10px] truncate hover:opacity-90"
              style={{
                backgroundColor: pose.name === p.name ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                color: pose.name === p.name ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                borderColor: 'var(--studio-border-strong)',
              }}
              title={`${p.name} (${p.category})`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Save / Organize Custom Poses */}
      <div
        className="p-2 rounded-lg border flex flex-col gap-1.5"
        style={{ backgroundColor: 'var(--studio-bg-card)', borderColor: 'var(--studio-border)' }}
      >
        <div className="flex gap-1">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Guardar pose como..."
            className="flex-1 px-2 py-1 rounded border text-[10px]"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
          />
          <select
            value={saveCat}
            onChange={(e) => setSaveCat(e.target.value)}
            className="px-1.5 py-1 rounded border text-[10px]"
            style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)', color: 'var(--studio-text)' }}
          >
            <option value="Combate">Combate</option>
            <option value="Básicas">Básicas</option>
            <option value="Especial">Especial</option>
          </select>
          <button
            type="button"
            disabled={!saveName.trim()}
            onClick={() => {
              onSavePose({ ...pose, id: `pose-saved-${Date.now()}`, name: saveName.trim(), category: saveCat });
              setSaveName('');
            }}
            className="px-2 py-1 rounded border font-bold disabled:opacity-40"
            style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)', borderColor: 'var(--studio-accent)' }}
          >
            <Save className="w-3 h-3" />
          </button>
        </div>

        {savedPoses.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {savedPoses.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]"
                style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border-strong)' }}
              >
                <button type="button" onClick={() => onChangePose(sp)} className="hover:underline font-medium">
                  {sp.name}
                </button>
                <button type="button" onClick={() => onDeleteSavedPose(sp.id)} className="text-rose-400 opacity-70 hover:opacity-100">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
