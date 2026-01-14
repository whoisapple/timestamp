// src/lib/ignoreApps.js

// ✅ 집계에서 제외할 앱 키 목록
// - Windows: "explorer.exe" 같은 exe
// - macOS: "com.apple.finder" 같은 bundle id
export const IGNORE_KEYS = new Set([
  // Windows shell / taskbar / start / search
  "explorer.exe",
  "SearchHost.exe",
  "StartMenuExperienceHost.exe",
  "ShellExperienceHost.exe",
  "RuntimeBroker.exe",
  "ApplicationFrameHost.exe",
  "TextInputHost.exe",
  "LockApp.exe",
  "PeopleExperienceHost.exe",
  "Widgets.exe",
  "WidgetService.exe",
  "SearchApp.exe",
  "SearchUI.exe",
  "ctfmon.exe",
  "sihost.exe",
  "dwm.exe",
  "taskhostw.exe",
  "SystemSettings.exe",

  // 본인 앱(자기 자신 집계 제외)
  "work-timer.exe",

  // macOS system
  "com.apple.finder",
  "com.apple.Spotlight",
  "com.apple.dock",
  "com.apple.ControlCenter",
  "com.apple.notificationcenterui",
  "com.apple.loginwindow",
  "com.apple.WindowManager",
]);

function isProbablyWindowsExe(key) {
  return /\.exe$/i.test(key);
}

// ✅ key(exe 또는 bundle id)가 없거나 제외 대상이면 true
export function shouldIgnoreExe(appKey) {
  if (!appKey) return true;

  const key = String(appKey).trim();
  if (!key) return true;

  // exact match 제외
  if (IGNORE_KEYS.has(key)) return true;

  // Windows에서만 안전장치(.exe 아닌 값 제외)를 적용
  // macOS에서는 bundle id가 들어오므로 여기서 제외하면 안 됨
  if (isProbablyWindowsExe(key)) {
    // 여기까지 왔으면 exe인데 IGNORE_KEYS에는 없다는 뜻 -> 포함
    return false;
  }

  // macOS(app bundle id) 또는 기타 문자열은 기본 포함(집계)
  // 단, 시스템 앱은 IGNORE_KEYS에서 이미 걸러짐
  return false;
}
