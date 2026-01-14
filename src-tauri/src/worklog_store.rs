use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::StoreExt;

#[derive(Serialize)]
pub struct DayStat {
  pub day: String,   // YYYY-MM-DD
  pub active: u64,   // seconds
  pub focus: u64,    // seconds
  pub worked: bool,  // active > 0
}

// 오늘 복구용 스냅샷
#[derive(Serialize)]
pub struct TodaySnapshot {
  pub day: String,
  pub active: u64,
  pub focus: u64,
  pub switches: u64,
  pub hourly_distraction: [u32; 24],
  pub exe_seconds: HashMap<String, u64>,
}

// store에 저장되는 day 데이터(확장)
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct DayData {
  pub active: u64,
  pub focus: u64,
  pub switches: u64,
  pub hourly_distraction: [u32; 24],
  pub exe_seconds: HashMap<String, u64>,
}

fn today_key() -> String {
  chrono::Local::now().format("%Y-%m-%d").to_string()
}

fn day_store_key(day: &str) -> String {
  format!("day:{}", day)
}

fn read_day_data(store_val: Option<&tauri_plugin_store::JsonValue>) -> DayData {
  let obj = match store_val.and_then(|v| v.as_object()) {
    Some(o) => o,
    None => return DayData::default(),
  };

  let active = obj.get("active").and_then(|v| v.as_u64()).unwrap_or(0);
  let focus = obj.get("focus").and_then(|v| v.as_u64()).unwrap_or(0);
  let switches = obj.get("switches").and_then(|v| v.as_u64()).unwrap_or(0);

  // hourly_distraction: [24]
  let mut hourly_distraction = [0u32; 24];
  if let Some(arr) = obj.get("hourly_distraction").and_then(|v| v.as_array()) {
    for i in 0..24 {
      if let Some(x) = arr.get(i).and_then(|v| v.as_u64()) {
        hourly_distraction[i] = x.min(u32::MAX as u64) as u32;
      }
    }
  }

  // exe_seconds: { "chrome.exe": 123, ... }
  let mut exe_seconds: HashMap<String, u64> = HashMap::new();
  if let Some(map) = obj.get("exe_seconds").and_then(|v| v.as_object()) {
    for (k, v) in map {
      exe_seconds.insert(k.clone(), v.as_u64().unwrap_or(0));
    }
  }

  DayData {
    active,
    focus,
    switches,
    hourly_distraction,
    exe_seconds,
  }
}

fn write_day<R: Runtime>(store: &tauri_plugin_store::Store<R>, key: String, data: &DayData) {
  store.set(
    key,
    json!({
      "active": data.active,
      "focus": data.focus,
      "switches": data.switches,
      "hourly_distraction": data.hourly_distraction,
      "exe_seconds": data.exe_seconds,
    }),
  );
}

pub fn record_today_deltas_impl<R: Runtime>(
  app: &AppHandle<R>,
  active_delta: u64,
  focus_delta: u64,
) -> Result<(), String> {
  let store = app.store("worklog.json").map_err(|e| e.to_string())?;
  let day = today_key();
  let k = day_store_key(&day);

  let mut data = read_day_data(store.get(&k).as_ref());
  data.active = data.active.saturating_add(active_delta);
  data.focus = data.focus.saturating_add(focus_delta);

  write_day(&store, k, &data);
  store.save().map_err(|e| e.to_string())?;
  Ok(())
}

// ✅ 기존 함수 그대로: n일을 날짜 생성 + store 읽기(없으면 0)
pub fn get_last_days_impl<R: Runtime>(app: &AppHandle<R>, n: i64) -> Result<Vec<DayStat>, String> {
  let store = app.store("worklog.json").map_err(|e| e.to_string())?;

  let today = chrono::Local::now().date_naive();
  let mut out: Vec<DayStat> = Vec::with_capacity(n as usize);

  for i in (0..n).rev() {
    let d = today - chrono::Duration::days(i);
    let day = d.format("%Y-%m-%d").to_string();
    let k = day_store_key(&day);

    let data = read_day_data(store.get(&k).as_ref());

    out.push(DayStat {
      day,
      active: data.active,
      focus: data.focus,
      worked: data.active > 0,
    });
  }

  Ok(out)
}

// ✅ 오늘 스냅샷(재시작/새로고침 복구용)
pub fn get_today_snapshot_impl<R: Runtime>(app: &AppHandle<R>) -> Result<TodaySnapshot, String> {
  let store = app.store("worklog.json").map_err(|e| e.to_string())?;
  let day = today_key();
  let k = day_store_key(&day);

  let data = read_day_data(store.get(&k).as_ref());

  Ok(TodaySnapshot {
    day,
    active: data.active,
    focus: data.focus,
    switches: data.switches,
    hourly_distraction: data.hourly_distraction,
    exe_seconds: data.exe_seconds,
  })
}

// ✅ switches delta 누적 저장
pub fn record_today_switches_impl<R: Runtime>(
  app: &AppHandle<R>,
  switches_delta: u64,
) -> Result<(), String> {
  let store = app.store("worklog.json").map_err(|e| e.to_string())?;
  let day = today_key();
  let k = day_store_key(&day);

  let mut data = read_day_data(store.get(&k).as_ref());
  data.switches = data.switches.saturating_add(switches_delta);

  write_day(&store, k, &data);
  store.save().map_err(|e| e.to_string())?;
  Ok(())
}

// ✅ hourly_distraction delta(24개) 누적 저장
pub fn record_today_hourly_distraction_impl<R: Runtime>(
  app: &AppHandle<R>,
  deltas: Vec<u32>,
) -> Result<(), String> {
  let store = app.store("worklog.json").map_err(|e| e.to_string())?;
  let day = today_key();
  let k = day_store_key(&day);

  let mut data = read_day_data(store.get(&k).as_ref());

  for i in 0..24 {
    let add = deltas.get(i).copied().unwrap_or(0) as u64;
    let cur = data.hourly_distraction[i] as u64;
    data.hourly_distraction[i] = (cur.saturating_add(add)).min(u32::MAX as u64) as u32;
  }

  write_day(&store, k, &data);
  store.save().map_err(|e| e.to_string())?;
  Ok(())
}

// ✅ exe별 delta 누적 저장: exe_deltas = [(exe, deltaSec), ...]
pub fn record_today_exe_deltas_impl<R: Runtime>(
  app: &AppHandle<R>,
  exe_deltas: Vec<(String, u64)>,
) -> Result<(), String> {
  let store = app.store("worklog.json").map_err(|e| e.to_string())?;
  let day = today_key();
  let k = day_store_key(&day);

  let mut data = read_day_data(store.get(&k).as_ref());

  for (exe, d) in exe_deltas {
    let entry = data.exe_seconds.entry(exe).or_insert(0);
    *entry = entry.saturating_add(d);
  }

  write_day(&store, k, &data);
  store.save().map_err(|e| e.to_string())?;
  Ok(())
}
