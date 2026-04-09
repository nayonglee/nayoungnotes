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
        <h1>Offline, but your drafts can still glow.</h1>
        <p>Nayoung Notes keeps local drafts in IndexedDB and syncs them when your connection returns.</p>
      </section>
    </main>
  );
}
