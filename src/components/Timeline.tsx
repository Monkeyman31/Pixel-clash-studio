import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Copy,
  Trash2,
  Clock,
  Layers,
  Grid3X3,
  ShieldAlert,
  Target,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Grid,
  Filter,
  LayoutGrid,
  Rows3,
  Table2,
  Minus,
  Link2,
  Diamond,
  Flag,
  MessageSquare,
  Zap,
  StretchHorizontal,
  Folder,
  FolderOpen,
  GripVertical,
  ChevronDown,
  Camera,
  Scan,
  Maximize,
  Sparkles,
} from 'lucide-react';
import {
  ActionTag,
  AnimationClip,
  CameraKeyframe,
  DEFAULT_ONION_SKIN_CONFIG,
  DEFAULT_ONION_SKIN_TRAIL_CONFIG,
  Frame,
  FramePhase,
  KeyframeEasing,
  Layer,
  LayerGroup,
  LayerKeyframe,
  OnionSkinBlendMode,
  OnionSkinColorMode,
  OnionSkinConfig,
  OnionSkinDetailLevel,
  OnionSkinDirectionConfig,
  OnionSkinDisplayMode,
  OnionSkinPresetId,
  PerformanceMode,
  TimelineEvent,
  TimelineMarker,
} from '../types';
import { PanelDockZone, TimelineSectionId } from '../constants/workspaceThemes';
import {
  applyKeyframeEasing,
  compositeFrame,
  getFrameDurationMs,
  renderPixelGridToCanvas,
  ThumbnailBoundsMode,
} from '../utils/pixelMath';
import { scheduleIdleTask } from '../utils/renderCache';
import {
  ONION_BLEND_MODE_OPTIONS,
  ONION_COLOR_MODE_OPTIONS,
  ONION_DETAIL_LEVEL_OPTIONS,
  ONION_DISPLAY_MODE_OPTIONS,
  ONION_OPACITY_PRESETS,
  applyOnionSkinPreset,
  resolveOnionColorModeHex,
} from '../utils/onionSkinEngine';
import {
  buildProjectLayerTracks,
  isTimelineMovementOnlyGroup,
  layerHasVisibleContent,
} from '../utils/layerTracks';
import { StudioSlider } from './StudioSlider';
import { STUDIO_Z } from './StudioTopLayer';

interface TimelineProps {
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (index: number) => void;
  onDeleteFrame: (index: number) => void;
  onReorderFrame?: (fromIndex: number, toIndex: number) => void;
  // Duration handlers supporting seconds / ms
  onChangeFrameDuration: (index: number, durationTicks: number, durationMs?: number) => void;
  onChangeFramePhase?: (index: number, phase: FramePhase) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevFrame: () => void;
  onNextFrame: () => void;
  clips?: AnimationClip[];
  activeClipId?: string;
  onSelectClip?: (clipId: string) => void;
  onCreateClip?: () => void;
  canvasWidth: number;
  canvasHeight: number;
  // Animation tools placed above timeline
  onionSkinEnabled: boolean;
  onToggleOnionSkin: () => void;
  onionSkinOpacity: number;
  onChangeOnionSkinOpacity: (opacity: number) => void;
  onionSkinPrev?: number;
  onChangeOnionSkinPrev?: (count: number) => void;
  onionSkinNext?: number;
  onChangeOnionSkinNext?: (count: number) => void;
  onionSkinConfig?: OnionSkinConfig;
  onChangeOnionSkinConfig?: (next: OnionSkinConfig) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showHitboxes: boolean;
  onToggleHitboxes: () => void;
  showPivot: boolean;
  onTogglePivot: () => void;
  playbackMode: 'loop' | 'pingpong' | 'once';
  onChangePlaybackMode: (mode: 'loop' | 'pingpong' | 'once') => void;
  // Unified Movement Groups (Action Tags fused into Groups)
  layerGroups: LayerGroup[];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  isolateActiveGroup: boolean;
  onToggleIsolateGroup: () => void;
  onCreateMovementGroup?: (name: string, color: string, category: any) => void;
  onAssignFrameToGroup?: (frameIndex: number, groupId: string | null) => void;
  onOpenSpriteSheetModal?: () => void;
  // Multi-selection props
  selectedFrameIndices?: number[];
  onSelectFrameIndices?: (indices: number[]) => void;
  onBatchChangeDuration?: (indices: number[], durationTicks: number, durationMs?: number) => void;
  onBatchChangePhase?: (indices: number[], phase: FramePhase) => void;
  onBatchDuplicate?: (indices: number[]) => void;
  onBatchDelete?: (indices: number[]) => void;
  // Optional FPS speed control
  fps?: number;
  onChangeFps?: (fps: number) => void;
  // Optional layer track list
  layers?: Layer[];
  currentLayerIndex?: number;
  activeTrackKey?: string | null;
  onSelectLayer?: (index: number) => void;
  onToggleLayerVisibility?: (index: number) => void;
  onToggleLayerLock?: (index: number) => void;
  onSelectLayerTrack?: (trackKey: string, frameLayerIndex: number) => void;
  onToggleTrackVisibility?: (trackKey: string, frameLayerIndex: number) => void;
  onToggleTrackLock?: (trackKey: string, frameLayerIndex: number) => void;
  // Optional modular layout & linked frame movement
  sectionOrder?: TimelineSectionId[];
  timelinePosition?: 'bottom' | 'top';
  linkMoveAllFrames?: boolean;
  onToggleLinkMoveAllFrames?: () => void;
  onSetOnionSkinEnabled?: (enabled: boolean) => void;
  // Hybrid After Effects + Aseprite Timeline Props
  timelineMarkers?: TimelineMarker[];
  onAddMarker?: (frameIndex: number, label: string, color: string) => void;
  onDeleteMarker?: (markerId: string) => void;
  onSetLayerKeyframe?: (layerIndex: number, keyframe: LayerKeyframe) => void;
  onRemoveLayerKeyframe?: (layerIndex: number, frameIndex: number) => void;
  onUpdateFrameMeta?: (
    frameIndex: number,
    patch: Partial<Pick<Frame, 'colorLabel' | 'note' | 'events'>>
  ) => void;
  onScaleTimelineDurations?: (factor: number) => void;
  onRetimeFrames?: (targetFps: number) => void;
  onCopyFullAnimation?: () => void;
  // Backward compatibility alias
  actionTags?: ActionTag[];
  activeActionTagId?: string | null;
  onSelectActionTag?: (tagId: string | null) => void;
  // Resizable Timeline Dock Props
  timelineHeight?: number;
  onChangeTimelineHeight?: (height: number) => void;
  onResetTimelineHeight?: () => void;
  // Modular Workspace Embedding Props
  embeddedInDock?: boolean;
  dockZone?: PanelDockZone;
  // Enhanced Help Locator, Camera Shake shortcut & Context tracking
  forceOpenCurvesNonce?: number;
  onUiContextFocus?: () => void;
  onOpenCameraShakeControls?: () => void;
  cameraKeyframes?: CameraKeyframe[];
  performanceMode?: PerformanceMode;
}

