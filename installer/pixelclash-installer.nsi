; PixelClash Studio - Instalador Grafico Windows (.EXE) con NSIS MUI2
Unicode True
!include "MUI2.nsh"
!include "x64.nsh"

Name "PixelClash Studio 2.0.0"
OutFile "..\release\PixelClashStudio-Setup-2.0.0-x64.exe"
InstallDir "$PROGRAMFILES64\PixelClash Studio"
InstallDirRegKey HKLM "Software\PixelClashStudio" "Install_Dir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

VIProductVersion "2.0.0.0"
VIAddVersionKey /LANG=3082 "ProductName" "PixelClash Studio"
VIAddVersionKey /LANG=3082 "CompanyName" "PixelClash Studio"
VIAddVersionKey /LANG=3082 "FileDescription" "Instalador de PixelClash Studio para Windows"
VIAddVersionKey /LANG=3082 "FileVersion" "2.0.0"
VIAddVersionKey /LANG=3082 "ProductVersion" "2.0.0"

!define MUI_ICON "..\assets\pixelclash.ico"
!define MUI_UNICON "..\assets\pixelclash.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\PixelClashStudio.exe"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Spanish"

Section "PixelClash Studio (Principal)" SecCore
  SectionIn RO
  SetOutPath "$INSTDIR"
  File /r "..\release\win-unpacked\*.*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelClashStudio" "DisplayName" "PixelClash Studio 2.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelClashStudio" "DisplayIcon" "$INSTDIR\PixelClashStudio.exe,0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelClashStudio" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelClashStudio" "Publisher" "PixelClash Studio"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelClashStudio" "DisplayVersion" "2.0.0"
  ; Asociacion oficial de archivos .pcs con el icono de PixelClash Studio
  WriteRegStr HKCR ".pcs" "" "PixelClashStudio.Project"
  WriteRegStr HKCR "PixelClashStudio.Project" "" "Proyecto PixelClash Studio"
  WriteRegStr HKCR "PixelClashStudio.Project\DefaultIcon" "" "$INSTDIR\PixelClashStudio.exe,0"
  WriteRegStr HKCR "PixelClashStudio.Project\shell\open\command" "" '"$INSTDIR\PixelClashStudio.exe" "%1"'
SectionEnd

Section "Acceso directo en Escritorio" SecDesktop
  CreateShortcut "$DESKTOP\PixelClash Studio.lnk" "$INSTDIR\PixelClashStudio.exe" "" "$INSTDIR\PixelClashStudio.exe" 0
SectionEnd

Section "Acceso directo en Menu Inicio" SecStartMenu
  CreateDirectory "$SMPROGRAMS\PixelClash Studio"
  CreateShortcut "$SMPROGRAMS\PixelClash Studio\PixelClash Studio.lnk" "$INSTDIR\PixelClashStudio.exe" "" "$INSTDIR\PixelClashStudio.exe" 0
  CreateShortcut "$SMPROGRAMS\PixelClash Studio\Desinstalar PixelClash Studio.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\PixelClash Studio.lnk"
  RMDir /r "$SMPROGRAMS\PixelClash Studio"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PixelClashStudio"
  DeleteRegKey HKCR "PixelClashStudio.Project"
SectionEnd
