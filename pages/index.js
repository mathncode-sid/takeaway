export default function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h1>Takeaway</h1>
      <p>Access presentation materials and summaries</p>
      <div style={{ margin: "40px 0" }}>
        <input
          type="text"
          placeholder="Search presentations..."
          style={{ width: "300px", padding: "8px" }}
        />
      </div>
      <div>
        <span>All Types</span>
        <button style={{ marginLeft: "10px" }}>Refresh</button>
      </div>
      <div style={{ margin: "40px 0" }}>
        <p>Loading presentations...</p>
      </div>
      <a href="#" style={{ color: "blue" }}>
        Upload New Presentation
      </a>
    </div>
  );
}