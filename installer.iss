; required outputs: dist\app.exe, dist\native_host.exe, extension\*.js
; helper manifest's name must match NativeHostName
#define AppExe "app.exe"
#define NativeHostName "anipresence_native_host"
#define NativeManifest "native_host_manifest.json"

[Setup]
AppId=AniPresence
AppName=AniPresence
AppVersion=1.4.4
DefaultDirName={autopf}\AniPresence
PrivilegesRequired=admin
OutputDir=.\Output
OutputBaseFilename=AniPresence_Setup
Compression=lzma
SolidCompression=yes
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\assets\icon.ico
DisableDirPage=no
CloseApplications=yes
RestartApplications=no

[Tasks]
Name: "startup"; Description: "Start AniPresence automatically when Windows boots"; GroupDescription: "Options:"

[Files]
Source: "dist\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\native_host.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "native_messaging\manifest.json"; DestDir: "{app}"; DestName: "{#NativeManifest}"; Flags: ignoreversion; AfterInstall: ConfigureNativeManifest
Source: "assets\icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "extension\*"; DestDir: "{app}\extension"; Excludes: "*.ts,*.map"; Flags: ignoreversion recursesubdirs

[Registry]
; register machine-wide because installation requires administrator privileges
; uninstall removes only host key, not the browser's parent keys
Root: HKLM32; Subkey: "Software\Google\Chrome\NativeMessagingHosts\{#NativeHostName}"; ValueType: string; ValueName: ""; ValueData: "{app}\{#NativeManifest}"; Flags: uninsdeletekey
Root: HKLM32; Subkey: "Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\{#NativeHostName}"; ValueType: string; ValueName: ""; ValueData: "{app}\{#NativeManifest}"; Flags: uninsdeletekey

[Icons]
Name: "{commonprograms}\AniPresence"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"
Name: "{commonprograms}\Uninstall AniPresence"; Filename: "{uninstallexe}"
Name: "{commonstartup}\AniPresence"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; Tasks: startup

[Run]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""AniPresence"""; Flags: runhidden
Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; Flags: nowait runhidden postinstall runasoriginaluser skipifsilent; Description: "Start AniPresence now"
Filename: "{sys}\explorer.exe"; Parameters: """{app}\extension"""; Description: "Open extension folder"; Flags: postinstall skipifsilent runasoriginaluser

[UninstallRun]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""AniPresence"""; Flags: runhidden

[InstallDelete]
; remove old executable (name change)
Type: files; Name: "{app}\rpc.exe"

; upgrade in place !! do not run old uninstaller

[Code]
procedure ConfigureNativeManifest();
var
  ManifestPath: String;
  Lines: TArrayOfString;
  I, Replacements: Integer;
begin
  { Modify only the installed copy, never the development source file. }
  ManifestPath := ExpandConstant('{app}\{#NativeManifest}');
  if not LoadStringsFromFile(ManifestPath, Lines) then
    RaiseException('Could not read the installed native helper manifest.');

  Replacements := 0;
  for I := 0 to GetArrayLength(Lines) - 1 do
    Replacements := Replacements + StringChangeEx(
      Lines[I], '"..\\dist\\native_host.exe"', '"native_host.exe"', True);

  { Stop rather than silently install a manifest with an unexpected layout. }
  if Replacements <> 1 then
    RaiseException('The native helper manifest has an unexpected executable path.');

  if not SaveStringsToUTF8FileWithoutBOM(ManifestPath, Lines, False) then
    RaiseException('Could not save the installed native helper manifest.');
end;
