/**
 * 지안 작품 수신함 큰 사진 자동 줄이기 (Google Apps Script)
 *
 * Claude가 쓰는 Drive 커넥터는 약 5MB가 넘는 파일을 받지 못합니다.
 * 이 스크립트를 보호자 구글 계정에서 10분마다 돌려, 수신함에 올라온 큰 사진을
 * 긴 변 2048px JPEG로 줄인 사본으로 바꿉니다.
 *
 * - 사본은 원본과 같은 폴더·같은 이름(확장자만 .jpg)으로 만듭니다. 폴더 이름·파일 이름 메모가 그대로 유지됩니다.
 * - 줄이면 사진 속 촬영 정보(EXIF)가 사라지므로, 촬영 시각·좌표·원래 업로드 시각을
 *   사본의 '설명'에 적어 둡니다. 설명은 비공개 드라이브 안에만 있고, 사이트에는 시·군 이름만 공개됩니다.
 * - 원본은 수신함 안 「원본 보관」 폴더로 옮깁니다(삭제하지 않음).
 *
 * 설치 방법: docs/drive-inbox-resizer.md
 */

const INBOX_ID = '1GuDjTa-1lJQDNlxpdgtpz2G4eCQvHmO-'; // 지안 작품 수신함
const SKIP_FOLDERS = ['반영 완료', '원본 보관'];
const ARCHIVE_NAME = '원본 보관';
const LIMIT_BYTES = 4.5 * 1024 * 1024; // 이보다 크면 줄임 (커넥터 한도 약 5MB보다 여유 있게)
const TARGET_PX = 2048; // 줄인 사진의 긴 변
const MARK = 'jian-resize v1 '; // 사본 설명 앞머리. Claude가 이 표시로 사본을 알아봅니다.

/** 10분마다 실행되는 본 작업. 직접 실행해도 됩니다. */
function resizeLargePhotos() {
  const inbox = DriveApp.getFolderById(INBOX_ID);
  const archive = archiveFolder_(inbox);
  const done = [];
  forEachPhoto_(inbox, (file, parent) => {
    if (file.getSize() <= LIMIT_BYTES) return;
    const copy = resizeOne_(file, parent);
    if (!copy) return; // 썸네일이 아직 준비되지 않음 → 다음 실행 때 다시 시도
    file.moveTo(archive);
    done.push(`${file.getName()} → ${Math.round(copy.getSize() / 1024)}KB`);
  });
  console.log(done.length ? `줄인 사진 ${done.length}장\n${done.join('\n')}` : '줄일 사진 없음');
}

/** 처음 한 번만 실행: 10분마다 resizeLargePhotos가 돌도록 등록 */
function install() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'resizeLargePhotos')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('resizeLargePhotos').timeBased().everyMinutes(10).create();
  resizeLargePhotos();
}

/** 수신함과 하위 폴더(반영 완료·원본 보관 제외)의 이미지 파일마다 fn 실행 */
function forEachPhoto_(folder, fn) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType().indexOf('image/') === 0) fn(file, folder);
  }
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const sub = subs.next();
    if (SKIP_FOLDERS.indexOf(sub.getName()) === -1) forEachPhoto_(sub, fn);
  }
}

/** 사진 1장을 줄인 사본으로 만든다. 실패하면 null */
function resizeOne_(file, parent) {
  const meta = driveApi_(file.getId(), 'thumbnailLink,imageMediaMetadata,createdTime');
  if (!meta || !meta.thumbnailLink) return null;
  // 드라이브 썸네일 주소의 크기(=s220)만 바꿔 큰 사진을 받는다. 회전은 이미 반영되어 있음
  const url = meta.thumbnailLink.replace(/=s\d+(-c)?$/, '') + '=s' + TARGET_PX;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return null;
  const base = file.getName().replace(/\.[^.]+$/, '');
  const blob = res.getBlob().setName(base + '.jpg');
  const img = meta.imageMediaMetadata || {};
  const info = {
    from: file.getId(),
    uploaded: meta.createdTime, // 폴더 안 사진 순서(먼저 올린 사진이 대표)를 지키기 위해 기록
    taken: img.time || null, // 예: 2026:01:06 23:12:00
    lat: img.location ? img.location.latitude : null,
    lng: img.location ? img.location.longitude : null,
  };
  const copy = parent.createFile(blob);
  copy.setDescription(MARK + JSON.stringify(info));
  return copy;
}

function driveApi_(id, fields) {
  const res = UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' + id + '?fields=' + encodeURIComponent(fields),
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true },
  );
  return res.getResponseCode() === 200 ? JSON.parse(res.getContentText()) : null;
}

function archiveFolder_(inbox) {
  const found = inbox.getFoldersByName(ARCHIVE_NAME);
  return found.hasNext() ? found.next() : inbox.createFolder(ARCHIVE_NAME);
}
