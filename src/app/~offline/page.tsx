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
        <h1>You&apos;re offline.</h1>
        <p>Drafts stay on this device and will sync again when the connection returns.</p>
      </section>
    </main>
  );
}
