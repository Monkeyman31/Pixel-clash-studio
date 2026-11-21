export type PsdRecoveryMode =
  | 'normal'
  | 'rasterize_incompatible'
  | 'ignore_incompatible'
  | 'merged_composite'
  | 'visible_only';

export type PsdFeatureCompatibilityStatus =
  | 'compatible'
  | 'partial'
  | 'warning'
  | 'unsupported';

export interface PsdCompatibilityCheckItem {
  key: 'layers' | 'groups' | 'transparency' | 'masks' | 'smart_objects' | 'adjustments';
  label: string;
  status: PsdFeatureCompatibilityStatus;
  detail: string;
}

export interface PsdCompatibilityReport {
  fileName: string;
  sourceSoftware: string;
  psdVersion: string;
  colorModeLabel: string;
  bitsPerChannel: number;
  width: number;
  height: number;
  dpi: number;
  totalSourceLayers: number;
  importedLayers: number;
  importedGroups: number;
  skippedLayers: number;
  rasterizedLayers: number;
  recoveryModeUsed: PsdRecoveryMode;
  hasWarnings: boolean;
  items: PsdCompatibilityCheckItem[];
  notes: string[];
}

export interface PsdHeaderInspection {
  isPsdSignature: boolean;
  signatureText: string;
  versionNumber: number;
  psdVersionLabel: string;
  isPsb: boolean;
  channels: number;
  height: number;
  width: number;
  bitsPerChannel: number;
  colorModeCode: number;
  colorModeLabel: string;
  headerValid: boolean;
  headerError?: string;
}

export interface FileDiagnosticLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  fileSizeBytes?: number;
  formatLabel: string;
  psdVersion?: string;
  incompatibleElement?: string;
  moduleName: string;
  errorCode: string;
  message: string;
  technicalDetails?: string;
  recoveryModeAttempted?: PsdRecoveryMode;
}

const DIAGNOSTIC_STORAGE_KEY = 'pixelclash_file_error_logs_v1';
const MAX_DIAGNOSTIC_LOGS = 60;
const inMemoryDiagnosticLogs: FileDiagnosticLogEntry[] = [];

export function formatByteSize(bytes?: number): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return 'Desconocido';
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB (${bytes.toLocaleString()} bytes)`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`;
}

export function getRecoveryModeLabel(mode?: PsdRecoveryMode): string {
  switch (mode) {
    case 'rasterize_incompatible':
      return 'Rasterizar capas incompatibles';
    case 'ignore_incompatible':
      return 'Ignorar capas incompatibles';
    case 'merged_composite':
      return 'Abrir imagen fusionada';
    case 'visible_only':
      return 'Importar únicamente capas visibles';
    case 'normal':
    default:
      return 'Importación estándar completa';
  }
}

export function getPsdColorModeLabel(code: number): string {
  switch (code) {
    case 0:
      return 'Bitmap (1-bit)';
    case 1:
      return 'Escala de grises';
    case 2:
      return 'Color indexado';
    case 3:
      return 'RGB';
    case 4:
      return 'CMYK';
    case 7:
      return 'Multicanal';
    case 8:
      return 'Duotono';
    case 9:
      return 'Lab';
    default:
      return `Modo desconocido (${code})`;
  }
}

export function inspectPsdHeader(buffer: ArrayBuffer): PsdHeaderInspection {
  if (!buffer || buffer.byteLength < 26) {
    return {
      isPsdSignature: false,
      signatureText: '',
      versionNumber: 0,
      psdVersionLabel: 'Desconocida (cabecera truncada)',
      isPsb: false,
      channels: 0,
      height: 0,
      width: 0,
      bitsPerChannel: 0,
      colorModeCode: -1,
      colorModeLabel: 'Desconocido',
      headerValid: false,
      headerError: `El archivo es demasiado pequeño (${buffer?.byteLength ?? 0} bytes) para contener una cabecera PSD válida (mínimo 26 bytes).`,
    };
  }

  const bytes = new Uint8Array(buffer, 0, 26);
  const view = new DataView(buffer, 0, 26);
  const signatureText = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const isPsdSignature = signatureText === '8BPS';

  if (!isPsdSignature) {
    return {
      isPsdSignature: false,
      signatureText: signatureText.replace(/[^\x20-\x7e]/g, '?'),
      versionNumber: 0,
      psdVersionLabel: 'No es PSD (firma inválida)',
      isPsb: false,
      channels: 0,
      height: 0,
      width: 0,
      bitsPerChannel: 0,
      colorModeCode: -1,
      colorModeLabel: 'Desconocido',
      headerValid: false,
      headerError: `Firma binaria inválida ("${signatureText.replace(/[^\x20-\x7e]/g, '?')}"). Se esperaba cabecera "8BPS".`,
    };
  }

  const versionNumber = view.getUint16(4, false);
  const isPsb = versionNumber === 2;
  const psdVersionLabel =
    versionNumber === 1
      ? 'PSD v1 (Photoshop Estándar)'
      : versionNumber === 2
      ? 'PSB v2 (Documento Grande)'
      : `PSD v${versionNumber} (No estándar)`;

  const channels = view.getUint16(12, false);
  const height = view.getUint32(14, false);
  const width = view.getUint32(18, false);
  const bitsPerChannel = view.getUint16(22, false);
  const colorModeCode = view.getUint16(24, false);
  const colorModeLabel = getPsdColorModeLabel(colorModeCode);

  let headerError: string | undefined;
  if (versionNumber !== 1 && versionNumber !== 2) {
    headerError = `Versión PSD no soportada (${versionNumber}). Solo se admiten v1 (PSD) y v2 (PSB).`;
  } else if (width <= 0 || height <= 0) {
    headerError = `Dimensiones declaradas en cabecera inválidas (${width}×${height}).`;
  } else if (![1, 8, 16, 32].includes(bitsPerChannel)) {
    headerError = `Profundidad de color por canal no válida (${bitsPerChannel} bits).`;
  }

  return {
    isPsdSignature,
    signatureText,
    versionNumber,
    psdVersionLabel,
    isPsb,
    channels,
    height,
    width,
    bitsPerChannel,
    colorModeCode,
    colorModeLabel,
    headerValid: !headerError,
    headerError,
  };
}

