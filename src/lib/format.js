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
 * - Windows: exe / full path / mixed case 대응
 * - macOS: bundle id 대응
 * - fallback 개선: bundle id는 마지막 세그먼트, exe는 확장자 제거 + Titleize
 */
/**
 * app identifier (bundle id / exe) → display name
 */
export function formatAppName(appId) {
  if (!appId) return "Unknown";

  // 1) normalize: 경로면 파일명만
  let id = String(appId);
  if (id.includes("\\") || id.includes("/")) {
    const parts = id.split(/[/\\]/);
    id = parts[parts.length - 1] || id;
  }

  const lower = id.toLowerCase();

  // 2) map (lowercase key)
  const MAP = {
    // macOS
    "com.figma.desktop": "Figma",
    "com.naver.whale": "Whale",
    "com.apple.safari": "Safari",
    "com.apple.finder": "Finder",
    "com.microsoft.vscode": "VS Code",

    // Windows
    "discord.exe": "Discord",
    "whale.exe": "Whale",
    "figma.exe": "Figma",
    "chrome.exe": "Chrome",
    "msedge.exe": "Edge",
    "code.exe": "VS Code",
    "notion.exe": "Notion",
  };

  if (MAP[lower]) return MAP[lower];

  // ✅ 3) Windows exe fallback는 "dot split"보다 먼저
  if (lower.endsWith(".exe")) {
    return id.replace(/\.exe$/i, "");
  }

  // 4) mac bundle id fallback: com.xxx.YYY → YYY
  if (id.includes(".")) {
    const last = id.split(".").pop();
    if (last) return last;
  }

  return id;
}


function titleize(s) {
  if (!s) return "-";
  // "afterfx" -> "Afterfx", "visual studio code" -> "Visual Studio Code"
  // camel/underscore/하이픈도 대충 정리
  const cleaned = String(s)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "-";

  // 이미 대문자/공백이 섞여 있으면 그대로 두는 편이 안전
  // (예: "VS Code", "iTerm", "Figma")
  const hasUpper = /[A-Z]/.test(cleaned);
  if (hasUpper) return cleaned;

  return cleaned
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
