const pad2 = (n) => String(n).padStart(2, "0");

export function formatHMS(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(r)}`;
}

/**
 * app identifier (bundle id / exe) → display name
 */
export function formatAppName(appId) {
  if (!appId) return "Unknown";

  const MAP = {
    // macOS
    "com.figma.Desktop": "Figma",
    "com.naver.Whale": "Whale",
    "com.apple.Safari": "Safari",
    "com.apple.finder": "Finder",
    "com.microsoft.VSCode": "VS Code",

    // Windows
    "chrome.exe": "Chrome",
    "msedge.exe": "Edge",
    "Code.exe": "VS Code",
    "notion.exe": "Notion",
    "figma.exe": "Figma",
  };

  if (MAP[appId]) return MAP[appId];

  // fallback 1: com.xxx.YYY → YYY
  if (appId.includes(".")) {
    const last = appId.split(".").pop();
    if (last) return last;
  }

  // fallback 2: xxx.exe → xxx
  if (appId.toLowerCase().endsWith(".exe")) {
    return appId.replace(/\.exe$/i, "");
  }

  return appId;
}
