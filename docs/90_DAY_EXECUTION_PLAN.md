# 90-Day Execution Plan

## 1. Executive Summary
This document serves as the master execution plan for CrickAIt over the next 90 days. It synthesizes all approved product, architectural, and conversion strategies into a unified engineering roadmap. The singular goal of this quarter is to prepare the platform for a high-concurrency public Beta Launch, centered around a frictionless, freemium "AI Match Intelligence" experience that aggressively converts visitors into registered users. No new features beyond the approved scope will be introduced.

---

## 2. Objectives
- **Beta Launch:** Successfully launch a public beta capable of supporting 10,000 concurrent users during a live T20 match.
- **Retention:** Achieve >45 minutes Time-on-Page during live match sessions.
- **Growth (Activation):** Reach a 60% visitor-to-match-open rate through the "Show, Don't Tell" homepage redesign.
- **Monetization (Conversion):** Convert >15% of visitors into registered users by gating only high-intent actions (e.g., Ask AI chat).
- **Reliability:** Maintain sub-200ms latency for all structural API endpoints and implement streaming (SSE) to mask LLM generation times.

---

## 3. 90-Day Timeline (Week-by-Week Milestones)

| Week | Phase | Focus |
| :--- | :--- | :--- |
| **Week 1** | Freemium Core | Remove `AuthOverlay` login wall; enable unauthenticated API access for live scores. |
| **Week 2** | Conversion Funnel | Build Chat Input signup trigger and state rehydration flow. |
| **Week 3** | UX & Analytics | Redesign Homepage with Live Match Carousel; inject PostHog/Vercel tracking. |
| **Week 4** | Performance | Implement Redis TTL caching for `/scorecard/{match_id}/intelligence`. |
| **Week 5** | AI Enhancements | Transition Chat and Intelligence endpoints to SSE (Server-Sent Events) for streaming. |
| **Week 6** | Data Fidelity | Upgrade `LiveTimeline` to support ball-by-ball data instead of only dismissals. |
| **Week 7** | Engagement | Add contextual "Ask AI" buttons directly onto Tactical Insight cards. |
| **Week 8** | Fantasy MVP Prep | Integrate Fantasy data hooks into `KeyBattlesCard`. |
| **Week 9** | Infrastructure | Kubernetes Probes (`/healthz`), horizontal scaling configuration. |
| **Week 10** | Load Testing | Execute simulated 10k concurrent user load test on PostgreSQL and LLM endpoints. |
| **Week 11** | Polish & Bug Bash | Resolve all critical/high UX issues identified in the Product Validation Report. |
| **Week 12** | Beta Launch | Final sign-off, marketing launch, and live monitoring. |

---

## 4. Engineering Tasks

### Backend
- **W1:** Update middleware/auth logic to permit guest read-access to `/scorecard` and `/intelligence` endpoints without Bearer tokens.
- **W4:** Wrap `intelligence_node` responses in a Redis cache layer (3-minute TTL) to prevent duplicate LLM calls for concurrent users watching the same match.
- **W5:** Refactor LangGraph invocation in `/ask` and `/intelligence` to yield Server-Sent Events (SSE) for streaming text.
- **W9:** Implement standard `/healthz` and `/readyz` endpoints for infrastructure orchestrators.

### Frontend
- **W1:** Remove global `AuthOverlay` blocking `AppLayout`. Ensure `MatchIntelligenceCenter` renders for guests.
- **W2:** Create `SignupModal.jsx`. Bind it to `onClick` on the `<ChatInterface>` input. Implement logic to save typed text, handle Google Auth, and auto-send post-redirect.
- **W3:** Overhaul `AppLayout.jsx` homepage to prioritize the `LiveMatchCarousel` above the fold.
- **W7:** Add "Discuss this" micro-buttons to `TacticalInsightCard.jsx` that pre-fill the chat input.

### AI
- **W6:** Refine prompts in `intelligence_node.py` to minimize hallucinations and strictly enforce JSON output limits to reduce generation latency.
- **W8:** Extend `AgentState` and prompt templates to explicitly consider a user's fantasy team preferences when generating `KeyBattles`.

### Infrastructure & QA
- **W3:** Setup PostHog/Vercel Analytics event pipelines (`match_opened`, `ask_ai_click`, `signup_complete`).
- **W10:** Write Locust/K6 load-testing scripts simulating 10k users polling the intelligence endpoints.
- **Continuous:** Ensure existing automated tests (Pytest) and regression tests pass for all UI modifications.

