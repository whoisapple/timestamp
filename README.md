# TimeStamp

Windows와 macOS에서 실행 중인 앱 사용 시간과 집중 시간을 기록하고 시각화하는 데스크톱 앱입니다. 사용자가 집중할 앱을 지정하면 일반 활성 시간과 집중 시간을 나누어 볼 수 있습니다.

<img width="3840" height="2160" alt="image" src="https://github.com/user-attachments/assets/86e6c6df-ed52-471f-bd43-69b9da4dc425" />


## 주요 기능

- 현재 포그라운드 앱을 바탕으로 앱별 사용 시간 집계
- 총 활성 시간, 집중 시간, 가장 많이 사용한 앱 확인
- 집중 앱 목록 지정 및 작은 타이머 창에서 집중 시간 확인
- 앱 전환과 시간대별 비집중 사용 분석
- 날짜별 활동 기록과 대시보드
- 유휴 상태 감지 시 사용 시간 집계 일시 정지
- 자동 실행 설정 및 앱 내 업데이트 확인

## 기술 스택

- Tauri 2 (Rust)
- React 19, Vite 7, Tailwind CSS
- Windows 및 macOS 네이티브 포그라운드 앱·유휴 상태 조회

## 개발 및 빌드

필요한 도구: Node.js, Rust 툴체인, 그리고 운영체제별 Tauri 빌드 의존성. 자세한 준비 사항은 [Tauri 공식 prerequisites 안내](https://v2.tauri.app/start/prerequisites/)를 참고하세요.

```bash
git clone https://github.com/whoisapple/timestamp.git
cd timestamp
npm install
npm run tauri dev
```

데스크톱 앱 패키지는 다음 명령으로 빌드합니다.

```bash
npm run tauri build
```

현재 번들 설정은 macOS DMG와 Windows MSI를 대상으로 합니다.

## 데이터와 분석

일별 작업 기록과 앱별 누적 시간은 Tauri 앱 데이터 디렉터리의 `worklog.json`에 저장됩니다. 프로덕션 빌드에는 Mixpanel 분석이 연결되어 있으며, 앱 실행·화면 전환·유휴 상태 전환·집중 앱 개수 등의 이벤트를 기록합니다.

## 프로젝트 구성

- `src/App.jsx`: 앱 상태와 대시보드·타이머 화면 전환
- `src/views`: 대시보드 및 타이머 UI
- `src/hooks/useWorklog.js`: 앱 사용 시간과 집중 시간 집계
- `src-tauri/src/foreground.rs`: Windows/macOS 포그라운드 앱 조회
- `src-tauri/src/idle.rs`: 운영체제 유휴 시간 조회
- `src-tauri/src/worklog_store.rs`: 로컬 일별 기록 저장과 조회
