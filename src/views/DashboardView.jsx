// src/views/DashboardView.jsx
import FocusLayer from "../components/FocusLayer";
import { formatAppName, formatHMS } from "../lib/format";
import UsageBars from "../components/UsageBars";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import WorkPresence30 from "../components/WorkPresence30";
import DistractionAnalysisCard from "../components/DistractionAnalysisCard";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkAndUpdate() {
  console.log("[updater] clicked");

  try {
    const update = await check();
    console.log("[updater] check result:", update);

    if (update?.available) {
      console.log("[updater] downloading...");
      await update.downloadAndInstall();
      console.log("[updater] installed, relaunching...");
      await relaunch();
    } else {
      console.log("[updater] no update available");
      alert("이미 최신 버전이에요.");
    }
  } catch (e) {
    console.error("[updater] error:", e);
    alert(String(e));
  }
}

export default function DashboardView({
  onClickTimer,
  rows,
  current,
  error,
  focusedSet,
  setFocusedSet,
  totalActive,
  totalFocus,
  topApp,
  switches,
  switchesPerHour,
  hourlyDistraction, // ✅ 추가: App.jsx에서 내려받기
})  {
  const [days30, setDays30] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await invoke("get_last_200_days");
        if (alive) setDays30(res);
      } catch (e) {
        console.error("[get_last_200_days] failed:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const FONT_FAMILY =
    '"Monoplex KR", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  const BG = "#E9E9E7";
  const CARD = "#F6F6F4";
  const PANEL = "#F6F6F4";
  const INSET = "0 0 0 1px rgba(0,0,0,0.06)";

  return (
    <div
      className="h-screen w-screen overflow-y-auto overflow-x-hidden xl:overflow-hidden"
      style={{ background: BG }}
    >
      <div
        className="mx-auto w-full max-w-[1440px] px-[24px] pt-[24px] pb-[24px] box-border
                   min-h-screen xl:h-full flex flex-col"
        style={{ fontFamily: FONT_FAMILY, color: "#0B0B0B" }}
      >
        {/* Top bar */}
        <div className="flex items-center shrink-0">
          <div className="flex items-center gap-3">
            <img src="./logo.svg" alt="" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              className="h-[34px] rounded-full bg-black px-5 text-[14px] font-semibold text-white"
              title="View Timer"
              onClick={onClickTimer}
            >
              View Timer
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-[18px] grid gap-[12px] grid-cols-1 xl:grid-cols-[1fr_420px] flex-1 min-h-0">
          {/* LEFT */}
          <div className="min-w-0 flex flex-col min-h-0">
            {/* KPI */}
            <div className="grid gap-[12px] grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              <div
                className="rounded-[24px] px-[20px] py-[20px]"
                style={{ background: CARD, boxShadow: INSET }}
              >
                <div className="text-[13px] font-medium">Total Active Time</div>
                <div className="mt-[4px] text-[28px] font-semibold leading-none">
                  {formatHMS(totalActive)}
                </div>
              </div>

              <div
                className="rounded-[24px] px-[20px] py-[20px]"
                style={{ background: CARD, boxShadow: INSET }}
              >
                <div className="text-[13px] font-medium">Total Focus Time</div>
                <div className="mt-[4px] text-[28px] font-semibold leading-none">
                  {formatHMS(totalFocus)}
                </div>
              </div>

              <div
                className="rounded-[24px] px-[20px] py-[20px]"
                style={{ background: CARD, boxShadow: INSET }}
              >
                <div className="text-[13px] font-medium">Top App</div>
                <div className="mt-[4px] text-[28px] font-semibold leading-none line-clamp-1">
                  {formatAppName(topApp)}
                </div>
              </div>
            </div>

            {/* Middle */}
            <div className="mt-[12px] grid gap-[12px] grid-cols-1 lg:grid-cols-2">
              <div
                className="rounded-[24px] p-[22px] h-auto xl:h-[380px]"
                style={{ background: PANEL, boxShadow: INSET }}
              >
                <WorkPresence30 days={days30} />
              </div>

              <div
                className="rounded-[24px] p-[22px] h-auto xl:h-[380px]"
                style={{ background: PANEL, boxShadow: INSET }}
              >
                <DistractionAnalysisCard
                  rows={rows}
                  focusedSet={focusedSet}
                  totalActive={totalActive}
                  totalFocus={totalFocus}
                  hourlyDistraction={hourlyDistraction}
                />
              </div>
            </div>

            {/* Bottom */}
            <div
              className="mt-[12px] rounded-[24px] p-[22px] min-h-[220px] xl:flex-1 xl:min-h-0"
              style={{ background: PANEL, boxShadow: INSET }}
            >
              <UsageBars
                rows={rows}
                totalActive={totalActive}
                focusedSet={focusedSet}
                limit={12}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="min-w-0 xl:h-full xl:min-h-0">
            <div className="xl:h-full xl:min-h-0">
              <FocusLayer
                rows={rows}
                focusedSet={focusedSet}
                setFocusedSet={setFocusedSet}
                totalFocus={totalFocus}
              />
            </div>

            {error ? (
              <div className="mt-3 text-[11px] font-medium text-red-600">
                {String(error).slice(0, 140)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
