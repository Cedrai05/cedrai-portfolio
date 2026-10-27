export default function BlogLoading() {
  return <div className="blog-page blog-loading" role="status" aria-label="블로그를 불러오는 중입니다">
    <div className="blog-loading__progress" />
    <div className="blog-loading__content" aria-hidden="true">
      <span className="small-label">FIELD NOTES / LOADING</span>
      <div className="blog-loading__title" />
      <div className="blog-loading__line" /><div className="blog-loading__line" />
    </div>
    <span className="visually-hidden">기록을 불러오는 중입니다.</span>
  </div>
}
