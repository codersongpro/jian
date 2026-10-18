import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";
import { repositoryEntries } from "@/lib/repository";
export const metadata: Metadata = {
  title: "전시 관리 — JIAN’S UNIVERSE",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  const repository = "https://github.com/codersongpro/jian";
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a href="/" className="text-link">
          <ArrowLeft size={15} /> 전시실로
        </a>
        <span className="eyebrow">CURATOR’S DESK</span>
      </header>
      <main className="admin-main repository-admin">
        <div className="eyebrow">LITTLE WONDERS, KEPT TOGETHER</div>
        <h1>GitHub로 작품 관리</h1>
        <p className="admin-intro">
          작품과 이야기를 파일로 보관하고, 새로운 전시에 담아요.
        </p>
        <section className="setup-card">
          <span className="setup-icon">
            <BookOpen size={28} />
          </span>
          <h2>수정하고, 저장하고, 다시 전시해요.</h2>
          <ol>
            <li>아래 링크로 GitHub에 로그인하고 작품 파일을 수정합니다.</li>
            <li>
              <strong>Commit changes</strong>로 main 브랜치에 저장합니다.
            </li>
            <li>
              Vercel을 저장소에 연결하면 변경할 때마다 자동으로 재배포됩니다.
            </li>
          </ol>
          <div className="repository-actions">
            <a
              className="primary-button"
              href={`${repository}/edit/main/content/works.json`}
              target="_blank"
              rel="noopener noreferrer"
            >
              작품 목록 편집 <ArrowUpRight size={15} />
            </a>
            <a
              className="text-link"
              href={`${repository}/upload/main/public/works`}
              target="_blank"
              rel="noopener noreferrer"
            >
              이미지 추가 <ArrowUpRight size={14} />
            </a>
            <a
              className="text-link"
              href={`${repository}/edit/main/content/videos.json`}
              target="_blank"
              rel="noopener noreferrer"
            >
              영상 링크 편집 <ArrowUpRight size={14} />
            </a>
            <a
              className="text-link"
              href={`${repository}/edit/main/content/settings.json`}
              target="_blank"
              rel="noopener noreferrer"
            >
              감상 설정 편집 <ArrowUpRight size={14} />
            </a>
          </div>
          <p className="admin-hint">
            파일 편집은 저장소 쓰기 권한이 있는 GitHub 계정으로 진행합니다. 변경
            내용은 Vercel 배포가 끝나면 전시에 반영됩니다.
          </p>
        </section>
        <section
          className="repository-works"
          aria-labelledby="repository-works-title"
        >
          <h2 id="repository-works-title">이야기를 다듬는 곳</h2>
          <p className="admin-hint">
            제목·분야·순서는 작품 목록에서, 긴 본문은 아래 작품별 파일에서
            수정합니다.
          </p>
          <div className="repository-work-grid">
            {repositoryEntries.map((work) => (
              <article key={work.id}>
                <span className="eyebrow">
                  {work.category} · {work.year ?? "제작일 미확인"}
                </span>
                <h3>{work.title}</h3>
                <a
                  className="text-link"
                  href={`${repository}/edit/main/content/${encodeURIComponent(work.content_file)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  작품 본문 편집 <ArrowUpRight size={14} />
                </a>
              </article>
            ))}
          </div>
          <a
            className="text-link"
            href={`${repository}/blob/main/README.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            작품 추가·수정 안내 <ArrowUpRight size={14} />
          </a>
        </section>
      </main>
    </div>
  );
}
