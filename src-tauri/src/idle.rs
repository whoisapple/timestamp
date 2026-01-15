// src/idle.rs

// -----------------------------
// macOS
// -----------------------------
#[cfg(target_os = "macos")]
#[tauri::command]
pub fn get_idle_time_ms() -> u64 {
    use core_foundation::base::{kCFAllocatorDefault, CFRelease, TCFType};
    use core_foundation::number::{CFNumberGetValue, CFNumberRef, kCFNumberSInt64Type};
    use core_foundation::string::CFString;

    use io_kit_sys::{
        kIOMasterPortDefault,
        types::io_registry_entry_t,
        IORegistryEntryCreateCFProperty,
        IOServiceGetMatchingService,
        IOServiceMatching,
        IOObjectRelease,
    };

    unsafe {
        // HIDSystem 서비스 찾기
        let matching = IOServiceMatching(b"IOHIDSystem\0".as_ptr() as *const _);
        if matching.is_null() {
            return 0;
        }

        let service: io_registry_entry_t =
            IOServiceGetMatchingService(kIOMasterPortDefault, matching);
        if service == 0 {
            return 0;
        }

        // "HIDIdleTime" 읽기 (ns 단위)
        let key = CFString::new("HIDIdleTime");
        let cf_num = IORegistryEntryCreateCFProperty(
            service,
            key.as_concrete_TypeRef(),
            kCFAllocatorDefault,
            0,
        ) as CFNumberRef;

        IOObjectRelease(service);

        if cf_num.is_null() {
            return 0;
        }

        let mut nanos: i64 = 0;
        let ok = CFNumberGetValue(cf_num, kCFNumberSInt64Type, &mut nanos as *mut _ as *mut _);
        CFRelease(cf_num as *const _);

        if ok == 0 || nanos < 0 {
            return 0;
        }

        // ns -> ms
        (nanos as u64) / 1_000_000
    }
}

// -----------------------------
// Windows
// -----------------------------
#[cfg(target_os = "windows")]
#[tauri::command]
pub fn get_idle_time_ms() -> u64 {
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    use windows::Win32::System::SystemInformation::GetTickCount;

    unsafe {
        let mut lii = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };

        if GetLastInputInfo(&mut lii).as_bool() {
            let now = GetTickCount() as u64;
            let last = lii.dwTime as u64;
            now.saturating_sub(last)
        } else {
            0
        }
    }
}

// -----------------------------
// fallback (linux/other)
// -----------------------------
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
#[tauri::command]
pub fn get_idle_time_ms() -> u64 {
    0
}
