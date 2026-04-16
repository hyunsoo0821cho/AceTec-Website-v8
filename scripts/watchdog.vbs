' AceTec Watchdog hidden launcher
' 작업 스케줄러(로그온 시)로 호출되어 콘솔 창 없이 watchdog.mjs 를 기동합니다.
Option Explicit
Dim sh, fso, scriptDir, projectRoot, cmd
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 이 .vbs 가 있는 디렉터리 = scripts, 상위 = 프로젝트 루트
scriptDir   = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(scriptDir)

sh.CurrentDirectory = projectRoot

' node watchdog 실행, 창 숨김(0), 비동기(False)
cmd = """C:\Program Files\nodejs\node.exe"" ""scripts\watchdog.mjs"""
sh.Run cmd, 0, False
