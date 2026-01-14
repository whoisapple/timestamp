export const APP_NAME_MAP = {
    "chrome.exe": "Chrome",
    "msedge.exe": "Edge",
    "Code.exe": "Visual Studio Code",
    "notion.exe": "Notion",
    "figma.exe": "Figma",
    "Discord.exe": "Discord",
    "Slack.exe": "Slack",
    "Photoshop.exe": "Adobe Photoshop",
    "Illustrator.exe": "Adobe Illustrator",
    "AfterFX.exe": "Adobe AfterEffects",
    "Blender.exe": "Blender",
    "com.microsoft.VSCode": "Visual Studio Code",
    "com.google.Chrome": "Chrome",
    "com.apple.Safari": "Safari",
  };
  
export function displayName(appKey, fallback) {
  return fallback || APP_NAME_MAP[appKey] || appKey;
}