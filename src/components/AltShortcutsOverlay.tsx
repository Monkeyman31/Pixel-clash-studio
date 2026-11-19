import React from 'react';
import { Keyboard } from 'lucide-react';
import { ShortcutBinding } from '../types';

interface AltShortcutsOverlayProps {
  visible: boolean;
  bindings: ShortcutBinding[];
}

export const AltShortcutsOverlay: React.FC<AltShortcutsOverlayProps> = ({
  visible,
  bindings,
}) => {
  if (!visible) return null;

  const quickGroups = [
    {
      title: 'Herramientas Clave',
      ids: [
        'tool.move',
        'tool.pencil',
        'tool.eraser',
        'tool.bucket',
        'tool.eyedropper',
        'tool.line',
        'tool.direct_select',
        'tool.select',
        'tool.hitbox',
        'tool.dither',
      ],
    },
    {
      title: 'Edición, Capas & Flujo',
      ids: [
        'edit.undo',
        'edit.redo',
        'edit.copy',
        'edit.paste',
        'transform.free',
        'layer.new',
        'layer.toggle_global',
        'anim.play_pause',
        'cmd.command_palette',
        'cmd.shortcuts_editor',
      ],
    },
  ];

  const byId = new Map(bindings.map((b) => [b.id, b]));

  return (
    <div className="fixed inset-0 z-[110] pointer-events-none flex items-end justify-center pb-14 px-4">
      <div
        className="w-full max-w-3xl rounded-xl border shadow-2xl p-3 backdrop-blur-md"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--studio-bg-panel) 94%, transparent)',
          borderColor: 'var(--studio-accent)',
          color: 'var(--studio-text)',
        }}
      >
        <div className="flex items-center justify-between border-b pb-1.5 mb-2" style={{ borderColor: 'var(--studio-border)' }}>
          <span className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: 'var(--studio-accent)' }}>
            <Keyboard className="w-3.5 h-3.5" />
            <span>Guía Rápida de Atajos Activos (Mantén Alt)</span>
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--studio-text-muted)' }}>
            F1: Paleta Universal · Suelta Alt para ocultar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickGroups.map((grp) => (
            <div key={grp.title} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--studio-text-muted)' }}>
                {grp.title}
              </span>
              <div className="grid grid-cols-2 gap-1">
                {grp.ids.map((id) => {
                  const b = byId.get(id);
                  if (!b) return null;
                  return (
                    <div
                      key={id}
                      className="px-2 py-1 rounded border flex items-center justify-between gap-2 text-[10px]"
                      style={{
                        backgroundColor: 'var(--studio-bg-card)',
                        borderColor: 'var(--studio-border)',
                      }}
                    >
                      <span className="truncate">{b.label}</span>
                      <kbd
                        className="px-1.5 py-0.5 rounded font-mono font-bold shrink-0"
                        style={{
                          backgroundColor: 'var(--studio-bg-elevated)',
                          color: 'var(--studio-accent)',
                        }}
                      >
                        {b.primary}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
