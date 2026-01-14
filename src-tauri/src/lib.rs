// src-tauri/src/lib.rs
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::Serialize;

mod foreground;

#[derive(Serialize)]
pub struct ForegroundApp {
  pub exe: String, // Windows: "Code.exe" / macOS: "com.microsoft.VSCode" (bundle id)
  pub pid: u32,    // macOS에서 PID 못 구하면 0
}

#[tauri::command]
fn get_foreground_app() -> Result<ForegroundApp, String> {
  foreground::get_foreground_app()
}

// greet가 실제로 존재한다는 전제(없으면 invoke_handler에서 제거하세요)
#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello, {name}!")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![greet, get_foreground_app])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
