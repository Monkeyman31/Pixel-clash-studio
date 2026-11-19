import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Monitor,
  Package,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { ProjectState } from '../types';
import {
  DEFAULT_WINDOWS_INSTALLER_CONFIG,
  generateInnoSetupScript,
  generateMsiWixScript,
  generateNsisInstallerScript,
  generatePixelClashIcoBytes,
  generatePixelClashIconPreviewDataUrl,
  generateWindowsExeBuilderZip,
  WindowsInstallerConfig,
} from '../utils/localInstallerExporter';
import { downloadBlob } from '../utils/zipExporter';

interface LocalInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
}

type WizardPreviewStep = 'welcome' | 'directory' | 'shortcuts' | 'installing' | 'finish';

const WIZARD_STEPS: { id: WizardPreviewStep; label: string }[] = [
  { id: 'welcome', label: '1. Bienvenida' },
  { id: 'directory', label: '2. Carpeta' },
  { id: 'shortcuts', label: '3. Accesos' },
  { id: 'installing', label: '4. Instalando' },
  { id: 'finish', label: '5. Listo' },
];

export const LocalInstallerModal: React.FC<LocalInstallerModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [config, setConfig] = useState<WindowsInstallerConfig>(DEFAULT_WINDOWS_INSTALLER_CONFIG);
  const [activeView, setActiveView] = useState<'config' | 'guide'>('config');
  const [wizardStep, setWizardStep] = useState<WizardPreviewStep>('welcome');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadDone, setDownloadDone] = useState<string | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string>('');
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIconPreviewUrl(generatePixelClashIconPreviewDataUrl());
    setDownloadDone(null);
  }, [isOpen]);

  const exeFileName = useMemo(() => {
    const slug = config.appName.replace(/[^a-zA-Z0-9_-]/g, '') || 'PixelClashStudio';
    return config.engine === 'msi_wix'
      ? `${slug}-${config.version}-x64.msi`
      : `${slug}-Setup-${config.version}-x64.exe`;
  }, [config.appName, config.version, config.engine]);

  if (!isOpen) return null;

  const updateCfg = <K extends keyof WindowsInstallerConfig>(
    key: K,
    value: WindowsInstallerConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleDownloadBuilderPackage = async () => {
    setIsGenerating(true);
    setDownloadDone(null);
    try {
      const blob = await generateWindowsExeBuilderZip(project, config);
      const slug = config.appName.replace(/[^a-zA-Z0-9_-]/g, '') || 'PixelClashStudio';
      const zipName = `${slug}_Instalador_Windows_EXE_MSI_v${config.version}.zip`;
      downloadBlob(blob, zipName);
      setDownloadDone(`Paquete instalador descargado: ${zipName}`);
    } catch (err) {
      console.error('Error al generar paquete de instalador Windows:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadInstallerScript = () => {
    if (config.engine === 'msi_wix') {
      const content = generateMsiWixScript(config);
      downloadBlob(new Blob([content], { type: 'application/xml;charset=utf-8' }), 'pixelclash-installer.wxs');
      setDownloadDone('Descriptor Windows Installer MSI (.wxs) descargado');
    } else if (config.engine === 'inno_setup') {
      const content = generateInnoSetupScript(config);
      downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), 'pixelclash-setup.iss');
      setDownloadDone('Script Inno Setup (.iss) descargado');
    } else {
      const content = generateNsisInstallerScript(config);
      downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), 'pixelclash-installer.nsi');
      setDownloadDone('Script NSIS (.nsi) descargado');
    }
  };

  const handleDownloadIco = async () => {
    const bytes = await generatePixelClashIcoBytes();
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    downloadBlob(new Blob([copy.buffer], { type: 'image/x-icon' }), 'pixelclash.ico');
    setDownloadDone('Icono Windows multi-resolución (.ico) descargado');
  };

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === wizardStep);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--studio-bg-panel)',
          borderColor: 'var(--studio-border-strong)',
          color: 'var(--studio-text)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--studio-bg-header)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {iconPreviewUrl ? (
              <img
                src={iconPreviewUrl}
                alt="Icono PixelClash Studio"
                className="w-9 h-9 rounded-lg border shrink-0"
                style={{ borderColor: 'var(--studio-border-strong)' }}
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight truncate">
                Instalador Profesional para Windows (.EXE / .MSI)
              </h3>
              <p className="text-[11px] truncate" style={{ color: 'var(--studio-text-muted)' }}>
                Instalación gráfica en 4 pasos (cero consola, cero .bat): dependencias incluidas, accesos directos, icono .ICO y asociación .pcs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: 'var(--studio-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View switcher bar */}
        <div
          className="px-5 py-2 border-b flex items-center justify-between gap-2 flex-wrap"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveView('config')}
              className="px-3 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor:
                  activeView === 'config' ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                color:
                  activeView === 'config'
                    ? 'var(--studio-accent-text)'
                    : 'var(--studio-text-muted)',
                borderColor:
                  activeView === 'config' ? 'var(--studio-accent)' : 'var(--studio-border)',
              }}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Configurador y Vista Previa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('guide')}
              className="px-3 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor:
                  activeView === 'guide' ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                color:
                  activeView === 'guide'
                    ? 'var(--studio-accent-text)'
                    : 'var(--studio-text-muted)',
                borderColor:
                  activeView === 'guide' ? 'var(--studio-accent)' : 'var(--studio-border)',
              }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>¿Cómo generar e instalar el .EXE / .MSI?</span>
            </button>
          </div>
          <span className="text-[10px] font-mono opacity-75">
            Nota: el navegador exporta el paquete compilable (.zip); el .exe/.msi real se compila en 1 clic vía GitHub Actions o Windows.
          </span>
        </div>

        {activeView === 'guide' ? (
          <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
            <div className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 leading-relaxed">
              <div className="font-bold text-amber-300 mb-1">
                ¿Por qué el botón descarga un .ZIP y no directamente un .EXE listo?
              </div>
              <p className="text-[11px] text-amber-100/90">
                Ningún navegador web puede compilar directamente un archivo binario ejecutable de Windows (.exe / .msi de ~115 MB) por restricciones técnicas del navegador. Por eso PixelClash Studio prepara toda la configuración oficial (Electron, icono .ico, scripts NSIS/WiX y flujo automático de GitHub Actions) para que puedas generar el <strong>Setup.exe</strong> y el <strong>.msi</strong> reales una sola vez y luego instalarlo con doble clic en cualquier PC con Windows sin consola ni .bat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: GitHub Actions */}
              <div
                className="p-3.5 rounded-lg border flex flex-col gap-2"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <div className="text-[11px] font-bold text-emerald-300">
                  Opción 1 · Recomendada (En la nube, sin instalar nada)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] opacity-90 leading-relaxed">
                  <li>Exporta este proyecto desde AI Studio a un repositorio en tu cuenta gratuita de <strong>GitHub</strong> (el repositorio ya incluye el workflow automático).</li>
                  <li>Si cambiaste opciones en el Configurador, descomprime el ZIP descargado y reemplaza los archivos en tu repositorio.</li>
                  <li>En GitHub abre la pestaña <strong>Actions</strong> → elige <strong>Compilar Instaladores Windows (.EXE y .MSI)</strong> → pulsa <strong>Run workflow</strong>.</li>
                  <li>Tras ~3 minutos, baja al final y descarga el archivo en <strong>Artifacts</strong>: ahí vienen <strong>{exeFileName}</strong> y el otro formato listos para doble clic.</li>
                </ol>
              </div>

              {/* Option 2: Local Windows Compile */}
              <div
                className="p-3.5 rounded-lg border flex flex-col gap-2"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <div className="text-[11px] font-bold text-sky-300">
                  Opción 2 · Compilar el .EXE/.MSI en tu PC Windows
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] opacity-90 leading-relaxed">
                  <li>Descarga el <strong>proyecto completo</strong> desde AI Studio (no solo el ZIP del instalador) y descomprímelo en una carpeta.</li>
                  <li>Instala <strong>Node.js 22 LTS</strong> (solo necesario en el equipo que compila; el usuario final nunca lo necesita).</li>
                  <li>Abre PowerShell en esa carpeta raíz una sola vez y pega estos comandos:</li>
                </ol>
                <div className="relative rounded border border-slate-700 bg-[#090d16] p-2 font-mono text-[10px] text-cyan-200 select-all leading-relaxed">
                  npm install --legacy-peer-deps{'\n'}
                  npm install --save-dev --legacy-peer-deps electron@^33.2.0 electron-builder@^25.1.8{'\n'}
                  node installer/ensure-icon.mjs{'\n'}
                  npx vite build --base=./{'\n'}
                  npx electron-builder --win nsis msi --x64 --config electron-builder.yml
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        'npm install --legacy-peer-deps\nnpm install --save-dev --legacy-peer-deps electron@^33.2.0 electron-builder@^25.1.8\nnode installer/ensure-icon.mjs\nnpx vite build --base=./\nnpx electron-builder --win nsis msi --x64 --config electron-builder.yml'
                      );
                      setCopiedCmd(true);
                      window.setTimeout(() => setCopiedCmd(false), 1800);
                    }}
                    className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-2.5 h-2.5" />
                    <span>{copiedCmd ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[10px] opacity-80">
                  Al terminar, abre la carpeta <strong>release/</strong>: encontrarás el <strong>Setup.exe</strong> y el <strong>.msi</strong> listos para instalar con doble clic.
                </p>
              </div>

              {/* Option 3: Instant Desktop App */}
              <div
                className="p-3.5 rounded-lg border flex flex-col gap-2"
                style={{
                  backgroundColor: 'var(--studio-bg-card)',
                  borderColor: 'var(--studio-border)',
                }}
              >
                <div className="text-[11px] font-bold text-amber-300">
                  Opción 3 · Acceso directo de escritorio hoy mismo (0 min)
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] opacity-90 leading-relaxed">
                  <li>Abre la URL compartida de <strong>PixelClash Studio</strong> en Google Chrome o Microsoft Edge.</li>
                  <li>Haz clic en el menú superior derecho (<strong>⋮</strong> en Chrome o <strong>…</strong> en Edge).</li>
                  <li>Elige <strong>Guardar y compartir → Instalar página como aplicación</strong> (en Edge: <strong>Aplicaciones → Instalar este sitio como una aplicación</strong>).</li>
                  <li>Windows creará un icono directo en Escritorio y Menú Inicio que abre PixelClash Studio en su propia ventana sin barra de navegador.</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
        /* Main 2-column content: Configurator + Interactive Windows Setup Preview */
        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          {/* LEFT: Installer Configurator */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            {/* Engine Selector */}
            <div
              className="p-3 rounded-lg border flex flex-col gap-2"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider opacity-70">
                Formato de Instalador Windows
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateCfg('engine', 'nsis_electron')}
                  className="px-2 py-2 rounded-md border text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor:
                      config.engine === 'nsis_electron'
                        ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-elevated))'
                        : 'var(--studio-bg-elevated)',
                    borderColor:
                      config.engine === 'nsis_electron'
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                  }}
                >
                  <div className="font-bold text-[11px]">Setup.exe</div>
                  <div className="text-[9px] opacity-70 mt-0.5">NSIS 64-bit</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateCfg('engine', 'msi_wix')}
                  className="px-2 py-2 rounded-md border text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor:
                      config.engine === 'msi_wix'
                        ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-elevated))'
                        : 'var(--studio-bg-elevated)',
                    borderColor:
                      config.engine === 'msi_wix'
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                  }}
                >
                  <div className="font-bold text-[11px]">Windows .MSI</div>
                  <div className="text-[9px] opacity-70 mt-0.5">WiX v4 nativo</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateCfg('engine', 'inno_setup')}
                  className="px-2 py-2 rounded-md border text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor:
                      config.engine === 'inno_setup'
                        ? 'color-mix(in srgb, var(--studio-accent) 16%, var(--studio-bg-elevated))'
                        : 'var(--studio-bg-elevated)',
                    borderColor:
                      config.engine === 'inno_setup'
                        ? 'var(--studio-accent)'
                        : 'var(--studio-border)',
                  }}
                >
                  <div className="font-bold text-[11px]">Inno Setup</div>
                  <div className="text-[9px] opacity-70 mt-0.5">Asistente .exe</div>
                </button>
              </div>
            </div>

            {/* Metadata & Directory */}
            <div
              className="p-3 rounded-lg border flex flex-col gap-2.5"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider opacity-70">
                Metadatos del Instalador ({config.engine === 'msi_wix' ? '.MSI' : '.EXE'})
              </span>

              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-[10px] opacity-75">Nombre del programa</span>
                  <input
                    type="text"
                    value={config.appName}
                    onChange={(e) => updateCfg('appName', e.target.value)}
                    className="h-7 px-2 rounded border text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] opacity-75">Versión</span>
                  <input
                    type="text"
                    value={config.version}
                    onChange={(e) => updateCfg('version', e.target.value)}
                    className="h-7 px-2 rounded border text-xs font-mono outline-none"
                    style={{
                      backgroundColor: 'var(--studio-bg-elevated)',
                      borderColor: 'var(--studio-border)',
                      color: 'var(--studio-text)',
                    }}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] opacity-75">Carpeta de instalación predeterminada</span>
                <input
                  type="text"
                  value={config.installDir}
                  onChange={(e) => updateCfg('installDir', e.target.value)}
                  className="h-7 px-2 rounded border text-[11px] font-mono outline-none"
                  style={{
                    backgroundColor: 'var(--studio-bg-elevated)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text)',
                  }}
                />
              </label>
            </div>

            {/* Checkboxes */}
            <div
              className="p-3 rounded-lg border flex flex-col gap-2"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider opacity-70">
                Opciones del Asistente Gráfico
              </span>

              {(
                [
                  ['allowCustomDir', 'Permitir elegir carpeta de instalación'],
                  ['desktopShortcut', 'Acceso directo opcional en Escritorio'],
                  ['startMenuShortcut', 'Acceso directo en Menú Inicio'],
                  ['createUninstaller', 'Desinstalador limpio en Panel de Control'],
                  ['associatePcs', 'Asociar archivos .pcs con doble clic'],
                  ['includeCurrentProject', 'Incluir copia del proyecto actual'],
                ] as const
              ).map(([key, label]) => {
                const checked = config[key];
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer select-none py-0.5"
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => updateCfg(key, !checked)}
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        backgroundColor: checked ? 'var(--studio-accent)' : 'var(--studio-bg-elevated)',
                        borderColor: checked ? 'var(--studio-accent)' : 'var(--studio-border-strong)',
                        color: 'var(--studio-accent-text)',
                      }}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <span className="text-[11px]">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Interactive Windows Setup Wizard Preview */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Step tabs */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase font-semibold tracking-wider opacity-70">
                Vista Previa del Instalador ({exeFileName})
              </span>
              <div className="flex items-center gap-1">
                {WIZARD_STEPS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setWizardStep(st.id)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer"
                    style={{
                      backgroundColor:
                        wizardStep === st.id ? 'var(--studio-accent)' : 'var(--studio-bg-card)',
                      color:
                        wizardStep === st.id
                          ? 'var(--studio-accent-text)'
                          : 'var(--studio-text-muted)',
                      borderColor:
                        wizardStep === st.id ? 'var(--studio-accent)' : 'var(--studio-border)',
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Native Windows Setup Window */}
            <div className="rounded-lg border border-slate-700/90 bg-[#10141f] shadow-xl overflow-hidden flex flex-col min-h-[296px]">
              {/* Windows Titlebar */}
              <div className="h-8 px-3 bg-[#1a2030] border-b border-slate-700/80 flex items-center justify-between text-[11px] select-none">
                <div className="flex items-center gap-2 min-w-0">
                  {iconPreviewUrl && (
                    <img src={iconPreviewUrl} alt="" className="w-4 h-4 rounded-xs shrink-0" />
                  )}
                  <span className="font-medium text-slate-200 truncate">
                    Instalación de {config.appName} {config.version}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                  <span>─</span>
                  <span>□</span>
                  <span>×</span>
                </div>
              </div>

              {/* Wizard Body */}
              <div className="flex-1 flex">
                {/* Left Brand Sidebar */}
                <div className="w-36 bg-gradient-to-b from-[#161d2f] via-[#111626] to-[#0c101b] border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
                  <div className="flex flex-col items-center text-center gap-2">
                    {iconPreviewUrl && (
                      <img
                        src={iconPreviewUrl}
                        alt=""
                        className="w-14 h-14 rounded-xl border border-amber-400/40 shadow-lg"
                      />
                    )}
                    <div className="text-[11px] font-bold text-slate-100 leading-tight">
                      {config.appName}
                    </div>
                    <div className="text-[10px] font-mono text-amber-400">v{config.version}</div>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 text-center">
                    Windows 10 / 11 · x64
                  </div>
                </div>

                {/* Right Step Content */}
                <div className="flex-1 p-5 flex flex-col justify-between gap-3">
                  {wizardStep === 'welcome' && (
                    <div className="flex flex-col gap-2.5">
                      <h4 className="text-sm font-bold text-slate-100">
                        Bienvenido al Asistente de Instalación de {config.appName}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Este asistente instalará <strong>{config.appName} {config.version}</strong> como aplicación de escritorio nativa en su equipo, sin consolas ni archivos por lotes.
                      </p>
                      <div className="mt-1 p-2.5 rounded border border-slate-800 bg-[#141927] text-[10px] text-slate-400 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {config.engine === 'msi_wix'
                              ? 'Paquete Windows Installer (.MSI)'
                              : 'Instalador ejecutable Windows (.EXE)'}
                          </span>
                        </div>
                        <span>
                          • Motor:{' '}
                          {config.engine === 'nsis_electron'
                            ? 'NSIS Modern UI 2 + Electron'
                            : config.engine === 'msi_wix'
                            ? 'Windows Installer MSI (WiX v4 + Electron)'
                            : 'Inno Setup 6 Modern Wizard'}
                        </span>
                        <span>• Editor: {config.publisher}</span>
                      </div>
                    </div>
                  )}

                  {wizardStep === 'directory' && (
                    <div className="flex flex-col gap-2.5">
                      <h4 className="text-sm font-bold text-slate-100">
                        Elegir carpeta de instalación
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {config.allowCustomDir
                          ? 'El usuario puede elegir cualquier ubicación en su disco duro.'
                          : 'Se usará la carpeta predeterminada del sistema.'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 h-7 px-2.5 rounded border border-slate-700 bg-[#0b0e17] text-[11px] font-mono text-slate-200 flex items-center truncate">
                          {config.installDir}
                        </div>
                        <button
                          type="button"
                          disabled={!config.allowCustomDir}
                          className="h-7 px-2.5 rounded border border-slate-600 bg-[#1b2234] text-[11px] text-slate-200 flex items-center gap-1 disabled:opacity-40"
                        >
                          <FolderOpen className="w-3 h-3" />
                          <span>Examinar...</span>
                        </button>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 mt-1">
                        <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                        <span>Espacio requerido estimado: ~115 MB</span>
                      </div>
                    </div>
                  )}

                  {wizardStep === 'shortcuts' && (
                    <div className="flex flex-col gap-2.5">
                      <h4 className="text-sm font-bold text-slate-100">
                        Seleccionar accesos directos e integración
                      </h4>
                      <div className="flex flex-col gap-2 text-[11px] text-slate-200 mt-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${config.desktopShortcut ? 'text-emerald-400' : 'text-slate-600'}`}
                          />
                          <span>Crear acceso directo en el Escritorio</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${config.startMenuShortcut ? 'text-emerald-400' : 'text-slate-600'}`}
                          />
                          <span>Crear entrada en el Menú Inicio de Windows</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${config.associatePcs ? 'text-emerald-400' : 'text-slate-600'}`}
                          />
                          <span>Asociar extensión de proyectos .pcs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trash2
                            className={`w-3.5 h-3.5 ${config.createUninstaller ? 'text-amber-400' : 'text-slate-600'}`}
                          />
                          <span>
                            {config.createUninstaller
                              ? 'Registrar Uninstall.exe en Panel de Control'
                              : 'Sin registro de desinstalador'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {wizardStep === 'installing' && (
                    <div className="flex flex-col gap-2.5">
                      <h4 className="text-sm font-bold text-slate-100">
                        Instalando {config.appName}...
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Extrayendo {config.appName.replace(/\s+/g, '')}.exe y recursos gráficos...
                      </p>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                        <div className="h-full w-3/4 bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full" />
                      </div>
                      <div className="p-2 rounded bg-[#0a0d14] border border-slate-800 font-mono text-[10px] text-slate-400 space-y-0.5">
                        <div>Creando directorio: {config.installDir}</div>
                        <div>Instalando icono: pixelclash.ico (16/32/48/256px)</div>
                        {config.createUninstaller && <div>Generando: Uninstall.exe</div>}
                      </div>
                    </div>
                  )}

                  {wizardStep === 'finish' && (
                    <div className="flex flex-col gap-2.5">
                      <h4 className="text-sm font-bold text-emerald-300">
                        ¡{config.appName} se ha instalado correctamente!
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Haga clic en Finalizar para cerrar el asistente y abrir directamente la aplicación nativa.
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-200 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Ejecutar {config.appName} ahora</span>
                      </div>
                    </div>
                  )}

                  {/* Wizard Footer Buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={currentStepIndex <= 0}
                      onClick={() => setWizardStep(WIZARD_STEPS[Math.max(0, currentStepIndex - 1)].id)}
                      className="px-3 py-1 rounded border border-slate-700 bg-[#181f30] text-[11px] text-slate-300 disabled:opacity-35 cursor-pointer"
                    >
                      &lt; Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWizardStep(
                          WIZARD_STEPS[(currentStepIndex + 1) % WIZARD_STEPS.length].id
                        )
                      }
                      className="px-3.5 py-1 rounded bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                    >
                      {wizardStep === 'finish' ? 'Finalizar' : 'Siguiente >'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Included deliverables list */}
            <div
              className="p-3 rounded-lg border text-[11px] flex flex-col gap-1.5"
              style={{
                backgroundColor: 'var(--studio-bg-card)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>Paquete Instalador Profesional .EXE + .MSI (cero .BAT, cero consola)</span>
              </div>
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px]"
                style={{ color: 'var(--studio-text-muted)' }}
              >
                <span>• Ventana nativa de escritorio (Electron)</span>
                <span>• Icono binario Windows .ICO (16–256px)</span>
                <span>• Instalador gráfico NSIS (.nsi → Setup.exe)</span>
                <span>• Instalador Windows Installer WiX (.wxs → .msi)</span>
                <span>• Script alternativo Inno Setup (.iss)</span>
                <span>• Workflow automático CI (genera .exe y .msi)</span>
              </div>
            </div>

            {downloadDone && (
              <div className="px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{downloadDone}</span>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Footer Actions */}
        <div
          className="px-5 py-3.5 border-t flex flex-wrap items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--studio-bg-bar)',
            borderColor: 'var(--studio-border)',
          }}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadInstallerScript}
              className="px-2.5 py-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1.5 hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Descargar Script (
                {config.engine === 'msi_wix'
                  ? '.wxs MSI'
                  : config.engine === 'inno_setup'
                  ? '.iss'
                  : '.nsi'}
                )
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadIco}
              className="px-2.5 py-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1.5 hover:bg-white/5 transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--studio-border-strong)',
                color: 'var(--studio-text)',
              }}
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Descargar Icono (.ico)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium hover:opacity-80 cursor-pointer"
              style={{ color: 'var(--studio-text-muted)' }}
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleDownloadBuilderPackage}
              disabled={isGenerating}
              className="px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{
                backgroundColor: 'var(--studio-accent)',
                color: 'var(--studio-accent-text)',
              }}
            >
              <Download className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'Empaquetando Instaladores...'
                  : 'Descargar Paquete Instalador (.EXE / .MSI)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
