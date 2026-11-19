import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  Swords,
  Play,
  Square,
  Zap,
  Plus,
  Copy,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CombatFxConfig,
  DummyBehaviorState,
  DummyOpponent,
  Frame,
  Hitbox,
  HitboxType,
} from '../types';
import { StudioSlider } from './StudioSlider';

interface FightingStudioPanelProps {
  activeHitboxType: HitboxType;
  onChangeHitboxType: (type: HitboxType) => void;
  onSelectHitboxTool: () => void;
  currentFrame: Frame;
  onDeleteHitbox: (id: string) => void;
  onUpdateHitboxes?: (hitboxes: Hitbox[]) => void;
  onUpdateFrameAdvantage: (onHit: number, onBlock: number) => void;
  dummyOpponent: DummyOpponent;
  onChangeDummy: (next: DummyOpponent) => void;
  combatFx: CombatFxConfig;
  onChangeCombatFx: (next: CombatFxConfig) => void;
  cameraShake?: import('../types').CameraShakeConfig;
  onChangeCameraShake?: (next: import('../types').CameraShakeConfig) => void;
  onTriggerCameraShakeTest?: () => void;
  combatTestActive: boolean;
  onToggleCombatTest: () => void;
  canvasWidth: number;
  canvasHeight?: number;
  frames: Frame[];
  currentFrameIndex: number;
}

export const HITBOX_TYPE_CONFIG: {
  id: HitboxType;
  label: string;
  short: string;
  color: string;
}[] = [
  { id: 'hurtbox', label: 'Hurtbox (Cuerpo)', short: 'HURT', color: '#10b981' },
  { id: 'hitbox', label: 'Hitbox (Ataque)', short: 'HIT', color: '#ef4444' },
  { id: 'pushbox', label: 'Pushbox (Colisión)', short: 'PUSH', color: '#f59e0b' },
  { id: 'throwbox', label: 'Throwbox (Agarre)', short: 'THROW', color: '#a855f7' },
  { id: 'counterbox', label: 'Counterbox (Parry)', short: 'CNTR', color: '#06b6d4' },
  { id: 'clashbox', label: 'Clashbox (Choque)', short: 'CLASH', color: '#f97316' },
  { id: 'armorbox', label: 'Armorbox (Armadura)', short: 'ARMOR', color: '#e2e8f0' },
];

const DUMMY_STATES: { id: DummyBehaviorState; label: string }[] = [
  { id: 'idle', label: 'Idle (Quieto)' },
  { id: 'walk', label: 'Walk (Camina)' },
  { id: 'jump', label: 'Jump (Salto)' },
  { id: 'block', label: 'Block (Guardia)' },
  { id: 'counter_hit', label: 'Counter Hit' },
  { id: 'guard_cancel', label: 'Guard Cancel' },
];

