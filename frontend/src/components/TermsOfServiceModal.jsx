import React from 'react';

export default function TermsOfServiceModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-sm md:p-md bg-pitch-dark/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-surface-container-low border border-stadium-grey rounded-2xl shadow-2xl p-lg flex flex-col max-h-[85vh] animate-float-in">
        
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-high border border-stadium-grey flex items-center justify-center text-text-muted hover:text-on-background text-xl transition-colors font-semibold z-20"
          onClick={onClose}
          type="button"
          aria-label="Close Terms of Service"
        >
          &times;
        </button>

        {/* Header */}
        <div className="border-b border-outline-variant/20 pb-md mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-trophy-gold text-3xl">gavel</span>
          <div>
            <h2 className="font-headline-md text-headline-md text-xl text-on-background">User Terms / Agreement (ToS)</h2>
            <p className="text-xs text-text-muted">Last Updated: July 13, 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto pr-xs space-y-md text-sm text-on-surface-variant leading-relaxed">
          <p>
            Welcome to <strong>CrickAlt</strong>. These User Terms / Agreement ("Terms", "Agreement") govern your access to and use of the CrickAlt web application, AI Chatbot Assistant, and live statistic scoreboards.
          </p>
          <p className="text-xs text-text-muted font-semibold">
            By creating an account, checking the agreement box, or accessing our services, you agree to be bound by this Agreement.
          </p>

          <h3 className="font-semibold text-on-background text-base mt-lg">1. User Accounts and Eligibility</h3>
          <p>
            You must be at least 13 years of age to register for an account. You agree to provide accurate, current, and complete registration information (username, email, password) and maintain the confidentiality of your account credentials.
          </p>

          <h3 className="font-semibold text-on-background text-base mt-lg">2. Acceptable Use and Restrictions</h3>
          <p>
            You agree to use CrickAlt only for lawful purposes. You are strictly prohibited from:
          </p>
          <ul className="list-disc pl-md space-y-xs">
            <li>Attempting to scrape, reverse engineer, or systematically query our proprietary database or LLM endpoints.</li>
            <li>Using automated scripts, bots, or software tools to submit messages or queries.</li>
            <li>Bypassing session token checks, Turnstile CAPTCHA security parameters, or rate limit headers.</li>
          </ul>

          <h3 className="font-semibold text-on-background text-base mt-lg">3. Service Rate Limits and Plans</h3>
          <p>
            CrickAlt operates on a tiered usage structure to prevent API abuse and resource exhaustion:
          </p>
          <ul className="list-disc pl-md space-y-xs">
            <li><strong>Free Registered Users:</strong> Capped at 100 AI queries/day.</li>
            <li><strong>Guest Users:</strong> Capped at 20 AI queries/day.</li>
            <li><strong>Pro Subscribed Users:</strong> Unlimited queries subject to our fair use guidelines.</li>
          </ul>
          <p>
            We reserve the right to temporarily suspend accounts or restrict IPs that violate these limits or engage in rapid, high-frequency querying.
          </p>

          <h3 className="font-semibold text-on-background text-base mt-lg">4. AI-Generated Content Disclaimer</h3>
          <p>
            All summaries, stats analysis, probability graphs, and answers rendered by the CrickAlt assistant are generated via advanced LLM agents (FastAPI + LangGraph) processing public feeds.
          </p>
          <p className="font-bold text-trophy-gold bg-trophy-gold/5 p-sm rounded-lg border border-trophy-gold/20">
            DISCLAIMER: AI-generated reports are strictly for informational and entertainment purposes. CrickAlt does not provide official sports betting advice, financial guidance, or certified historic match records. We are not liable for any losses incurred due to reliance on AI-predicted outcomes.
          </p>

          <h3 className="font-semibold text-on-background text-base mt-lg">5. Intellectual Property</h3>
          <p>
            All application code, UI designs, brand logos (CrickAlt), dynamic charts, and backend integrations are owned by or licensed to CrickAlt. User-submitted chat questions remain the property of the user, but you grant us a license to process queries through our LLM nodes to provide responses.
          </p>

          <h3 className="font-semibold text-on-background text-base mt-lg">6. Limitation of Liability</h3>
          <p>
            CRICKALT AND ITS AGENTS ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF THE CHATBOT OR LIVE FEED PREVIEWS.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant/20 pt-md mt-md flex justify-end">
          <button 
            onClick={onClose} 
            className="px-lg py-sm bg-grass-green text-pitch-dark font-bold rounded-xl hover:shadow-[0_0_15px_rgba(16,163,127,0.3)] transition-all active:scale-95 text-xs"
          >
            I Accept
          </button>
        </div>

      </div>
    </div>
  );
}
