/**
 * 지안 작품 수신함 큰 사진 자동 줄이기 (Google Apps Script)
 *
 * Claude가 쓰는 Drive 커넥터는 약 5MB가 넘는 파일을 받지 못합니다.
 * 이 스크립트를 보호자 구글 계정에서 5분마다 가볍게 확인해, 큰 사진이 있고 업로드가 끝났으면(마지막 업로드 뒤 5분)
 * 긴 변 2048px JPEG로 줄인 사본으로 바꿉니다. 웹앱 주소를 열면 기다리지 않고 바로 줄입니다.
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
const SETTLE_MS = 5 * 60 * 1000; // 마지막 업로드 뒤 이만큼 새 파일이 없으면 업로드가 끝난 것으로 봄

/** 5분마다 실행: 큰 사진이 없거나 아직 올리는 중이면 바로 끝내고, 업로드가 끝났으면 줄인다. */
function checkInbox() {
  let large = 0;
  let newest = 0;
  forEachFile_(DriveApp.getFolderById(INBOX_ID), (file) => {
    newest = Math.max(newest, file.getDateCreated().getTime());
    if (file.getMimeType().indexOf('image/') === 0 && file.getSize() > LIMIT_BYTES) large++;
  });
  if (!large) return; // 줄일 사진 없음
  if (Date.now() - newest < SETTLE_MS) return console.log(`큰 사진 ${large}장, 아직 올리는 중 → 다음 확인 때 처리`);
  resizeLargePhotos();
}

/** 큰 사진을 모두 줄인다. 웹앱 주소나 편집기에서 실행하면 업로드가 끝나기를 기다리지 않는다. */
function resizeLargePhotos() {
  // 5분 자동 확인과 웹앱 실행이 겹쳐 같은 사진의 사본이 두 번 생기지 않도록 한 번에 하나만 실행
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return '다른 실행이 진행 중입니다. 잠시 뒤 다시 시도해 주세요.';
  try {
    return resizeAll_();
  } finally {
    lock.releaseLock();
  }
}

/** 웹앱 주소를 열면 바로 실행하고 결과를 보여 줍니다 (요청할 때 실행). */
function doGet() {
  const message = resizeLargePhotos();
  const html = '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<div style="font:16px/1.6 sans-serif;padding:24px;white-space:pre-line">' +
    '<b>지안 수신함 사진 줄이기</b>\n' + escapeHtml_(message) + '</div>';
  return HtmlService.createHtmlOutput(html).setTitle('수신함 사진 줄이기');
}

function resizeAll_() {
  const inbox = DriveApp.getFolderById(INBOX_ID);
  const archive = archiveFolder_(inbox);
  const done = [];
  forEachPhoto_(inbox, (file, parent) => {
    if (file.getSize() <= LIMIT_BYTES) return;
    const copy = resizeOne_(file, parent);
    if (!copy) return; // 썸네일이 아직 준비되지 않음 → 다음 확인 때 다시 시도
    file.moveTo(archive);
    done.push(`${file.getName()} → ${Math.round(copy.getSize() / 1024)}KB`);
  });
  const message = done.length ? `줄인 사진 ${done.length}장\n${done.join('\n')}` : '줄일 사진 없음';
  console.log(message);
  return message;
}

function escapeHtml_(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** 처음 한 번만 실행: 5분마다 checkInbox가 돌도록 등록 (예전 예약은 지움) */
function install() {
  ScriptApp.getProjectTriggers()
    .filter((t) => ['checkInbox', 'resizeLargePhotos'].indexOf(t.getHandlerFunction()) !== -1)
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkInbox').timeBased().everyMinutes(5).create();
  console.log(resizeLargePhotos());
}

/** 수신함과 하위 폴더(반영 완료·원본 보관 제외)의 파일마다 fn 실행 */
function forEachFile_(folder, fn) {
  const files = folder.getFiles();
  while (files.hasNext()) fn(files.next(), folder);
  const subs = folder.getFolders();
  while (subs.hasNext()) {
    const sub = subs.next();
    if (SKIP_FOLDERS.indexOf(sub.getName()) === -1) forEachFile_(sub, fn);
  }
}

/** 이미지 파일만 */
function forEachPhoto_(folder, fn) {
  forEachFile_(folder, (file, parent) => {
    if (file.getMimeType().indexOf('image/') === 0) fn(file, parent);
  });
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