export const FightingStudioPanel: React.FC<FightingStudioPanelProps> = ({
  activeHitboxType,
  onChangeHitboxType,
  onSelectHitboxTool,
  currentFrame,
  onDeleteHitbox,
  onUpdateHitboxes,
  onUpdateFrameAdvantage,
  dummyOpponent,
  onChangeDummy,
  combatFx,
  onChangeCombatFx,
  cameraShake,
  onChangeCameraShake,
  onTriggerCameraShakeTest,
  combatTestActive,
  onToggleCombatTest,
  canvasWidth,
  canvasHeight = 64,
  currentFrameIndex,
}) => {
  const [expandedHitboxId, setExpandedHitboxId] = useState<string | null>(null);

  const hitboxes = currentFrame.hitboxes || [];
  const onHitAdv = currentFrame.onHitAdvantage ?? 0;
  const onBlockAdv = currentFrame.onBlockAdvantage ?? 0;

  const currentDummyState: DummyBehaviorState = dummyOpponent.state || 'idle';

  const handleAddFreeHitbox = () => {
    if (!onUpdateHitboxes) return;
    const defaultW = Math.max(4, Math.min(20, Math.round(canvasWidth * 0.25)));
    const defaultH = Math.max(4, Math.min(24, Math.round(canvasHeight * 0.3)));
    const newHb: Hitbox = {
      id: `hb-${Date.now()}-${Math.round(Math.random() * 999)}`,
      type: activeHitboxType,
      x: Math.max(0, Math.round(canvasWidth / 2 - defaultW / 2)),
      y: Math.max(0, Math.round(canvasHeight / 2 - defaultH / 2)),
      w: defaultW,
      h: defaultH,
      name: `${activeHitboxType.toUpperCase()} #${hitboxes.length + 1}`,
    };
    onUpdateHitboxes([...hitboxes, newHb]);
    setExpandedHitboxId(newHb.id);
  };

  const handlePatchHitbox = (id: string, patch: Partial<Hitbox>) => {
    if (!onUpdateHitboxes) return;
    onUpdateHitboxes(hitboxes.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };

  const handleDuplicateHitbox = (hb: Hitbox) => {
    if (!onUpdateHitboxes) return;
    const copy: Hitbox = {
      ...hb,
      id: `hb-${Date.now()}-${Math.round(Math.random() * 999)}`,
      x: Math.min(canvasWidth - 2, hb.x + 2),
      y: Math.min(canvasHeight - 2, hb.y + 2),
      name: `${hb.name || hb.type.toUpperCase()} Copia`,
    };
    onUpdateHitboxes([...hitboxes, copy]);
    setExpandedHitboxId(copy.id);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Real-time Combat Test Mode Launcher */}
      <div
        className="p-2.5 rounded-xl border flex flex-col gap-2"
        style={{
          backgroundColor: combatTestActive
            ? 'rgba(239, 68, 68, 0.14)'
            : 'var(--studio-bg-card)',
          borderColor: combatTestActive ? '#ef4444' : 'var(--studio-border-strong)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[11px] flex items-center gap-1.5" style={{ color: 'var(--studio-text)' }}>
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span>Modo Prueba de Combate en Vivo</span>
          </span>
          <span
            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: combatTestActive ? '#ef4444' : 'var(--studio-bg-elevated)',
              color: combatTestActive ? '#ffffff' : 'var(--studio-text-muted)',
            }}
          >
            {combatTestActive ? 'EN VIVO' : 'EDITOR'}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleCombatTest}
          className="w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          style={{
            backgroundColor: combatTestActive ? '#ef4444' : 'var(--studio-accent)',
            color: combatTestActive ? '#ffffff' : 'var(--studio-accent-text)',
          }}
        >
          {combatTestActive ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{combatTestActive ? 'Detener Prueba en Lienzo' : 'Probar Combate en el Lienzo'}</span>
        </button>

        <span className="text-[10px] leading-snug" style={{ color: 'var(--studio-text-muted)' }}>
          Controles en lienzo: <b>A / D</b> moverse · <b>W</b> saltar · <b>J / K / L</b> atacar vs Dummy.
        </span>
      </div>

      {/* Free Hitbox Manager + 7 Combat Box Types */}
      <div
        className="p-2.5 rounded-xl border flex flex-col gap-2"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1" style={{ color: 'var(--studio-text-muted)' }}>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Manejo Libre de Hitboxes</span>
          </span>
          <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--studio-text-muted)' }}>
            F#{currentFrameIndex + 1} · {hitboxes.length} cajas
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1">
          {HITBOX_TYPE_CONFIG.map((box) => {
            const active = activeHitboxType === box.id;
            return (
              <button
                key={box.id}
                type="button"
                onClick={() => {
                  onChangeHitboxType(box.id);
                  onSelectHitboxTool();
                }}
                className="px-2 py-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-1.5 transition-colors"
                style={{
                  backgroundColor: active ? `${box.color}25` : 'var(--studio-bg-elevated)',
                  borderColor: active ? box.color : 'var(--studio-border)',
                  color: active ? '#ffffff' : 'var(--studio-text)',
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: box.color }}
                />
                <span className="truncate">{box.label}</span>
              </button>
            );
          })}
        </div>

        {onUpdateHitboxes && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddFreeHitbox}
              className="flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Añadir Caja Libre</span>
            </button>
            {hitboxes.length > 0 && (
              <button
                type="button"
                onClick={() => onUpdateHitboxes([])}
                title="Eliminar todas las hitboxes de este fotograma"
                className="py-1.5 px-2 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/15 text-[10px] font-semibold"
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Editable Active Frame Hitboxes List */}
        {hitboxes.length > 0 ? (
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pt-1 border-t" style={{ borderColor: 'var(--studio-border)' }}>
            {hitboxes.map((hb) => {
              const cfg = HITBOX_TYPE_CONFIG.find((c) => c.id === hb.type) || HITBOX_TYPE_CONFIG[0];
              const isExpanded = expandedHitboxId === hb.id;
              return (
                <div
                  key={hb.id}
                  className="rounded-lg border flex flex-col overflow-hidden"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: isExpanded ? cfg.color : 'var(--studio-border)',
                  }}
                >
                  <div
                    onClick={() => setExpandedHitboxId(isExpanded ? null : hb.id)}
                    className="px-2 py-1.5 flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                      <span style={{ color: cfg.color }} className="font-bold shrink-0">
                        {cfg.short}
                      </span>
                      <span className="truncate font-semibold" style={{ color: 'var(--studio-text)' }}>
                        {hb.name || `${cfg.short}`}
                      </span>
                      <span className="opacity-70 shrink-0" style={{ color: 'var(--studio-text-muted)' }}>
                        [{hb.x},{hb.y} · {hb.w}×{hb.h}]
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setExpandedHitboxId(isExpanded ? null : hb.id)}
                        title="Editar propiedades"
                        className="p-0.5 opacity-75 hover:opacity-100"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                      </button>
                      {onUpdateHitboxes && (
                        <button
                          type="button"
                          onClick={() => handleDuplicateHitbox(hb)}
                          title="Duplicar caja"
                          className="p-0.5 text-sky-400/80 hover:text-sky-300"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteHitbox(hb.id)}
                        title="Eliminar caja"
                        className="p-0.5 text-rose-400/80 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && onUpdateHitboxes && (
                    <div className="p-2 border-t flex flex-col gap-1.5 text-[10px] font-mono" style={{ borderColor: 'var(--studio-border)' }}>
                      <div className="grid grid-cols-2 gap-1.5">
                        <label className="flex flex-col gap-0.5">
                          <span style={{ color: 'var(--studio-text-muted)' }}>Nombre</span>
                          <input
                            type="text"
                            value={hb.name || ''}
                            onChange={(e) => handlePatchHitbox(hb.id, { name: e.target.value })}
                            placeholder="Ej. Puño Débil"
                            className="px-1.5 py-0.5 rounded border text-[10px]"
                            style={{
                              backgroundColor: 'var(--studio-bg-card)',
                              borderColor: 'var(--studio-border-strong)',
                              color: 'var(--studio-text)',
                            }}
                          />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span style={{ color: 'var(--studio-text-muted)' }}>Tipo</span>
                          <select
                            value={hb.type}
                            onChange={(e) => handlePatchHitbox(hb.id, { type: e.target.value as HitboxType })}
                            className="px-1 py-0.5 rounded border text-[10px]"
                            style={{
                              backgroundColor: 'var(--studio-bg-card)',
                              borderColor: 'var(--studio-border-strong)',
                              color: cfg.color,
                            }}
                          >
                            {HITBOX_TYPE_CONFIG.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid grid-cols-4 gap-1 tabular-nums">
                        <label className="flex flex-col gap-0.5">
                          <span style={{ color: 'var(--studio-text-muted)' }}>X</span>
                          <input
                            type="number"
                            value={hb.x}
                            onChange={(e) =>
                              handlePatchHitbox(hb.id, { x: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-full px-1 py-0.5 rounded border text-center"
                            style={{
                              backgroundColor: 'var(--studio-bg-card)',
                              borderColor: 'var(--studio-border-strong)',
                              color: 'var(--studio-text)',
                            }}
                          />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span style={{ color: 'var(--studio-text-muted)' }}>Y</span>
                          <input
                            type="number"
                            value={hb.y}
                            onChange={(e) =>
                              handlePatchHitbox(hb.id, { y: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-full px-1 py-0.5 rounded border text-center"
                            style={{
                              backgroundColor: 'var(--studio-bg-card)',
                              borderColor: 'var(--studio-border-strong)',
                              color: 'var(--studio-text)',
                            }}
                          />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span style={{ color: 'var(--studio-text-muted)' }}>Ancho</span>
                          <input
                            type="number"
                            min={1}
                            value={hb.w}
                            onChange={(e) =>
                              handlePatchHitbox(hb.id, { w: Math.max(1, parseInt(e.target.value, 10) || 1) })
                            }
                            className="w-full px-1 py-0.5 rounded border text-center"
                            style={{
                              backgroundColor: 'var(--studio-bg-card)',
                              borderColor: 'var(--studio-border-strong)',
                              color: 'var(--studio-text)',
                            }}
                          />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span style={{ color: 'var(--studio-text-muted)' }}>Alto</span>
                          <input
                            type="number"
                            min={1}
                            value={hb.h}
                            onChange={(e) =>
                              handlePatchHitbox(hb.id, { h: Math.max(1, parseInt(e.target.value, 10) || 1) })
                            }
                            className="w-full px-1 py-0.5 rounded border text-center"
                            style={{
                              backgroundColor: 'var(--studio-bg-card)',
                              borderColor: 'var(--studio-border-strong)',
                              color: 'var(--studio-text)',
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[10px] font-mono py-2 text-center opacity-70" style={{ color: 'var(--studio-text-muted)' }}>
            Dibuja en el lienzo o pulsa "+ Añadir Caja Libre". Selecciona y redimensiona libremente con la herramienta Mover (V).
          </div>
        )}
      </div>

      {/* Optional Frame Advantage Notes */}
      <div
        className="p-2.5 rounded-xl border flex flex-col gap-2"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <span className="text-[10px] font-mono uppercase font-semibold" style={{ color: 'var(--studio-text-muted)' }}>
          Ventaja de Impacto del Frame #{currentFrameIndex + 1}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5 text-[10px] font-mono">
            <span style={{ color: 'var(--studio-text-muted)' }}>On-Hit</span>
            <input
              type="number"
              min={-30}
              max={30}
              value={onHitAdv}
              onChange={(e) => onUpdateFrameAdvantage(parseInt(e.target.value, 10) || 0, onBlockAdv)}
              className="px-2 py-1 rounded border text-xs tabular-nums"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: onHitAdv >= 0 ? '#34d399' : '#fb7185',
              }}
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] font-mono">
            <span style={{ color: 'var(--studio-text-muted)' }}>On-Block</span>
            <input
              type="number"
              min={-30}
              max={30}
              value={onBlockAdv}
              onChange={(e) => onUpdateFrameAdvantage(onHitAdv, parseInt(e.target.value, 10) || 0)}
              className="px-2 py-1 rounded border text-xs tabular-nums"
              style={{
                backgroundColor: 'var(--studio-bg-elevated)',
                borderColor: 'var(--studio-border-strong)',
                color: onBlockAdv >= 0 ? '#34d399' : onBlockAdv >= -2 ? '#fbbf24' : '#fb7185',
              }}
            />
          </label>
        </div>
      </div>

      {/* Dummy Opponent & 6 States */}
      <div
        className="p-2.5 rounded-xl border flex flex-col gap-2"
        style={{
          backgroundColor: 'var(--studio-bg-card)',
          borderColor: 'var(--studio-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold" style={{ color: 'var(--studio-text)' }}>
            Dummy Sparring P2 (6 Estados)
          </span>
          <label className="flex items-center gap-1.5 text-[10px] font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={dummyOpponent.enabled}
              onChange={(e) => onChangeDummy({ ...dummyOpponent, enabled: e.target.checked })}
              className="accent-indigo-500"
            />
            <span>{dummyOpponent.enabled ? 'Activo' : 'Oculto'}</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-1">
          {DUMMY_STATES.map((st) => {
            const active = currentDummyState === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() =>
                  onChangeDummy({
                    ...dummyOpponent,
                    enabled: true,
                    state: st.id,
                  })
                }
                className="px-2 py-1 rounded border text-[10px] font-mono text-left transition-colors"
                style={{
                  backgroundColor: active ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                  color: active ? 'var(--studio-accent-text)' : 'var(--studio-text)',
                  borderColor: active ? 'var(--studio-accent)' : 'var(--studio-border)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        <StudioSlider
          variant="panel"
          label="Posición Dummy X"
          value={dummyOpponent.distance}
          min={8}
          max={Math.max(24, canvasWidth - 14)}
          step={1}
          unit="px"
          onChange={(v) => onChangeDummy({ ...dummyOpponent, distance: v })}
        />

        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={dummyOpponent.showHurtbox}
              onChange={(e) =>
                onChangeDummy({ ...dummyOpponent, showHurtbox: e.target.checked })
              }
              className="accent-emerald-500"
            />
            <span>Hurtbox P2</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={combatFx.hitstop}
              onChange={(e) => onChangeCombatFx({ ...combatFx, hitstop: e.target.checked })}
              className="accent-amber-500"
            />
            <span className="flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 text-amber-400" /> Hitstop
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer col-span-2">
            <input
              type="checkbox"
              checked={combatFx.screenShake}
              onChange={(e) => {
                onChangeCombatFx({ ...combatFx, screenShake: e.target.checked });
                if (cameraShake && onChangeCameraShake) {
                  onChangeCameraShake({ ...cameraShake, enabled: e.target.checked });
                }
              }}
              className="accent-rose-500"
            />
            <span>Temblor de Cámara (Screen Shake) al impactar</span>
          </label>
        </div>

        {cameraShake && onChangeCameraShake && (
          <div className="pt-2 border-t flex flex-col gap-1.5 text-[10px] font-mono tabular-nums" style={{ borderColor: 'var(--studio-border)' }}>
            <div className="flex items-center justify-between gap-2">
              <span style={{ color: 'var(--studio-text-muted)' }}>Intensidad: {cameraShake.intensity}px · {cameraShake.durationMs}ms</span>
              {onTriggerCameraShakeTest && (
                <button
                  type="button"
                  onClick={onTriggerCameraShakeTest}
                  className="px-2 py-0.5 rounded border font-bold"
                  style={{
                    borderColor: 'var(--studio-accent)',
                    color: 'var(--studio-accent)',
                    backgroundColor: 'var(--studio-bg-elevated)',
                  }}
                >
                  Probar
                </button>
              )}
            </div>
            <StudioSlider
              variant="panel"
              label="Intensidad del Temblor"
              value={cameraShake.intensity}
              min={1}
              max={24}
              step={1}
              unit="px"
              defaultValue={6}
              onChange={(v) => onChangeCameraShake({ ...cameraShake, intensity: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
};
