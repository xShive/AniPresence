[Setup]
AppName=AniPresence
AppVersion=1.4.2
DefaultDirName={autopf}\AniPresence
PrivilegesRequired=admin
OutputDir=.\Output
OutputBaseFilename=AniPresence_Setup
Compression=lzma
SolidCompression=yes
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\assets\icon.ico
DisableDirPage=no

[Tasks]
Name: "startup"; Description: "Start AniPresence automatically when Windows boots"; GroupDescription: "Options:"

[Files]
Source: "dist\rpc.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "assets\icon.ico"; DestDir: "{app}\assets"; Flags: ignoreversion
Source: "extension\*"; DestDir: "{app}\extension"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{commonprograms}\AniPresence"; Filename: "{app}\rpc.exe"; IconFilename: "{app}\assets\icon.ico"
Name: "{commonprograms}\Uninstall AniPresence"; Filename: "{uninstallexe}"
Name: "{commonstartup}\AniPresence"; Filename: "{app}\rpc.exe"; Tasks: startup

[Run]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""AniPresence"" dir=in action=allow program=""{app}\rpc.exe"" enable=yes"; Flags: runhidden
Filename: "{app}\rpc.exe"; Flags: nowait runhidden postinstall; Description: "Start AniPresence now"
Filename: "explorer.exe"; Parameters: "{app}\extension"; Description: "Open extension folder"; Flags: postinstall skipifsilent shellexec

[UninstallRun]
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""AniPresence"""; Flags: runhidden

[Code]
var 
  ResultCode: Integer;

procedure RemoveOldInstallation();
var
  UninstallerPath: String;
  UninsResultCode: Integer;
begin
  // 1. Remove the ancient "AnimeActivityTracker" (just in case they skip versions)
  UninstallerPath := ExpandConstant('{autopf}\AnimeActivityTracker\unins000.exe');
  if FileExists(UninstallerPath) then
  begin
    Exec(UninstallerPath, '/VERYSILENT /SUPPRESSMSGBOXES', '', SW_HIDE, ewWaitUntilTerminated, UninsResultCode);
    Sleep(1000);
  end;

  // 2. Remove the previous "AniPresence" version for a clean upgrade
  UninstallerPath := ExpandConstant('{app}\unins000.exe');
  if FileExists(UninstallerPath) then
  begin
    // The /_?= flag is critical here. It stops the uninstaller from copying itself to the Temp folder
    // and running in the background. It forces Inno Setup to wait for it to finish deleting old files.
    Exec(UninstallerPath, '/VERYSILENT /SUPPRESSMSGBOXES /_?=' + ExpandConstant('{app}'), '', SW_HIDE, ewWaitUntilTerminated, UninsResultCode);
    Sleep(1000);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
  begin
    // Kill the running process BEFORE trying to uninstall
    Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM rpc.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(1000);
    
    // Now that it's dead, wipe the old files cleanly
    RemoveOldInstallation();
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    // Kill the process when the user clicks "Uninstall" in Windows settings
    Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM rpc.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Sleep(1000);
  end;
end;