use core_foundation::base::{kCFAllocatorDefault, CFRelease, TCFType};

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn get_idle_time_ms() -> u64 {
    use core_foundation::base::{kCFAllocatorDefault, CFRelease, TCFType};
    use core_foundation::number::{CFNumberGetValue, CFNumberRef, kCFNumberSInt64Type};
    use core_foundation::string::CFString;
    use io_kit_sys::{
        IORegistryEntryCreateCFProperty, IOServiceGetMatchingService, IOServiceMatching, IOObjectRelease,
    };
    use std::ffi::CString;

    unsafe {
        let class = match CString::new("IOHIDSystem") {
            Ok(v) => v,
            Err(_) => return 0,
        };

        let matching = IOServiceMatching(class.as_ptr());
        if matching.is_null() {
            return 0;
        }

        let service = IOServiceGetMatchingService(0, matching);
        if service == 0 {
            return 0;
        }

        // ✅ CFString 임시값 금지: 변수로 잡아서 lifetime 유지
        let key_str = CFString::new("HIDIdleTime");
        let key = key_str.as_concrete_TypeRef();

        let cf_prop = IORegistryEntryCreateCFProperty(service, key, kCFAllocatorDefault, 0);

        // ✅ service release (누수 방지, 크래시 원인은 아니지만 정리)
        IOObjectRelease(service);

        if cf_prop.is_null() {
            return 0;
        }

        let mut nanos: i64 = 0;
        let ok = CFNumberGetValue(
            cf_prop as CFNumberRef,
            kCFNumberSInt64Type,
            &mut nanos as *mut _ as *mut _,
        );

        CFRelease(cf_prop);

        if !ok {
            return 0;
        }

        (nanos as u64) / 1_000_000
    }
}

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

        if !GetLastInputInfo(&mut lii).as_bool() {
            return 0;
        }

        // GetTickCount: ms since system start (u32 wrap-around 가능하지만 idle 용도로 충분)
        let now = GetTickCount();
        now.wrapping_sub(lii.dwTime) as u64
    }
}
