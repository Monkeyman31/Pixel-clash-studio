import React from 'react';
import { Folder, Trash2, Layers, AlertTriangle } from 'lucide-react';
import { LayerGroup } from '../types';

interface DeleteGroupModalProps {
  isOpen: boolean;
  group: LayerGroup | null;
  layerCount: number;
  onClose: () => void;
  onUngroupOnly: () => void;
  onDeleteGroupAndContent: () => void;
}

export const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  isOpen,
  group,
  layerCount,
  onClose,
  onUngroupOnly,
  onDeleteGroupAndContent,
}) => {
  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#151824] border border-[#2c354d] rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 text-slate-200">
        <div className="flex items-center gap-3 border-b border-[#242c40] pb-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: `${group.color}22`, borderColor: group.color }}
          >
            <Folder className="w-5 h-5" style={{ color: group.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Eliminar Carpeta / Grupo de Capas</h3>
            <p className="text-xs text-slate-400 font-mono">
              Grupo: <span className="font-semibold text-amber-300">"{group.name}"</span> ({layerCount} capas)
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#1a1f2e] rounded-xl border border-[#2b354c] text-xs text-slate-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            Este grupo contiene <strong className="text-white">{layerCount} capa(s)</strong>. Elige si deseas conservar los dibujos de las capas sacándolos del grupo, o borrarlos completamente.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {/* Option 1: Ungroup and keep layers intact */}
          <button
            onClick={() => {
              onUngroupOnly();
              onClose();
            }}
            className="w-full p-3 rounded-xl bg-[#1e2538] hover:bg-[#28324a] border border-[#323d57] hover:border-indigo-400/60 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-xs font-bold text-white group-hover:text-indigo-300">
                  Solo Desagrupar (Recomendado)
                </p>
                <p className="text-[11px] text-slate-400">
                  Elimina la carpeta pero conserva intactas todas las capas en el lienzo.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
              Conservar
            </span>
          </button>

          {/* Option 2: Delete group and all contents */}
          <button
            onClick={() => {
              onDeleteGroupAndContent();
              onClose();
            }}
            className="w-full p-3 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 hover:border-rose-500/60 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <div>
                <p className="text-xs font-bold text-rose-300 group-hover:text-rose-200">
                  Eliminar Grupo y todo su Contenido
                </p>
                <p className="text-[11px] text-slate-400">
                  Borra permanentemente la carpeta y todas las {layerCount} capas que contiene.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
              Borrar todo
            </span>
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-[#232a3d]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-[#1b202e] hover:bg-[#252c3f]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
