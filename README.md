# JIAN’S UNIVERSE

Jian의 작품을 한 장의 전시 페이지로 보여 줍니다. **작품은 이 GitHub 저장소에서 관리하며 Supabase·별도 데이터베이스·환경변수가 필요하지 않습니다.**

사용자의 GitHub 등록 요청에 따라 제공된 공개용 파생 자료에서 작품 9묶음, 이미지 40개, YouTube 링크 6개를 등록했습니다. 비공개 원본 ZIP과 내부 검수 기록은 포함하지 않았습니다. 원래 이미지·본문은 바이트를 바꾸지 않고 복사했고, 전사·편집 안내와 날짜 근거를 보존했습니다.

## 실행

Node.js 24와 npm을 사용합니다.

```bash
cd /workspace/jian
npm ci --cache /workspace/.cache/npm
npm run dev
```

일반 컴퓨터에서는 `npm ci`를 사용해도 됩니다. 현재 클라우드 체크아웃은 이미 격리되어 있으므로 별도 worktree가 필요하지 않습니다. 기존 `.env.local`에 `CONTENT_REVIEW_MODE=1`이 있다면 삭제하거나 0으로 바꾸면 저장소의 공개 작품을 표시합니다.

## 작품 관리

사이트의 `/admin`에서 파일 편집 링크를 열 수 있습니다. 편집은 저장소 쓰기 권한이 있는 GitHub 계정으로 진행합니다.

| 파일                                             | 수정할 내용                                              |
| ------------------------------------------------ | -------------------------------------------------------- |
| [`content/works.json`](content/works.json)       | 제목·소개·분야·자료 연도·대표 순서·본문 파일·이미지 경로 |
| [`content/*.md`](content)                        | 작품별 긴 본문과 전사·편집 안내                          |
| [`public/works/`](public/works)                  | 전시에 사용하는 썸네일과 페이지 이미지                   |
| [`content/videos.json`](content/videos.json)     | YouTube 링크와 확인된 제목                               |
| [`content/settings.json`](content/settings.json) | 효과음 허용과 모션 강도                                  |

GitHub에서 파일을 열고 연필 아이콘으로 수정한 뒤 **Commit changes**로 `main`에 저장합니다. Vercel 프로젝트를 연결해 두면 변경할 때마다 자동 재배포됩니다. 사이트 안에서 직접 저장하는 방식이 아니며, 배포 완료 후 변경 내용을 볼 수 있습니다.

### 기존 작품 수정

- `title`, `description`은 제목과 소개입니다. 본문은 해당 작품의 `content_file`이 가리키는 Markdown 파일에서 수정합니다.
- `category`는 `문학`, `과학`, `수학`, `음악`, `미술`, `발레`, `그림책`, `공예·디자인`, `사회·기획`, `앱 기획` 중 하나입니다.
- `year`가 미확인이면 `null`을 유지합니다. `provenance.date_basis`에는 실제 창작일인지, 파일 등록일·판권일인지 근거를 씁니다.
- `featured_order`는 0부터 작은 순서로 대표 작품에 표시합니다. 대표 작품에서 빼려면 `null`을 사용합니다.
- `thumbnail_url`은 `public/works/thumbnails/poems.svg` 파일의 경우 `/works/thumbnails/poems.svg`입니다. `pages`에는 본문 페이지 경로와 설명을 표시 순서대로 넣습니다.
- `motion_enabled`는 작품의 모션 사용 여부입니다.
- `is_public: false`는 전시 목록에서 숨깁니다. 이미 저장소·공개 폴더에 올린 파일의 접근 권한을 바꾸는 기능은 아니므로 비공개 자료는 넣지 않습니다.

### 새 작품 추가

1. `public/works/새-작품-id/`에 공개할 이미지를 올립니다. 파일명은 영문 소문자·숫자·하이픈을 권장합니다.
2. `content/새-작품-id.md`에 본문을 씁니다.
3. `content/works.json`의 기존 항목을 복사하고 고유한 `id`, `title`, `category`, `content_file`, `thumbnail_url`과 필요한 `pages`를 바꿉니다. 본문 파일명에는 경로 없이 `새-작품-id.md`처럼 파일명만 씁니다. 실제 파일명은 영문 소문자·숫자·하이픈으로 작성합니다.
4. 근거가 없는 날짜·출처·저작 정보는 추정하지 않습니다. 공개할 문장·사진만 등록합니다.
5. `npm test`와 빌드 검증 후 `main`에 저장하고 Vercel 배포를 확인합니다.

