// src-tauri/src/foreground.rs
use crate::ForegroundApp;

#[cfg(target_os = "windows")]
pub fn get_foreground_app() -> Result<ForegroundApp, String> {
  use windows::Win32::Foundation::HWND;
  use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
  };
  use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

  unsafe {
    // 1) Foreground window -> PID
    let hwnd: HWND = GetForegroundWindow();
    if hwnd.0.is_null() {
      return Err("No foreground window".into());
    }

    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    if pid == 0 {
      return Err("PID not found".into());
    }

    // 2) Snapshot handle 얻기
    let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
      .map_err(|e| format!("CreateToolhelp32Snapshot failed: {e}"))?;

    // 3) 프로세스 순회
    let mut entry = PROCESSENTRY32W::default();
    entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

    if Process32FirstW(snapshot, &mut entry).is_err() {
      return Err("Process32FirstW failed".into());
    }

    loop {
      if entry.th32ProcessID == pid {
        let exe_u16 = &entry.szExeFile;
        let end = exe_u16.iter().position(|&c| c == 0).unwrap_or(exe_u16.len());
        let exe = String::from_utf16_lossy(&exe_u16[..end]);
        return Ok(ForegroundApp { exe: exe.clone(), pid, name: exe });
      }

      if Process32NextW(snapshot, &mut entry).is_err() {
        break;
      }
    }

    Err("Process not found in snapshot".into())
  }
}

#[cfg(target_os = "macos")]
pub fn get_foreground_app() -> Result<ForegroundApp, String> {
  use cocoa::base::{id, nil};
  use objc::{class, msg_send};
  use std::ffi::CStr;

  unsafe {
    let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
    let app: id = msg_send![workspace, frontmostApplication];
    if app == nil {
      return Err("no frontmost app".into());
    }

    let pid_i32: i32 = msg_send![app, processIdentifier];
    let pid: u32 = if pid_i32 > 0 { pid_i32 as u32 } else { 0 };

    // bundleIdentifier (key)
    let mut bundle_key = String::new();
    let bundle_id: id = msg_send![app, bundleIdentifier];
    if bundle_id != nil {
      let cstr: *const std::os::raw::c_char = msg_send![bundle_id, UTF8String];
      if !cstr.is_null() {
        bundle_key = CStr::from_ptr(cstr).to_string_lossy().into_owned();
      }
    }

    // localizedName (display)
    let mut display = String::new();
    let name: id = msg_send![app, localizedName];
    if name != nil {
      let cstr: *const std::os::raw::c_char = msg_send![name, UTF8String];
      if !cstr.is_null() {
        display = CStr::from_ptr(cstr).to_string_lossy().into_owned();
      }
    }

    // fallback 규칙
    let exe = if !bundle_key.is_empty() { bundle_key } else { display.clone() };
    let name = if !display.is_empty() { display } else { exe.clone() };

    Ok(ForegroundApp { exe, pid, name })
  }
}


#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn get_foreground_app() -> Result<ForegroundApp, String> {
  Err("unsupported OS".into())
}