export function detectPsdSourceSoftware(imageResources?: {
  versionInfo?: { writerName?: string; readerName?: string };
  xmpMetadata?: string;
}): string {
  const writer = (imageResources?.versionInfo?.writerName || '').trim();
  const reader = (imageResources?.versionInfo?.readerName || '').trim();
  const xmp = imageResources?.xmpMetadata || '';
  const combined = `${writer} ${reader} ${xmp}`.toLowerCase();

  if (combined.includes('krita')) return 'Krita';
  if (combined.includes('clip studio') || combined.includes('celsys')) return 'Clip Studio Paint';
  if (combined.includes('procreate')) return 'Procreate';
  if (combined.includes('affinity')) return 'Affinity Photo';
  if (combined.includes('gimp')) return 'GIMP';
  if (combined.includes('paint tool sai') || combined.includes('sai2')) return 'PaintTool SAI';
  if (combined.includes('photoshop') || combined.includes('adobe')) return 'Adobe Photoshop';
  if (writer) return writer;
  if (reader) return reader;
  return 'PSD Estándar compatible';
}

export function recordFileFailureDiagnostic(
  entry: Omit<FileDiagnosticLogEntry, 'id' | 'timestamp'>
): FileDiagnosticLogEntry {
  const fullEntry: FileDiagnosticLogEntry = {
    ...entry,
    id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  inMemoryDiagnosticLogs.unshift(fullEntry);
  if (inMemoryDiagnosticLogs.length > MAX_DIAGNOSTIC_LOGS) {
    inMemoryDiagnosticLogs.length = MAX_DIAGNOSTIC_LOGS;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existingRaw = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
      const parsed = existingRaw ? (JSON.parse(existingRaw) as FileDiagnosticLogEntry[]) : [];
      const next = [fullEntry, ...(Array.isArray(parsed) ? parsed : [])].slice(0, MAX_DIAGNOSTIC_LOGS);
      window.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore quota/storage access errors so diagnostic logging never breaks error UI
  }

  return fullEntry;
}

export function getFileFailureDiagnostics(): FileDiagnosticLogEntry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as FileDiagnosticLogEntry[];
      }
    }
  } catch {
    // Fallback to in-memory buffer
  }
  return [...inMemoryDiagnosticLogs];
}

export function clearFileFailureDiagnostics(): void {
  inMemoryDiagnosticLogs.length = 0;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

export function formatDiagnosticLogText(entry: {
  fileName: string;
  fileSizeBytes?: number;
  formatLabel?: string;
  psdVersion?: string;
  incompatibleElement?: string;
  moduleName?: string;
  errorCode?: string;
  message: string;
  technicalDetails?: string;
  recoveryModeAttempted?: PsdRecoveryMode;
  timestamp?: string;
}): string {
  const lines: string[] = [
    '====================================================',
    'PIXELCLASH STUDIO - REGISTRO DE DIAGNÓSTICO DE CARGA',
    '====================================================',
    `Fecha: ${entry.timestamp || new Date().toISOString()}`,
    `Archivo: ${entry.fileName}`,
    `Tamaño: ${formatByteSize(entry.fileSizeBytes)}`,
    `Tipo / Formato: ${entry.formatLabel || 'Desconocido'}`,
  ];

  if (entry.psdVersion) {
    lines.push(`Versión PSD: ${entry.psdVersion}`);
  }
  if (entry.incompatibleElement) {
    lines.push(`Elemento incompatible: ${entry.incompatibleElement}`);
  }
  if (entry.recoveryModeAttempted && entry.recoveryModeAttempted !== 'normal') {
    lines.push(`Modo de recuperación intentado: ${getRecoveryModeLabel(entry.recoveryModeAttempted)}`);
  }

  lines.push(`Error: ${entry.message}`);
  lines.push(`Módulo: ${entry.moduleName || 'File Loader'}`);
  lines.push(`Código: ${entry.errorCode || 'FILE_LOAD_ERR'}`);

  if (entry.technicalDetails) {
    lines.push('');
    lines.push('--- Traza / Detalles Técnicos ---');
    lines.push(entry.technicalDetails.trim());
  }

  return lines.join('\n');
}
