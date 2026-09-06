#!/bin/bash
# Tints this session's Terminal.app tab dark Google-Calendar-blue at SessionStart.
# Best-effort only: no-ops on non-macOS, non-Terminal.app, or if AppleScript
# automation isn't permitted.

get_ctty() {
  local pid="$1" tty
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -z "$pid" ] && return 1
    tty=$(ps -o tty= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$tty" ] && [ "$tty" != "??" ]; then
      echo "$tty"
      return 0
    fi
    pid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
  done
  return 1
}

{
  [ "$(uname)" = "Darwin" ] || exit 0
  [ "$TERM_PROGRAM" = "Apple_Terminal" ] || exit 0

  # $PPID's own tty is often "??" (detached wrapper shell), so walk up
  # the process tree to the first ancestor with a real controlling tty.
  tty_name=$(get_ctty "$PPID")
  [ -n "$tty_name" ] || exit 0
  full_tty="/dev/$tty_name"

  osascript <<APPLESCRIPT
tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is "$full_tty" then
        set background color of t to {6700, 13000, 21500}
      end if
    end repeat
  end repeat
end tell
APPLESCRIPT
} >/dev/null 2>&1 || true

exit 0
