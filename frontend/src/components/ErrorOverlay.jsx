export default function ErrorOverlay({ type = 'duck', message, onClose }) {
  const isDuck = type === 'duck';
  const defaultMsg = isDuck 
    ? "You've been caught behind the crease! This page or data seems to have taken an unscheduled drinks break."
    : "The server encountered an unexpected glitch. Please check back soon or try reloading.";

  return (
    <div className="error-overlay" style={{ display: 'flex' }}>
      <div className="error-content">
        <img src={isDuck ? "/duck_out.png" : "/wicket_out.png"} alt="Error Graphic" />
        <h2>{isDuck ? "DUCK OUT!" : "WICKET DOWN"}</h2>
        <p>{message || defaultMsg}</p>
        <button className="auth-submit-btn" onClick={onClose} style={{ width: 'auto', padding: '10px 30px' }}>Dismiss</button>
      </div>
    </div>
  );
}