YouTube 링크 6개는 지정 순서를 보존했습니다. 제목을 확인했다면 `content/videos.json`의 `title`을 수정할 수 있습니다. 영상은 외부 링크로 열리며 자동 임베드·자동 재생하지 않습니다.

`content/settings.json`의 `effects_enabled`는 효과음을 허용하고, `motion_intensity`는 `off`, `gentle`, `full` 중 하나입니다. 현재 파일의 `background_id`와 `theme_id`는 `null`로 유지합니다.

## Vercel 배포

1. Vercel에서 **Add New → Project**를 열고 `codersongpro/jian` 저장소를 연결합니다.
2. Production Branch는 `main`, Framework는 Next.js, Node.js는 24로 설정합니다. 루트 디렉터리는 저장소 루트입니다.
3. 빌드는 `npm run build`이며 Output Directory는 기본값을 사용합니다. 현재 파일 기반 전시에는 환경변수가 필요 없습니다.
4. Deploy 후 `/`의 작품 9개와 `/admin`의 GitHub 편집 링크를 확인합니다.
5. 이후 main의 작품 파일 변경은 Git 연동으로 자동 배포됩니다. 이 작업에서 Vercel 프로젝트를 생성하거나 실제 배포를 실행한 것은 아닙니다.

본문 파일이 배포 서버에서도 포함되도록 Next.js의 파일 추적 설정에 `content/*.md`를 등록했습니다. 이미지는 `public/works/`에서 제공합니다.

## 모션과 사운드

첫 방문과 새 페이지는 무음입니다. 저장된 선호 설정이 있어도 사운드를 직접 켜야 재생합니다. 배경 음악·효과음·볼륨·모션 설정을 따로 보관합니다.

기본 테마 **Little Notes**는 앱에서 합성한 약 18초의 선율이며 실제 지안이 연주나 제삼자 음원이 아닙니다. 오디오 엔진은 소리를 켠 뒤 지연 로드됩니다. 모션 최소화·저사양/데이터 절약 설정을 반영하고, 탭이 숨겨지면 음악을 중지합니다.

## 검증

```bash
npm test
npm run build
npm run typecheck
npm run test:e2e
```

브라우저 테스트는 데이터베이스 없이 실제 프로덕션 서버(3000)를 대상으로 데스크톱과 모바일 Chromium을 확인합니다. 개발 서버가 같은 포트에서 실행 중이면 먼저 해당 서버를 종료합니다. 클라우드에서는 `/usr/bin/chromium`을 사용하며 다른 컴퓨터에서는 `CHROMIUM_PATH`를 지정합니다.

저장소의 실제 본문·이미지 경로, 19쪽 갤러리, 필터·날짜 미상, 외부 링크, 무음 시작·오디오 종료, GitHub 관리 링크와 비공개 검토 경로 차단을 검사합니다. 실제 iOS Safari·실기기·Vercel 배포는 별도 확인이 필요합니다.

## 원본 자료와 이전 구현

`content-bundle/`은 원래 공개 후보 ZIP을 그대로 보관하는 Git 제외 폴더입니다. 현재 공개 전시는 이 폴더 없이 동작합니다. 원본의 검수 플래그와 메모는 수정하지 않았으며, 공개용 목록에는 내부 검수 메모를 옮기지 않았습니다. 원본 후보 묶음이 없으면 그 묶음 자체를 검사하는 단위 테스트 4개만 명시적으로 스킵합니다.

`jian-private-review.zip`은 도구의 32MiB 파일 전송 한도로 다운로드하지 못했습니다. 그 안의 원본을 검수·등록한 것으로 표시하지 않습니다. 이 ZIP은 저장소와 공개 폴더에 넣지 않습니다.

이전 Supabase 관리자·미디어 API 코드는 참고용으로 남아 있으며 현재 전시와 `/admin`의 GitHub 관리에는 사용하지 않습니다. 이전 연결 절차는 [`docs/supabase-legacy.md`](docs/supabase-legacy.md)에 보관했습니다. 현재 전시를 위해 그 설정을 할 필요는 없습니다.
