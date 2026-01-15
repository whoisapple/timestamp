#[tauri::command]
pub fn get_idle_time_ms() -> u64 {
  platform_idle_time_ms()
}

#[cfg(target_os = "windows")]
fn platform_idle_time_ms() -> u64 {
  use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
  use windows::Win32::System::SystemInformation::GetTickCount;

  unsafe {
    let mut info = LASTINPUTINFO {
      cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
      dwTime: 0,
    };

    if GetLastInputInfo(&mut info).as_bool() {
      let now = GetTickCount();
      return (now - info.dwTime) as u64;
    }
  }
  0
}

#[cfg(target_os = "macos")]
fn platform_idle_time_ms() -> u64 {
  use core_graphics::event::{
    CGEventSource, CGEventSourceStateID, CGEventType
  };

  let seconds = CGEventSource::seconds_since_last_event_type(
    CGEventSourceStateID::CombinedSessionState,
    CGEventType::Null,
  );

  (seconds * 1000.0) as u64
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn platform_idle_time_ms() -> u64 {
  0
}