---

## 5. Dependencies
- **Must finish first:** The Auth wall removal (W1) MUST precede the Signup Trigger (W2). Without the wall removed, the trigger is useless.
- **Must finish first:** Redis caching (W4) MUST precede Load Testing (W10). The LLM APIs will rate-limit or fail spectacularly without caching.
- **Parallel Execution:** Frontend UI polish (W3, W7) can run entirely in parallel with Backend infrastructure tasks (W4, W5, W9).

---

## 6. Deliverables
- **End of W1:** A public URL where anyone can view live cricket intelligence without an account.
- **End of W2:** A fully functional, frictionless signup flow triggered *only* by chat interaction.
- **End of W4:** API response times for Intelligence drop from >5s to <200ms on cache hits.
- **End of W12:** A stable, production-ready SaaS application processing live sports data at scale.

---

## 7. Acceptance Criteria (Definition of Done)
- **Code:** PR reviewed, merged, and deployed to staging.
- **Testing:** Automated tests pass; manual QA verifies expected behavior on Desktop, iOS, and Android.
- **UX:** No UI jank, layout shifts, or unhandled loading states.
- **Performance:** Does not introduce any memory leaks (PostgreSQL connections must be properly returned to the pool).

---

## 8. Risk Register

| Blocker / Risk | Mitigation | Owner | Priority |
| :--- | :--- | :--- | :--- |
| **LLM Latency & API Costs** | Implement strict Redis TTL caching so only 1 LLM call is made per 3 minutes per match, regardless of user count. | Backend Lead | CRITICAL |
| **PostgreSQL Connection Exhaustion**| `asyncpg.Pool` is implemented. Must enforce strict `max_size` and load test heavily. | Infrastructure Lead | HIGH |
| **CricAPI Rate Limiting** | Route all external API calls through a single background worker that caches data locally. | Backend Lead | HIGH |
| **Guest UI Confusion** | Ensure the chat input placeholder clearly states "Sign up to ask AI" so guests understand the limitation. | UX Designer | MEDIUM |

---

## 9. Beta Launch Checklist
- [ ] Redis caching implemented for all LLM and external API calls.
- [ ] Load test passed for 10,000 concurrent sessions.
- [ ] PostgreSQL backups automated and verified.
- [ ] Freemium funnel complete (Landing -> Intelligence Center -> Chat Signup).
- [ ] Mobile layouts verified across standard viewports (iPhone SE to Pro Max).
- [ ] Global `AuthOverlay` disabled for `GET` routes.
- [ ] SSE streaming operational for chat.

---

## 10. Success Metrics
- **Activation:** Visitor-to-Match-Open Rate > 60%.
- **Signup Conversion:** Visitor-to-Signup Rate > 15%.
- **Retention:** Day 1 Retention > 40%.
- **Session Length:** Average > 25 minutes per session.
- **AI Questions:** Average > 2.5 questions asked per authenticated user.
- **Guest Engagement:** Guests spending > 5 minutes reading insights before bouncing or converting.

---

## 11. Investor Demo Checklist (Under 5 Minutes)
**The exact flow for a live demo:**
1. **[0:00-0:30] The Hook:** Open CrickAIt.com in an incognito window. Point out the absence of a login wall. The page instantly displays active live matches.
2. **[0:30-1:30] The "Aha!" Moment:** Click on a live match (e.g., India vs Australia). The AI Match Intelligence Center loads. Read the AI Match Story aloud. Show the live Win Probability meter.
3. **[1:30-2:30] The Tactical Edge:** Scroll down to the Tactical Insight Card. Point out that generic AIs (ChatGPT) cannot generate real-time tactical advice based on a ball bowled 5 seconds ago.
4. **[2:30-3:30] The Conversion Trigger:** Act as a curious fan. Type *"Why is Kohli struggling against Cummins?"* into the Chat box and hit Enter. The sleek Signup Modal appears: *"Join the Conversation to Ask AI."*
5. **[3:30-4:30] Frictionless Value:** Click "Continue with Google." Log in instantly. The chat automatically sends the typed question, and the LLM streams back a deeply analytical, stats-backed answer.
6. **[4:30-5:00] The Close:** Conclude by highlighting the seamless integration of raw sports data, generative AI, and frictionless user acquisition.
