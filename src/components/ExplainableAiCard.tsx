import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { AiExplanationReport } from '../types';

interface ExplainableAiCardProps {
  report: AiExplanationReport;
  compact?: boolean;
}

const COHERENCE_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  max: 'Máxima',
};

const FIDELITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  exact: 'Exacta',
};

const LIGHT_LABELS: Record<string, string> = {
  'top-left': 'Superior Izq',
  'top-right': 'Superior Der',
  top: 'Cenital',
  front: 'Frontal',
  rim: 'Contraluz / Rim',
};

export const ExplainableAiCard: React.FC<ExplainableAiCardProps> = ({ report, compact = false }) => {
  const stats = report.validationStats;
  const totalFixes = stats
    ? stats.filledHoles + stats.removedOrphans + stats.prunedFragments + stats.repairedEdges
    : 0;

  return (
    <div
      className={`rounded-lg border flex flex-col gap-1.5 text-[10px] ${compact ? 'p-2' : 'p-2.5'}`}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--studio-bg-elevated) 85%, transparent)',
        borderColor: 'color-mix(in srgb, var(--studio-accent) 45%, var(--studio-border))',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold flex items-center gap-1" style={{ color: 'var(--studio-accent)' }}>
          <Info className="w-3 h-3 shrink-0" />
          <span>IA Explicable</span>
        </span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Coherencia {COHERENCE_LABELS[report.coherenceLevel] || report.coherenceLevel}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono" style={{ color: 'var(--studio-text-muted)' }}>
        <span className="truncate" title={report.detectedStyle}>
          Estilo detectado: <b style={{ color: 'var(--studio-text)' }}>{report.detectedStyle}</b>
        </span>
        <span className="truncate" title={report.targetStyleLabel}>
          Objetivo: <b style={{ color: 'var(--studio-accent)' }}>{report.targetStyleLabel}</b>
        </span>
        <span>
          Paleta detectada: <b style={{ color: 'var(--studio-text)' }}>{report.paletteCount} colores</b>
        </span>
        <span>
          Contorno: <b style={{ color: 'var(--studio-text)' }}>{report.outlineThickness} px</b>
          {' · '}
          <span className="text-[9px]">{LIGHT_LABELS[report.lightDirection] || report.lightDirection}</span>
        </span>
        <span className="col-span-2 truncate" title={report.referenceUsed}>
          Referencia utilizada: <b style={{ color: 'var(--studio-text)' }}>{report.referenceUsed}</b>
        </span>
        {report.poseFidelity && (
          <span className="col-span-2">
            Fidelidad de pose: <b className="text-purple-300">{FIDELITY_LABELS[report.poseFidelity] || report.poseFidelity}</b>
          </span>
        )}
      </div>

      {report.detectedPalette.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {report.detectedPalette.slice(0, 10).map((c, idx) => (
            <span
              key={`${c}-${idx}`}
              className="w-3 h-3 rounded-sm border border-white/25"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      )}

      {stats && (
        <div
          className="text-[9px] font-mono pt-1 border-t flex items-center justify-between gap-2"
          style={{ borderColor: 'var(--studio-border)', color: 'var(--studio-text-muted)' }}
        >
          <span>
            Post-validación:{' '}
            {totalFixes === 0
              ? 'Silueta limpia (0 artefactos)'
              : `${stats.filledHoles} huecos · ${stats.removedOrphans + stats.prunedFragments} sueltos · ${stats.repairedEdges} bordes`}
          </span>
          <span className="tabular-nums">{stats.totalPixelsAfter} px</span>
        </div>
      )}
    </div>
  );
};
