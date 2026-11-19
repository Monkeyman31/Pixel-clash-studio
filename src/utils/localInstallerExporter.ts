import JSZip from 'jszip';
import { ProjectState } from '../types';

export type WindowsInstallerEngine = 'nsis_electron' | 'msi_wix' | 'inno_setup';

export interface WindowsInstallerConfig {
  appName: string;
  version: string;
  publisher: string;
  installDir: string;
  allowCustomDir: boolean;
  desktopShortcut: boolean;
  startMenuShortcut: boolean;
  createUninstaller: boolean;
  associatePcs: boolean;
  includeCurrentProject: boolean;
  engine: WindowsInstallerEngine;
}

export const DEFAULT_WINDOWS_INSTALLER_CONFIG: WindowsInstallerConfig = {
  appName: 'PixelClash Studio',
  version: '2.0.0',
  publisher: 'PixelClash Studio',
  installDir: 'C:\\Program Files\\PixelClash Studio',
  allowCustomDir: true,
  desktopShortcut: true,
  startMenuShortcut: true,
  createUninstaller: true,
  associatePcs: true,
  includeCurrentProject: true,
  engine: 'nsis_electron',
};

function renderIconToCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const r = Math.max(2, Math.round(size * 0.2));

  // Outer gradient border frame
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(0.55, '#e11d48');
  grad.addColorStop(1, '#4f46e5');

  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fillStyle = grad;
  ctx.fill();

  // Inner dark studio surface
  const pad = Math.max(1, Math.round(size * 0.08));
  ctx.beginPath();
  ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, Math.max(1, r - pad));
  ctx.fillStyle = '#0f131f';
  ctx.fill();

  // Subtle inner pixel grid sheen for >= 48px
  if (size >= 48) {
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.14)';
    ctx.lineWidth = Math.max(1, size / 64);
    const step = size / 8;
    for (let x = pad + step; x < size - pad; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, size - pad);
      ctx.stroke();
    }
    for (let y = pad + step; y < size - pad; y += step) {
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(size - pad, y);
      ctx.stroke();
    }
  }

  // Crisp KO pixel emblem
  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(size * 0.44)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.fillText('KO', size / 2, size / 2 + size * 0.03);

  // Small pixel highlight corner
  const px = Math.max(2, Math.round(size * 0.1));
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(size - pad - px - Math.round(size * 0.06), pad + Math.round(size * 0.06), px, px);

  return canvas;
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo renderizar el PNG del icono.'));
        return;
      }
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
    }, 'image/png');
  });
}

/**
 * Generates a valid multi-resolution binary Windows .ICO file (16, 32, 48, 256px PNG-in-ICO).
 */
export async function generatePixelClashIcoBytes(): Promise<Uint8Array> {
  const sizes = [16, 32, 48, 256];
  const pngFrames: { size: number; bytes: Uint8Array }[] = [];

  for (const size of sizes) {
    const canvas = renderIconToCanvas(size);
    const bytes = await canvasToPngBytes(canvas);
    pngFrames.push({ size, bytes });
  }

  const headerSize = 6;
  const dirEntrySize = 16;
  const totalDirSize = dirEntrySize * pngFrames.length;
  const totalPayload = pngFrames.reduce((acc, f) => acc + f.bytes.length, 0);
  const output = new Uint8Array(headerSize + totalDirSize + totalPayload);
  const view = new DataView(output.buffer);

  // ICONDIR
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // Type: 1 = ICO
  view.setUint16(4, pngFrames.length, true); // Image count

  let offset = headerSize + totalDirSize;
  pngFrames.forEach((frame, idx) => {
    const entryPos = headerSize + idx * dirEntrySize;
    output[entryPos + 0] = frame.size >= 256 ? 0 : frame.size;
    output[entryPos + 1] = frame.size >= 256 ? 0 : frame.size;
    output[entryPos + 2] = 0; // Color palette
    output[entryPos + 3] = 0; // Reserved
    view.setUint16(entryPos + 4, 1, true); // Planes
    view.setUint16(entryPos + 6, 32, true); // Bit count (RGBA)
    view.setUint32(entryPos + 8, frame.bytes.length, true); // Size
    view.setUint32(entryPos + 12, offset, true); // Offset

    output.set(frame.bytes, offset);
    offset += frame.bytes.length;
  });

  return output;
}

