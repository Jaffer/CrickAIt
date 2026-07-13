import React from 'react';

export default function PrivacyPolicyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-sm md:p-md bg-pitch-dark/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-surface-container-low border border-stadium-grey rounded-2xl shadow-2xl p-lg flex flex-col max-h-[85vh] animate-float-in">
        
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-high border border-stadium-grey flex items-center justify-center text-text-muted hover:text-on-background text-xl transition-colors font-semibold z-20"
          onClick={onClose}
          type="button"
          aria-label="Close Privacy Policy"
        >
          &times;
        </button>

        {/* Header */}
        <div className="border-b border-outline-variant/20 pb-md mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-grass-green text-3xl">shield</span>
          <div>
            <h2 className="font-headline-md text-headline-md text-xl text-on-background">Privacy Policy</h2>
            <p className="text-xs text-text-muted">Last Updated: July 13, 2026</p>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto pr-xs space-y-md text-sm text-on-surface-variant leading-relaxed">
          <p>
            Welcome to <strong>CrickAlt</strong>. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.
          </p>

          <h3 className="font-semibold text-on-background text-base mt-lg">1. Information We Collect</h3>
          <p>
            We collect personal information that you voluntarily provide to us when registering on CrickAlt, expressing an interest in obtaining information about us or our products, or when participating in activities on the application.
          </p>
          <ul className="list-disc pl-md space-y-xs">
            <li><strong>Account Data:</strong> Usernames, email addresses, display names, passwords, and custom avatars. If you sign up using a Google Account, we receive your email and public name details from Google.</li>
            <li><strong>AI Conversation Logs:</strong> Chat logs and queries you submit to the AI Cricket Assistant are stored securely to maintain session memory and enable continuity of chat threads.</li>
            <li><strong>User Preferences:</strong> Interface themes, language configurations, match formats, and personalization properties.</li>
          </ul>

          <h3 className="font-semibold text-on-background text-base mt-lg">2. How We Use Your Information</h3>
          <p>
            We use personal information collected via our application for a variety of business purposes, including:
          </p>
          <ul className="list-disc pl-md space-y-xs">
            <li>To facilitate account creation and logon processes.</li>
            <li>To customize your AI Assistant response style according to your Cricket Expertise, Response Verbosity, and preferred match formats.</li>
            <li>To safeguard our application using Cloudflare Turnstile CAPTCHA verification.</li>
            <li>To send administrative notifications, alerts, and feature updates.</li>
          </ul>

          <h3 className="font-semibold text-on-background text-base mt-lg">3. Cookies & Local Storage</h3>
          <p>
            We use local storage keys (such as auth tokens, usernames, and themes) to persist your login session and application preferences across page loads without requiring constant re-authentication. No tracking or marketing cookies are set.
          </p>

          <h3 className="font-semibold text-on-background text-base mt-lg">4. Third-Party Integrations</h3>
          <p>
            CrickAlt integrates with third-party APIs to provide live statistics and search features. This includes:
          </p>
          <ul className="list-disc pl-md space-y-xs">
            <li><strong>Tavily Search:</strong> Used to search the web for current news and articles.</li>
            <li><strong>Cricbuzz / CricAPI:</strong> Used to load live scores and schedules.</li>
            <li><strong>Cloudflare Turnstile:</strong> We use Cloudflare Turnstile to prevent automated bot registrations and secure our authentication forms. Turnstile operates invisibly and may collect telemetry data, device headers, user-agent information, IP addresses, canvas rendering metrics, and browser configurations to verify human interaction. This telemetry is transmitted to and processed by Cloudflare, Inc. in accordance with their Privacy Policy.</li>
          </ul>

          <h3 className="font-semibold text-on-background text-base mt-lg">5. Data Retention & Security</h3>
          <p>
            Your account and profile records are preserved securely in our encrypted Redis and SQLite databases. You may request account or conversation log deletion at any time by contacting our support team.
          </p>

          <h3 className="font-semibold text-on-background text-base mt-lg">6. Contact Us</h3>
          <p>
            If you have questions or comments about this policy, you may contact us at: <span className="text-grass-green font-semibold">support@crickait.com</span>.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant/20 pt-md mt-md flex justify-end">
          <button 
            onClick={onClose} 
            className="px-lg py-sm bg-grass-green text-pitch-dark font-bold rounded-xl hover:shadow-[0_0_15px_rgba(16,163,127,0.3)] transition-all active:scale-95 text-xs"
          >
            I Understand
          </button>
        </div>

      </div>
    </div>
  );
}
