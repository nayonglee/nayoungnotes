export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        textAlign: "center"
      }}
    >
      <section>
        <h1>오프라인 상태입니다.</h1>
        <p>초안은 기기에 저장되고, 연결이 돌아오면 다시 동기화됩니다.</p>
      </section>
    </main>
  );
}