export function generatePixelClashIconPreviewDataUrl(): string {
  return renderIconToCanvas(128).toDataURL('image/png');
}

function normalizeVersion4(version: string): string {
  const parts = version
    .replace(/[^0-9.]/g, '')
    .split('.')
    .filter(Boolean)
    .map((p) => String(Math.max(0, parseInt(p, 10) || 0)));
  while (parts.length < 4) parts.push('0');
  return parts.slice(0, 4).join('.');
}

function sanitizeSafeSlug(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '') || 'PixelClashStudio';
}

export function generateNsisInstallerScript(cfg: WindowsInstallerConfig): string {
  const slug = sanitizeSafeSlug(cfg.appName);
  const ver4 = normalizeVersion4(cfg.version);
  const exeName = `${slug}.exe`;
  const setupExeName = `${slug}-Setup-${cfg.version}-x64.exe`;
  const regKey = `Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${slug}`;

  return `; ============================================================================
; ${cfg.appName} - Instalador Grafico Profesional para Windows (.EXE)
; Motor: NSIS Modern UI 2 (MUI2) - Compilar con: makensis pixelclash-installer.nsi
; ============================================================================

Unicode True
!include "MUI2.nsh"
!include "x64.nsh"

Name "${cfg.appName} ${cfg.version}"
OutFile "..\\release\\${setupExeName}"
InstallDir "${cfg.installDir.replace(/^C:\\Program Files/i, '$PROGRAMFILES64')}"
InstallDirRegKey HKLM "Software\\${slug}" "Install_Dir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

; Metadatos del ejecutable (.EXE) visibles en Propiedades de Windows
VIProductVersion "${ver4}"
VIAddVersionKey /LANG=3082 "ProductName" "${cfg.appName}"
VIAddVersionKey /LANG=3082 "CompanyName" "${cfg.publisher}"
VIAddVersionKey /LANG=3082 "FileDescription" "Instalador de ${cfg.appName} para Windows 64-bit"
VIAddVersionKey /LANG=3082 "FileVersion" "${cfg.version}"
VIAddVersionKey /LANG=3082 "ProductVersion" "${cfg.version}"
VIAddVersionKey /LANG=3082 "LegalCopyright" "© ${new Date().getFullYear()} ${cfg.publisher}"

; Icono personalizado (.ICO multi-resolucion)
!define MUI_ICON "..\\assets\\pixelclash.ico"
!define MUI_UNICON "..\\assets\\pixelclash.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\\${exeName}"
!define MUI_FINISHPAGE_RUN_TEXT "Iniciar ${cfg.appName} al finalizar"

; Asistente grafico paso a paso
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_COMPONENTS
${cfg.allowCustomDir ? '!insertmacro MUI_PAGE_DIRECTORY' : '; Carpeta de instalacion fija configurada por el empaquetador'}
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Paginas del desinstalador grafico
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Spanish"

; ----------------------------------------------------------------------------
; Seccion Principal (Obligatoria)
; ----------------------------------------------------------------------------
Section "${cfg.appName} (Aplicacion Principal)" SecCore
  SectionIn RO
  SetOutPath "$INSTDIR"

  ; Archivos empaquetados de la aplicacion de escritorio compilada
  File /r "..\\release\\win-unpacked\\*.*"
  File "..\\assets\\pixelclash.ico"

  WriteRegStr HKLM "Software\\${slug}" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "Software\\${slug}" "Version" "${cfg.version}"

${
  cfg.createUninstaller
    ? `  ; Registro del desinstalador en Panel de Control / Aplicaciones de Windows
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  WriteRegStr HKLM "${regKey}" "DisplayName" "${cfg.appName} ${cfg.version}"
  WriteRegStr HKLM "${regKey}" "DisplayVersion" "${cfg.version}"
  WriteRegStr HKLM "${regKey}" "Publisher" "${cfg.publisher}"
  WriteRegStr HKLM "${regKey}" "DisplayIcon" "$INSTDIR\\pixelclash.ico"
  WriteRegStr HKLM "${regKey}" "UninstallString" '"$INSTDIR\\Uninstall.exe"'
  WriteRegStr HKLM "${regKey}" "QuietUninstallString" '"$INSTDIR\\Uninstall.exe" /S'
  WriteRegDWORD HKLM "${regKey}" "NoModify" 1
  WriteRegDWORD HKLM "${regKey}" "NoRepair" 1`
    : '  ; Desinstalador deshabilitado por configuracion'
}

${
  cfg.associatePcs
    ? `  ; Asociacion nativa de proyectos .pcs con ${cfg.appName}
  WriteRegStr HKCR ".pcs" "" "${slug}.Project"
  WriteRegStr HKCR "${slug}.Project" "" "Proyecto de ${cfg.appName}"
  WriteRegStr HKCR "${slug}.Project\\DefaultIcon" "" "$INSTDIR\\pixelclash.ico,0"
  WriteRegStr HKCR "${slug}.Project\\shell\\open\\command" "" '"$INSTDIR\\${exeName}" "%1"'`
    : '  ; Asociacion de archivos .pcs omitida'
}
SectionEnd

; ----------------------------------------------------------------------------
; Accesos Directos Opcionales
; ----------------------------------------------------------------------------
Section ${cfg.desktopShortcut ? '' : '/o '}"Acceso directo en el Escritorio" SecDesktop
  CreateShortcut "$DESKTOP\\${cfg.appName}.lnk" "$INSTDIR\\${exeName}" "" "$INSTDIR\\pixelclash.ico" 0
SectionEnd

Section ${cfg.startMenuShortcut ? '' : '/o '}"Acceso directo en el Menu Inicio" SecStartMenu
  CreateDirectory "$SMPROGRAMS\\${cfg.appName}"
  CreateShortcut "$SMPROGRAMS\\${cfg.appName}\\${cfg.appName}.lnk" "$INSTDIR\\${exeName}" "" "$INSTDIR\\pixelclash.ico" 0
${
  cfg.createUninstaller
    ? `  CreateShortcut "$SMPROGRAMS\\${cfg.appName}\\Desinstalar ${cfg.appName}.lnk" "$INSTDIR\\Uninstall.exe" "" "$INSTDIR\\pixelclash.ico" 0`
    : ''
}
SectionEnd

; Descripciones interactivas en pantalla de componentes
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT \${SecCore} "Instala el ejecutable nativo ${exeName}, motor pixel art, animacion y recursos."
  !insertmacro MUI_DESCRIPTION_TEXT \${SecDesktop} "Crea un acceso directo con icono personalizado en el Escritorio de Windows."
  !insertmacro MUI_DESCRIPTION_TEXT \${SecStartMenu} "Agrega ${cfg.appName} y su desinstalador al Menu Inicio."
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ----------------------------------------------------------------------------
; Desinstalador Limpio
; ----------------------------------------------------------------------------
Section "Uninstall"
  Delete "$DESKTOP\\${cfg.appName}.lnk"
  RMDir /r "$SMPROGRAMS\\${cfg.appName}"
  RMDir /r "$INSTDIR"

  DeleteRegKey HKLM "${regKey}"
  DeleteRegKey HKLM "Software\\${slug}"
  DeleteRegKey HKCR ".pcs"
  DeleteRegKey HKCR "${slug}.Project"
SectionEnd
`;
}

