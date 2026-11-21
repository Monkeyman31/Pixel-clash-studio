import JSZip from 'jszip';
import { ProjectState } from '../types';
import {
  OFFICIAL_ICON_SIZES,
  renderOfficialPixelClashIconToCanvas,
} from '../components/PixelClashLogoIcon';

export type WindowsInstallerEngine = 'nsis_tauri' | 'msi_wix' | 'inno_setup';

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
  engine: 'nsis_tauri',
};

function renderIconToCanvas(size: number): HTMLCanvasElement {
  return renderOfficialPixelClashIconToCanvas(size);
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
 * Generates a valid multi-resolution binary Windows .ICO file
 * containing all 6 standard sizes: 16, 32, 48, 64, 128, 256px (PNG-in-ICO).
 */
export async function generatePixelClashIcoBytes(): Promise<Uint8Array> {
  const sizes = [...OFFICIAL_ICON_SIZES];
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

export function generatePixelClashIconPreviewDataUrl(size: number = 128): string {
  return renderIconToCanvas(size).toDataURL('image/png');
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

  ; Archivos empaquetados del binario nativo Rust compilado (Tauri v2)
  File "/oname=${exeName}" "..\\src-tauri\\target\\release\\pixelclash-studio.exe"
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
Source: "..\\src-tauri\\target\\release\\pixelclash-studio.exe"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion
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
        <File Id="PixelClashExe" Name="${exeName}" Source="..\\src-tauri\\target\\release\\pixelclash-studio.exe" KeyPath="yes" />
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

export function generateTauriConfJson(cfg: WindowsInstallerConfig): string {
  const slug = sanitizeSafeSlug(cfg.appName);
  const bundleConfig: Record<string, unknown> = {
    active: true,
    targets: ['nsis', 'msi'],
    icon: ['../assets/pixelclash.ico', '../assets/pixelclash.png'],
    windows: {
      webviewInstallMode: {
        type: 'downloadBootstrapper',
      },
      nsis: {
        languages: ['Spanish'],
        displayLanguageSelector: false,
        installMode: 'both',
      },
    },
  };

  if (cfg.associatePcs) {
    bundleConfig.fileAssociations = [
      {
        ext: ['pcs'],
        name: `Proyecto ${cfg.appName}`,
        description: `Proyecto editable de pixel art y animación ${cfg.appName} (.pcs)`,
        role: 'Editor',
      },
    ];
  }

  return JSON.stringify(
    {
      $schema: 'https://schema.tauri.app/config/2',
      productName: cfg.appName,
      version: cfg.version,
      identifier: `com.${slug.toLowerCase()}.studio`,
      build: {
        beforeDevCommand: 'npm run dev',
        devUrl: 'http://localhost:3000',
        beforeBuildCommand: 'npm run build -- --base=./',
        frontendDist: '../dist',
      },
      app: {
        withGlobalTauri: true,
        windows: [
          {
            label: 'main',
            title: `${cfg.appName} ${cfg.version}`,
            width: 1440,
            height: 900,
            minWidth: 1080,
            minHeight: 680,
            center: true,
            resizable: true,
            maximizable: true,
            minimizable: true,
            decorations: false,
            transparent: false,
            backgroundColor: '#12101e',
          },
        ],
        security: {
          csp: null,
        },
      },
      bundle: bundleConfig,
    },
    null,
    2
  );
}

export async function generateWindowsExeBuilderZip(
  project: ProjectState,
  cfg: WindowsInstallerConfig
): Promise<Blob> {
  const zip = new JSZip();
  const slug = sanitizeSafeSlug(cfg.appName);
  const root = zip.folder(`${slug}-Windows-Rust-Tauri-Installer`) || zip;

  // 1. Multi-resolution real binary .ico + 256px PNG icon
  const icoBytes = await generatePixelClashIcoBytes();
  const png256Bytes = await canvasToPngBytes(renderIconToCanvas(256));
  root.file('assets/pixelclash.ico', icoBytes);
  root.file('assets/pixelclash.png', png256Bytes);

  // 2. Native Rust / Tauri v2 desktop workspace (frameless custom window + native I/O & clipboard)
  const cargoToml = `[package]
name = "pixelclash-studio"
version = "${cfg.version}"
description = "${cfg.appName} — Editor profesional de Pixel Art, Sprites, Escenarios y Animación"
authors = ["${cfg.publisher}"]
license = "MIT"
edition = "2021"

[lib]
name = "pixelclash_studio_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rfd = "0.15"
arboard = "3"
image = { version = "0.25", default-features = false, features = ["png"] }

[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
`;
  root.file('src-tauri/Cargo.toml', cargoToml);
  root.file('src-tauri/build.rs', 'fn main() {\n    tauri_build::build();\n}\n');
  root.file('src-tauri/tauri.conf.json', generateTauriConfJson(cfg));
  root.file(
    'src-tauri/capabilities/default.json',
    JSON.stringify(
      {
        $schema: '../gen/schemas/desktop-schema.json',
        identifier: 'default',
        description: `Permisos nativos de ventana, eventos, archivos y portapapeles para ${cfg.appName}`,
        windows: ['main'],
        permissions: [
          'core:default',
          'core:event:default',
          'core:window:default',
          'core:window:allow-minimize',
          'core:window:allow-maximize',
          'core:window:allow-unmaximize',
          'core:window:allow-toggle-maximize',
          'core:window:allow-is-maximized',
          'core:window:allow-close',
          'core:window:allow-start-dragging',
        ],
      },
      null,
      2
    )
  );
  root.file(
    'src-tauri/src/main.rs',
    `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pixelclash_studio_lib::run();
}
`
  );

  const tauriLibRs = `use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::UNIX_EPOCH;

use image::ImageEncoder;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

pub struct DesktopRuntimeState {
    pub has_unsaved: AtomicBool,
    pub force_close: AtomicBool,
    pub last_maximized: AtomicBool,
}

impl Default for DesktopRuntimeState {
    fn default() -> Self {
        Self {
            has_unsaved: AtomicBool::new(false),
            force_close: AtomicBool::new(false),
            last_maximized: AtomicBool::new(false),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenDialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileDialogOptions {
    pub title: Option<String>,
    pub multiple: Option<bool>,
    pub filters: Option<Vec<OpenDialogFilter>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopOpenFilePayload {
    pub file_path: String,
    pub name: String,
    pub size: u64,
    pub last_modified: u64,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileDialogResponse {
    pub canceled: bool,
    pub error: Option<String>,
    pub files: Vec<DesktopOpenFilePayload>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileExistsResponse {
    pub exists: bool,
    pub size: Option<u64>,
    pub last_modified: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadFileResponse {
    pub exists: bool,
    pub file_path: Option<String>,
    pub name: Option<String>,
    pub size: Option<u64>,
    pub last_modified: Option<u64>,
    pub bytes: Option<Vec<u8>>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardImageReadResponse {
    pub has_image: bool,
    pub png_bytes: Option<Vec<u8>>,
    pub width: Option<usize>,
    pub height: Option<usize>,
    pub error: Option<String>,
}

fn modified_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn read_disk_file_payload(path: &Path) -> Result<DesktopOpenFilePayload, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if !meta.is_file() {
        return Err("La ruta no corresponde a un archivo válido.".to_string());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("archivo")
        .to_string();

    Ok(DesktopOpenFilePayload {
        file_path: path.to_string_lossy().to_string(),
        name,
        size: meta.len(),
        last_modified: modified_ms(&meta),
        bytes,
    })
}

#[tauri::command]
async fn open_file_dialog(options: Option<OpenFileDialogOptions>) -> OpenFileDialogResponse {
    let opts = options.unwrap_or_default();
    let title = opts
        .title
        .unwrap_or_else(|| "Abrir archivo en ${cfg.appName}".to_string());
    let multiple = opts.multiple.unwrap_or(false);

    let mut dialog = rfd::AsyncFileDialog::new().set_title(&title);

    if let Some(custom_filters) = opts.filters {
        for f in custom_filters {
            let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(&f.name, &exts);
        }
    } else {
        dialog = dialog
            .add_filter(
                "Todos los formatos compatibles",
                &[
                    "pcs", "ase", "aseprite", "psd", "json", "png", "jpg", "jpeg", "webp", "gif",
                    "bmp", "tif", "tiff", "tga", "ico",
                ],
            )
            .add_filter(
                "Imágenes (PNG, JPG, WEBP, GIF, BMP, TIFF, TGA, ICO)",
                &["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "tga", "ico"],
            )
            .add_filter(
                "Pixel Art y Proyectos (PCS, ASE, ASEPRITE, PSD, JSON)",
                &["pcs", "ase", "aseprite", "psd", "json"],
            )
            .add_filter("Todos los archivos", &["*"]);
    }

    let picked_paths: Vec<PathBuf> = if multiple {
        match dialog.pick_files().await {
            Some(handles) => handles.into_iter().map(|h| h.path().to_path_buf()).collect(),
            None => Vec::new(),
        }
    } else {
        match dialog.pick_file().await {
            Some(handle) => vec![handle.path().to_path_buf()],
            None => Vec::new(),
        }
    };

    if picked_paths.is_empty() {
        return OpenFileDialogResponse {
            canceled: true,
            error: None,
            files: Vec::new(),
        };
    }

    let mut files = Vec::with_capacity(picked_paths.len());
    for path in picked_paths {
        match read_disk_file_payload(&path) {
            Ok(payload) => files.push(payload),
            Err(err) => {
                return OpenFileDialogResponse {
                    canceled: false,
                    error: Some(err),
                    files: Vec::new(),
                };
            }
        }
    }

    OpenFileDialogResponse {
        canceled: false,
        error: None,
        files,
    }
}

#[tauri::command]
fn check_file_exists(file_path: String) -> FileExistsResponse {
    let path = Path::new(&file_path);
    match fs::metadata(path) {
        Ok(meta) if meta.is_file() => FileExistsResponse {
            exists: true,
            size: Some(meta.len()),
            last_modified: Some(modified_ms(&meta)),
        },
        _ => FileExistsResponse {
            exists: false,
            size: None,
            last_modified: None,
        },
    }
}

#[tauri::command]
fn read_file_at_path(file_path: String) -> ReadFileResponse {
    let path = Path::new(&file_path);
    if !path.exists() {
        return ReadFileResponse {
            exists: false,
            file_path: None,
            name: None,
            size: None,
            last_modified: None,
            bytes: None,
            error: None,
        };
    }
    match read_disk_file_payload(path) {
        Ok(payload) => ReadFileResponse {
            exists: true,
            file_path: Some(payload.file_path),
            name: Some(payload.name),
            size: Some(payload.size),
            last_modified: Some(payload.last_modified),
            bytes: Some(payload.bytes),
            error: None,
        },
        Err(err) => ReadFileResponse {
            exists: false,
            file_path: None,
            name: None,
            size: None,
            last_modified: None,
            bytes: None,
            error: Some(err),
        },
    }
}

#[tauri::command]
fn read_clipboard_image() -> ClipboardImageReadResponse {
    let mut clipboard = match arboard::Clipboard::new() {
        Ok(cb) => cb,
        Err(err) => {
            return ClipboardImageReadResponse {
                has_image: false,
                png_bytes: None,
                width: None,
                height: None,
                error: Some(err.to_string()),
            }
        }
    };
    let img = match clipboard.get_image() {
        Ok(img) => img,
        Err(_) => {
            return ClipboardImageReadResponse {
                has_image: false,
                png_bytes: None,
                width: None,
                height: None,
                error: None,
            }
        }
    };
    let mut png_bytes: Vec<u8> = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
    if let Err(err) = encoder.write_image(
        &img.bytes,
        img.width as u32,
        img.height as u32,
        image::ExtendedColorType::Rgba8,
    ) {
        return ClipboardImageReadResponse {
            has_image: false,
            png_bytes: None,
            width: None,
            height: None,
            error: Some(err.to_string()),
        };
    }
    ClipboardImageReadResponse {
        has_image: true,
        png_bytes: Some(png_bytes),
        width: Some(img.width),
        height: Some(img.height),
        error: None,
    }
}

#[tauri::command]
fn write_clipboard_image(png_bytes: Vec<u8>) -> serde_json::Value {
    let decoded = match image::load_from_memory_with_format(&png_bytes, image::ImageFormat::Png) {
        Ok(img) => img.to_rgba8(),
        Err(err) => return serde_json::json!({ "ok": false, "error": err.to_string() }),
    };
    let mut clipboard = match arboard::Clipboard::new() {
        Ok(cb) => cb,
        Err(err) => return serde_json::json!({ "ok": false, "error": err.to_string() }),
    };
    let image_data = arboard::ImageData {
        width: decoded.width() as usize,
        height: decoded.height() as usize,
        bytes: std::borrow::Cow::Owned(decoded.into_raw()),
    };
    match clipboard.set_image(image_data) {
        Ok(_) => serde_json::json!({ "ok": true }),
        Err(err) => serde_json::json!({ "ok": false, "error": err.to_string() }),
    }
}

#[tauri::command]
fn window_minimize(window: tauri::Window) -> serde_json::Value {
    serde_json::json!({ "ok": window.minimize().is_ok() })
}

#[tauri::command]
fn window_toggle_maximize(
    window: tauri::Window,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> serde_json::Value {
    let is_max = window.is_maximized().unwrap_or(false);
    if is_max {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
    let next_max = window.is_maximized().unwrap_or(!is_max);
    state.last_maximized.store(next_max, Ordering::SeqCst);
    let _ = window.emit("desktop:window-maximize-change", next_max);
    serde_json::json!({ "maximized": next_max })
}

#[tauri::command]
fn window_is_maximized(window: tauri::Window) -> serde_json::Value {
    serde_json::json!({ "maximized": window.is_maximized().unwrap_or(false) })
}

#[tauri::command]
fn window_close(window: tauri::Window) -> serde_json::Value {
    serde_json::json!({ "ok": window.close().is_ok() })
}

#[tauri::command]
fn window_start_dragging(window: tauri::Window) -> serde_json::Value {
    serde_json::json!({ "ok": window.start_dragging().is_ok() })
}

#[tauri::command]
fn set_unsaved_state(
    has_unsaved: bool,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> serde_json::Value {
    state.has_unsaved.store(has_unsaved, Ordering::SeqCst);
    serde_json::json!({ "ok": true })
}

#[tauri::command]
fn confirm_app_close(
    app: tauri::AppHandle,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> serde_json::Value {
    state.force_close.store(true, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.close();
    } else {
        app.exit(0);
    }
    serde_json::json!({ "ok": true })
}

pub fn run() {
    tauri::Builder::default()
        .manage(DesktopRuntimeState::default())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            check_file_exists,
            read_file_at_path,
            read_clipboard_image,
            write_clipboard_image,
            window_minimize,
            window_toggle_maximize,
            window_is_maximized,
            window_close,
            window_start_dragging,
            set_unsaved_state,
            confirm_app_close,
        ])
        .on_window_event(|window, event| {
            let state = window.state::<DesktopRuntimeState>();
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    let has_unsaved = state.has_unsaved.load(Ordering::SeqCst);
                    let force_close = state.force_close.load(Ordering::SeqCst);
                    if has_unsaved && !force_close {
                        api.prevent_close();
                        let _ = window.emit("desktop:request-app-close", ());
                    }
                }
                tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) => {
                    if let Ok(is_max) = window.is_maximized() {
                        let prev = state.last_maximized.swap(is_max, Ordering::SeqCst);
                        if prev != is_max {
                            let _ = window.emit("desktop:window-maximize-change", is_max);
                        }
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar el runtime nativo Rust (Tauri)");
}
`;
  root.file('src-tauri/src/lib.rs', tauriLibRs);

  // 3. Installer build descriptors (.nsi, .wxs, .iss, LICENSE)
  root.file('installer/pixelclash-installer.nsi', generateNsisInstallerScript(cfg));
  root.file('installer/pixelclash-installer.wxs', generateMsiWixScript(cfg));
  root.file('installer/pixelclash-setup.iss', generateInnoSetupScript(cfg));
  root.file(
    'installer/LICENSE.txt',
    `${cfg.appName} v${cfg.version}\r\nCopyright © ${new Date().getFullYear()} ${cfg.publisher}\r\n\r\nSuite profesional de dibujo Pixel Art, Vectores y Animación 2D.\r\nBinario nativo compilado en Rust (Tauri v2) para Windows 10 y Windows 11 (64 bits).\r\n`
  );

  // 4. Desktop npm build descriptor (generates real Setup.exe and .msi via Rust + Tauri v2)
  const desktopPkg = {
    name: slug.toLowerCase(),
    productName: cfg.appName,
    version: cfg.version,
    description: `${cfg.appName} - Suite profesional nativa en Rust de Pixel Art y Animación 2D`,
    author: cfg.publisher,
    scripts: {
      'build:web': 'vite build --base=./',
      'tauri:dev': 'tauri dev',
      'build:win-exe': 'vite build --base=./ && tauri build --bundles nsis',
      'build:win-msi': 'vite build --base=./ && tauri build --bundles msi',
      'build:win-all': 'vite build --base=./ && tauri build --bundles nsis,msi',
      'build:inno': 'vite build --base=./ && tauri build --no-bundle && iscc installer/pixelclash-setup.iss',
    },
    devDependencies: {
      '@tauri-apps/cli': '^2.2.0',
    },
  };
  root.file('package.desktop.json', JSON.stringify(desktopPkg, null, 2));

  // 5. GitHub Actions CI workflow that compiles Rust binary + Setup.exe AND .msi automatically
  const ghWorkflow = `name: Compilar Instaladores Windows Rust/Tauri (.EXE y .MSI)

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

      - name: Configurar toolchain nativo Rust (stable)
        uses: dtolnay/rust-toolchain@stable

      - name: Cachear dependencias Cargo (Rust)
        uses: swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - name: Instalar dependencias de empaquetado Tauri v2
        run: |
          npm install --legacy-peer-deps
          npm install --save-dev --legacy-peer-deps @tauri-apps/cli@^2.2.0

      - name: Compilar aplicación Rust y generar Instaladores Windows (.EXE y .MSI)
        run: |
          npx vite build --base=./
          npx tauri build --bundles nsis,msi

      - name: Publicar instaladores finales (.EXE y .MSI)
        uses: actions/upload-artifact@v4
        with:
          name: ${slug}-Rust-Installers-${cfg.version}-Windows-x64
          path: |
            src-tauri/target/release/bundle/nsis/*.exe
            src-tauri/target/release/bundle/msi/*.msi
`;
  root.file('.github/workflows/build-windows-installers.yml', ghWorkflow);

  // 6. Clean distributor instructions (end user NEVER opens console or .bat files)
  const guide = `================================================================
${cfg.appName.toUpperCase()} v${cfg.version} — INSTALADOR NATIVO RUST/TAURI (.EXE / .MSI)
================================================================

EXPERIENCIA PARA EL USUARIO FINAL (CERO CONSOLA, CERO ARCHIVOS .BAT):
  1. Ejecutar el instalador (${slug}-Setup-${cfg.version}-x64.exe o ${slug}-${cfg.version}-x64.msi).
  2. Elegir carpeta de instalación (${cfg.installDir}).
  3. Pulsar Instalar (~12 MB nativos en Rust + WebView2 del sistema).
  4. Abrir ${cfg.appName} directamente desde el acceso directo en Escritorio o Menú Inicio.

CARACTERÍSTICAS CONFIGURADAS:
- Runtime nativo:     Rust + Tauri v2 (ventana sin bordes integrada y E/S nativa rápida)
- Instalador EXE:     NSIS Modern UI 2 / Inno Setup 6
- Instalador MSI:     Windows Installer (.MSI)
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

MÉTODO 2 — COMPILACIÓN EN EQUIPO DE DESARROLLO (RUST + TAURI v2 CLI):
  - Requisitos: Rust (rustup stable) + Node.js 22 LTS + Visual Studio Build Tools C++.
  - Comandos:
      npm install --legacy-peer-deps
      npm install --save-dev --legacy-peer-deps @tauri-apps/cli@^2.2.0
      npx vite build --base=./
      npx tauri build --bundles nsis,msi
  - Los instaladores generados aparecerán en:
      src-tauri/target/release/bundle/nsis/*.exe
      src-tauri/target/release/bundle/msi/*.msi

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

