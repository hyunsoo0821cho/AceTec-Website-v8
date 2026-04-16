' AceTec Auto-Sync hidden launcher
' 작업 스케줄러(로그온 시)가 호출하여 콘솔 창 없이 auto-sync.mjs 를 기동.
Option Explicit
Dim sh, fso, scriptDir, projectRoot, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir   = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(scriptDir)

sh.CurrentDirectory = projectRoot

' node auto-sync.mjs — 창 숨김(0), 비동기(False)
cmd = """C:\Program Files\nodejs\node.exe"" ""scripts\auto-sync.mjs"""
sh.Run cmd, 0, False
