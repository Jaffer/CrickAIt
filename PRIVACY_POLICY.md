# Privacy Policy for CrickAlt

**Last Updated: July 13, 2026**

CrickAlt ("we", "our", or "us") respects the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit and use our web application, CrickAlt.

Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access or use the application.

---

## 1. Information We Collect

We collect information directly from you when you register, configure your assistant settings, or interact with our multi-agent chatbot.

### A. Personal Data
* **Account Credentials**: Usernames, email addresses, display names, and password hashes.
* **Google OAuth Data**: If you sign up using "Continue with Google", we collect your Google email address and public name details.
* **User Profile Customizations**: Preferences like Cricket Expertise, Response Verbosity, preferred match formats, language settings, and interface themes.

### B. Conversation and AI Logs
* **Chat History**: Text queries, questions, and responses processed by the LangGraph agents are saved securely in SQLite and backed up in Redis to provide thread memory.

### C. Session & Device Identifiers
* **Local Storage & Session Tokens**: We store authorization bearer tokens, active usernames, and interface settings locally on your browser.
* **Rate-Limit Logs**: IP addresses or account usage stats stored in Redis to track query limits (Free = 100/day, Guest = 20/day).

---

## 2. How We Use Your Information

We use the collected information for the following purposes:
1. **Account Management**: To facilitate login, verify identities, and manage active sessions.
2. **AI Personalization**: To route requests and tailor answers based on your profile configurations.
3. **Application Security**: To prevent abuse and spam registrations using Cloudflare Turnstile CAPTCHA verification.
4. **Data Verification**: To process live scores and match statistics retrieved from external public feeds.

---

## 3. Third-Party Integrations & APIs

We share data only with the minimum necessary integrations required for application features:
* **Tavily / Wikipedia Search**: Chat queries are analyzed to fetch web resources when querying latest cricket trends.
* **CricAPI / Cricbuzz**: Used to read public live match details.
* **Cloudflare Turnstile**: Standard invisible security challenges are loaded from Cloudflare servers. Turnstile gathers telemetry data (such as user-agent data, browser metrics, IP addresses, canvas fingerprint tokens, and interactive events) to evaluate if requests originate from humans rather than automated spam engines. Telemetry transmission and processing is governed by the Cloudflare Privacy Policy.

---

## 4. Cookies & Browser Storage

We do not run advertising or marketing cookies. We use standard browser LocalStorage to keep you logged in and preserve your dark mode or interface language preferences across browser restarts.

---

## 5. Security & Retention

All user and session records are stored on secure SQLite databases backed by a Redis client layer. Security credentials are cryptographically hashed. We retain your chat logs and settings until you request account deletion.

---

## 6. Your Rights & Contacts

You may delete your profile, wipe your chat sessions, or adjust account details directly in the **Settings** panel under "Account & Data".

For any questions regarding this policy, contact us at: **support@crickait.com**
