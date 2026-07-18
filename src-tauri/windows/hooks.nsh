!macro NSIS_HOOK_POSTINSTALL
  FileOpen $0 "$INSTDIR\.verva-installed" w
  FileWrite $0 "installed"
  FileClose $0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Delete "$INSTDIR\.verva-installed"
!macroend
