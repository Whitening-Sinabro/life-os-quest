# Design Baseline — life-os-quest (grandfathered legacy)

> 기존 UI(그대로)라서 enforcement에서 제외하는 **레거시 파일 목록**.
> **명시적 파일 경로만.** `**` / `src/**` / 디렉터리 glob 금지 (한 레이어를 통째로 무력화 [adv f5]).
> Budget = **5** (pre-commit이 초과 시 commit 거부). 새 항목은 예외처럼 정당화 필요.
> design-tokens.css 는 여기 없음 — token-mode self-whitelist로 1급 처리(면제 아님) [adv f7].

- src/styles.css
- src/App.jsx
- src/Auth.jsx
- src/Onboarding.jsx
- src/main.jsx
