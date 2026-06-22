# 믿음 기반 창작 점수 적립 MVP

친구끼리 SNS 창작물 공개 습관을 만들기 위한 React 웹앱입니다. SNS 공개 여부를 검증하지 않고, 입력한 URL은 플랫폼과 콘텐츠 유형을 자동 분류하고 기록하기 위한 용도로만 사용합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 로컬 주소를 열면 됩니다.

## 주요 구조

- `src/App.tsx`: 전체 화면, 입력 폼, 목록, 설정, 보상 사용 UI
- `src/lib/storage.ts`: localStorage 저장소. 나중에 Supabase/Firebase로 바꿀 때 이 계층부터 교체하면 됩니다.
- `src/lib/classify.ts`: URL 기반 플랫폼/콘텐츠 유형 자동 분류
- `src/lib/calculations.ts`: 점수, 보상 금액, 주간 성공 계산
- `src/lib/defaults.ts`: 기본 참여자와 기본 점수표

## 수동 확인 체크리스트

- `instagram.com/stories` 입력 시 스토리로 분류되는지 확인
- `instagram.com/p` 입력 시 게시물로 분류되는지 확인
- `instagram.com/reel`, `youtube.com/shorts`, `tiktok.com` 입력 시 숏폼 영상으로 분류되는지 확인
- `youtube.com/watch`, `youtu.be` 입력 시 긴 영상으로 분류되는지 확인
- 알 수 없는 URL 또는 빈 URL에서 콘텐츠 유형을 직접 선택할 수 있는지 확인
- 콘텐츠 유형에서 `기타/직접 입력`을 선택하면 형식 이름, 점수, 설명 입력칸이 보이는지 확인
- 기타 기록에서 형식 이름과 0보다 큰 점수를 입력하면 저장되고 누적 점수에 반영되는지 확인
- 기타 기록의 점수가 비어 있거나 0 이하이면 저장되지 않는지 확인
- 기타 기록이 기록 목록에서 사용자가 입력한 형식 이름으로 보이는지 확인
- 점수 설정 변경 후 새 기록에는 새 점수가 적용되고 기존 기록 점수는 유지되는지 확인
- 사용 안 함 처리한 점수 유형이 기록 작성 선택 목록에서 사라지는지 확인
- 이번 주 기록이 있는 참여자가 이번 주 성공으로 표시되는지 확인
- 남은 점수가 10점 미만일 때 보상 사용 버튼이 비활성화되는지 확인
- 50,000원 사용 시 5점이 차감되는지 확인
- 35,000원 사용 시 3.5점이 자동 계산되는지 확인
- 보상 사용 저장 후 총 사용 점수가 늘고 남은 점수가 줄어드는지 확인
- 사용하려는 점수가 남은 점수보다 크면 저장되지 않는지 확인
- 새로고침 후 localStorage 데이터가 유지되는지 확인

## Google Sheets 연동

친구들과 같은 데이터를 보려면 Google Sheets + Apps Script 웹앱을 사용합니다.

1. Google Sheets에서 새 스프레드시트를 만듭니다.
2. 메뉴에서 `확장 프로그램 > Apps Script`를 엽니다.
3. `google-apps-script/Code.gs` 내용을 Apps Script 편집기에 붙여넣습니다.
4. Apps Script에서 `Deploy > New deployment > Web app`을 선택합니다.
5. 실행 계정은 `Me`, 접근 권한은 친구가 쓸 수 있게 `Anyone with the link`로 설정합니다.
6. 배포 후 나온 `/exec` URL을 앱의 `연동 설정` 탭에 붙여넣습니다.
7. `현재 데이터를 Sheets에 올리기`를 한 번 누른 뒤 `Sheets 연동 켜기`를 누릅니다.

친구에게는 Apps Script URL이 아니라 Vercel/Netlify에 배포된 앱 URL을 보내면 됩니다.

주의: 이 방식은 친구 3-4명 규모의 믿음 기반 MVP에 맞춘 단순 연동입니다. Apps Script URL을 아는 사람은 기록을 저장할 수 있으니 링크는 친구에게만 공유하세요.