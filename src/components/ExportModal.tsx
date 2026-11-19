import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  FileJson, 
  Image, 
  Film, 
  FolderArchive,
  Layers,
  FileSpreadsheet,
  Table2,
  Code2,
  Bone,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Compass,
  Package,
} from 'lucide-react';
import JSZip from 'jszip';
import { Frame, Layer, ProjectState, ProjectWorkMode } from '../types';
import { compositeFrame, frameToCanvas, generateCombatJson, generateGroupedSpritesheet } from '../utils/pixelMath';
import { WORK_MODES_REGISTRY, analyzeTilesetSeams } from '../utils/workModesEngine';
import { downloadGif, generateAnimatedGif } from '../utils/gifExporter';
import { downloadBlob, exportPngSequenceZip } from '../utils/zipExporter';
import {
  EngineExportPreset,
  generateCombatCsv,
  getDefaultCsvHeaders,
} from '../utils/csvExporter';
import {
  buildSpineSkeletonJson,
  exportSpineBundleZip,
} from '../utils/spineExporter';
import {
  downloadUint8Array,
  exportProjectAsAse,
  exportProjectAsPcs,
  exportProjectAsPsd,
} from '../utils/fileExporter';

export type ExportModalTab = 'gif' | 'spritesheet' | 'sequence' | 'single' | 'json' | 'mode_export' | 'advanced';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  currentFrame: Frame;
  initialTab?: ExportModalTab;
  workMode?: ProjectWorkMode;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  currentFrame,
  initialTab = 'gif',
  workMode,
}) => {
  const activeWorkMode: ProjectWorkMode = workMode || project.workMode || 'fighter';
  const modeDef = WORK_MODES_REGISTRY[activeWorkMode] || WORK_MODES_REGISTRY.fighter;
  const [activeTab, setActiveTab] = useState<ExportModalTab>(initialTab);
  const [exportScale, setExportScale] = useState<number>(2);
  const [gifTransparent, setGifTransparent] = useState<boolean>(true);
  const [gifPingPong, setGifPingPong] = useState<boolean>(project.playbackMode === 'pingpong');
  const [sheetIncludeGroupNames, setSheetIncludeGroupNames] = useState<boolean>(true);
  const [sheetBgTransparent, setSheetBgTransparent] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Advanced Export sub-mode: CSV or .spine
  const [advancedFormat, setAdvancedFormat] = useState<'csv' | 'spine'>('csv');

  // Advanced CSV Export states + Custom Column Mapping
  const [csvEngine, setCsvEngine] = useState<EngineExportPreset>('universal');
  const [csvIncludeEmpty, setCsvIncludeEmpty] = useState<boolean>(true);
  const [csvDelimiter, setCsvDelimiter] = useState<',' | ';'>(',');
  const [csvPpu, setCsvPpu] = useState<number>(16);
  const [csvPreviewMode, setCsvPreviewMode] = useState<'table' | 'raw'>('table');
  const [showColumnMapper, setShowColumnMapper] = useState<boolean>(true);
  const [columnMappingsByEngine, setColumnMappingsByEngine] = useState<
    Record<EngineExportPreset, Record<string, string>>
  >({
    universal: {},
    unity: {},
    godot: {},
    mugen: {},
  });
  const [disabledColumnsByEngine, setDisabledColumnsByEngine] = useState<
    Record<EngineExportPreset, string[]>
  >({
    universal: [],
    unity: [],
    godot: [],
    mugen: [],
  });
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  // Spine 2D (.spine) Export states
  const [spineSplitBones, setSpineSplitBones] = useState<boolean>(true);
  const [spineIncludeHitboxes, setSpineIncludeHitboxes] = useState<boolean>(true);
  const [spineTrackMotion, setSpineTrackMotion] = useState<boolean>(true);
  const [copiedSpine, setCopiedSpine] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const jsonContent = React.useMemo(() => generateCombatJson(project), [project]);

  const defaultEngineHeaders = React.useMemo(
    () => getDefaultCsvHeaders(csvEngine),
    [csvEngine]
  );

  const activeColumnMapping = columnMappingsByEngine[csvEngine] || {};
  const activeDisabledColumns = disabledColumnsByEngine[csvEngine] || [];

  const csvResult = React.useMemo(
    () =>
      generateCombatCsv(project, {
        engine: csvEngine,
        includeEmptyFrames: csvIncludeEmpty,
        delimiter: csvDelimiter,
        ppu: csvPpu,
        scale: exportScale,
        columnMapping: activeColumnMapping,
        disabledColumns: activeDisabledColumns,
      }),
    [
      project,
      csvEngine,
      csvIncludeEmpty,
      csvDelimiter,
      csvPpu,
      exportScale,
      activeColumnMapping,
      activeDisabledColumns,
    ]
  );

  const spineResult = React.useMemo(
    () =>
      buildSpineSkeletonJson(project, {
        scale: exportScale,
        splitBonesByLayer: spineSplitBones,
        includeHitboxSlots: spineIncludeHitboxes,
        trackBoneMotion: spineTrackMotion,
      }),
    [project, exportScale, spineSplitBones, spineIncludeHitboxes, spineTrackMotion]
  );

  // Update preview canvas
  useEffect(() => {
    if (!isOpen || activeTab === 'json' || activeTab === 'sequence' || activeTab === 'advanced' || activeTab === 'mode_export') return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    if (activeTab === 'spritesheet') {
      const sheet = generateGroupedSpritesheet(
        project.frames,
        project.layerGroups || [],
        project.width,
        project.height,
        {
          scale: exportScale,
          padding: 4 * exportScale,
          includeGroupNames: sheetIncludeGroupNames,
          excludeTempLayers: true,
          backgroundColor: sheetBgTransparent ? 'transparent' : '#0e111a',
        }
      );
      canvas.width = sheet.width;
      canvas.height = sheet.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(sheet, 0, 0);
    } else if (activeTab === 'single' || activeTab === 'gif') {
      const fCanvas = frameToCanvas(
        currentFrame,
        project.width,
        project.height,
        exportScale,
        false,
        project.layerGroups || []
      );
      canvas.width = fCanvas.width;
      canvas.height = fCanvas.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(fCanvas, 0, 0);
    }
  }, [isOpen, activeTab, project, currentFrame, exportScale, sheetIncludeGroupNames, sheetBgTransparent]);

  const handleRenameCsvColumn = (originalKey: string, nextLabel: string) => {
    setColumnMappingsByEngine((prev) => ({
      ...prev,
      [csvEngine]: {
        ...(prev[csvEngine] || {}),
        [originalKey]: nextLabel,
      },
    }));
  };

  const handleToggleCsvColumn = (originalKey: string) => {
    setDisabledColumnsByEngine((prev) => {
      const current = prev[csvEngine] || [];
      const exists = current.includes(originalKey);
      const next = exists
        ? current.filter((c) => c !== originalKey)
        : [...current, originalKey];
      return { ...prev, [csvEngine]: next };
    });
  };

  const handleResetCsvColumns = () => {
    setColumnMappingsByEngine((prev) => ({ ...prev, [csvEngine]: {} }));
    setDisabledColumnsByEngine((prev) => ({ ...prev, [csvEngine]: [] }));
  };

  // Download GIF
  const handleDownloadGif = async () => {
    setIsExporting(true);
    try {
      const bytes = generateAnimatedGif(project.frames, project.width, project.height, {
        scale: exportScale,
        fps: project.fps || 12,
        pingpong: gifPingPong,
        transparent: gifTransparent,
        loop: 0,
        layerGroups: project.layerGroups || [],
      });
      const filename = `${project.name.toLowerCase().replace(/\s+/g, '_')}_anim.gif`;
      downloadGif(bytes, filename);
    } catch (err: any) {
      console.error('Error al generar GIF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Download PNG Sequence as ZIP
  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const baseName = project.name.toLowerCase().replace(/\s+/g, '_');
      const blob = await exportPngSequenceZip(
        project.frames,
        project.width,
        project.height,
        exportScale,
        baseName,
        project.layerGroups || []
      );
      downloadBlob(blob, `${baseName}_secuencia_png.zip`);
    } catch (err: any) {
      console.error('Error al exportar secuencia ZIP:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Download Spritesheet PNG
  const handleDownloadSpritesheet = () => {
    const scaledSheet = generateGroupedSpritesheet(
      project.frames,
      project.layerGroups || [],
      project.width,
      project.height,
      {
        scale: exportScale,
        padding: 4 * exportScale,
        includeGroupNames: sheetIncludeGroupNames,
        excludeTempLayers: true,
        backgroundColor: sheetBgTransparent ? 'transparent' : '#0e111a',
      }
    );

    const filename = `${project.name.toLowerCase().replace(/\s+/g, '_')}_spritesheet.png`;
    const link = document.createElement('a');
    link.download = filename;
    link.href = scaledSheet.toDataURL('image/png');
    link.click();
  };

  // Download Single Frame PNG
  const handleDownloadSinglePng = () => {
    const canvas = frameToCanvas(
      currentFrame,
      project.width,
      project.height,
      exportScale,
      true,
      project.layerGroups || []
    );
    const filename = `${project.name.toLowerCase().replace(/\s+/g, '_')}_${currentFrame.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_framedata.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPcs = async () => {
    setIsExporting(true);
    try {
      const bytes = await exportProjectAsPcs(project);
      const baseName = project.name.toLowerCase().replace(/\s+/g, '_');
      downloadUint8Array(bytes, `${baseName}.pcs`, 'application/octet-stream');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAse = () => {
    const bytes = exportProjectAsAse(project);
    const baseName = project.name.toLowerCase().replace(/\s+/g, '_');
    downloadUint8Array(bytes, `${baseName}.ase`, 'application/octet-stream');
  };

  const handleDownloadPsd = () => {
    const bytes = exportProjectAsPsd(project, project.currentFrameIndex);
    const baseName = project.name.toLowerCase().replace(/\s+/g, '_');
    downloadUint8Array(bytes, `${baseName}.psd`, 'image/vnd.adobe.photoshop');
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsv = () => {
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvResult.csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_${csvEngine}_hitboxes_timing.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCsv = () => {
    navigator.clipboard.writeText(csvResult.csvText);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const handleDownloadSpineFile = () => {
    const blob = new Blob([spineResult.jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.spine`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSpineZip = async () => {
    setIsExporting(true);
    try {
      const blob = await exportSpineBundleZip(project, {
        scale: exportScale,
        splitBonesByLayer: spineSplitBones,
        includeHitboxSlots: spineIncludeHitboxes,
        trackBoneMotion: spineTrackMotion,
      });
      const baseName = project.name.toLowerCase().replace(/\s+/g, '_');
      downloadBlob(blob, `${baseName}_spine_bundle.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySpine = () => {
    navigator.clipboard.writeText(spineResult.jsonText);
    setCopiedSpine(true);
    setTimeout(() => setCopiedSpine(false), 2000);
  };

  // --- WORK MODE SPECIALIZED EXPORTERS ---
  const renderLayerGridToCanvas = (layer: Layer, scale: number): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = project.width * scale;
    c.height = project.height * scale;
    const ctx = c.getContext('2d');
    if (!ctx) return c;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1));
    for (let y = 0; y < project.height; y++) {
      const row = layer.pixels[y];
      if (!row) continue;
      for (let x = 0; x < project.width; x++) {
        const col = row[x];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    ctx.globalAlpha = 1;
    return c;
  };

  const slugifyFile = (raw: string) =>
    raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'layer';

  const handleExportStageParallaxZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const baseName = slugifyFile(project.name);
      const visibleLayers = currentFrame.layers.filter((l) => l.visible && l.layerType !== 'adjustment');
      const manifestLayers: Array<{
        index: number;
        file: string;
        name: string;
        parallaxSpeed: number;
        stagePlane?: string;
        opacity: number;
        blendMode: string;
      }> = [];

      visibleLayers.forEach((layer, idx) => {
        const fileName = `${String(idx + 1).padStart(2, '0')}_${slugifyFile(layer.name)}.png`;
        const c = renderLayerGridToCanvas(layer, exportScale);
        const b64 = c.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
        zip.file(`parallax_layers/${fileName}`, b64, { base64: true });
        manifestLayers.push({
          index: idx,
          file: `parallax_layers/${fileName}`,
          name: layer.name,
          parallaxSpeed: layer.parallaxSpeed ?? 1,
          stagePlane: layer.stagePlane,
          opacity: layer.opacity,
          blendMode: layer.blendMode || 'normal',
        });
      });

      const fullCanvas = frameToCanvas(
        currentFrame,
        project.width,
        project.height,
        exportScale,
        true,
        project.layerGroups || []
      );
      zip.file(
        `${baseName}_stage_full.png`,
        fullCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
        { base64: true }
      );
      zip.file(
        'parallax_manifest.json',
        JSON.stringify(
          {
            project: project.name,
            workMode: 'stage',
            width: project.width * exportScale,
            height: project.height * exportScale,
            nativeWidth: project.width,
            nativeHeight: project.height,
            scale: exportScale,
            layers: manifestLayers,
          },
          null,
          2
        )
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${baseName}_stage_parallax.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportHudAtlasZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const baseName = slugifyFile(project.name);
      const visibleLayers = currentFrame.layers.filter((l) => l.visible && l.layerType !== 'adjustment');

      interface TrimmedSprite {
        name: string;
        file: string;
        minX: number;
        minY: number;
        w: number;
        h: number;
        canvas: HTMLCanvasElement;
      }

      const trimmed: TrimmedSprite[] = [];
      for (let idx = 0; idx < visibleLayers.length; idx++) {
        const layer = visibleLayers[idx];
        let minX = project.width;
        let minY = project.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < project.height; y++) {
          const row = layer.pixels[y];
          if (!row) continue;
          for (let x = 0; x < project.width; x++) {
            if (row[x]) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX < minX || maxY < minY) continue;
        const w = (maxX - minX + 1) * exportScale;
        const h = (maxY - minY + 1) * exportScale;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const col = layer.pixels[y]?.[x];
              if (col) {
                ctx.fillStyle = col;
                ctx.fillRect((x - minX) * exportScale, (y - minY) * exportScale, exportScale, exportScale);
              }
            }
          }
        }
        const fileName = `${String(idx + 1).padStart(2, '0')}_${slugifyFile(layer.name)}.png`;
        zip.file(`elements/${fileName}`, c.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''), {
          base64: true,
        });
        trimmed.push({ name: layer.name, file: `elements/${fileName}`, minX, minY, w, h, canvas: c });
      }

      // Pack horizontal strip atlas with padding
      const pad = 2 * exportScale;
      const atlasW = Math.max(16, trimmed.reduce((acc, t) => acc + t.w + pad, pad));
      const atlasH = Math.max(16, trimmed.reduce((acc, t) => Math.max(acc, t.h), 0) + pad * 2);
      const atlasCanvas = document.createElement('canvas');
      atlasCanvas.width = atlasW;
      atlasCanvas.height = atlasH;
      const actx = atlasCanvas.getContext('2d');
      const atlasEntries: Record<
        string,
        { x: number; y: number; w: number; h: number; origX: number; origY: number }
      > = {};
      if (actx) {
        actx.imageSmoothingEnabled = false;
        let cursorX = pad;
        trimmed.forEach((item) => {
          actx.drawImage(item.canvas, cursorX, pad);
          atlasEntries[item.name] = {
            x: cursorX,
            y: pad,
            w: item.w,
            h: item.h,
            origX: item.minX * exportScale,
            origY: item.minY * exportScale,
          };
          cursorX += item.w + pad;
        });
      }

      zip.file(
        `${baseName}_ui_atlas.png`,
        atlasCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
        { base64: true }
      );
      zip.file(
        'ui_atlas.json',
        JSON.stringify(
          {
            project: project.name,
            workMode: 'hud_ui',
            atlasWidth: atlasW,
            atlasHeight: atlasH,
            scale: exportScale,
            elements: atlasEntries,
          },
          null,
          2
        )
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${baseName}_hud_ui_atlas.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportFxComponentLayersZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const baseName = slugifyFile(project.name);
      const fxManifestFrames: Array<{
        frameIndex: number;
        name: string;
        layers: Array<{ name: string; file: string; blendMode: string; opacity: number; hasRecipe: boolean }>;
      }> = [];

      project.frames.forEach((frame, fIdx) => {
        const fPad = String(fIdx + 1).padStart(3, '0');
        const layerEntries: Array<{
          name: string;
          file: string;
          blendMode: string;
          opacity: number;
          hasRecipe: boolean;
        }> = [];
        frame.layers
          .filter((l) => l.visible && l.layerType !== 'adjustment')
          .forEach((layer, lIdx) => {
            const fileName = `f${fPad}_${String(lIdx + 1).padStart(2, '0')}_${slugifyFile(layer.name)}.png`;
            const c = renderLayerGridToCanvas(layer, exportScale);
            zip.file(
              `fx_components/${fileName}`,
              c.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
              { base64: true }
            );
            layerEntries.push({
              name: layer.name,
              file: `fx_components/${fileName}`,
              blendMode: layer.blendMode || 'normal',
              opacity: layer.opacity,
              hasRecipe: Boolean(layer.fxRecipe),
            });
          });
        fxManifestFrames.push({ frameIndex: fIdx, name: frame.name, layers: layerEntries });
      });

      const recipeLayer = currentFrame.layers.find((l) => l.fxRecipe);
      zip.file(
        'fx_manifest.json',
        JSON.stringify(
          {
            project: project.name,
            workMode: 'fx',
            fps: project.fps,
            scale: exportScale,
            frames: fxManifestFrames,
            fxRecipe: recipeLayer?.fxRecipe || null,
          },
          null,
          2
        )
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${baseName}_fx_components.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTilesetZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const baseName = slugifyFile(project.name);
      const composed = compositeFrame(
        currentFrame,
        project.width,
        project.height,
        -1,
        true,
        project.layerGroups || []
      );
      const seamReport = analyzeTilesetSeams(composed, project.width, project.height);
      const tileCanvas = frameToCanvas(
        currentFrame,
        project.width,
        project.height,
        exportScale,
        true,
        project.layerGroups || []
      );

      // 3x3 repeat verification sheet
      const repCanvas = document.createElement('canvas');
      repCanvas.width = tileCanvas.width * 3;
      repCanvas.height = tileCanvas.height * 3;
      const rctx = repCanvas.getContext('2d');
      if (rctx) {
        rctx.imageSmoothingEnabled = false;
        for (let gy = 0; gy < 3; gy++) {
          for (let gx = 0; gx < 3; gx++) {
            rctx.drawImage(tileCanvas, gx * tileCanvas.width, gy * tileCanvas.height);
          }
        }
      }

      zip.file(
        `${baseName}_tileset_seamless.png`,
        tileCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
        { base64: true }
      );
      zip.file(
        `${baseName}_tileset_3x3_preview.png`,
        repCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
        { base64: true }
      );
      zip.file(
        'tileset_autotile.json',
        JSON.stringify(
          {
            project: project.name,
            workMode: 'tileset',
            tileWidth: project.width * exportScale,
            tileHeight: project.height * exportScale,
            scale: exportScale,
            seamQuality: {
              horizontalScore: seamReport.horizontalScore,
              verticalScore: seamReport.verticalScore,
              overallScore: seamReport.overallScore,
              mismatchedEdgePixels: seamReport.mismatchedEdgePixels.length,
            },
            autotileBitmask4: Array.from({ length: 16 }, (_, mask) => ({
              bitmask: mask,
              north: Boolean(mask & 1),
              east: Boolean(mask & 2),
              south: Boolean(mask & 4),
              west: Boolean(mask & 8),
            })),
          },
          null,
          2
        )
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${baseName}_tileset_pack.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSeparatedLayersZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const baseName = slugifyFile(project.name);
      const visibleLayers = currentFrame.layers.filter((l) => l.visible && l.layerType !== 'adjustment');

      const fullCanvas = frameToCanvas(
        currentFrame,
        project.width,
        project.height,
        exportScale,
        true,
        project.layerGroups || []
      );
      zip.file(
        `${baseName}_composite_${exportScale}x.png`,
        fullCanvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''),
        { base64: true }
      );

      const manifest: Array<{ file: string; name: string; opacity: number; blendMode: string }> = [];
      visibleLayers.forEach((layer, idx) => {
        const fileName = `${String(idx + 1).padStart(2, '0')}_${slugifyFile(layer.name)}.png`;
        const c = renderLayerGridToCanvas(layer, exportScale);
        zip.file(`layers/${fileName}`, c.toDataURL('image/png').replace(/^data:image\/png;base64,/, ''), {
          base64: true,
        });
        manifest.push({
          file: `layers/${fileName}`,
          name: layer.name,
          opacity: layer.opacity,
          blendMode: layer.blendMode || 'normal',
        });
      });

      zip.file(
        'layers_manifest.json',
        JSON.stringify(
          {
            project: project.name,
            workMode: activeWorkMode,
            width: project.width * exportScale,
            height: project.height * exportScale,
            layers: manifest,
          },
          null,
          2
        )
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, `${baseName}_${activeWorkMode}_layers.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#141724] border border-[#2b334a] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#252c3f] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Exportar Assets de Animación</h3>
              <p className="text-[11px] text-slate-400">
                {project.name} · {project.width}x{project.height}px · {project.frames.length} fotogramas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#202738] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-5 pt-3 border-b border-[#22283a] flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('gif')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'gif'
                ? 'border-amber-400 text-amber-400 bg-[#1c2233]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>GIF Animado</span>
          </button>

          <button
            onClick={() => setActiveTab('spritesheet')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'spritesheet'
                ? 'border-amber-400 text-amber-400 bg-[#1c2233]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Spritesheet PNG</span>
          </button>

          <button
            onClick={() => setActiveTab('sequence')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'sequence'
                ? 'border-amber-400 text-amber-400 bg-[#1c2233]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Secuencia PNG (ZIP)</span>
          </button>

          <button
            onClick={() => setActiveTab('single')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'single'
                ? 'border-amber-400 text-amber-400 bg-[#1c2233]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Frame Actual</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'json'
                ? 'border-amber-400 text-amber-400 bg-[#1c2233]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Proyecto (.pcs / .ase / .psd)</span>
          </button>

          <button
            onClick={() => setActiveTab('mode_export')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'mode_export'
                ? 'border-sky-400 text-sky-300 bg-[#172336]'
                : 'border-transparent text-sky-400/80 hover:text-sky-300'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Modo: {modeDef.shortLabel}</span>
          </button>

          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'advanced'
                ? 'border-emerald-400 text-emerald-300 bg-[#182628]'
                : 'border-transparent text-emerald-400/80 hover:text-emerald-300'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportación Avanzada (CSV / .spine)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* Scale Selector for visual formats */}
          {activeTab !== 'json' && (
            <div className="flex items-center justify-between bg-[#191e2b] p-3 rounded-xl border border-[#273247]">
              <span className="text-xs font-medium text-slate-300">
                Escala de Píxeles (Pixel-Art Crisp):
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 4, 8].map((scale) => (
                  <button
                    key={scale}
                    onClick={() => setExportScale(scale)}
                    className={`px-2.5 py-1 text-xs font-mono rounded ${
                      exportScale === scale
                        ? 'bg-amber-400 text-slate-900 font-bold'
                        : 'bg-[#22293b] text-slate-400 hover:text-white'
                    }`}
                  >
                    {scale}x ({project.width * scale}px)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: GIF ANIMADO */}
          {activeTab === 'gif' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 bg-[#11131c] p-3 rounded-xl border border-[#252c3e] text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gifTransparent}
                    onChange={(e) => setGifTransparent(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>Fondo Transparente</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gifPingPong}
                    onChange={(e) => setGifPingPong(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>Ciclo Ping-Pong (Ida y vuelta)</span>
                </label>
              </div>

              <div className="canvas-checkerboard p-4 rounded-xl border border-[#293247] flex items-center justify-center min-h-[160px]">
                <canvas ref={previewCanvasRef} className="pixel-canvas max-h-56 max-w-full" />
              </div>
            </div>
          )}

          {/* TAB: SPRITESHEET PNG */}
          {activeTab === 'spritesheet' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-4 bg-[#11131c] p-3 rounded-xl border border-[#252c3e] text-xs">
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sheetIncludeGroupNames}
                    onChange={(e) => setSheetIncludeGroupNames(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>Mostrar nombre de cada grupo encima de su animación</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sheetBgTransparent}
                    onChange={(e) => setSheetBgTransparent(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>Fondo Transparente</span>
                </label>
              </div>

              <div className="canvas-checkerboard p-4 rounded-xl border border-[#293247] flex items-center justify-center min-h-[160px] overflow-auto">
                <canvas ref={previewCanvasRef} className="pixel-canvas max-h-64 max-w-full" />
              </div>
              <p className="text-[11px] text-slate-400">
                Cada grupo/carpeta de animación (ej. idle, walk) se organiza en su propia tira horizontal con su nombre libre impreso encima.
              </p>
            </div>
          )}

          {/* TAB: SECUENCIA DE PNGs (ZIP) */}
          {activeTab === 'sequence' && (
            <div className="p-4 bg-[#11141e] rounded-xl border border-[#252c3f] flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <FolderArchive className="w-4 h-4" />
                <span>Empaquetador de Archivos Individuales</span>
              </div>
              <p className="text-xs text-slate-300">
                Se descargarán los {project.frames.length} fotogramas individualmente como archivos numerados dentro de un archivo ZIP:
              </p>
              <div className="bg-[#0b0d13] p-2.5 rounded-lg font-mono text-[11px] text-slate-400 flex flex-col gap-1">
                <span>📁 {project.name.toLowerCase().replace(/\s+/g, '_')}_secuencia_png.zip/</span>
                <span className="pl-4 text-emerald-400">📄 frame_001.png ({project.width * exportScale}x{project.height * exportScale}px)</span>
                <span className="pl-4 text-emerald-400">📄 frame_002.png</span>
                <span className="pl-4 text-slate-500">... y {Math.max(0, project.frames.length - 2)} archivos más</span>
              </div>
            </div>
          )}

          {/* TAB: FOTOGRAMA ACTUAL */}
          {activeTab === 'single' && (
            <div className="flex flex-col gap-3">
              <div className="canvas-checkerboard p-4 rounded-xl border border-[#293247] flex items-center justify-center min-h-[160px]">
                <canvas ref={previewCanvasRef} className="pixel-canvas max-h-56 max-w-full" />
              </div>
              <p className="text-[11px] text-slate-400">
                Exporta únicamente el fotograma seleccionado: <span className="text-amber-400 font-bold">{currentFrame.name}</span>.
              </p>
            </div>
          )}

          {/* TAB: PROYECTO (.PCS / .ASE / .PSD / FRAME DATA JSON) */}
          {activeTab === 'json' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-[#151824] border border-amber-400/50 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-amber-300">PixelClash (.pcs)</span>
                    <span className="text-[9px] font-mono text-amber-400">Nativo</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Archivo único comprimido del estudio: capas, grupos, hitboxes, pinceles, escenario, paletas y miniatura.
                  </p>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleDownloadPcs}
                    className="mt-auto px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Guardar .pcs</span>
                  </button>
                </div>

                <div className="p-3 bg-[#11141e] border border-[#26314a] rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-sky-300">Aseprite (.ase)</span>
                    <span className="text-[9px] font-mono text-sky-400">32-bit</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Guarda animación, capas, duraciones y tags en formato binario compatible con Aseprite.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadAse}
                    className="mt-auto px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Guardar .ase</span>
                  </button>
                </div>

                <div className="p-3 bg-[#11141e] border border-[#26314a] rounded-xl flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-indigo-300">Photoshop (.psd)</span>
                    <span className="text-[9px] font-mono text-indigo-400">Capas</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Exporta un documento Adobe Photoshop con capas editables y carpetas por fotograma.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownloadPsd}
                    className="mt-auto px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Guardar .psd</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">
                  Frame Data JSON (colisiones, hitboxes y timing):
                </span>
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 rounded bg-[#242c40] hover:bg-[#303b54] text-xs font-mono text-amber-400 flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Copiado!' : 'Copiar JSON'}</span>
                </button>
              </div>
              <pre className="p-3 bg-[#0d0f17] border border-[#232a3d] rounded-xl text-[11px] font-mono text-emerald-400 overflow-auto max-h-52">
                {jsonContent}
              </pre>
            </div>
          )}

          {/* TAB: EXPORTACIÓN AVANZADA (CSV CON MAPEO DE COLUMNAS + SPINE 2D .spine) */}
          {activeTab === 'advanced' && (
            <div className="flex flex-col gap-3">
              {/* Format Switch: CSV vs Spine 2D */}
              <div className="flex items-center justify-between gap-2 bg-[#10131d] p-1 rounded-xl border border-[#242c40]">
                <button
                  type="button"
                  onClick={() => setAdvancedFormat('csv')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                    advancedFormat === 'csv'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Datos CSV (Mapeo de Columnas)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdvancedFormat('spine')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                    advancedFormat === 'spine'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bone className="w-4 h-4" />
                  <span>Esqueleto 2D (.spine)</span>
                </button>
              </div>

              {advancedFormat === 'csv' ? (
                <>
                  {/* Target Engine Selector */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">
                      Motor Destino (Hitboxes y Duración de Fotogramas):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'universal', name: 'Universal / CSV', desc: 'Px + Normalizado 0..1' },
                        { id: 'unity', name: 'Unity 2D', desc: 'Pivot Y-Up + PPU Units' },
                        { id: 'godot', name: 'Godot Engine', desc: 'Extents & Center 2D' },
                        { id: 'mugen', name: 'MUGEN / IKEMEN', desc: 'Clsn1/Clsn2 + Air Ticks' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCsvEngine(item.id as EngineExportPreset)}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            csvEngine === item.id
                              ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-bold'
                              : 'bg-[#11141e] border-[#252c3f] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-xs">{item.name}</div>
                          <div className="text-[10px] font-normal opacity-80">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CSV Technical Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#11141e] p-3 rounded-xl border border-[#252c3f] text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={csvIncludeEmpty}
                        onChange={(e) => setCsvIncludeEmpty(e.target.checked)}
                        className="rounded accent-emerald-400"
                      />
                      <span>Incluir frames sin hitboxes</span>
                    </label>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Separador CSV:</span>
                      <select
                        value={csvDelimiter}
                        onChange={(e) => setCsvDelimiter(e.target.value as ',' | ';')}
                        className="bg-[#191f2e] border border-[#2b354d] rounded px-2 py-1 text-xs font-mono text-slate-200"
                      >
                        <option value=",">Coma (,)</option>
                        <option value=";">Punto y coma (;)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">PPU (Unity/Godot):</span>
                      <input
                        type="number"
                        min={1}
                        max={512}
                        value={csvPpu}
                        onChange={(e) => setCsvPpu(Math.max(1, parseInt(e.target.value, 10) || 16))}
                        className="w-16 bg-[#191f2e] border border-[#2b354d] rounded px-2 py-1 text-xs font-mono text-emerald-300 text-right tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Column Header Mapping Editor */}
                  <div className="bg-[#11141e] border border-[#252c3f] rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-[#161a27] border-b border-[#232b40] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowColumnMapper((v) => !v)}
                        className="flex items-center gap-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>
                          Mapear Nombres de Columnas ({csvResult.headers.length}/{defaultEngineHeaders.length} activas)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetCsvColumns}
                        className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1"
                        title="Restablecer nombres originales"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restablecer</span>
                      </button>
                    </div>

                    {showColumnMapper && (
                      <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                        {defaultEngineHeaders.map((origCol) => {
                          const isEnabled = !activeDisabledColumns.includes(origCol);
                          const mappedVal = activeColumnMapping[origCol] ?? '';
                          return (
                            <div
                              key={origCol}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] ${
                                isEnabled
                                  ? 'bg-[#171c2a] border-[#29334b]'
                                  : 'bg-[#0e1017] border-[#1c2130] opacity-55'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleToggleCsvColumn(origCol)}
                                title={`Incluir columna ${origCol}`}
                                className="rounded accent-emerald-400 shrink-0"
                              />
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[9px] font-mono text-slate-500 truncate">
                                  {origCol}
                                </span>
                                <input
                                  type="text"
                                  disabled={!isEnabled}
                                  placeholder={origCol}
                                  value={mappedVal}
                                  onChange={(e) => handleRenameCsvColumn(origCol, e.target.value)}
                                  className="bg-transparent border-b border-[#2b354d] focus:border-emerald-400 outline-none text-[11px] font-mono text-emerald-300 placeholder:text-slate-500 w-full"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Preview Switcher + Copy Action */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 bg-[#10131d] p-0.5 rounded-lg border border-[#242c40] text-[11px]">
                      <button
                        type="button"
                        onClick={() => setCsvPreviewMode('table')}
                        className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                          csvPreviewMode === 'table'
                            ? 'bg-[#222b40] text-emerald-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Table2 className="w-3.5 h-3.5" />
                        <span>Vista Tabla ({csvResult.rows.length} filas)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCsvPreviewMode('raw')}
                        className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                          csvPreviewMode === 'raw'
                            ? 'bg-[#222b40] text-emerald-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>CSV Crudo</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCsv}
                      className="px-2.5 py-1 rounded bg-[#242c40] hover:bg-[#303b54] text-xs font-mono text-emerald-300 flex items-center gap-1 transition-colors"
                    >
                      {copiedCsv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCsv ? '¡CSV Copiado!' : 'Copiar CSV'}</span>
                    </button>
                  </div>

                  {/* CSV Preview Box */}
                  {csvPreviewMode === 'table' ? (
                    <div className="border border-[#232a3d] rounded-xl bg-[#0d0f17] overflow-auto max-h-52">
                      <table className="w-full text-left border-collapse font-mono text-[10px] tabular-nums">
                        <thead className="bg-[#151926] text-emerald-300 sticky top-0 border-b border-[#262f45]">
                          <tr>
                            {csvResult.headers.map((h, i) => (
                              <th key={`${h}-${i}`} className="px-2 py-1.5 font-semibold whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1b2030] text-slate-300">
                          {csvResult.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[#171c2b]">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-2 py-1 whitespace-nowrap">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <pre className="p-3 bg-[#0d0f17] border border-[#232a3d] rounded-xl text-[11px] font-mono text-emerald-400 overflow-auto max-h-52">
                      {csvResult.csvText}
                    </pre>
                  )}

                  <p className="text-[11px] text-slate-400 tabular-nums">
                    Vista previa en tiempo real: {csvResult.frameCount} fotogramas · {csvResult.hitboxRowCount} cajas · {csvResult.headers.length} columnas mapeadas · Escala {exportScale}x.
                  </p>
                </>
              ) : (
                /* SPINE 2D (.spine) EXPORT PANEL */
                <div className="flex flex-col gap-3">
                  <div className="bg-[#11141e] p-3 rounded-xl border border-[#252c3f] flex flex-col gap-2 text-xs">
                    <span className="text-xs font-semibold text-indigo-300">
                      Configuración de Esqueleto 2D (.spine v4.1)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={spineSplitBones}
                          onChange={(e) => setSpineSplitBones(e.target.checked)}
                          className="rounded accent-indigo-400"
                        />
                        <span>Huesos por Capa</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={spineIncludeHitboxes}
                          onChange={(e) => setSpineIncludeHitboxes(e.target.checked)}
                          className="rounded accent-indigo-400"
                        />
                        <span>Hitboxes BoundingBox</span>
                      </label>
                      <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={spineTrackMotion}
                          onChange={(e) => setSpineTrackMotion(e.target.checked)}
                          className="rounded accent-indigo-400"
                        />
                        <span>Rastreo Óseo por Frame</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <div className="font-mono text-[11px] tabular-nums text-indigo-300">
                      {spineResult.boneCount} huesos · {spineResult.slotCount} slots · {spineResult.animationCount} animaciones · {spineResult.attachmentCount} attachments
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySpine}
                      className="px-2.5 py-1 rounded bg-[#242c40] hover:bg-[#303b54] text-xs font-mono text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      {copiedSpine ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSpine ? '¡Copiado!' : 'Copiar .spine'}</span>
                    </button>
                  </div>

                  <pre className="p-3 bg-[#0d0f17] border border-[#232a3d] rounded-xl text-[11px] font-mono text-indigo-300 overflow-auto max-h-64">
                    {spineResult.jsonText}
                  </pre>

                  <p className="text-[11px] text-slate-400">
                    Genera jerarquía ósea (`root → fighter_body → bone_capa`), slots por capa, bounding-boxes de combate y timelines por grupo de movimiento listos para Spine, Godot, Unity o PixiJS.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: EXPORTACIÓN ESPECIALIZADA POR MODO DE TRABAJO */}
          {activeTab === 'mode_export' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[#2a334d] bg-[#171c2b] p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: modeDef.accentColor }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100">
                      Exportación Especializada · Modo {modeDef.label}
                    </div>
                    <div className="text-[11px] text-slate-400">{modeDef.description}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#232b42] text-slate-300 shrink-0 tabular-nums">
                  {currentFrame.layers.filter((l) => l.visible && l.layerType !== 'adjustment').length} capas visibles
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeWorkMode === 'stage' && (
                  <>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleExportStageParallaxZip}
                      className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
                    >
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        Capas Parallax (ZIP + JSON)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Exporta cada plano por separado (PNG) + <code className="text-emerald-200">parallax_manifest.json</code> con velocidades y modos de fusión.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSinglePng}
                      className="p-3.5 rounded-xl border border-[#2b344d] bg-[#191e2b] hover:bg-[#22293c] text-left transition-colors flex flex-col gap-1"
                    >
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-sky-400" />
                        Escenario Completo PNG ({exportScale}x)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Renderiza todas las capas visibles combinadas en una sola imagen lista para motor.
                      </span>
                    </button>
                  </>
                )}

                {activeWorkMode === 'hud_ui' && (
                  <>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleExportHudAtlasZip}
                      className="p-3.5 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
                    >
                      <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        UI Atlas PNG + ui_atlas.json + Elementos (ZIP)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Recorta automáticamente cada capa HUD, genera el Atlas empaquetado con coordenadas JSON y los PNG individuales.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSinglePng}
                      className="p-3.5 rounded-xl border border-[#2b344d] bg-[#191e2b] hover:bg-[#22293c] text-left transition-colors flex flex-col gap-1"
                    >
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-amber-400" />
                        Mockup HUD Completo PNG ({exportScale}x)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Exporta la composición exacta de la interfaz para revisión o overlay.
                      </span>
                    </button>
                  </>
                )}

                {activeWorkMode === 'fx' && (
                  <>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleExportFxComponentLayersZip}
                      className="p-3.5 rounded-xl border border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
                    >
                      <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        Capas FX por Componente (ZIP + Receta)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Exporta todos los frames separados por componente (Base, Brillo, Chispas, Humo) + <code className="text-violet-200">fx_manifest.json</code>.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSpritesheet}
                      className="p-3.5 rounded-xl border border-[#2b344d] bg-[#191e2b] hover:bg-[#22293c] text-left transition-colors flex flex-col gap-1"
                    >
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        Spritesheet FX Transparente ({exportScale}x)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Hoja de sprites optimizada con todos los fotogramas del efecto listos para shader/partícula.
                      </span>
                    </button>
                  </>
                )}

                {activeWorkMode === 'tileset' && (
                  <>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleExportTilesetZip}
                      className="p-3.5 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
                    >
                      <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        Tileset Seamless + Autotile JSON (ZIP)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Incluye tile PNG nítido, hoja de verificación 3×3 y tabla bitmask de 16 vecinos + reporte de costuras.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSinglePng}
                      className="p-3.5 rounded-xl border border-[#2b344d] bg-[#191e2b] hover:bg-[#22293c] text-left transition-colors flex flex-col gap-1"
                    >
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-teal-400" />
                        Tile Base PNG ({exportScale}x)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Descarga directa del bloque listo para importar en Tiled, Godot o Unity Tilemap.
                      </span>
                    </button>
                  </>
                )}

                {(activeWorkMode === 'portrait' ||
                  activeWorkMode === 'cutscene' ||
                  activeWorkMode === 'fighter' ||
                  activeWorkMode === 'custom') && (
                  <>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={handleExportSeparatedLayersZip}
                      className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-left transition-colors flex flex-col gap-1 disabled:opacity-50"
                    >
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        Paquete Capas Separadas + Compuesto (ZIP)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Exporta la ilustración compuesta HD ({exportScale}x) + todas las capas visibles en PNGs individuales y manifiesto JSON.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSpritesheet}
                      className="p-3.5 rounded-xl border border-[#2b344d] bg-[#191e2b] hover:bg-[#22293c] text-left transition-colors flex flex-col gap-1"
                    >
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-sky-400" />
                        Spritesheet / Secuencia ({project.frames.length} frames)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Ideal para sprites de combate, secuencias animadas y expresiones de retratos.
                      </span>
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-[#252c3f] bg-[#121622] px-3.5 py-2.5 text-[11px] text-slate-400 flex items-center justify-between gap-2">
                <span>Modo activo: {modeDef.label} ({modeDef.badge})</span>
                <span className="font-mono text-slate-200">{project.width * exportScale}×{project.height * exportScale}px · {exportScale}x</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#252c3f] bg-[#10121a] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cerrar
          </button>

          {activeTab === 'gif' && (
            <button
              onClick={handleDownloadGif}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 shadow-md active:scale-98 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generando GIF...' : `Descargar GIF (${exportScale}x)`}</span>
            </button>
          )}

          {activeTab === 'spritesheet' && (
            <button
              onClick={handleDownloadSpritesheet}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 shadow-md active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Spritesheet PNG</span>
            </button>
          )}

          {activeTab === 'sequence' && (
            <button
              onClick={handleDownloadZip}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 shadow-md active:scale-98 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Empaquetando ZIP...' : 'Descargar Secuencia ZIP'}</span>
            </button>
          )}

          {activeTab === 'single' && (
            <button
              onClick={handleDownloadSinglePng}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 shadow-md active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Frame PNG</span>
            </button>
          )}

          {activeTab === 'json' && (
            <button
              onClick={handleDownloadJson}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 shadow-md active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Frame Data (.json)</span>
            </button>
          )}

          {activeTab === 'advanced' && advancedFormat === 'csv' && (
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center gap-1.5 shadow-md active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar CSV ({csvEngine.toUpperCase()})</span>
            </button>
          )}

          {activeTab === 'advanced' && advancedFormat === 'spine' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSpineFile}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar .spine</span>
              </button>
              <button
                onClick={handleDownloadSpineZip}
                disabled={isExporting}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Empaquetando...' : 'Paquete .spine + Atlas (.zip)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
