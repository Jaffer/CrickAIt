export default function UpgradeModal({ onClose, onShowAlert }) {
  const plan = localStorage.getItem('crickait_plan') || 'free';

  const initiateUpgrade = () => {
    onShowAlert({
      title: 'Notification',
      message: 'Payment gateway integration (Stripe) is pending. Upgrade unavailable at this time.'
    });
  };

  return (
    <div className="modal" style={{ display: 'flex' }}>
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3>Upgrade Your Plan</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="upgrade-grid">
            <div className={`upgrade-card ${plan === 'free' || plan === 'guest' ? 'current' : ''}`}>
              <h4>Free Plan</h4>
              <div className="price">$0<span>/month</span></div>
              <p className="plan-desc">Standard access to cricket assistant.</p>
              <ul>
                <li><i className="fa-solid fa-check"></i> Standard response speeds</li>
                <li><i className="fa-solid fa-check"></i> 100 Messages / Day limit</li>
                <li><i className="fa-solid fa-check"></i> Llama-3.1 8B Model</li>
                <li><i className="fa-solid fa-check"></i> Live scores & news</li>
              </ul>
              <button className="btn-plan current" disabled>Current Plan</button>
            </div>
            <div className={`upgrade-card pro ${plan === 'pro' ? 'current' : ''}`}>
              <div className="badge">POPULAR</div>
              <h4>CrickAIt Pro</h4>
              <div className="price">$15<span>/month</span></div>
              <p className="plan-desc">Unleash the full expert model power.</p>
              <ul>
                <li><i className="fa-solid fa-check"></i> Fast priority responses</li>
                <li><i className="fa-solid fa-check"></i> Llama-3.3 70B Expert Engine</li>
                <li><i className="fa-solid fa-check"></i> Deep match score analysis</li>
                <li><i className="fa-solid fa-check"></i> Unlimited questions</li>
              </ul>
              {plan === 'pro' ? (
                <button className="btn-plan current" disabled>Current Plan</button>
              ) : (
                <button className="btn-plan upgrade" onClick={initiateUpgrade}>Upgrade Now</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
