// src/views/DashboardView.jsx
import FocusLayer from "../components/FocusLayer";
import { formatHMS } from "../lib/format";
import { displayName } from "../lib/appNames";
import UsageBars from "../components/UsageBars";

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
}) {
  const FONT_FAMILY =
    '"Monoplex KR", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  const BG = "#E9E9E7";
  const CARD = "#F6F6F4";
  const PANEL = "#F6F6F4";
  const INSET = "0 0 0 1px rgba(0,0,0,0.06)";

  return (
    // ✅ 핵심: 작은 화면(단일 컬럼)에서는 스크롤 허용, xl부터는 화면 고정
    <div
      className="h-screen w-screen overflow-y-auto overflow-x-hidden xl:overflow-hidden"
      style={{ background: BG }}
    >
      {/* center + max width */}
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
        {/* ✅ xl(2컬럼)에서는 남은 높이를 다 쓰고, 그 외엔 자연 높이(스크롤) */}
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
                  {topApp}
                </div>
              </div>
            </div>

            {/* Middle */}
            <div className="mt-[12px] grid gap-[12px] grid-cols-1 lg:grid-cols-2">
              <div
                className="rounded-[24px] p-[22px] h-auto xl:h-[380px]"
                style={{ background: PANEL, boxShadow: INSET }}
              >
                <div className="text-[13px] font-medium">Context Switches</div>
                <div className="mt-[10px] text-[34px] font-semibold leading-none">
                  {switches}
                </div>
                <div className="mt-2 text-[12px] font-medium text-black/55">
                  Switches / hour: {switchesPerHour || 0}
                </div>
              </div>

              <div
                className="rounded-[24px] p-[22px] h-auto xl:h-[380px]"
                style={{ background: PANEL, boxShadow: INSET }}
              >
                <div className="text-[13px] font-medium">Current App</div>
                <div className="mt-[10px] text-[24px] font-semibold leading-none">
                  {displayName(current?.exe)}
                </div>
                <div className="mt-2 text-[12px] font-medium text-black/55">
                  {current?.exe || "-"}
                </div>
              </div>
            </div>

            {/* Bottom placeholder */}
            {/* ✅ xl에서만 남는 높이 먹게 해서 “세로 꽉참” / 작은 화면에서는 자연 높이 */}
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
          {/* ✅ 작은 화면에서는 자연 높이(스크롤은 바깥이 담당), xl에서는 세로 꽉 채움 */}
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
