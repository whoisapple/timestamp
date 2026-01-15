

// src-tauri/src/lib.rs
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg(target_os = "macos")]
#[macro_use]


extern crate objc;

use tauri::Manager;
use tauri_plugin_store::StoreExt;
use serde::Serialize;
mod idle;
use idle::get_idle_time_ms;
mod foreground;
mod worklog_store;

#[derive(Serialize)]
pub struct ForegroundApp {
  pub exe: String, // Windows: "Code.exe" / macOS: "com.microsoft.VSCode" (bundle id)
  pub pid: u32,    // macOS에서 PID 못 구하면 0
  pub name: String,  // ✅ 표시명
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
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      None
    ))
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
        greet, 
        get_foreground_app, 
        record_today_deltas,   
        get_today_snapshot,
        record_today_switches,
        record_today_hourly_distraction,
        record_today_exe_deltas,
        get_last_200_days,
        debug_store_dir,
        ensure_store_file,
        get_idle_time_ms
        ])

        .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn record_today_deltas(
  app: tauri::AppHandle,
  active_delta: u64,
  focus_delta: u64
) -> Result<(), String> {
  worklog_store::record_today_deltas_impl(&app, active_delta, focus_delta)
}

#[tauri::command]
fn get_today_snapshot(app: tauri::AppHandle) -> Result<worklog_store::TodaySnapshot, String> {
  worklog_store::get_today_snapshot_impl(&app)
}

#[tauri::command]
fn record_today_switches(app: tauri::AppHandle, switches_delta: u64) -> Result<(), String> {
  worklog_store::record_today_switches_impl(&app, switches_delta)
}

#[tauri::command]
fn record_today_hourly_distraction(app: tauri::AppHandle, deltas: Vec<u32>) -> Result<(), String> {
  worklog_store::record_today_hourly_distraction_impl(&app, deltas)
}

#[tauri::command]
fn record_today_exe_deltas(app: tauri::AppHandle, exe_deltas: Vec<(String, u64)>) -> Result<(), String> {
  worklog_store::record_today_exe_deltas_impl(&app, exe_deltas)
}

#[tauri::command]
fn get_last_200_days(app: tauri::AppHandle) -> Result<Vec<worklog_store::DayStat>, String> {
  worklog_store::get_last_days_impl(&app, 200)
}

#[tauri::command]
fn debug_store_dir(app: tauri::AppHandle) -> Result<String, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())?;

  Ok(dir.to_string_lossy().to_string())
}


#[tauri::command]
fn ensure_store_file(app: tauri::AppHandle) -> Result<(), String> {
  let store = app.store("worklog.json").map_err(|e| e.to_string())?;
  store.set("___boot".to_string(), serde_json::json!(true));
  store.save().map_err(|e| e.to_string())?;
  Ok(())
}