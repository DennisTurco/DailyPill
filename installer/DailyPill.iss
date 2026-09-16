; Inno Setup script for DailyPill
; Prerequisite: run "npm run build:electron" inside frontend/
;               (output in frontend\release\win-unpacked\)
;
; To compile:
;   - Open this file with Inno Setup Compiler
;   - Press Ctrl+F9 (Build) or use the Build > Compile menu
;   - The installer is created in installer\Output\DailyPill_Setup_....exe
;
; Note: Windows autostart is NOT handled by this installer.
; The Electron app registers itself as a startup entry (via the "auto-launch"
; npm package, HKCU\...\Run, value name "DailyPill") the first time it runs in a
; packaged build (see frontend\electron\main.ts). Adding a Run key here would
; duplicate that registration — but it must still be cleaned up on uninstall,
; otherwise a dead entry pointing at a removed exe is left behind.

#define AppName      "DailyPill"
#define AppVersion   "1.0.0"
#define AppPublisher "DennisTurco"
#define AppURL       "https://github.com/DennisTurco/DailyPill"
#define AppExeName   "DailyPill.exe"
#ifndef SourceDir
  #define SourceDir  "..\frontend\release\win-unpacked"
#endif

[Setup]
AppId={{CC096AF4-F697-4FAF-89FF-071EA763C209}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
; Installer output folder
OutputDir=Output
OutputBaseFilename={#AppName}_Setup_{#AppVersion}
SetupIconFile=..\frontend\build\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; 64-bit only
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Requires Windows 10+
MinVersion=10.0
; No UAC needed to install under AppData (per-user install)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName} {#AppVersion}

[Languages]
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; \
  Description: "{cm:CreateDesktopIcon}"; \
  GroupDescription: "{cm:AdditionalIcons}"; \
  Flags: unchecked

[Files]
; The whole packaged Electron app (electron-builder, target "dir"),
; including the published .NET backend under resources\backend
Source: "{#SourceDir}\*"; \
  DestDir: "{app}"; \
  Flags: ignoreversion recursesubdirs createallsubdirs

[Registry]
; The app registers itself as a startup entry on first run (auto-launch npm
; package, HKCU\...\Run, value name "DailyPill") — this installer does not
; create it, but it must still be removed on uninstall, otherwise a dead
; entry pointing at a removed exe is left behind.
Root: HKCU; \
  Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; \
  ValueName: "DailyPill"; \
  ValueData: """{app}\{#AppExeName}"""; \
  Flags: uninsdeletevalue

[Icons]
; Start Menu
Name: "{group}\{#AppName}";           Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
; Desktop (optional)
Name: "{autodesktop}\{#AppName}"; \
  Filename: "{app}\{#AppExeName}"; \
  Tasks: desktopicon

[Run]
; Offers to launch the app after installation
Filename: "{app}\{#AppExeName}"; \
  Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; \
  Flags: nowait postinstall skipifsilent

[UninstallRun]
; Closes the app and its backend before uninstalling (if running)
Filename: "taskkill.exe"; \
  Parameters: "/f /im {#AppExeName}"; \
  Flags: runhidden waituntilterminated; \
  RunOnceId: "KillApp"
Filename: "taskkill.exe"; \
  Parameters: "/f /im DailyPill.Api.exe"; \
  Flags: runhidden waituntilterminated; \
  RunOnceId: "KillBackend"