const PHASE_META: Record<FramePhase, { label: string; short: string; color: string }> = {
  startup: { label: 'Inicio (Startup)', short: 'INI', color: '#38bdf8' },
  active: { label: 'Activo (Hit)', short: 'HIT', color: '#f43f5e' },
  recovery: { label: 'Recuperación', short: 'REC', color: '#f59e0b' },
  neutral: { label: 'Neutral', short: 'NEU', color: '#94a3b8' },
};

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onReorderFrame,
  onChangeFrameDuration,
  onChangeFramePhase,
  isPlaying,
  onTogglePlay,
  onPrevFrame,
  onNextFrame,
  canvasWidth,
  canvasHeight,
  onionSkinEnabled,
  onToggleOnionSkin,
  onionSkinOpacity,
  onChangeOnionSkinOpacity,
  onionSkinPrev = 1,
  onChangeOnionSkinPrev,
  onionSkinNext = 0,
  onChangeOnionSkinNext,
  showGrid,
  onToggleGrid,
  showHitboxes,
  onToggleHitboxes,
  showPivot,
  onTogglePivot,
  playbackMode,
  onChangePlaybackMode,
  layerGroups = [],
  activeGroupId,
  onSelectGroup,
  isolateActiveGroup,
  onToggleIsolateGroup,
  onCreateMovementGroup,
  onOpenSpriteSheetModal,
  selectedFrameIndices,
  onSelectFrameIndices,
  onBatchChangeDuration,
  onBatchChangePhase,
  onBatchDuplicate,
  onBatchDelete,
  fps = 12,
  onChangeFps,
  layers,
  currentLayerIndex = 0,
  activeTrackKey = null,
  onSelectLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onSelectLayerTrack,
  onToggleTrackVisibility,
  onToggleTrackLock,
  sectionOrder = ['tags', 'ruler', 'frames', 'transport'],
  timelinePosition = 'bottom',
  linkMoveAllFrames = false,
  onToggleLinkMoveAllFrames,
  onSetOnionSkinEnabled,
  onionSkinConfig,
  onChangeOnionSkinConfig,
  timelineMarkers = [],
  onAddMarker,
  onDeleteMarker,
  onSetLayerKeyframe,
  onRemoveLayerKeyframe,
  onUpdateFrameMeta,
  onScaleTimelineDurations,
  onRetimeFrames,
  onCopyFullAnimation,
  timelineHeight,
  onChangeTimelineHeight,
  onResetTimelineHeight,
  embeddedInDock = false,
  dockZone = 'bottom',
  forceOpenCurvesNonce = 0,
  onUiContextFocus,
  onOpenCameraShakeControls,
  cameraKeyframes = [],
  performanceMode = 'balanced',
}) => {
  const [timelineViewMode, setTimelineViewMode] = useState<'cards' | 'tracks' | 'table' | 'compact'>('cards');
  const [thumbnailBoundsMode, setThumbnailBoundsMode] = useState<ThumbnailBoundsMode>(() => {
    try {
      const saved = localStorage.getItem('pixelclash_timeline_thumb_bounds_v1');
      if (saved === 'content' || saved === 'canvas') return saved;
    } catch {
      // ignore storage errors
    }
    return 'canvas';
  });
  const toggleThumbnailBoundsMode = useCallback(() => {
    setThumbnailBoundsMode((prev) => {
      const next: ThumbnailBoundsMode = prev === 'canvas' ? 'content' : 'canvas';
      try {
        localStorage.setItem('pixelclash_timeline_thumb_bounds_v1', next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);
  const [isResizingTimeline, setIsResizingTimeline] = useState<boolean>(false);
  const timelineResizeStartRef = useRef<{ y: number; h: number } | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const [showGroupsStrip, setShowGroupsStrip] = useState<boolean>(false);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null);
  const [dragOverFrameIndex, setDragOverFrameIndex] = useState<number | null>(null);
  const isInteractiveTarget = (target: EventTarget | null) =>
    Boolean((target as HTMLElement | null)?.closest('input, select, button, textarea, label'));
  const [showOnionMenu, setShowOnionMenu] = useState<boolean>(false);
  const [showTemporalTools, setShowTemporalTools] = useState<boolean>(false);
  const [showKeyframeEditor, setShowKeyframeEditor] = useState<boolean>(false);

  useEffect(() => {
    if (forceOpenCurvesNonce > 0) {
      setShowKeyframeEditor(true);
      setShowTemporalTools(false);
    }
  }, [forceOpenCurvesNonce]);

  const [showMarkerPrompt, setShowMarkerPrompt] = useState<boolean>(false);
  const [newMarkerLabel, setNewMarkerLabel] = useState<string>('Impacto');
  const [newMarkerColor, setNewMarkerColor] = useState<string>('#f59e0b');
  const [temporalScaleInput, setTemporalScaleInput] = useState<string>('1.25');
  const [retimeFpsInput, setRetimeFpsInput] = useState<number>(12);
  const [newEventLabel, setNewEventLabel] = useState<string>('');
  const [newEventType, setNewEventType] = useState<TimelineEvent['type']>('sfx');
  const [collapsedTrackFolders, setCollapsedTrackFolders] = useState<Record<string, boolean>>({});
  const [onionMenuPos, setOnionMenuPos] = useState<{ left: number; top: number; openDown: boolean }>({
    left: 16,
    top: 200,
    openDown: false,
  });
  const onionBtnRef = useRef<HTMLDivElement>(null);
  const onionPopoverRef = useRef<HTMLDivElement>(null);
  const [isCreatingMove, setIsCreatingMove] = useState<boolean>(false);
  const [newMoveName, setNewMoveName] = useState<string>('');
  const [newMoveColor] = useState<string>('#ef4444');
  const [newMoveCategory] = useState<string>('Normal');
  const [batchSecInput, setBatchSecInput] = useState<string>('0.10');
  const [isScrubbingRuler, setIsScrubbingRuler] = useState<boolean>(false);
  const rulerRef = useRef<HTMLDivElement>(null);

  const handleStartTimelineResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const measuredH = footerRef.current?.getBoundingClientRect().height || timelineHeight || 204;
    timelineResizeStartRef.current = { y: e.clientY, h: measuredH };
    setIsResizingTimeline(true);
  };

  useEffect(() => {
    if (!isResizingTimeline) return;
    const onMove = (e: PointerEvent) => {
      if (!timelineResizeStartRef.current || !onChangeTimelineHeight) return;
      const dy =
        timelinePosition === 'top'
          ? e.clientY - timelineResizeStartRef.current.y
          : timelineResizeStartRef.current.y - e.clientY;
      const maxH = Math.max(320, Math.round(window.innerHeight * 0.72));
      const nextH = Math.max(96, Math.min(maxH, Math.round(timelineResizeStartRef.current.h + dy)));
      onChangeTimelineHeight(nextH);
    };
    const onUp = () => {
      setIsResizingTimeline(false);
      timelineResizeStartRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isResizingTimeline, onChangeTimelineHeight, timelinePosition]);

  useEffect(() => {
    if (!showOnionMenu) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        onionPopoverRef.current &&
        !onionPopoverRef.current.contains(target) &&
        onionBtnRef.current &&
        !onionBtnRef.current.contains(target)
      ) {
        setShowOnionMenu(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [showOnionMenu]);

  const selectedIndices = useMemo(
    () =>
      selectedFrameIndices && selectedFrameIndices.length > 0
        ? selectedFrameIndices
        : [currentFrameIndex],
    [selectedFrameIndices, currentFrameIndex]
  );

  const handleFrameClick = useCallback(
    (idx: number, e?: React.MouseEvent) => {
      if (e && onSelectFrameIndices) {
        if (e.shiftKey) {
          const anchor = selectedIndices[selectedIndices.length - 1] ?? currentFrameIndex;
          const start = Math.min(anchor, idx);
          const end = Math.max(anchor, idx);
          const range: number[] = [];
          for (let i = start; i <= end; i++) range.push(i);
          onSelectFrameIndices(range);
          onSelectFrame(idx);
          return;
        }
        if (e.ctrlKey || e.metaKey) {
          const exists = selectedIndices.includes(idx);
          const next = exists
            ? selectedIndices.filter((i) => i !== idx)
            : [...selectedIndices, idx].sort((a, b) => a - b);
          onSelectFrameIndices(next.length > 0 ? next : [idx]);
          onSelectFrame(idx);
          return;
        }
        onSelectFrameIndices([idx]);
      }
      onSelectFrame(idx);
    },
    [selectedIndices, currentFrameIndex, onSelectFrameIndices, onSelectFrame]
  );

  // Cumulative timing data for ruler and frame data table
  const { frameTimings, totalMs, totalTicks, currentStartMs } = useMemo(() => {
    let accMs = 0;
    let ticksSum = 0;
    const timings = frames.map((f) => {
      const ms = getFrameDurationMs(f);
      const startMs = accMs;
      accMs += ms;
      ticksSum += f.durationTicks;
      return { startMs, ms, ticks: f.durationTicks };
    });
    return {
      frameTimings: timings,
      totalMs: accMs,
      totalTicks: ticksSum,
      currentStartMs: timings[currentFrameIndex]?.startMs ?? 0,
    };
  }, [frames, currentFrameIndex]);

  const safeTotalMs = Math.max(1, totalMs);

  const scrubRulerAtClientX = useCallback(
    (clientX: number) => {
      const el = rulerRef.current;
      if (!el || frames.length === 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(0.9999, (clientX - rect.left) / Math.max(1, rect.width)));
      if (totalMs <= 0) {
        const idx = Math.floor(ratio * frames.length);
        onSelectFrame(Math.max(0, Math.min(frames.length - 1, idx)));
        return;
      }
      const targetMs = ratio * totalMs;
      let foundIdx = frames.length - 1;
      for (let i = 0; i < frameTimings.length; i++) {
        if (targetMs < frameTimings[i].startMs + frameTimings[i].ms) {
          foundIdx = i;
          break;
        }
      }
      if (foundIdx !== currentFrameIndex) {
        onSelectFrame(foundIdx);
      }
    },
    [frames.length, totalMs, frameTimings, currentFrameIndex, onSelectFrame]
  );

  useEffect(() => {
    if (!isScrubbingRuler) return;
    const onMove = (e: PointerEvent) => scrubRulerAtClientX(e.clientX);
    const onUp = () => setIsScrubbingRuler(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isScrubbingRuler, scrubRulerAtClientX]);

  const activeLayers: Layer[] = useMemo(
    () => (layers && layers.length > 0 ? layers : frames[currentFrameIndex]?.layers || []),
    [layers, frames, currentFrameIndex]
  );

  const projectTracks = useMemo(
    () => buildProjectLayerTracks(frames, currentFrameIndex),
    [frames, currentFrameIndex]
  );

  const visibleTrackFolders = useMemo(
    () => layerGroups.filter((g) => !isTimelineMovementOnlyGroup(g, projectTracks)),
    [layerGroups, projectTracks]
  );

  const movementGroups = useMemo(
    () => layerGroups.filter((g) => (g.frameIndices?.length || 0) > 0),
    [layerGroups]
  );

  const currentFrame = frames[currentFrameIndex] || frames[0];

  // Frame drag-reorder
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    if (!onReorderFrame) return;
    setDraggedFrameIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (!onReorderFrame || draggedFrameIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFrameIndex !== idx) setDragOverFrameIndex(idx);
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (onReorderFrame && draggedFrameIndex !== null && draggedFrameIndex !== idx) {
      onReorderFrame(draggedFrameIndex, idx);
    }
    setDraggedFrameIndex(null);
    setDragOverFrameIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedFrameIndex(null);
    setDragOverFrameIndex(null);
  };

  const openOnionPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showOnionMenu && onionBtnRef.current) {
      const rect = onionBtnRef.current.getBoundingClientRect();
      const openDown = rect.top < 270;
      const clampedLeft = Math.max(8, Math.min(window.innerWidth - 300, rect.left));
      setOnionMenuPos({
        left: clampedLeft,
        top: openDown ? rect.bottom + 6 : rect.top - 6,
        openDown,
      });
    }
    setShowOnionMenu((v) => !v);
  };

  const handleCyclePlaybackMode = () => {
    const next =
      playbackMode === 'loop' ? 'pingpong' : playbackMode === 'pingpong' ? 'once' : 'loop';
    onChangePlaybackMode(next);
  };

  // ---------------------------------------------------------------------------
  // MODULAR SECTION 1: TAGS (Movement Groups, Multi-select Batch Bar, Marker/Retiming/Curves Drawers)
  // ---------------------------------------------------------------------------
  const renderTagsSection = () => {
    const hasAnyTopBar =
      showGroupsStrip ||
      selectedIndices.length > 1 ||
      showMarkerPrompt ||
      showTemporalTools ||
      showKeyframeEditor;
    if (!hasAnyTopBar) return null;

    return (
      <div
        key="sec-tags"
        className="shrink-0 max-h-[42%] overflow-y-auto border-b flex flex-col divide-y"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border)',
        }}
      >
        {/* Unified Movement Groups Strip */}
        {showGroupsStrip && (
          <div className="px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto text-[10px] font-mono">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                Movimientos:
              </span>
              <button
                type="button"
                onClick={() => onSelectGroup(null)}
                className="px-2 py-0.5 rounded border font-semibold transition-colors"
                style={{
                  backgroundColor: !activeGroupId ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  color: !activeGroupId ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                  borderColor: !activeGroupId ? 'var(--studio-accent)' : 'var(--studio-border)',
                }}
              >
                Todos ({frames.length})
              </button>
              {movementGroups.map((g) => {
                const isAct = activeGroupId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onSelectGroup(isAct ? null : g.id)}
                    className="px-2 py-0.5 rounded border flex items-center gap-1.5 font-semibold transition-colors"
                    style={{
                      backgroundColor: isAct
                        ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-elevated))'
                        : 'var(--studio-bg-elevated)',
                      borderColor: isAct ? g.color : 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                    <span>{g.name}</span>
                  </button>
                );
              })}
              {activeGroupId && (
                <button
                  type="button"
                  onClick={onToggleIsolateGroup}
                  className="px-2 py-0.5 rounded border font-semibold"
                  style={{
                    backgroundColor: isolateActiveGroup ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                    color: isolateActiveGroup ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  {isolateActiveGroup ? 'Aislado' : 'Aislar'}
                </button>
              )}
              {onCreateMovementGroup &&
                (isCreatingMove ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newMoveName}
                      onChange={(e) => setNewMoveName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newMoveName.trim()) {
                          onCreateMovementGroup(newMoveName.trim(), newMoveColor, newMoveCategory);
                          setNewMoveName('');
                          setIsCreatingMove(false);
                        } else if (e.key === 'Escape') {
                          setIsCreatingMove(false);
                        }
                      }}
                      placeholder="Nombre..."
                      className="w-24 px-1.5 py-0.5 rounded border text-[10px]"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-accent)',
                        color: 'var(--studio-text)',
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newMoveName.trim()) {
                          onCreateMovementGroup(newMoveName.trim(), newMoveColor, newMoveCategory);
                          setNewMoveName('');
                        }
                        setIsCreatingMove(false);
                      }}
                      className="px-1.5 py-0.5 rounded font-bold"
                      style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCreatingMove(true)}
                    className="px-2 py-0.5 rounded border hover:opacity-100 opacity-80"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                    }}
                  >
                    + Grupo
                  </button>
                ))}
            </div>
            {onOpenSpriteSheetModal && (
              <button
                type="button"
                onClick={onOpenSpriteSheetModal}
                className="px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 hover:opacity-100 opacity-85"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
              >
                <Grid className="w-3 h-3" />
                <span>Sprite Sheet</span>
              </button>
            )}
          </div>
        )}

        {/* Multi-Selection Batch Bar */}
        {selectedIndices.length > 1 && (
          <div className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold tabular-nums" style={{ color: 'var(--studio-accent)' }}>
                {selectedIndices.length} fotogramas seleccionados
              </span>
              <button
                type="button"
                onClick={() => onSelectFrameIndices?.([currentFrameIndex])}
                className="underline opacity-75 hover:opacity-100"
              >
                Limpiar
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {onBatchChangeDuration && (
                <div className="flex items-center gap-1">
                  <span style={{ color: 'var(--studio-text-muted)' }}>Tiempo (s):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="60"
                    value={batchSecInput}
                    onChange={(e) => setBatchSecInput(e.target.value)}
                    className="w-14 px-1 py-0.5 rounded border text-center tabular-nums"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const sec = parseFloat(batchSecInput.replace(',', '.'));
                      if (!isNaN(sec) && sec >= 0) {
                        const ms = Math.round(sec * 1000);
                        const ticks = sec === 0 ? 0 : Math.max(1, Math.round(sec * 60));
                        onBatchChangeDuration(selectedIndices, ticks, ms);
                      }
                    }}
                    className="px-2 py-0.5 rounded font-bold"
                    style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                  >
                    Aplicar
                  </button>
                </div>
              )}
              {onBatchChangePhase && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onBatchChangePhase(selectedIndices, e.target.value as FramePhase);
                      e.target.value = '';
                    }
                  }}
                  className="px-1.5 py-0.5 rounded border text-[10px]"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text)',
                  }}
                >
                  <option value="">Fase lote...</option>
                  {(Object.keys(PHASE_META) as FramePhase[]).map((ph) => (
                    <option key={ph} value={ph}>
                      {PHASE_META[ph].label}
                    </option>
                  ))}
                </select>
              )}
              {onBatchDuplicate && (
                <button
                  type="button"
                  onClick={() => onBatchDuplicate(selectedIndices)}
                  className="px-2 py-0.5 rounded border flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <Copy className="w-3 h-3" />
                  <span>Duplicar</span>
                </button>
              )}
              {onBatchDelete && frames.length > selectedIndices.length && (
                <button
                  type="button"
                  onClick={() => onBatchDelete(selectedIndices)}
                  className="px-2 py-0.5 rounded border border-rose-500/40 text-rose-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Eliminar</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Marker Prompt */}
        {showMarkerPrompt && onAddMarker && (
          <div className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <Flag className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">Marcador en F#{currentFrameIndex + 1}:</span>
              <input
                type="text"
                value={newMarkerLabel}
                onChange={(e) => setNewMarkerLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMarkerLabel.trim()) {
                    onAddMarker(currentFrameIndex, newMarkerLabel.trim(), newMarkerColor);
                    setShowMarkerPrompt(false);
                  }
                }}
                placeholder="Etiqueta..."
                className="w-32 px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                  color: 'var(--studio-text)',
                }}
                autoFocus
              />
              <div className="flex items-center gap-1">
                {['#f59e0b', '#ef4444', '#10b981', '#38bdf8', '#a855f7'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewMarkerColor(col)}
                    className="w-3.5 h-3.5 rounded-full border"
                    style={{
                      backgroundColor: col,
                      borderColor: newMarkerColor === col ? '#ffffff' : 'transparent',
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newMarkerLabel.trim()) return;
                  onAddMarker(currentFrameIndex, newMarkerLabel.trim(), newMarkerColor);
                  setShowMarkerPrompt(false);
                }}
                className="px-2 py-0.5 rounded font-bold"
                style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
              >
                Añadir
              </button>
            </div>
            <button type="button" onClick={() => setShowMarkerPrompt(false)} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Retiming Tools Bar */}
        {showTemporalTools && (
          <div className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold flex items-center gap-1" style={{ color: 'var(--studio-accent)' }}>
                <StretchHorizontal className="w-3.5 h-3.5" />
                <span>Retiming:</span>
              </span>
              {onScaleTimelineDurations && (
                <div className="flex items-center gap-1">
                  {[0.5, 0.75, 1.25, 1.5, 2].map((fac) => (
                    <button
                      key={fac}
                      type="button"
                      onClick={() => onScaleTimelineDurations(fac)}
                      className="px-1.5 py-0.5 rounded border tabular-nums"
                      style={{
                        backgroundColor: 'var(--studio-bg-elevated)',
                        borderColor: 'var(--studio-border)',
                      }}
                    >
                      ×{fac}
                    </button>
                  ))}
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="5"
                    value={temporalScaleInput}
                    onChange={(e) => setTemporalScaleInput(e.target.value)}
                    className="w-12 px-1 py-0.5 rounded border text-center tabular-nums"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const f = parseFloat(temporalScaleInput);
                      if (!isNaN(f) && f > 0) onScaleTimelineDurations(f);
                    }}
                    className="px-2 py-0.5 rounded font-bold"
                    style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
                  >
                    Escalar
                  </button>
                </div>
              )}
              {onRetimeFrames && (
                <div className="flex items-center gap-1 pl-2 border-l" style={{ borderColor: 'var(--studio-border)' }}>
                  <span style={{ color: 'var(--studio-text-muted)' }}>FPS:</span>
                  <select
                    value={retimeFpsInput}
                    onChange={(e) => setRetimeFpsInput(Number(e.target.value))}
                    className="px-1 py-0.5 rounded border"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    {[8, 12, 16, 24, 30, 60].map((v) => (
                      <option key={v} value={v}>
                        {v} FPS
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRetimeFrames(retimeFpsInput)}
                    className="px-2 py-0.5 rounded border font-semibold"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-accent)',
                      color: 'var(--studio-accent)',
                    }}
                  >
                    Adaptar
                  </button>
                </div>
              )}
              {onCopyFullAnimation && (
                <button
                  type="button"
                  onClick={onCopyFullAnimation}
                  className="px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  Duplicar Ciclo
                </button>
              )}
            </div>
            <button type="button" onClick={() => setShowTemporalTools(false)} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Hybrid Keyframe, Curve & Events Inspector */}
        {showKeyframeEditor && currentFrame && (
          <HybridKeyframeCurveBar
            frame={currentFrame}
            frameIndex={currentFrameIndex}
            layers={activeLayers}
            currentLayerIndex={currentLayerIndex}
            onSetLayerKeyframe={onSetLayerKeyframe}
            onRemoveLayerKeyframe={onRemoveLayerKeyframe}
            onUpdateFrameMeta={onUpdateFrameMeta}
            newEventLabel={newEventLabel}
            setNewEventLabel={setNewEventLabel}
            newEventType={newEventType}
            setNewEventType={setNewEventType}
            onClose={() => setShowKeyframeEditor(false)}
          />
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // MODULAR SECTION 2: RULER (Graduated Scrubbing Time Ruler in Seconds + Markers)
  // ---------------------------------------------------------------------------
  const renderRulerSection = () => {
    if (timelineViewMode === 'compact') return null;

    const currentDurMs = frameTimings[currentFrameIndex]?.ms ?? 0;
    const playheadPct =
      totalMs > 0
        ? ((currentStartMs + currentDurMs * 0.5) / safeTotalMs) * 100
        : ((currentFrameIndex + 0.5) / Math.max(1, frames.length)) * 100;

    // Build clean graduated major + minor time ticks in seconds (or frame ticks if 0s)
    const rulerTicks: { pct: number; major: boolean; label?: string }[] = [];
    if (totalMs > 0) {
      const candidateSteps = [50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
      let majorStepMs = candidateSteps[candidateSteps.length - 1];
      for (const step of candidateSteps) {
        const count = totalMs / step;
        if (count <= 10) {
          majorStepMs = step;
          break;
        }
      }
      const subDivs = majorStepMs <= 100 ? 2 : 5;
      const minorStepMs = majorStepMs / subDivs;
      const maxSteps = Math.ceil(totalMs / minorStepMs);
      const decimals = majorStepMs < 100 ? 2 : majorStepMs < 1000 ? 1 : 0;

      for (let i = 0; i <= maxSteps; i++) {
        const tMs = i * minorStepMs;
        if (tMs > totalMs + 0.5) break;
        const clampedMs = Math.min(totalMs, tMs);
        const pct = (clampedMs / safeTotalMs) * 100;
        const isMajor = i % subDivs === 0;
        rulerTicks.push({
          pct,
          major: isMajor,
          label: isMajor ? `${(clampedMs / 1000).toFixed(decimals)}s` : undefined,
        });
      }
    } else {
      const count = Math.max(1, frames.length);
      for (let i = 0; i < count; i++) {
        rulerTicks.push({
          pct: (i / count) * 100,
          major: true,
          label: `F${i + 1}`,
        });
      }
    }

    const activeSpanLeftPct =
      totalMs > 0
        ? (currentStartMs / safeTotalMs) * 100
        : (currentFrameIndex / Math.max(1, frames.length)) * 100;
    const activeSpanWidthPct =
      totalMs > 0
        ? (currentDurMs / safeTotalMs) * 100
        : 100 / Math.max(1, frames.length);

    return (
      <div
        key="sec-ruler"
        className="shrink-0 h-8 border-b px-2.5 flex items-center gap-2 text-[9.5px] font-mono select-none"
        style={{
          backgroundColor: 'var(--studio-bg-elevated)',
          borderColor: 'var(--studio-border)',
        }}
      >
        {/* Left current timecode + frame index */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="px-1.5 py-0.5 rounded border tabular-nums font-bold text-[9.5px]"
            style={{
              backgroundColor: 'var(--studio-bg-card)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-accent)',
            }}
            title="Tiempo actual en la línea de tiempo"
          >
            {(currentStartMs / 1000).toFixed(2)}s
          </span>
          <span className="tabular-nums text-[9px] font-semibold" style={{ color: 'var(--studio-text-muted)' }}>
            F#{currentFrameIndex + 1}
          </span>
        </div>

        {/* Full Graduated Time Ruler with Scrubbing & Playhead */}
        <div
          ref={rulerRef}
          onPointerDown={(e) => {
            if (isInteractiveTarget(e.target)) return;
            e.preventDefault();
            scrubRulerAtClientX(e.clientX);
            setIsScrubbingRuler(true);
          }}
          title="Regla de tiempo en segundos · Haz clic o arrastra para recorrer la animación"
          className="flex-1 h-full relative cursor-ew-resize overflow-hidden border-x"
          style={{
            backgroundColor: 'var(--studio-bg-card)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {/* Major & Minor Graduated Ruler Ticks */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[7px]">
            {rulerTicks.map((tk, idx) => (
              <div
                key={`rtk-${idx}`}
                className="absolute top-0 bottom-0"
                style={{ left: `${Math.min(99.6, Math.max(0, tk.pct))}%` }}
              >
                <div
                  className="w-[1px]"
                  style={{
                    height: tk.major ? '10px' : '5px',
                    backgroundColor: tk.major ? 'var(--studio-text-muted)' : 'var(--studio-border-strong)',
                    opacity: tk.major ? 0.7 : 0.65,
                  }}
                />
                {tk.major && tk.label && tk.pct < 93 && (
                  <span
                    className="absolute top-[7px] left-1 text-[8.5px] leading-none tabular-nums whitespace-nowrap"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    {tk.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Subtle Proportional Frame Span Rail along bottom edge */}
          <div
            className="absolute inset-x-0 bottom-0 h-[7px] border-t flex items-stretch"
            style={{
              borderColor: 'var(--studio-border)',
              backgroundColor: 'color-mix(in srgb, var(--studio-bg-bar) 70%, transparent)',
            }}
          >
            {frames.map((frame, fIdx) => {
              const timing = frameTimings[fIdx];
              const wPct =
                totalMs > 0
                  ? ((timing?.ms ?? 0) / safeTotalMs) * 100
                  : 100 / Math.max(1, frames.length);
              const startSec = ((timing?.startMs ?? 0) / 1000).toFixed(2);
              const endSec = (((timing?.startMs ?? 0) + (timing?.ms ?? 0)) / 1000).toFixed(2);
              return (
                <div
                  key={`rspan-${frame.id}-${fIdx}`}
                  title={`Fotograma #${fIdx + 1} · ${startSec}s–${endSec}s`}
                  style={{
                    width: `${Math.max(1, wPct)}%`,
                    borderColor: 'var(--studio-border)',
                    backgroundColor:
                      fIdx % 2 === 1 ? 'rgba(148, 163, 184, 0.08)' : 'transparent',
                  }}
                  className="h-full border-r last:border-r-0"
                />
              );
            })}
            {/* Active Frame Highlight Span */}
            <div
              className="pointer-events-none absolute top-0 bottom-0"
              style={{
                left: `${Math.max(0, Math.min(100, activeSpanLeftPct))}%`,
                width: `${Math.max(1.5, Math.min(100 - activeSpanLeftPct, activeSpanWidthPct))}%`,
                backgroundColor: 'color-mix(in srgb, var(--studio-accent) 45%, transparent)',
              }}
            />
          </div>

          {/* Colored Timeline Marker Pins */}
          {timelineMarkers.map((mk) => {
            const idx = Math.max(0, Math.min(frames.length - 1, mk.frameIndex));
            const leftPct =
              totalMs > 0
                ? ((frameTimings[idx]?.startMs ?? 0) / safeTotalMs) * 100
                : (idx / Math.max(1, frames.length)) * 100;
            return (
              <button
                key={mk.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.altKey) onDeleteMarker?.(mk.id);
                  else onSelectFrame(idx);
                }}
                title={`${mk.label} (F#${idx + 1}) · Clic para ir · Alt+Clic para quitar`}
                className="absolute bottom-[7px] px-1 py-[1px] text-[8px] font-bold flex items-center z-20 rounded-sm shadow-xs leading-none"
                style={{
                  left: `${Math.min(94, Math.max(0, leftPct))}%`,
                  backgroundColor: mk.color,
                  color: '#0f172a',
                }}
              >
                {mk.label}
              </button>
            );
          })}

          {/* Classic Draggable Playhead Cap + Vertical Needle */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-30"
            style={{ left: `${Math.max(0.4, Math.min(99.6, playheadPct))}%` }}
          >
            <svg
              width="10"
              height="8"
              viewBox="0 0 10 8"
              className="absolute top-0 -translate-x-1/2 drop-shadow-xs"
              style={{ fill: 'var(--studio-accent)' }}
            >
              <polygon points="0,0 10,0 10,4 5,8 0,4" />
            </svg>
            <div
              className="absolute top-[6px] bottom-0 w-[2px] -translate-x-1/2"
              style={{
                backgroundColor: 'var(--studio-accent)',
                boxShadow: isScrubbingRuler ? '0 0 8px var(--studio-accent)' : undefined,
              }}
            />
          </div>
        </div>

        {/* Right total duration */}
        <span
          className="tabular-nums shrink-0 text-[9.5px]"
          style={{ color: 'var(--studio-text-muted)' }}
          title="Duración total de la animación"
        >
          {(totalMs / 1000).toFixed(2)}s
        </span>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // MODULAR SECTION 3: FRAMES (Cards [default] | Tracks Matrix | Frame Data Table | Compact)
  // ---------------------------------------------------------------------------
  const renderFramesSection = () => {
    if (timelineViewMode === 'compact') {
      return (
        <div
          key="sec-frames"
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-3 py-1.5 flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--studio-bg-card)' }}
        >
          {frames.map((frame, idx) => {
            const isCur = idx === currentFrameIndex;
            const isSel = selectedIndices.includes(idx);
            return (
              <button
                key={`cmp-${frame.id}-${idx}`}
                type="button"
                onClick={(e) => handleFrameClick(idx, e)}
                className="px-2.5 py-1 rounded border font-mono text-[11px] font-bold tabular-nums shrink-0 transition-colors"
                style={{
                  backgroundColor: isCur
                    ? 'var(--studio-accent)'
                    : isSel
                    ? 'color-mix(in srgb, var(--studio-accent) 22%, var(--studio-bg-elevated))'
                    : 'var(--studio-bg-elevated)',
                  color: isCur ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                  borderColor: isCur ? 'var(--studio-accent)' : 'var(--studio-border)',
                }}
              >
                #{idx + 1}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onAddFrame}
            title="Añadir fotograma"
            className="px-2 py-1 rounded border border-dashed text-[11px] font-bold shrink-0 hover:opacity-100 opacity-80"
            style={{ borderColor: 'var(--studio-border-strong)', color: 'var(--studio-accent)' }}
          >
            +
          </button>
        </div>
      );
    }

    if (timelineViewMode === 'tracks') {
      const validFolderIds = new Set(visibleTrackFolders.map((g) => g.id));
      return (
        <div
          key="sec-frames"
          className="flex-1 min-h-0 overflow-auto"
          style={{ backgroundColor: 'var(--studio-bg-card)' }}
        >
          <table className="w-max min-w-full border-collapse text-[10.5px] font-mono">
            <thead
              className="sticky top-0 z-20 border-b"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <tr>
                <th
                  className="sticky left-0 z-30 w-48 px-2.5 py-1.5 text-left border-r font-bold"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text-muted)',
                  }}
                >
                  Capas / Pistas ({projectTracks.length})
                </th>
                {frames.map((frame, fIdx) => {
                  const isCur = fIdx === currentFrameIndex;
                  return (
                    <th
                      key={`th-${frame.id}-${fIdx}`}
                      onClick={(e) => handleFrameClick(fIdx, e)}
                      className="w-14 px-1 py-1.5 text-center border-r cursor-pointer tabular-nums"
                      style={{
                        borderColor: 'var(--studio-border)',
                        backgroundColor: isCur
                          ? 'color-mix(in srgb, var(--studio-accent) 22%, var(--studio-bg-elevated))'
                          : undefined,
                        color: isCur ? 'var(--studio-accent)' : 'var(--studio-text)',
                      }}
                    >
                      #{fIdx + 1}
                    </th>
                  );
                })}
                <th className="w-10 px-1 py-1 text-center">
                  <button
                    type="button"
                    onClick={onAddFrame}
                    title="Añadir fotograma"
                    className="p-0.5 rounded hover:opacity-100 opacity-80"
                    style={{ color: 'var(--studio-accent)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Grouped folders (mirrored with Layers Panel) */}
              {visibleTrackFolders.map((grp) => {
                const members = projectTracks
                  .filter((t) => t.layer.groupId === grp.id)
                  .slice()
                  .reverse();
                if (members.length === 0) return null;
                const isCollapsed = Boolean(collapsedTrackFolders[grp.id]);
                return (
                  <React.Fragment key={`trk-grp-${grp.id}`}>
                    <tr
                      className="border-b"
                      style={{
                        borderColor: 'var(--studio-border)',
                        backgroundColor: 'color-mix(in srgb, var(--studio-bg-elevated) 65%, transparent)',
                      }}
                    >
                      <td
                        onClick={() =>
                          setCollapsedTrackFolders((prev) => ({
                            ...prev,
                            [grp.id]: !prev[grp.id],
                          }))
                        }
                        className="sticky left-0 z-10 px-2 py-1 border-r cursor-pointer font-bold"
                        style={{
                          backgroundColor: 'var(--studio-bg-elevated)',
                          borderColor: 'var(--studio-border)',
                        }}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isCollapsed ? (
                            <Folder className="w-3 h-3 shrink-0" style={{ color: grp.color }} />
                          ) : (
                            <FolderOpen className="w-3 h-3 shrink-0" style={{ color: grp.color }} />
                          )}
                          <span className="truncate">{grp.name}</span>
                        </div>
                      </td>
                      <td colSpan={frames.length + 1} className="px-2 py-1 text-[9.5px]" style={{ color: 'var(--studio-text-muted)' }}>
                        {members.length} capa(s)
                      </td>
                    </tr>
                    {!isCollapsed &&
                      members.map((track) => {
                        const l = track.layer;
                        const idx = track.currentFrameLayerIndex;
                        const isActiveTrack = activeTrackKey
                          ? track.trackKey === activeTrackKey
                          : idx >= 0 && idx === currentLayerIndex;
                        return (
                          <tr
                            key={`trk-gl-${track.trackKey}`}
                            className="border-b"
                            style={{
                              borderColor: 'var(--studio-border)',
                              backgroundColor: isActiveTrack
                                ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)'
                                : undefined,
                            }}
                          >
                            <td
                              onClick={() => {
                                if (onSelectLayerTrack) onSelectLayerTrack(track.trackKey, idx);
                                else if (idx >= 0) onSelectLayer?.(idx);
                              }}
                              className="sticky left-0 z-10 pl-5 pr-2 py-1 border-r cursor-pointer"
                              style={{
                                backgroundColor: isActiveTrack
                                  ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-panel))'
                                  : 'var(--studio-bg-panel)',
                                borderColor: 'var(--studio-border)',
                              }}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleTrackVisibility) {
                                      onToggleTrackVisibility(track.trackKey, idx);
                                    } else if (idx >= 0) {
                                      onToggleLayerVisibility?.(idx);
                                    }
                                  }}
                                  className="opacity-75 hover:opacity-100 shrink-0"
                                >
                                  {l.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-45" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleTrackLock) {
                                      onToggleTrackLock(track.trackKey, idx);
                                    } else if (idx >= 0) {
                                      onToggleLayerLock?.(idx);
                                    }
                                  }}
                                  className="opacity-65 hover:opacity-100 shrink-0"
                                >
                                  {track.isLocked ? (
                                    <Lock className="w-2.5 h-2.5 text-rose-400" />
                                  ) : (
                                    <Unlock className="w-2.5 h-2.5 opacity-45" />
                                  )}
                                </button>
                                <span
                                  className={`truncate flex-1 ${
                                    !track.existsInCurrentFrame ? 'italic opacity-75' : ''
                                  }`}
                                >
                                  {l.name}
                                </span>
                                {track.isLocked && (
                                  <span title="Capa bloqueada" className="text-[8px] text-rose-400 shrink-0">
                                    ◼
                                  </span>
                                )}
                              </div>
                            </td>
                            {frames.map((frame, fIdx) => {
                              const fLayerIdx = track.frameLayerIndices[fIdx] ?? -1;
                              const fLayer = fLayerIdx >= 0 ? frame.layers[fLayerIdx] : undefined;
                              const hasPix = fLayer ? layerHasVisibleContent(fLayer) : false;
                              const hasKf = Boolean(fLayer?.keyframes?.some((k) => k.frameIndex === fIdx));
                              const isCurCell = fIdx === currentFrameIndex && isActiveTrack;
                              return (
                                <td
                                  key={`tc-${track.trackKey}-${frame.id}-${fIdx}`}
                                  onClick={(e) => {
                                    if (onSelectLayerTrack) {
                                      onSelectLayerTrack(track.trackKey, fLayerIdx);
                                    } else if (fLayerIdx >= 0) {
                                      onSelectLayer?.(fLayerIdx);
                                    }
                                    handleFrameClick(fIdx, e);
                                  }}
                                  title={
                                    hasKf
                                      ? '◆ Keyframe'
                                      : hasPix
                                      ? '● Contenido presente'
                                      : '○ Sin contenido en este frame'
                                  }
                                  className="border-r text-center cursor-pointer py-1"
                                  style={{
                                    borderColor: 'var(--studio-border)',
                                    backgroundColor: isCurCell
                                      ? 'color-mix(in srgb, var(--studio-accent) 22%, transparent)'
                                      : fIdx === currentFrameIndex
                                      ? 'color-mix(in srgb, var(--studio-accent) 8%, transparent)'
                                      : undefined,
                                  }}
                                >
                                  <div className="flex items-center justify-center gap-0.5 leading-none">
                                    {hasKf ? (
                                      <span className="text-[10px] text-amber-400">◆</span>
                                    ) : hasPix ? (
                                      <span className="text-[10px] text-sky-400">●</span>
                                    ) : (
                                      <span
                                        className={`text-[10px] ${
                                          fLayerIdx < 0 ? 'text-slate-500/50' : 'text-slate-400/80'
                                        }`}
                                      >
                                        ○
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td />
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}

              {/* Ungrouped project tracks (top-to-bottom) */}
              {projectTracks
                .filter((t) => !t.layer.groupId || !validFolderIds.has(t.layer.groupId))
                .slice()
                .reverse()
                .map((track) => {
                  const l = track.layer;
                  const idx = track.currentFrameLayerIndex;
                  const isActiveTrack = activeTrackKey
                    ? track.trackKey === activeTrackKey
                    : idx >= 0 && idx === currentLayerIndex;
                  return (
                    <tr
                      key={`trk-ul-${track.trackKey}`}
                      className="border-b"
                      style={{
                        borderColor: 'var(--studio-border)',
                        backgroundColor: isActiveTrack
                          ? 'color-mix(in srgb, var(--studio-accent) 10%, transparent)'
                          : undefined,
                      }}
                    >
                      <td
                        onClick={() => {
                          if (onSelectLayerTrack) onSelectLayerTrack(track.trackKey, idx);
                          else if (idx >= 0) onSelectLayer?.(idx);
                        }}
                        className="sticky left-0 z-10 px-2 py-1 border-r cursor-pointer"
                        style={{
                          backgroundColor: isActiveTrack
                            ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-panel))'
                            : 'var(--studio-bg-panel)',
                          borderColor: 'var(--studio-border)',
                        }}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleTrackVisibility) {
                                onToggleTrackVisibility(track.trackKey, idx);
                              } else if (idx >= 0) {
                                onToggleLayerVisibility?.(idx);
                              }
                            }}
                            className="opacity-75 hover:opacity-100 shrink-0"
                          >
                            {l.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-45" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleTrackLock) {
                                onToggleTrackLock(track.trackKey, idx);
                              } else if (idx >= 0) {
                                onToggleLayerLock?.(idx);
                              }
                            }}
                            className="opacity-65 hover:opacity-100 shrink-0"
                          >
                            {track.isLocked ? (
                              <Lock className="w-2.5 h-2.5 text-rose-400" />
                            ) : (
                              <Unlock className="w-2.5 h-2.5 opacity-45" />
                            )}
                          </button>
                          <span
                            className={`truncate font-semibold flex-1 ${
                              !track.existsInCurrentFrame ? 'italic opacity-75' : ''
                            }`}
                          >
                            {l.name}
                          </span>
                          {track.isLocked && (
                            <span title="Capa bloqueada" className="text-[8px] text-rose-400 shrink-0">
                              ◼
                            </span>
                          )}
                        </div>
                      </td>
                      {frames.map((frame, fIdx) => {
                        const fLayerIdx = track.frameLayerIndices[fIdx] ?? -1;
                        const fLayer = fLayerIdx >= 0 ? frame.layers[fLayerIdx] : undefined;
                        const hasPix = fLayer ? layerHasVisibleContent(fLayer) : false;
                        const hasKf = Boolean(fLayer?.keyframes?.some((k) => k.frameIndex === fIdx));
                        const isCurCell = fIdx === currentFrameIndex && isActiveTrack;
                        return (
                          <td
                            key={`tcu-${track.trackKey}-${frame.id}-${fIdx}`}
                            onClick={(e) => {
                              if (onSelectLayerTrack) {
                                onSelectLayerTrack(track.trackKey, fLayerIdx);
                              } else if (fLayerIdx >= 0) {
                                onSelectLayer?.(fLayerIdx);
                              }
                              handleFrameClick(fIdx, e);
                            }}
                            title={
                              hasKf
                                ? '◆ Keyframe'
                                : hasPix
                                ? '● Contenido presente'
                                : '○ Sin contenido en este frame'
                            }
                            className="border-r text-center cursor-pointer py-1"
                            style={{
                              borderColor: 'var(--studio-border)',
                              backgroundColor: isCurCell
                                ? 'color-mix(in srgb, var(--studio-accent) 22%, transparent)'
                                : fIdx === currentFrameIndex
                                ? 'color-mix(in srgb, var(--studio-accent) 8%, transparent)'
                                : undefined,
                            }}
                          >
                            <div className="flex items-center justify-center gap-0.5 leading-none">
                              {hasKf ? (
                                <span className="text-[10px] text-amber-400">◆</span>
                              ) : hasPix ? (
                                <span className="text-[10px] text-sky-400">●</span>
                              ) : (
                                <span
                                  className={`text-[10px] ${
                                    fLayerIdx < 0 ? 'text-slate-500/50' : 'text-slate-400/80'
                                  }`}
                                >
                                  ○
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      );
    }

    if (timelineViewMode === 'table') {
      return (
        <div
          key="sec-frames"
          className="flex-1 min-h-0 overflow-auto"
          style={{ backgroundColor: 'var(--studio-bg-card)' }}
        >
          <table className="w-full text-left border-collapse text-[11px] font-mono">
            <thead
              className="sticky top-0 z-10 border-b"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border)',
                color: 'var(--studio-text-muted)',
              }}
            >
              <tr>
                <th className="py-1.5 px-2.5">#</th>
                <th className="py-1.5 px-2.5">Duración</th>
                <th className="py-1.5 px-2.5">Acum.</th>
                <th className="py-1.5 px-2.5">Fase</th>
                <th className="py-1.5 px-2.5">Cajas</th>
                <th className="py-1.5 px-2.5">Keyframes / Eventos</th>
                <th className="py-1.5 px-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {frames.map((frame, fIdx) => {
                const isCur = fIdx === currentFrameIndex;
                const timing = frameTimings[fIdx];
                const atk = frame.hitboxes.filter((h) => h.type === 'hitbox').length;
                const hurt = frame.hitboxes.filter((h) => h.type === 'hurtbox').length;
                const kfCount = activeLayers.filter((l) =>
                  l.keyframes?.some((k) => k.frameIndex === fIdx)
                ).length;

                return (
                  <tr
                    key={`tbl-${frame.id}-${fIdx}`}
                    onClick={(e) => handleFrameClick(fIdx, e)}
                    className="border-b cursor-pointer transition-colors"
                    style={{
                      borderColor: 'var(--studio-border)',
                      backgroundColor: isCur
                        ? 'color-mix(in srgb, var(--studio-accent) 14%, transparent)'
                        : undefined,
                    }}
                  >
                    <td className="py-1 px-2.5 font-bold tabular-nums" style={{ color: isCur ? 'var(--studio-accent)' : 'var(--studio-text)' }}>
                      #{fIdx + 1}
                    </td>
                    <td className="py-1 px-2.5">
                      <FrameDurationInput
                        durationMs={timing?.ms ?? 0}
                        durationTicks={frame.durationTicks}
                        onCommit={(ticks, ms) => onChangeFrameDuration(fIdx, ticks, ms)}
                      />
                    </td>
                    <td className="py-1 px-2.5 tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
                      {((timing?.startMs ?? 0) / 1000).toFixed(2)}s
                    </td>
                    <td className="py-1 px-2.5" onClick={(e) => e.stopPropagation()}>
                      {onChangeFramePhase ? (
                        <select
                          value={frame.phase || 'neutral'}
                          onChange={(e) => onChangeFramePhase(fIdx, e.target.value as FramePhase)}
                          className="px-1.5 py-0.5 rounded border text-[10px]"
                          style={{
                            backgroundColor: 'var(--studio-bg-elevated)',
                            borderColor: 'var(--studio-border)',
                            color: PHASE_META[frame.phase || 'neutral'].color,
                          }}
                        >
                          {(Object.keys(PHASE_META) as FramePhase[]).map((ph) => (
                            <option key={ph} value={ph}>
                              {PHASE_META[ph].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{PHASE_META[frame.phase || 'neutral'].label}</span>
                      )}
                    </td>
                    <td className="py-1 px-2.5 tabular-nums">
                      <span className="text-rose-400 mr-2">A:{atk}</span>
                      <span className="text-cyan-400">H:{hurt}</span>
                    </td>
                    <td className="py-1 px-2.5 truncate max-w-[200px]">
                      {kfCount > 0 && <span className="text-amber-400 mr-2">◆{kfCount}</span>}
                      {(frame.events || []).map((ev) => (
                        <span key={ev.id} className="mr-1.5 text-amber-300">
                          ⚡{ev.label}
                        </span>
                      ))}
                      {frame.note && <span style={{ color: 'var(--studio-text-muted)' }}>{frame.note}</span>}
                    </td>
                    <td className="py-1 px-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicateFrame(fIdx)}
                          title="Duplicar"
                          className="p-1 rounded hover:bg-white/10"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {frames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteFrame(fIdx)}
                            title="Eliminar"
                            className="p-1 rounded hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // DEFAULT VIEW: 'cards' — Classic PixelClash Horizontal Frame Cards Strip
    return (
      <div
        key="sec-frames"
        className="flex-1 min-h-0 overflow-x-auto overflow-y-auto px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: 'var(--studio-bg-card)' }}
      >
        {frames.map((frame, fIdx) => {
          const isCur = fIdx === currentFrameIndex;
          const isSel = selectedIndices.includes(fIdx);
          const isDragTarget = dragOverFrameIndex === fIdx && draggedFrameIndex !== fIdx;
          const durMs = frameTimings[fIdx]?.ms ?? 0;
          const hasAnyKf = frame.layers.some((l) => l.keyframes?.some((k) => k.frameIndex === fIdx));
          const evtCount = frame.events?.length || 0;
          const camKf = cameraKeyframes.some((ck) => ck.frameIndex === fIdx);

          return (
            <div
              key={`fc-${frame.id}-${fIdx}`}
              draggable={Boolean(onReorderFrame)}
              onDragStart={(e) => handleDragStart(e, fIdx)}
              onDragOver={(e) => handleDragOver(e, fIdx)}
              onDrop={(e) => handleDrop(e, fIdx)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleFrameClick(fIdx, e)}
              style={{
                backgroundColor: 'var(--studio-bg-panel)',
                borderColor: isCur
                  ? 'var(--studio-accent)'
                  : isSel || isDragTarget
                  ? 'color-mix(in srgb, var(--studio-accent) 65%, var(--studio-border))'
                  : 'var(--studio-border)',
              }}
              className={`w-[104px] shrink-0 rounded-lg border flex flex-col overflow-hidden cursor-pointer group transition-all relative ${
                isCur ? 'ring-1 ring-amber-400/60 shadow-md' : 'hover:border-amber-400/50'
              }`}
            >
              {frame.colorLabel && (
                <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: frame.colorLabel }} />
              )}

              {/* Top mini header */}
              <div
                className="px-1.5 py-0.5 border-b flex items-center justify-between gap-1 text-[10px] font-mono shrink-0"
                style={{
                  backgroundColor: isCur
                    ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))'
                    : 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <span
                  className="font-bold tabular-nums flex items-center gap-0.5"
                  style={{ color: isCur ? 'var(--studio-accent)' : 'var(--studio-text)' }}
                >
                  {onReorderFrame && <GripVertical className="w-2.5 h-2.5 opacity-45" />}
                  <span>#{fIdx + 1}</span>
                </span>
                <div className="flex items-center gap-0.5">
                  {hasAnyKf && <Diamond className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                  {camKf && <Camera className="w-2.5 h-2.5 text-sky-400" />}
                  {evtCount > 0 && <Zap className="w-2.5 h-2.5 text-amber-400" />}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateFrame(fIdx);
                    }}
                    title="Duplicar fotograma"
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity"
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                  {frames.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFrame(fIdx);
                      }}
                      title="Eliminar fotograma"
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Thumbnail preview */}
              <div
                className="h-[62px] w-full flex items-center justify-center p-1 relative overflow-hidden"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #222633 25%, transparent 25%), linear-gradient(-45deg, #222633 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222633 75%), linear-gradient(-45deg, transparent 75%, #222633 75%)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                  backgroundColor: '#161924',
                }}
              >
                <FrameThumbnailCanvas
                  frame={frame}
                  width={canvasWidth}
                  height={canvasHeight}
                  layerGroups={layerGroups}
                  boundsMode={thumbnailBoundsMode}
                  performanceMode={performanceMode}
                  isPlaying={isPlaying}
                />
              </div>

              {/* Duration selector */}
              <div
                className="p-1 border-t shrink-0"
                style={{
                  backgroundColor: 'var(--studio-bg-elevated)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <FrameDurationInput
                  durationMs={durMs}
                  durationTicks={frame.durationTicks}
                  fullWidth
                  onCommit={(ticks, ms) => onChangeFrameDuration(fIdx, ticks, ms)}
                />
              </div>
            </div>
          );
        })}

        {/* Add Frame Card */}
        <button
          type="button"
          onClick={onAddFrame}
          style={{
            borderColor: 'var(--studio-border-strong)',
            color: 'var(--studio-text-muted)',
          }}
          className="w-[78px] h-[112px] shrink-0 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-[10px] font-semibold hover:opacity-100 opacity-75 transition-opacity"
          title="Añadir nuevo fotograma"
        >
          <Plus className="w-5 h-5" style={{ color: 'var(--studio-accent)' }} />
          <span>Nuevo</span>
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // MODULAR SECTION 4: TRANSPORT (Classic Bottom Bar — Play, FPS, Cebolla, Frame Data, Views)
  // ---------------------------------------------------------------------------
  const renderTransportSection = () => (
    <div
      key="sec-transport"
      className="shrink-0 min-h-[38px] border-t px-3 py-1 flex items-center justify-between gap-2 overflow-x-auto text-[10.5px] font-mono"
      style={{
        backgroundColor: 'var(--studio-bg-bar)',
        borderColor: 'var(--studio-border)',
      }}
    >
      {/* Left: Transport & FPS */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          data-help-id="anim.playback"
          className="flex items-center rounded-md border overflow-hidden"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <button
            type="button"
            onClick={onPrevFrame}
            title="Fotograma anterior (,)"
            className="p-1.5 hover:opacity-100 opacity-80"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
            className="px-2.5 py-1 flex items-center gap-1 font-bold border-x"
            style={{
              backgroundColor: isPlaying
                ? 'var(--studio-accent)'
                : 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-card))',
              color: isPlaying ? 'var(--studio-accent-text)' : 'var(--studio-accent)',
              borderColor: 'var(--studio-border)',
            }}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pausa' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={onNextFrame}
            title="Fotograma siguiente (.)"
            className="p-1.5 hover:opacity-100 opacity-80"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleCyclePlaybackMode}
          title="Cambiar modo de bucle (Loop / PingPong / 1x)"
          className="px-2 py-1 rounded border flex items-center gap-1 font-semibold"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: playbackMode !== 'once' ? 'var(--studio-accent)' : 'var(--studio-border)',
            color: playbackMode !== 'once' ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
          }}
        >
          <ArrowRightLeft className="w-3 h-3" />
          <span>{playbackMode === 'loop' ? 'Loop' : playbackMode === 'pingpong' ? 'PingPong' : '1x'}</span>
        </button>

        <button
          type="button"
          onClick={onAddFrame}
          title="Nuevo fotograma"
          className="px-2 py-1 rounded border flex items-center gap-1 font-bold"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-elevated))',
            borderColor: 'var(--studio-accent)',
            color: 'var(--studio-accent)',
          }}
        >
          <Plus className="w-3 h-3" />
          <span>Frame</span>
        </button>

        {onChangeFps && (
          <select
            value={fps}
            onChange={(e) => onChangeFps(Number(e.target.value))}
            title="Velocidad de reproducción (FPS)"
            className="px-1.5 py-1 rounded border tabular-nums font-bold cursor-pointer"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          >
            {[8, 10, 12, 16, 24, 30, 60].map((v) => (
              <option key={v} value={v}>
                {v} FPS
              </option>
            ))}
          </select>
        )}

        <span className="tabular-nums pl-1" style={{ color: 'var(--studio-text-muted)' }}>
          F#{currentFrameIndex + 1}/{frames.length} · {(totalMs / 1000).toFixed(2)}s · {totalTicks}T
        </span>
      </div>

      {/* Center: Onion Skin, Grid, Hitboxes, Pivot, Link, Groups */}
      <div className="flex items-center gap-1 shrink-0">
        <div
          ref={onionBtnRef}
          data-help-id="anim.onion"
          className="flex items-center rounded border overflow-hidden"
          style={{ borderColor: onionSkinEnabled ? '#10b981' : 'var(--studio-border)' }}
        >
          <button
            type="button"
            onClick={onToggleOnionSkin}
            title="Activar/Desactivar Papel Cebolla (O)"
            className="px-2 py-1 flex items-center gap-1 font-semibold"
            style={{
              backgroundColor: onionSkinEnabled ? 'rgba(16, 185, 129, 0.18)' : 'var(--studio-bg-elevated)',
              color: onionSkinEnabled ? '#34d399' : 'var(--studio-text-muted)',
            }}
          >
            <Layers className="w-3 h-3" />
            <span>Cebolla</span>
          </button>
          <button
            type="button"
            onClick={openOnionPopover}
            title="Configurar Papel Cebolla"
            className="px-1 py-1 border-l"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: onionSkinEnabled ? 'rgba(16, 185, 129, 0.45)' : 'var(--studio-border)',
              color: onionSkinEnabled ? '#34d399' : 'var(--studio-text-muted)',
            }}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleGrid}
          title="Rejilla"
          className="p-1.5 rounded border"
          style={{
            backgroundColor: showGrid ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
            borderColor: showGrid ? 'var(--studio-accent)' : 'var(--studio-border)',
            color: showGrid ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
          }}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleHitboxes}
          title="Hitboxes / Hurtboxes"
          className="p-1.5 rounded border"
          style={{
            backgroundColor: showHitboxes ? 'rgba(244, 63, 94, 0.18)' : 'var(--studio-bg-elevated)',
            borderColor: showHitboxes ? '#f43f5e' : 'var(--studio-border)',
            color: showHitboxes ? '#fb7185' : 'var(--studio-text-muted)',
          }}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onTogglePivot}
          title="Pivote"
          className="p-1.5 rounded border"
          style={{
            backgroundColor: showPivot ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
            borderColor: showPivot ? 'var(--studio-accent)' : 'var(--studio-border)',
            color: showPivot ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
          }}
        >
          <Target className="w-3.5 h-3.5" />
        </button>

        {onToggleLinkMoveAllFrames && (
          <button
            type="button"
            onClick={onToggleLinkMoveAllFrames}
            title="Enlazar movimiento en todos los fotogramas"
            className="p-1.5 rounded border"
            style={{
              backgroundColor: linkMoveAllFrames ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
              borderColor: linkMoveAllFrames ? 'var(--studio-accent)' : 'var(--studio-border)',
              color: linkMoveAllFrames ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
            }}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowGroupsStrip((v) => !v)}
          title="Mostrar/Ocultar Grupos de Movimientos"
          className="px-2 py-1 rounded border flex items-center gap-1"
          style={{
            backgroundColor: showGroupsStrip || activeGroupId ? 'color-mix(in srgb, var(--studio-accent) 18%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
            borderColor: showGroupsStrip || activeGroupId ? 'var(--studio-accent)' : 'var(--studio-border)',
            color: showGroupsStrip || activeGroupId ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
          }}
        >
          <Filter className="w-3 h-3" />
          <span>Grupos</span>
        </button>
      </div>

      {/* Right: Keyframes/Curves, Marker, Retiming, Camera, View Modes */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            setShowKeyframeEditor((v) => !v);
            setShowTemporalTools(false);
          }}
          title="Keyframes, Curvas y Eventos"
          className="px-2 py-1 rounded border flex items-center gap-1 font-semibold"
          style={{
            backgroundColor: showKeyframeEditor ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
            borderColor: showKeyframeEditor ? 'var(--studio-accent)' : 'var(--studio-border)',
            color: showKeyframeEditor ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
          }}
        >
          <Diamond className="w-3 h-3" />
          <span>Curvas</span>
        </button>

        {onAddMarker && (
          <button
            type="button"
            onClick={() => setShowMarkerPrompt((v) => !v)}
            title="Añadir Marcador en fotograma actual"
            className="p-1.5 rounded border"
            style={{
              backgroundColor: showMarkerPrompt ? 'rgba(245, 158, 11, 0.2)' : 'var(--studio-bg-elevated)',
              borderColor: showMarkerPrompt ? '#f59e0b' : 'var(--studio-border)',
              color: showMarkerPrompt ? '#fbbf24' : 'var(--studio-text-muted)',
            }}
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        )}

        {(onScaleTimelineDurations || onRetimeFrames) && (
          <button
            type="button"
            onClick={() => {
              setShowTemporalTools((v) => !v);
              setShowKeyframeEditor(false);
            }}
            title="Retiming y Escalado Temporal"
            className="p-1.5 rounded border"
            style={{
              backgroundColor: showTemporalTools ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-elevated))' : 'var(--studio-bg-elevated)',
              borderColor: showTemporalTools ? 'var(--studio-accent)' : 'var(--studio-border)',
              color: showTemporalTools ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
            }}
          >
            <StretchHorizontal className="w-3.5 h-3.5" />
          </button>
        )}

        {onOpenCameraShakeControls && (
          <button
            type="button"
            onClick={onOpenCameraShakeControls}
            title="Cámara y Camera Shake"
            className="p-1.5 rounded border"
            style={{
              backgroundColor: cameraKeyframes.length > 0 ? 'rgba(56, 189, 248, 0.16)' : 'var(--studio-bg-elevated)',
              borderColor: cameraKeyframes.length > 0 ? '#38bdf8' : 'var(--studio-border)',
              color: cameraKeyframes.length > 0 ? '#38bdf8' : 'var(--studio-text-muted)',
            }}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Thumbnail Framing Mode: Full Canvas vs Content Bounds */}
        <button
          type="button"
          onClick={toggleThumbnailBoundsMode}
          title={
            thumbnailBoundsMode === 'content'
              ? 'Miniaturas de fotogramas: Ajustadas al contenido (clic para ver el lienzo completo)'
              : 'Miniaturas de fotogramas: Lienzo completo (clic para ajustar al tamaño del contenido)'
          }
          className="px-2 py-1 rounded border flex items-center gap-1 font-semibold ml-0.5 transition-colors"
          style={{
            backgroundColor:
              thumbnailBoundsMode === 'content'
                ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-elevated))'
                : 'var(--studio-bg-elevated)',
            borderColor:
              thumbnailBoundsMode === 'content' ? 'var(--studio-accent)' : 'var(--studio-border)',
            color:
              thumbnailBoundsMode === 'content' ? 'var(--studio-accent)' : 'var(--studio-text-muted)',
          }}
        >
          {thumbnailBoundsMode === 'content' ? (
            <Scan className="w-3 h-3" />
          ) : (
            <Maximize className="w-3 h-3" />
          )}
          <span>{thumbnailBoundsMode === 'content' ? 'Contenido' : 'Lienzo'}</span>
        </button>

        {/* View Mode Selector: Tarjetas | Pistas | Tabla | Compacto */}
        <div
          className="flex items-center rounded border overflow-hidden ml-1"
          style={{
            backgroundColor: 'var(--studio-bg-elevated)',
            borderColor: 'var(--studio-border)',
          }}
        >
          {(
            [
              { id: 'cards', icon: LayoutGrid, tip: 'Vista Tarjetas' },
              { id: 'tracks', icon: Rows3, tip: 'Vista Pistas / Capas' },
              { id: 'table', icon: Table2, tip: 'Vista Tabla Frame Data' },
              { id: 'compact', icon: Minus, tip: 'Vista Compacta' },
            ] as const
          ).map((v) => {
            const Icon = v.icon;
            const active = timelineViewMode === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setTimelineViewMode(v.id)}
                title={v.tip}
                className="p-1.5 transition-colors"
                style={{
                  backgroundColor: active ? 'var(--studio-accent)' : 'transparent',
                  color: active ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                }}
              >
                <Icon className="w-3 h-3" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const sectionRenderers: Record<TimelineSectionId, () => React.ReactNode> = {
    tags: renderTagsSection,
    ruler: renderRulerSection,
    frames: renderFramesSection,
    transport: renderTransportSection,
  };

  const resizeSplitterBar = (
    <div
      onPointerDown={handleStartTimelineResize}
      onDoubleClick={() => onResetTimelineHeight?.()}
      title="Arrastra para redimensionar la Línea de Tiempo · Doble clic para restablecer altura"
      className={`h-1.5 w-full cursor-row-resize flex items-center justify-center transition-colors shrink-0 group relative ${
        isResizingTimeline ? 'bg-amber-400/50' : 'hover:bg-amber-400/30'
      }`}
    >
      <div
        className={`h-[2px] w-16 rounded-full transition-all ${
          isResizingTimeline
            ? 'w-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
            : 'bg-slate-600/70 group-hover:bg-amber-400 group-hover:w-28'
        }`}
      />
    </div>
  );

  const isSideDocked = dockZone === 'left-main' || dockZone === 'right-main';

  return (
    <div
      ref={footerRef}
      data-help-id="anim.timeline"
      onMouseDownCapture={() => onUiContextFocus?.()}
      className={`flex flex-col select-none relative overflow-hidden ${
        embeddedInDock
          ? 'flex-1 min-h-0 h-full w-full'
          : `shrink-0 z-20 ${timelinePosition === 'top' ? 'border-b' : 'border-t'}`
      }`}
      style={{
        backgroundColor: 'var(--studio-bg-bar)',
        borderColor: isResizingTimeline ? 'var(--studio-accent)' : 'var(--studio-border)',
        color: 'var(--studio-text)',
        height:
          !embeddedInDock && timelineHeight && timelineViewMode !== 'compact'
            ? `${timelineHeight}px`
            : undefined,
      }}
    >
      {!embeddedInDock && timelinePosition !== 'top' && resizeSplitterBar}
      <div className={`flex flex-col flex-1 min-h-0 overflow-hidden ${isSideDocked ? 'min-w-0' : ''}`}>
        {sectionOrder.map((secId) => sectionRenderers[secId]?.())}
      </div>
      {!embeddedInDock && timelinePosition === 'top' && resizeSplitterBar}

      {/* Unclipped Fixed-Position Onion Skin Configuration Popover */}
      {showOnionMenu &&
        typeof document !== 'undefined' &&
        (() => {
          const onionCfg: OnionSkinConfig = onionSkinConfig
            ? {
                ...onionSkinConfig,
                enabled: onionSkinEnabled,
                globalOpacity: onionSkinOpacity,
                prev: { ...onionSkinConfig.prev, count: onionSkinPrev },
                next: { ...onionSkinConfig.next, count: onionSkinNext },
              }
            : {
                ...DEFAULT_ONION_SKIN_CONFIG,
                enabled: onionSkinEnabled,
                globalOpacity: onionSkinOpacity,
                prev: { ...DEFAULT_ONION_SKIN_CONFIG.prev, count: onionSkinPrev },
                next: { ...DEFAULT_ONION_SKIN_CONFIG.next, count: onionSkinNext },
              };
          const updateOnion = (updater: (prev: OnionSkinConfig) => OnionSkinConfig) => {
            const next = updater(onionCfg);
            if (onChangeOnionSkinConfig) {
              onChangeOnionSkinConfig(next);
            } else {
              onChangeOnionSkinPrev?.(next.prev.count);
              onChangeOnionSkinNext?.(next.next.count);
              onChangeOnionSkinOpacity(next.globalOpacity);
              if (next.enabled !== onionSkinEnabled) onSetOnionSkinEnabled?.(next.enabled);
            }
          };

          return createPortal(
            <div
              ref={onionPopoverRef}
              onClick={(e) => e.stopPropagation()}
              className="fixed w-[360px] max-w-[92vw] max-h-[78vh] overflow-y-auto border rounded-xl shadow-2xl p-3 flex flex-col gap-2.5 text-xs font-mono"
              style={{
                zIndex: STUDIO_Z.CONTEXT_MENU,
                left: onionMenuPos.left,
                top: onionMenuPos.top,
                transform: onionMenuPos.openDown ? 'translateY(0)' : 'translateY(-100%)',
                backgroundColor: 'var(--studio-bg-panel)',
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--studio-border)' }}>
                <span className="font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Papel Cebolla Pro</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleOnionSkin}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      onionSkinEnabled
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                        : 'bg-slate-700/40 border-slate-600 text-slate-400'
                    }`}
                  >
                    {onionSkinEnabled ? 'ACTIVO' : 'APAGADO'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOnionMenu(false)}
                    className="hover:opacity-75"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Presets rápidos */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                  Presets rápidos
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      ['animator', 'Animador', 'Anterior: Fantasma rojo · Posterior: Fantasma verde'],
                      ['ghost_clean', 'Fantasma', 'Fotograma completo con colores originales y FX'],
                      ['kof_trail', 'Trail FX', 'Estela acumulativa tipo KOF / Guilty Gear'],
                      ['silhouette_classic', 'Silueta', 'Siluetas clásicas roja/azul'],
                    ] as [OnionSkinPresetId, string, string][]
                  ).map(([presetId, label, title]) => {
                    const isAnimatorActive =
                      presetId === 'animator' &&
                      onionCfg.prev.displayMode === 'tinted_ghost' &&
                      onionCfg.prev.colorMode === 'red' &&
                      onionCfg.next.displayMode === 'tinted_ghost' &&
                      onionCfg.next.colorMode === 'green';
                    const isGhostActive =
                      presetId === 'ghost_clean' &&
                      onionCfg.prev.displayMode === 'ghost' &&
                      (onionCfg.prev.colorMode || 'original') === 'original';
                    const isTrailActive = presetId === 'kof_trail' && Boolean(onionCfg.trail?.enabled);
                    const isActive = isAnimatorActive || isGhostActive || isTrailActive;
                    return (
                      <button
                        key={presetId}
                        type="button"
                        title={title}
                        onClick={() => updateOnion((c) => applyOnionSkinPreset(c, presetId))}
                        className="px-1.5 py-1 rounded border text-[9px] font-bold cursor-pointer truncate"
                        style={{
                          backgroundColor: isActive ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                          borderColor: isActive ? 'var(--studio-accent)' : 'var(--studio-border)',
                          color: isActive ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Blend + Detail */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                    Mezcla
                  </span>
                  <select
                    value={onionCfg.blendMode}
                    onChange={(e) =>
                      updateOnion((c) => ({ ...c, blendMode: e.target.value as OnionSkinBlendMode }))
                    }
                    className="px-1.5 py-1 rounded border text-[10px]"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    {ONION_BLEND_MODE_OPTIONS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                    Nivel Detalle
                  </span>
                  <select
                    value={onionCfg.detailLevel}
                    onChange={(e) =>
                      updateOnion((c) => ({ ...c, detailLevel: e.target.value as OnionSkinDetailLevel }))
                    }
                    className="px-1.5 py-1 rounded border text-[10px]"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  >
                    {ONION_DETAIL_LEVEL_OPTIONS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Previous & Next Frames */}
              {(['prev', 'next'] as const).map((dirKey) => {
                const dir: OnionSkinDirectionConfig = onionCfg[dirKey];
                const isPrev = dirKey === 'prev';
                const effectiveColorMode: OnionSkinColorMode =
                  dir.colorMode ?? (dir.displayMode === 'ghost' ? 'original' : 'custom');
                const resolvedSwatch =
                  resolveOnionColorModeHex(effectiveColorMode, dir.color) || dir.color;
                const isCustomMode =
                  dir.displayMode === 'volume' ||
                  dir.displayMode === 'base_color' ||
                  dir.displayMode === 'full';
                const patchDir = (patch: Partial<OnionSkinDirectionConfig>) =>
                  updateOnion((c) => ({
                    ...c,
                    [dirKey]: { ...c[dirKey], ...patch },
                  }));

                return (
                  <div
                    key={dirKey}
                    className="flex flex-col gap-1.5 rounded-lg border p-2"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: dir.count > 0 ? `${resolvedSwatch}66` : 'var(--studio-border)',
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block border border-white/30"
                          style={{
                            background:
                              effectiveColorMode === 'original'
                                ? 'linear-gradient(135deg, #f8fafc 0%, #38bdf8 50%, #f59e0b 100%)'
                                : resolvedSwatch,
                          }}
                        />
                        <span>{isPrev ? `Anteriores (${dir.count} F)` : `Siguientes (${dir.count} F)`}</span>
                      </span>
                      <span className="text-[10px] tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
                        {Math.round(dir.opacity * 100)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {[0, 1, 2, 3, 5, 10, 20].map((val) => (
                        <button
                          key={`${dirKey}-${val}`}
                          type="button"
                          onClick={() =>
                            updateOnion((c) => ({
                              ...c,
                              enabled: val > 0 ? true : c.enabled,
                              [dirKey]: { ...c[dirKey], count: val },
                            }))
                          }
                          className="py-0.5 rounded text-[10px] font-bold border transition-colors"
                          style={
                            dir.count === val
                              ? {
                                  backgroundColor: `${resolvedSwatch}33`,
                                  borderColor: resolvedSwatch,
                                  color: '#ffffff',
                                }
                              : {
                                  backgroundColor: 'var(--studio-bg-elevated)',
                                  borderColor: 'var(--studio-border)',
                                  color: 'var(--studio-text-muted)',
                                }
                          }
                        >
                          {val === 0 ? '0' : isPrev ? `-${val}` : `+${val}`}
                        </button>
                      ))}
                    </div>

                    {/* Visualización */}
                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          ['silhouette', 'Silueta'],
                          ['outline', 'Contorno'],
                          ['ghost', 'Fantasma'],
                          ['tinted_ghost', 'Fantasma Color'],
                        ] as [OnionSkinDisplayMode, string][]
                      ).map(([modeId, lbl]) => {
                        const active = dir.displayMode === modeId;
                        return (
                          <button
                            key={`${dirKey}-${modeId}`}
                            type="button"
                            onClick={() => {
                              if (modeId === 'ghost') {
                                patchDir({ displayMode: 'ghost', colorMode: 'original' });
                              } else if (modeId === 'tinted_ghost') {
                                const nextColorMode: OnionSkinColorMode =
                                  effectiveColorMode === 'original'
                                    ? isPrev
                                      ? 'red'
                                      : 'green'
                                    : effectiveColorMode;
                                patchDir({
                                  displayMode: 'tinted_ghost',
                                  colorMode: nextColorMode,
                                  color: resolveOnionColorModeHex(nextColorMode, dir.color) || dir.color,
                                });
                              } else {
                                const nextColorMode: OnionSkinColorMode =
                                  effectiveColorMode === 'original' ? 'custom' : effectiveColorMode;
                                patchDir({ displayMode: modeId, colorMode: nextColorMode });
                              }
                            }}
                            className="px-1.5 py-1 rounded border text-[9px] font-semibold text-left cursor-pointer truncate"
                            style={{
                              backgroundColor: active ? `${resolvedSwatch}33` : 'var(--studio-bg-elevated)',
                              borderColor: active ? resolvedSwatch : 'var(--studio-border)',
                              color: active ? '#ffffff' : 'var(--studio-text-muted)',
                            }}
                          >
                            {active ? '● ' : '○ '}
                            {lbl}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          if (!isCustomMode) patchDir({ displayMode: 'volume' });
                        }}
                        className="col-span-2 px-1.5 py-1 rounded border text-[9px] font-semibold text-left cursor-pointer"
                        style={{
                          backgroundColor: isCustomMode ? `${resolvedSwatch}33` : 'var(--studio-bg-elevated)',
                          borderColor: isCustomMode ? resolvedSwatch : 'var(--studio-border)',
                          color: isCustomMode ? '#ffffff' : 'var(--studio-text-muted)',
                        }}
                      >
                        {isCustomMode ? '● ' : '○ '}Personalizado (Volumen / Color Base / Detalle)
                      </button>
                    </div>

                    {isCustomMode && (
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            ['volume', 'Volumen'],
                            ['base_color', 'Color Base'],
                            ['full', 'Detalle'],
                          ] as [OnionSkinDisplayMode, string][]
                        ).map(([subId, subLbl]) => (
                          <button
                            key={`${dirKey}-${subId}`}
                            type="button"
                            onClick={() => patchDir({ displayMode: subId })}
                            className="px-1 py-0.5 rounded border text-[9px] font-semibold cursor-pointer"
                            style={{
                              backgroundColor:
                                dir.displayMode === subId ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                              borderColor: 'var(--studio-border-strong)',
                              color: dir.displayMode === subId ? 'var(--studio-accent-text)' : 'var(--studio-text-muted)',
                            }}
                          >
                            {subLbl}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Opacidad 0% - 100% + Quick Presets */}
                    <StudioSlider
                      variant="panel"
                      label="Opac."
                      value={Math.round(dir.opacity * 100)}
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                      defaultValue={50}
                      accentColor={resolvedSwatch}
                      onChange={(v) => patchDir({ opacity: v / 100 })}
                    />
                    <div className="grid grid-cols-4 gap-1">
                      {ONION_OPACITY_PRESETS.map((pct) => {
                        const active = Math.round(dir.opacity * 100) === pct;
                        return (
                          <button
                            key={`${dirKey}-pct-${pct}`}
                            type="button"
                            onClick={() => patchDir({ opacity: pct / 100 })}
                            className="py-0.5 rounded border text-[9px] font-mono tabular-nums cursor-pointer"
                            style={{
                              backgroundColor: active ? `${resolvedSwatch}33` : 'var(--studio-bg-elevated)',
                              borderColor: active ? resolvedSwatch : 'var(--studio-border)',
                              color: active ? '#ffffff' : 'var(--studio-text-muted)',
                            }}
                          >
                            {pct}%
                          </button>
                        );
                      })}
                    </div>

                    {/* Coloración opcional */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {ONION_COLOR_MODE_OPTIONS.map((cm) => {
                        const active = effectiveColorMode === cm.id;
                        return (
                          <button
                            key={`${dirKey}-cm-${cm.id}`}
                            type="button"
                            title={cm.label}
                            onClick={() => {
                              const nextHex = cm.hex || dir.color;
                              const nextDisplayMode =
                                cm.id === 'original' && dir.displayMode === 'tinted_ghost'
                                  ? 'ghost'
                                  : cm.id !== 'original' && dir.displayMode === 'ghost'
                                  ? 'tinted_ghost'
                                  : dir.displayMode;
                              patchDir({
                                colorMode: cm.id,
                                color: nextHex,
                                displayMode: nextDisplayMode,
                              });
                            }}
                            className="px-1.5 py-0.5 rounded border text-[9px] font-semibold flex items-center gap-1 cursor-pointer"
                            style={{
                              backgroundColor: active ? 'var(--studio-bg-elevated)' : 'transparent',
                              borderColor: active
                                ? cm.hex || 'var(--studio-accent)'
                                : 'var(--studio-border)',
                              color: active ? '#ffffff' : 'var(--studio-text-muted)',
                            }}
                          >
                            {cm.hex && (
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: cm.hex }}
                              />
                            )}
                            <span>{cm.shortLabel}</span>
                          </button>
                        );
                      })}
                      <input
                        type="color"
                        value={dir.color}
                        onChange={(e) =>
                          patchDir({
                            colorMode: 'custom',
                            color: e.target.value,
                            displayMode: dir.displayMode === 'ghost' ? 'tinted_ghost' : dir.displayMode,
                          })
                        }
                        className="w-4 h-4 bg-transparent border-0 cursor-pointer p-0"
                      />
                    </div>

                    {!isPrev && currentFrameIndex === 0 && dir.count === 0 && (
                      <span className="text-[10px] text-amber-300/90 leading-snug">
                        Estás en el frame #1. Elige frame #2 o activa +1 siguiente.
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Global Opacity + Auto Falloff */}
              <div className="flex flex-col gap-1.5 border-t pt-2" style={{ borderColor: 'var(--studio-border)' }}>
                <StudioSlider
                  variant="panel"
                  label="Opacidad global"
                  value={Math.round(onionCfg.globalOpacity * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  defaultValue={100}
                  accentColor="#34d399"
                  onChange={(v) =>
                    updateOnion((c) => ({ ...c, enabled: v > 0 ? true : c.enabled, globalOpacity: v / 100 }))
                  }
                />
                <label className="flex items-center justify-between text-[10px] cursor-pointer">
                  <span style={{ color: 'var(--studio-text-muted)' }}>Estela progresiva (caída por distancia)</span>
                  <input
                    type="checkbox"
                    checked={onionCfg.autoDistanceFalloff}
                    onChange={(e) =>
                      updateOnion((c) => ({ ...c, autoDistanceFalloff: e.target.checked }))
                    }
                    className="accent-emerald-400"
                  />
                </label>
              </div>

              {/* Modo Trail (Estela FX / Dash KOF / Guilty Gear) */}
              {(() => {
                const trailCfg = onionCfg.trail || DEFAULT_ONION_SKIN_TRAIL_CONFIG;
                const updateTrail = (patch: Partial<typeof trailCfg>) =>
                  updateOnion((c) => ({
                    ...c,
                    trail: { ...(c.trail || DEFAULT_ONION_SKIN_TRAIL_CONFIG), ...patch },
                  }));
                return (
                  <div
                    className="flex flex-col gap-1.5 rounded-lg border p-2"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: trailCfg.enabled ? '#f59e0b' : 'var(--studio-border)',
                    }}
                  >
                    <label className="flex items-center justify-between text-[10px] font-bold cursor-pointer">
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Modo Trail (Estela FX / Dash)</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={trailCfg.enabled}
                        onChange={(e) => updateTrail({ enabled: e.target.checked })}
                        className="accent-amber-400"
                      />
                    </label>
                    {trailCfg.enabled && (
                      <>
                        <StudioSlider
                          variant="panel"
                          label="Últimos N frames"
                          value={trailCfg.framesCount}
                          min={1}
                          max={20}
                          step={1}
                          defaultValue={5}
                          accentColor="#f59e0b"
                          formatValue={(v) => `${v} F`}
                          onChange={(v) => updateTrail({ framesCount: v })}
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <StudioSlider
                            variant="panel"
                            label="Opac. inicial"
                            value={Math.round(trailCfg.opacity * 100)}
                            min={0}
                            max={100}
                            step={1}
                            defaultValue={55}
                            unit="%"
                            accentColor="#f59e0b"
                            onChange={(v) => updateTrail({ opacity: v / 100 })}
                          />
                          <StudioSlider
                            variant="panel"
                            label="Caída"
                            value={Math.round(trailCfg.decay * 100)}
                            min={0}
                            max={95}
                            step={1}
                            defaultValue={45}
                            unit="%"
                            accentColor="#f59e0b"
                            onChange={(v) => updateTrail({ decay: v / 100 })}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={trailCfg.preserveOriginalColors}
                              onChange={(e) =>
                                updateTrail({ preserveOriginalColors: e.target.checked })
                              }
                              className="accent-amber-400"
                            />
                            <span>Colores/FX originales</span>
                          </label>
                          {!trailCfg.preserveOriginalColors && (
                            <input
                              type="color"
                              value={trailCfg.tintColor}
                              onChange={(e) => updateTrail({ tintColor: e.target.value })}
                              className="w-4 h-4 bg-transparent border-0 cursor-pointer p-0"
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 items-center text-[10px]">
                          <select
                            value={trailCfg.blendMode}
                            onChange={(e) =>
                              updateTrail({ blendMode: e.target.value as OnionSkinBlendMode })
                            }
                            className="px-1.5 py-1 rounded border text-[10px]"
                            style={{
                              backgroundColor: 'var(--studio-bg-elevated)',
                              borderColor: 'var(--studio-border)',
                              color: 'var(--studio-text)',
                            }}
                          >
                            {ONION_BLEND_MODE_OPTIONS.map((b) => (
                              <option key={`tl-trail-blend-${b.id}`} value={b.id}>
                                Mezcla: {b.label}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 cursor-pointer justify-end">
                            <input
                              type="checkbox"
                              checked={trailCfg.showDuringPlay}
                              onChange={(e) => updateTrail({ showDuringPlay: e.target.checked })}
                              className="accent-amber-400"
                            />
                            <span style={{ color: 'var(--studio-text-muted)' }}>Al reproducir</span>
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Motion Path Quick Controls */}
              <div className="flex flex-col gap-1.5 border-t pt-2" style={{ borderColor: 'var(--studio-border)' }}>
                <label className="flex items-center justify-between text-[10px] font-bold cursor-pointer">
                  <span className="text-sky-300">Modo Trazo de Movimiento</span>
                  <input
                    type="checkbox"
                    checked={onionCfg.motionPath.enabled}
                    onChange={(e) =>
                      updateOnion((c) => ({
                        ...c,
                        motionPath: { ...c.motionPath, enabled: e.target.checked },
                      }))
                    }
                    className="accent-sky-400"
                  />
                </label>
                {onionCfg.motionPath.enabled && (
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onionCfg.motionPath.trackHead}
                        onChange={(e) =>
                          updateOnion((c) => ({
                            ...c,
                            motionPath: { ...c.motionPath, trackHead: e.target.checked },
                          }))
                        }
                        className="accent-sky-400"
                      />
                      <span className="text-sky-300">Cabeza</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onionCfg.motionPath.trackHands}
                        onChange={(e) =>
                          updateOnion((c) => ({
                            ...c,
                            motionPath: { ...c.motionPath, trackHands: e.target.checked },
                          }))
                        }
                        className="accent-amber-400"
                      />
                      <span className="text-amber-300">Manos</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onionCfg.motionPath.trackFeet}
                        onChange={(e) =>
                          updateOnion((c) => ({
                            ...c,
                            motionPath: { ...c.motionPath, trackFeet: e.target.checked },
                          }))
                        }
                        className="accent-emerald-400"
                      />
                      <span className="text-emerald-300">Pies</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onionCfg.motionPath.trackCenterOfGravity}
                        onChange={(e) =>
                          updateOnion((c) => ({
                            ...c,
                            motionPath: { ...c.motionPath, trackCenterOfGravity: e.target.checked },
                          }))
                        }
                        className="accent-rose-400"
                      />
                      <span className="text-rose-300">C. Gravedad</span>
                    </label>
                  </div>
                )}
              </div>
            </div>,
            document.body
          );
        })()}
    </div>
  );
};

const DURATION_PRESETS: { label: string; sec: number; ms: number; ticks: number }[] = [
  { label: 'Sin tiempo (0.0)', sec: 0, ms: 0, ticks: 0 },
  { label: '0.01s', sec: 0.01, ms: 10, ticks: 1 },
  { label: '0.05s', sec: 0.05, ms: 50, ticks: 3 },
  { label: '0.1s', sec: 0.1, ms: 100, ticks: 6 },
  { label: '0.5s', sec: 0.5, ms: 500, ticks: 30 },
  { label: '1s', sec: 1, ms: 1000, ticks: 60 },
  { label: '5s', sec: 5, ms: 5000, ticks: 300 },
];

function formatDurationBadge(durationMs: number): string {
  if (durationMs === 0) return '0.0s';
  if (durationMs === 10) return '0.01s';
  if (durationMs === 50) return '0.05s';
  if (durationMs === 100) return '0.1s';
  if (durationMs === 500) return '0.5s';
  if (durationMs === 1000) return '1s';
  if (durationMs === 5000) return '5s';
  return `${(durationMs / 1000).toFixed(2)}s`;
}

// Preset + Libre numeric duration menu in seconds
const FrameDurationInput: React.FC<{
  durationMs: number;
  durationTicks: number;
  onCommit: (ticks: number, ms: number) => void;
  fullWidth?: boolean;
}> = ({ durationMs, durationTicks, onCommit, fullWidth = false }) => {
  const [open, setOpen] = useState(false);
  const [libreMode, setLibreMode] = useState(false);
  const [draft, setDraft] = useState<string>((durationMs / 1000).toFixed(2));
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; openDown: boolean }>({
    left: 20,
    top: 200,
    openDown: false,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(durationMs === 0 ? '0.0' : (durationMs / 1000).toFixed(2));
  }, [durationMs]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popRef.current &&
        !popRef.current.contains(target) &&
        btnRef.current &&
        !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const openDown = rect.top < 270;
      const clampedLeft = Math.max(8, Math.min(window.innerWidth - 220, rect.left));
      setMenuPos({
        left: clampedLeft,
        top: openDown ? rect.bottom + 4 : rect.top - 4,
        openDown,
      });
      const isPreset = DURATION_PRESETS.some((p) => p.ms === durationMs);
      setLibreMode(!isPreset);
    }
    setOpen((v) => !v);
  };

  const commitFreeValue = (raw: string) => {
    const normalized = raw.replace(',', '.');
    const sec = parseFloat(normalized);
    if (!isNaN(sec) && sec >= 0) {
      const clamped = Math.max(0, Math.min(60, sec));
      const ticks = clamped === 0 ? 0 : Math.max(1, Math.round(clamped * 60));
      const ms = Math.round(clamped * 1000);
      onCommit(ticks, ms);
      setDraft(clamped === 0 ? '0.0' : clamped.toString());
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleMenu}
        title={`Tiempo del fotograma: ${formatDurationBadge(durationMs)} (${durationMs}ms · ${durationTicks}T)`}
        className={`${
          fullWidth ? 'w-full justify-between' : ''
        } flex items-center gap-1 border rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors`}
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
          color: 'var(--studio-accent)',
        }}
      >
        <span className="flex items-center gap-1 truncate">
          <Clock className="w-2.5 h-2.5 opacity-65 shrink-0" />
          <span className="tabular-nums font-semibold">
            {durationMs === 0 ? 'Sin (0.0)' : formatDurationBadge(durationMs)}
          </span>
        </span>
        <ChevronDown className="w-2.5 h-2.5 opacity-65 shrink-0" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popRef}
            onClick={(e) => e.stopPropagation()}
            className="fixed w-52 border rounded-xl shadow-2xl p-2 flex flex-col gap-1.5 text-[11px] font-mono"
            style={{
              zIndex: STUDIO_Z.CONTEXT_MENU,
              left: menuPos.left,
              top: menuPos.top,
              transform: menuPos.openDown ? 'translateY(0)' : 'translateY(-100%)',
              backgroundColor: 'var(--studio-bg-panel)',
              borderColor: 'var(--studio-border-strong)',
              color: 'var(--studio-text)',
            }}
          >
            <div
              className="text-[9px] uppercase tracking-wider font-bold pb-1 border-b flex items-center justify-between"
              style={{ color: 'var(--studio-text-muted)', borderColor: 'var(--studio-border)' }}
            >
              <span>Tiempo del fotograma</span>
              <button type="button" onClick={() => setOpen(false)} className="hover:opacity-80">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {DURATION_PRESETS.map((preset) => {
                const isPresetActive = durationMs === preset.ms && !libreMode;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onCommit(preset.ticks, preset.ms);
                      setLibreMode(false);
                      setOpen(false);
                    }}
                    className={`px-1.5 py-1 rounded border text-[10px] text-left tabular-nums transition-colors ${
                      preset.sec === 0 ? 'col-span-2' : ''
                    }`}
                    style={{
                      backgroundColor: isPresetActive ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                      color: isPresetActive ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                      borderColor: isPresetActive ? 'var(--studio-accent)' : 'var(--studio-border)',
                      fontWeight: isPresetActive ? 700 : 500,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 border-t flex flex-col gap-1" style={{ borderColor: 'var(--studio-border)' }}>
              <button
                type="button"
                onClick={() => setLibreMode((v) => !v)}
                className="px-1.5 py-1 rounded border text-[10px] font-bold flex items-center justify-between"
                style={{
                  backgroundColor: libreMode
                    ? 'color-mix(in srgb, var(--studio-accent) 20%, var(--studio-bg-elevated))'
                    : 'var(--studio-bg-elevated)',
                  borderColor: libreMode ? 'var(--studio-accent)' : 'var(--studio-border)',
                  color: libreMode ? 'var(--studio-accent)' : 'var(--studio-text)',
                }}
              >
                <span>Libre (rango personalizado)</span>
                <span>{libreMode ? '▾' : '▸'}</span>
              </button>

              {libreMode && (
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.01"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitFreeValue(draft);
                      else if (e.key === 'Escape') setOpen(false);
                    }}
                    placeholder="0.25"
                    className="flex-1 min-w-0 px-1.5 py-1 rounded border text-[11px] tabular-nums focus:outline-none"
                    style={{
                      backgroundColor: 'var(--studio-bg-card)',
                      borderColor: 'var(--studio-accent)',
                      color: 'var(--studio-text)',
                    }}
                    autoFocus
                  />
                  <span className="text-[10px]" style={{ color: 'var(--studio-text-muted)' }}>
                    s
                  </span>
                  <button
                    type="button"
                    onClick={() => commitFreeValue(draft)}
                    className="px-2 py-1 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: 'var(--studio-accent)',
                      color: 'var(--studio-accent-text)',
                    }}
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

// Detect if a Layer cel has any painted pixels
function celHasPixels(layer: Layer): boolean {
  for (let y = 0; y < layer.pixels.length; y++) {
    const row = layer.pixels[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      if (row[x]) return true;
    }
  }
  return false;
}

// Mini thumbnail canvas supporting Full Canvas ('canvas') or Tight Content Bounds ('content')
// Virtualized with IntersectionObserver: invisible off-screen frames are NEVER composited or drawn.
const FrameThumbnailCanvas: React.FC<{
  frame: Frame;
  width: number;
  height: number;
  layerGroups?: LayerGroup[];
  boundsMode: ThumbnailBoundsMode;
  performanceMode?: PerformanceMode;
  isPlaying?: boolean;
}> = React.memo(({ frame, width, height, layerGroups = [], boundsMode, performanceMode = 'balanced', isPlaying = false }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = React.useState<boolean>(false);
  const lastRenderedKeyRef = React.useRef<string>('');
  const lastLayersRef = React.useRef<Layer[] | null>(null);
  const lastGroupsRef = React.useRef<LayerGroup[] | null>(null);

  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        }
      },
      { rootMargin: '160px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;
    // In Performance mode, skip unnecessary thumbnail refreshes while animation is playing
    if (performanceMode === 'performance' && isPlaying && lastLayersRef.current !== null) return;

    const metaKey = `${width}x${height}|${boundsMode}`;
    if (
      lastLayersRef.current === frame.layers &&
      lastGroupsRef.current === layerGroups &&
      lastRenderedKeyRef.current === metaKey
    ) {
      return;
    }

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const composited = compositeFrame(frame, width, height, -1, false, layerGroups);
      renderPixelGridToCanvas(
        ctx,
        composited,
        width,
        height,
        canvas.width,
        canvas.height,
        boundsMode,
        3,
        true
      );
      lastLayersRef.current = frame.layers;
      lastGroupsRef.current = layerGroups;
      lastRenderedKeyRef.current = metaKey;
    };

    if (performanceMode === 'performance') {
      return scheduleIdleTask(draw, 350);
    }
    draw();
  }, [isVisible, frame, frame.layers, width, height, layerGroups, boundsMode, performanceMode, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={92}
      height={54}
      className="pixel-canvas w-full h-full object-contain"
    />
  );
});

const FRAME_COLOR_LABELS = ['', '#ef4444', '#f59e0b', '#10b981', '#38bdf8', '#a855f7'];
const EASING_OPTIONS: KeyframeEasing[] = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'hold'];

const HybridKeyframeCurveBar: React.FC<{
  frame: Frame;
  frameIndex: number;
  layers: Layer[];
  currentLayerIndex: number;
  onSetLayerKeyframe?: (layerIndex: number, keyframe: LayerKeyframe) => void;
  onRemoveLayerKeyframe?: (layerIndex: number, frameIndex: number) => void;
  onUpdateFrameMeta?: (
    frameIndex: number,
    patch: Partial<Pick<Frame, 'colorLabel' | 'note' | 'events'>>
  ) => void;
  newEventLabel: string;
  setNewEventLabel: (v: string) => void;
  newEventType: TimelineEvent['type'];
  setNewEventType: (t: TimelineEvent['type']) => void;
  onClose: () => void;
}> = ({
  frame,
  frameIndex,
  layers,
  currentLayerIndex,
  onSetLayerKeyframe,
  onRemoveLayerKeyframe,
  onUpdateFrameMeta,
  newEventLabel,
  setNewEventLabel,
  newEventType,
  setNewEventType,
  onClose,
}) => {
  const activeLayer = layers[currentLayerIndex] || layers[0];
  const existingKf = activeLayer?.keyframes?.find((k) => k.frameIndex === frameIndex) || null;
  const activeKf: LayerKeyframe = existingKf || {
    frameIndex,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    opacity: 1,
    easing: 'ease-out',
  };

  const curvePath = React.useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const yVal = applyKeyframeEasing(t, activeKf.easing);
      const xPx = 4 + t * 56;
      const yPx = 32 - yVal * 26;
      pts.push(`${i === 0 ? 'M' : 'L'} ${xPx.toFixed(1)} ${yPx.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [activeKf.easing]);

  const updateKf = (patch: Partial<LayerKeyframe>) => {
    onSetLayerKeyframe?.(currentLayerIndex, {
      ...activeKf,
      ...patch,
      frameIndex,
    });
  };

  return (
    <div
      data-help-id="anim.curves"
      className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono"
      style={{
        backgroundColor: 'var(--studio-bg-card)',
        color: 'var(--studio-text)',
      }}
    >
      <div data-help-id="anim.interpolation" className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Diamond className={`w-3.5 h-3.5 ${existingKf ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
          <span className="font-bold" style={{ color: 'var(--studio-accent)' }}>
            {activeLayer?.name || 'Capa'} @ F#{frameIndex + 1}
          </span>
          {existingKf ? (
            <button
              type="button"
              onClick={() => onRemoveLayerKeyframe?.(currentLayerIndex, frameIndex)}
              className="px-1.5 py-0.5 rounded border text-rose-300 border-rose-500/40"
            >
              Quitar KF
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updateKf({})}
              className="px-1.5 py-0.5 rounded font-bold"
              style={{ backgroundColor: 'var(--studio-accent)', color: 'var(--studio-accent-text)' }}
            >
              + Fijar Keyframe
            </button>
          )}
        </div>

        <svg
          width={64}
          height={36}
          className="rounded border shrink-0"
          style={{
            backgroundColor: 'var(--studio-bg-canvas)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <path d={curvePath} fill="none" stroke="var(--studio-accent)" strokeWidth={2} />
        </svg>

        <div className="flex items-center gap-1.5 tabular-nums">
          <label className="flex items-center gap-1">
            <span style={{ color: 'var(--studio-text-muted)' }}>X:</span>
            <input
              type="number"
              value={activeKf.offsetX}
              onChange={(e) => updateKf({ offsetX: parseInt(e.target.value, 10) || 0 })}
              className="w-11 px-1 py-0.5 rounded border text-center"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            />
          </label>
          <label className="flex items-center gap-1">
            <span style={{ color: 'var(--studio-text-muted)' }}>Y:</span>
            <input
              type="number"
              value={activeKf.offsetY}
              onChange={(e) => updateKf({ offsetY: parseInt(e.target.value, 10) || 0 })}
              className="w-11 px-1 py-0.5 rounded border text-center"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            />
          </label>
          <label className="flex items-center gap-1">
            <span style={{ color: 'var(--studio-text-muted)' }}>Esc:</span>
            <input
              type="number"
              step="0.1"
              min="0.2"
              max="3"
              value={activeKf.scale}
              onChange={(e) => updateKf({ scale: parseFloat(e.target.value) || 1 })}
              className="w-11 px-1 py-0.5 rounded border text-center"
              style={{ backgroundColor: 'var(--studio-bg-elevated)', borderColor: 'var(--studio-border)' }}
            />
          </label>
          <select
            value={activeKf.easing}
            onChange={(e) => updateKf({ easing: e.target.value as KeyframeEasing })}
            className="px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          >
            {EASING_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Curva: {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <span style={{ color: 'var(--studio-text-muted)' }}>Etiqueta:</span>
          {FRAME_COLOR_LABELS.map((col) => (
            <button
              key={col || 'none'}
              type="button"
              onClick={() => onUpdateFrameMeta?.(frameIndex, { colorLabel: col || undefined })}
              className="w-3.5 h-3.5 rounded-full border"
              style={{
                backgroundColor: col || 'var(--studio-bg-elevated)',
                borderColor: (frame.colorLabel || '') === col ? '#ffffff' : 'var(--studio-border-strong)',
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3 text-sky-400" />
          <input
            type="text"
            value={frame.note || ''}
            onChange={(e) => onUpdateFrameMeta?.(frameIndex, { note: e.target.value })}
            placeholder="Nota del frame..."
            className="w-28 px-1.5 py-0.5 rounded border text-[10px]"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          />
        </div>

        <div data-help-id="anim.events" className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <select
            value={newEventType}
            onChange={(e) => setNewEventType(e.target.value as TimelineEvent['type'])}
            className="px-1 py-0.5 rounded border text-[9px]"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          >
            <option value="sfx">SFX</option>
            <option value="vfx">VFX</option>
            <option value="camera">Cámara</option>
            <option value="hitbox">Hitbox</option>
          </select>
          <input
            type="text"
            value={newEventLabel}
            onChange={(e) => setNewEventLabel(e.target.value)}
            placeholder="Evento..."
            className="w-20 px-1.5 py-0.5 rounded border text-[10px]"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-border)',
              color: 'var(--studio-text)',
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!newEventLabel.trim()) return;
              const nextEvents: TimelineEvent[] = [
                ...(frame.events || []),
                { id: `evt-${Date.now()}`, type: newEventType, label: newEventLabel.trim() },
              ];
              onUpdateFrameMeta?.(frameIndex, { events: nextEvents });
              setNewEventLabel('');
            }}
            className="px-1.5 py-0.5 rounded border font-bold"
            style={{
              backgroundColor: 'var(--studio-bg-elevated)',
              borderColor: 'var(--studio-accent)',
              color: 'var(--studio-accent)',
            }}
          >
            + Evt
          </button>
          {(frame.events || []).map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() =>
                onUpdateFrameMeta?.(frameIndex, {
                  events: (frame.events || []).filter((x) => x.id !== ev.id),
                })
              }
              title="Clic para eliminar evento"
              className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px]"
            >
              {ev.type.toUpperCase()}:{ev.label} ×
            </button>
          ))}
        </div>

        <button type="button" onClick={onClose} className="opacity-65 hover:opacity-100 ml-1">
          ✕
        </button>
      </div>
    </div>
  );
};
