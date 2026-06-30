# Design Contract — life-os-quest

> UI 작업 시작 전 필수. 모든 값이 채워지기 전까지 UI 파일 Write BLOCK.
> SP1 = enforcement foundation. UI 출력 변경 없음(그대로). 토큰은 src/design-tokens.css (additive @theme).

## Primary Action:
사용자가 자신의 맞춤 러닝 플랜에서 오늘의 미션을 확인하고 운동을 시작한다.

## Reference URL:
https://www.nike.com/nrc-app

## Accent Color:
#00d7c0

## Font Family:
Inter, Pretendard

## Layout Structure (SOP §3):
- Hero: 대시보드 헤더 (오늘의 미션 + 진행률)
- Feature sections: 1 (플랜/주차 카드 Z-pattern)
- Showcase sections: N/A (대시보드형 — W/B 교차 미적용)

## Notes:
Live running-test product (운동 > 런닝). 기존 198+ default-palette JSX 사용처는 grandfather, 신규/수정 파일만 token-mode 강제.