export function generateInnoSetupScript(cfg: WindowsInstallerConfig): string {
  const slug = sanitizeSafeSlug(cfg.appName);
  const exeName = `${slug}.exe`;
  const setupBaseName = `${slug}-Setup-${cfg.version}-x64`;

  return `; ============================================================================
; ${cfg.appName} - Instalador Windows (.EXE) con Inno Setup 6
; Compilar con: iscc installer\\pixelclash-setup.iss
; ============================================================================

#define MyAppName "${cfg.appName}"
#define MyAppVersion "${cfg.version}"
#define MyAppPublisher "${cfg.publisher}"
#define MyAppExeName "${exeName}"

[Setup]
AppId={{8AB38D30-91F0-4CD0-B41E-661AC843FC9A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName=${cfg.installDir.replace(/^C:\\Program Files/i, '{autopf}')}
DisableDirPage=${cfg.allowCustomDir ? 'no' : 'yes'}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=LICENSE.txt
OutputDir=..\\release
OutputBaseFilename=${setupBaseName}
SetupIconFile=..\\assets\\pixelclash.ico
UninstallDisplayIcon={app}\\pixelclash.ico
Uninstallable=${cfg.createUninstaller ? 'yes' : 'no'}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
VersionInfoVersion=${normalizeVersion4(cfg.version)}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=Instalador oficial de {#MyAppName}
VersionInfoProductName={#MyAppName}
ChangesAssociations=${cfg.associatePcs ? 'yes' : 'no'}

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el Escritorio"; GroupDescription: "Accesos directos adicionales:"; Flags: ${cfg.desktopShortcut ? 'checkedonce' : 'unchecked'}
Name: "startmenuicon"; Description: "Crear acceso directo en el Menu Inicio"; GroupDescription: "Accesos directos adicionales:"; Flags: ${cfg.startMenuShortcut ? 'checkedonce' : 'unchecked'}

[Files]
Source: "..\\release\\win-unpacked\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\\assets\\pixelclash.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"; IconFilename: "{app}\\pixelclash.ico"; Tasks: startmenuicon
${
  cfg.createUninstaller
    ? 'Name: "{group}\\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"; IconFilename: "{app}\\pixelclash.ico"; Tasks: startmenuicon'
    : ''
}
Name: "{autodesktop}\\{#MyAppName}"; Filename: "{app}\\{#MyAppExeName}"; IconFilename: "{app}\\pixelclash.ico"; Tasks: desktopicon

${
  cfg.associatePcs
    ? `[Registry]
Root: HKA; Subkey: "Software\\Classes\\.pcs"; ValueType: string; ValueName: ""; ValueData: "${slug}.Project"; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\\Classes\\${slug}.Project"; ValueType: string; ValueName: ""; ValueData: "Proyecto de {#MyAppName}"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\\Classes\\${slug}.Project\\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\\pixelclash.ico,0"
Root: HKA; Subkey: "Software\\Classes\\${slug}.Project\\shell\\open\\command"; ValueType: string; ValueName: ""; ValueData: """{app}\\{#MyAppExeName}"" ""%1"""`
    : ''
}

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "Ejecutar {#MyAppName} ahora"; Flags: nowait postinstall skipifsilent
`;
}

export function generateMsiWixScript(cfg: WindowsInstallerConfig): string {
  const slug = sanitizeSafeSlug(cfg.appName);
  const ver4 = normalizeVersion4(cfg.version);
  const exeName = `${slug}.exe`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ========================================================================= -->
<!-- ${cfg.appName} v${cfg.version} - Instalador Windows Installer (.MSI)       -->
<!-- Motor: WiX Toolset v4 · Compilar con: wix build pixelclash-installer.wxs  -->
<!-- ========================================================================= -->
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs"
     xmlns:ui="http://wixtoolset.org/schemas/v4/wxs/ui">

  <Package Name="${cfg.appName}"
           Manufacturer="${cfg.publisher}"
           Version="${ver4}"
           UpgradeCode="8AB38D30-91F0-4CD0-B41E-661AC843FC9A"
           Language="3082"
           Scope="perMachine">

    <SummaryInformation Description="Instalador oficial de ${cfg.appName} para Windows 64-bit"
                        Manufacturer="${cfg.publisher}" />

    <MajorUpgrade DowngradeErrorMessage="Ya existe una versión más reciente de ${cfg.appName} instalada." />
    <MediaTemplate EmbedCab="yes" CompressionLevel="high" />

    <Icon Id="PixelClashIcon.ico" SourceFile="..\\assets\\pixelclash.ico" />
    <Property Id="ARPPRODUCTICON" Value="PixelClashIcon.ico" />
    <Property Id="WIXUI_INSTALLDIR" Value="INSTALLFOLDER" />

    <!-- Asistente grafico nativo Windows Installer (.MSI) sin consola ni archivos .bat -->
    <ui:WixUI Id="${cfg.allowCustomDir ? 'WixUI_InstallDir' : 'WixUI_Minimal'}" />

    <StandardDirectory Id="ProgramFiles64Folder">
      <Directory Id="INSTALLFOLDER" Name="${cfg.appName}" />
    </StandardDirectory>

    <StandardDirectory Id="ProgramMenuFolder">
      <Directory Id="ApplicationProgramsFolder" Name="${cfg.appName}" />
    </StandardDirectory>

    <StandardDirectory Id="DesktopFolder" />

    <ComponentGroup Id="AppFiles" Directory="INSTALLFOLDER">
      <Component Id="MainExecutable" Guid="B8C41910-5E22-4B77-9C30-1E9A74401001">
        <File Id="PixelClashExe" Source="..\\release\\win-unpacked\\${exeName}" KeyPath="yes" />
        <File Id="PixelClashIco" Source="..\\assets\\pixelclash.ico" />
${
  cfg.associatePcs
    ? `        <ProgId Id="${slug}.Project" Description="Proyecto de ${cfg.appName}" Icon="PixelClashIco" IconIndex="0">
          <Extension Id="pcs" ContentType="application/x-pixelclash-project">
            <Verb Id="open" Command="Abrir en ${cfg.appName}" TargetFile="PixelClashExe" Argument='"%1"' />
          </Extension>
        </ProgId>`
    : '        <!-- Asociacion de extension .pcs deshabilitada -->'
}
      </Component>
      <Files Include="..\\release\\win-unpacked\\**" Exclude="..\\release\\win-unpacked\\${exeName}" />
    </ComponentGroup>

    <ComponentGroup Id="AppShortcuts">
${
  cfg.startMenuShortcut
    ? `      <Component Id="StartMenuShortcut" Directory="ApplicationProgramsFolder" Guid="B8C41910-5E22-4B77-9C30-1E9A74401002">
        <Shortcut Id="ApplicationStartMenuShortcut"
                  Name="${cfg.appName}"
                  Description="Suite profesional de Pixel Art y Animación 2D"
                  Target="[INSTALLFOLDER]${exeName}"
                  Icon="PixelClashIcon.ico"
                  WorkingDirectory="INSTALLFOLDER" />
        <RemoveFolder Id="CleanUpStartMenuFolder" On="uninstall" />
        <RegistryValue Root="HKCU" Key="Software\\${slug}" Name="StartMenuShortcut" Type="integer" Value="1" KeyPath="yes" />
      </Component>`
    : '      <!-- Acceso directo de Menu Inicio desactivado -->'
}
${
  cfg.desktopShortcut
    ? `      <Component Id="DesktopShortcut" Directory="DesktopFolder" Guid="B8C41910-5E22-4B77-9C30-1E9A74401003">
        <Shortcut Id="ApplicationDesktopShortcut"
                  Name="${cfg.appName}"
                  Description="Abrir ${cfg.appName}"
                  Target="[INSTALLFOLDER]${exeName}"
                  Icon="PixelClashIcon.ico"
                  WorkingDirectory="INSTALLFOLDER" />
        <RegistryValue Root="HKCU" Key="Software\\${slug}" Name="DesktopShortcut" Type="integer" Value="1" KeyPath="yes" />
      </Component>`
    : '      <!-- Acceso directo en Escritorio desactivado -->'
}
    </ComponentGroup>

    <Feature Id="MainFeature" Title="${cfg.appName}" Level="1">
      <ComponentGroupRef Id="AppFiles" />
      <ComponentGroupRef Id="AppShortcuts" />
    </Feature>
  </Package>
</Wix>
`;
}

export function generateElectronBuilderYaml(cfg: WindowsInstallerConfig): string {
  const slug = sanitizeSafeSlug(cfg.appName);
  return `appId: com.pixelclash.studio
productName: "${cfg.appName}"
copyright: "Copyright © ${new Date().getFullYear()} ${cfg.publisher}"
extraMetadata:
  main: electron/main.cjs
  version: "${cfg.version}"
npmRebuild: false
publish: null
directories:
  output: release
  buildResources: assets
files:
  - dist/**/*
  - electron/**/*
  - assets/pixelclash.ico
  - package.json
  - "!node_modules/**/*"
win:
  icon: assets/pixelclash.ico
  executableName: "${slug}"
  target:
    - target: nsis
      arch:
        - x64
    - target: msi
      arch:
        - x64
nsis:
  oneClick: false
  perMachine: false
  allowElevation: true
  allowToChangeInstallationDirectory: ${cfg.allowCustomDir ? 'true' : 'false'}
  createDesktopShortcut: ${cfg.desktopShortcut ? 'true' : 'false'}
  createStartMenuShortcut: ${cfg.startMenuShortcut ? 'true' : 'false'}
  shortcutName: "${cfg.appName}"
  installerIcon: assets/pixelclash.ico
  uninstallerIcon: assets/pixelclash.ico
  installerHeaderIcon: assets/pixelclash.ico
  uninstallDisplayName: "${cfg.appName} ${cfg.version}"
  deleteAppDataOnUninstall: false
  runAfterFinish: true
  installerLanguages:
    - es_ES
  language: "3082"
  artifactName: "${slug}-Setup-\${version}-x64.exe"
msi:
  oneClick: false
  perMachine: false
  createDesktopShortcut: ${cfg.desktopShortcut ? 'true' : 'false'}
  createStartMenuShortcut: ${cfg.startMenuShortcut ? 'true' : 'false'}
  shortcutName: "${cfg.appName}"
  artifactName: "${slug}-\${version}-x64.msi"
${
  cfg.associatePcs
    ? `fileAssociations:
  - ext: pcs
    name: "Proyecto PixelClash Studio"
    description: "Proyecto editable de animación y pixel art PixelClash Studio"
    icon: assets/pixelclash.ico
    role: Editor`
    : ''
}
`;
}

export async function generateWindowsExeBuilderZip(
  project: ProjectState,
  cfg: WindowsInstallerConfig
): Promise<Blob> {
  const zip = new JSZip();
  const slug = sanitizeSafeSlug(cfg.appName);
  const root = zip.folder(`${slug}-Windows-EXE-Installer`) || zip;

  // 1. Multi-resolution real binary .ico
  const icoBytes = await generatePixelClashIcoBytes();
  root.file('assets/pixelclash.ico', icoBytes);

  // 2. Native Electron main & preload runtime (no browser bar, desktop window)
  const electronMain = `const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    title: '${cfg.appName} ${cfg.version}',
    backgroundColor: '#0d0f14',
    icon: path.join(__dirname, '..', 'assets', 'pixelclash.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;
  root.file('electron/main.cjs', electronMain);

  const electronPreload = `const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('pixelClashDesktop', {
  platform: process.platform,
  version: '${cfg.version}',
  isNativeDesktop: true,
});
`;
  root.file('electron/preload.cjs', electronPreload);

  // 3. Installer build descriptors (.yml, .nsi, .wxs, .iss, LICENSE)
  root.file('electron-builder.yml', generateElectronBuilderYaml(cfg));
  root.file('installer/pixelclash-installer.nsi', generateNsisInstallerScript(cfg));
  root.file('installer/pixelclash-installer.wxs', generateMsiWixScript(cfg));
  root.file('installer/pixelclash-setup.iss', generateInnoSetupScript(cfg));
  root.file(
    'installer/LICENSE.txt',
    `${cfg.appName} v${cfg.version}\r\nCopyright © ${new Date().getFullYear()} ${cfg.publisher}\r\n\r\nSuite profesional de dibujo Pixel Art, Vectores y Animación 2D.\r\nDistribución nativa para Windows 10 y Windows 11 (64 bits).\r\n`
  );

  // 4. Desktop npm build descriptor (generates real Setup.exe and .msi installers)
  const desktopPkg = {
    name: slug.toLowerCase(),
    productName: cfg.appName,
    version: cfg.version,
    description: `${cfg.appName} - Suite profesional de Pixel Art y Animación 2D`,
    author: cfg.publisher,
    main: 'electron/main.cjs',
    scripts: {
      'build:web': 'vite build --base=./',
      'build:win-exe': 'vite build --base=./ && electron-builder --win nsis --x64 --publish never --config electron-builder.yml',
      'build:win-msi': 'vite build --base=./ && electron-builder --win msi --x64 --publish never --config electron-builder.yml',
      'build:win-all': 'vite build --base=./ && electron-builder --win nsis msi --x64 --publish never --config electron-builder.yml',
      'build:win-unpacked': 'vite build --base=./ && electron-builder --win dir --x64 --publish never --config electron-builder.yml',
      'build:inno': 'vite build --base=./ && electron-builder --win dir --x64 --publish never --config electron-builder.yml && iscc installer/pixelclash-setup.iss',
    },
    devDependencies: {
      electron: '^33.2.0',
      'electron-builder': '^25.1.8',
    },
  };
  root.file('package.desktop.json', JSON.stringify(desktopPkg, null, 2));

  // 5. GitHub Actions CI workflow that compiles BOTH Setup.exe AND .msi automatically
  const ghWorkflow = `name: Compilar Instaladores Windows (.EXE y .MSI)

on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

jobs:
  build-windows-installers:
    runs-on: windows-latest
    steps:
      - name: Descargar repositorio
        uses: actions/checkout@v4

      - name: Configurar Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Instalar dependencias de empaquetado
        run: |
          npm install --legacy-peer-deps
          npm install --save-dev --legacy-peer-deps electron@^33.2.0 electron-builder@^25.1.8

      - name: Compilar aplicación y generar Instaladores Windows (.EXE y .MSI)
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: false
        run: |
          npx vite build --base=./
          npx electron-builder --win nsis msi --x64 --publish never --config electron-builder.yml

      - name: Publicar instaladores finales (.EXE y .MSI)
        uses: actions/upload-artifact@v4
        with:
          name: ${slug}-Installers-${cfg.version}-Windows-x64
          path: |
            release/*.exe
            release/*.msi
`;
  root.file('.github/workflows/build-windows-installers.yml', ghWorkflow);

  // 6. Clean distributor instructions (end user NEVER opens console or .bat files)
  const guide = `================================================================
${cfg.appName.toUpperCase()} v${cfg.version} — INSTALADOR PROFESIONAL WINDOWS (.EXE / .MSI)
================================================================

EXPERIENCIA PARA EL USUARIO FINAL (CERO CONSOLA, CERO ARCHIVOS .BAT):
  1. Ejecutar el instalador (${slug}-Setup-${cfg.version}-x64.exe o ${slug}-${cfg.version}-x64.msi).
  2. Elegir carpeta de instalación (${cfg.installDir}).
  3. Pulsar Instalar (instala dependencias y runtime integrados automáticamente).
  4. Abrir ${cfg.appName} directamente desde el acceso directo en Escritorio o Menú Inicio.

CARACTERÍSTICAS CONFIGURADAS:
- Instalador EXE:     ${slug}-Setup-${cfg.version}-x64.exe (NSIS Modern UI 2 / Inno Setup 6)
- Instalador MSI:     ${slug}-${cfg.version}-x64.msi (Windows Installer / WiX v4)
- Icono incrustado:   assets/pixelclash.ico (multi-resolución 16/32/48/256px)
- Carpeta destino:    ${cfg.installDir} (${cfg.allowCustomDir ? 'Personalizable por el usuario' : 'Fija'})
- Acceso Escritorio:  ${cfg.desktopShortcut ? 'Sí' : 'Opcional (desmarcado)'}
- Menú Inicio:        ${cfg.startMenuShortcut ? 'Sí' : 'Opcional (desmarcado)'}
- Desinstalador:      ${cfg.createUninstaller ? 'Registrado en Aplicaciones / Panel de Control de Windows' : 'No incluido'}
- Asociación .pcs:    ${cfg.associatePcs ? 'Activa (doble clic abre directamente en el estudio)' : 'Desactivada'}

----------------------------------------------------------------
EMPAQUETADO DEL INSTALADOR FINAL (PARA DISTRIBUCIÓN):
----------------------------------------------------------------
MÉTODO 1 — COMPILACIÓN AUTOMÁTICA EN LA NUBE (GITHUB ACTIONS, SIN CONFIGURAR WINDOWS):
  - Copia estos archivos en tu repositorio y ejecuta:
      .github/workflows/build-windows-installers.yml
  - Descarga directamente los instaladores listos (.exe y .msi) desde Actions > Artifacts.

MÉTODO 2 — COMPILACIÓN EN EQUIPO DE DESARROLLO (ELECTRON BUILDER):
  - Ejecuta el script de empaquetado definido en package.desktop.json:
      build:win-all   -> genera Setup.exe + .msi en release/
      build:win-exe   -> genera únicamente Setup.exe en release/
      build:win-msi   -> genera únicamente .msi en release/

MÉTODO 3 — COMPILADORES NATIVOS (WIX / NSIS / INNO SETUP):
  - WiX v4 (.msi):     installer/pixelclash-installer.wxs
  - NSIS (.exe):       installer/pixelclash-installer.nsi
  - Inno Setup (.exe): installer/pixelclash-setup.iss
`;
  root.file('GUIA_DISTRIBUCION_INSTALADOR.txt', guide);

  // 7. Optional embedded active project backup
  if (cfg.includeCurrentProject) {
    root.file('proyecto_actual.pcs.json', JSON.stringify(project, null, 2));
  }

  return await zip.generateAsync({ type: 'blob' });
}
