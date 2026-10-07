# Beta 01 Changelog

## 🚀 Freemium Conversion & Guest Mode Implemented

We have successfully completed the primary milestone for the Beta launch, fully transitioning the product from a login-first application to a value-first freemium application.

### 📝 Modified Files
- `frontend/src/App.jsx`: Removed the global `AuthOverlay` blocking the application. Set initial state of `authMode` to `'hidden'`, allowing unauthenticated users to enter `AppLayout` immediately. Added a conditional inline `AuthOverlay` modal triggered only for high-intent actions.
- `frontend/src/components/AppLayout.jsx`: Passed down `isAuthenticated` and `onSignupTrigger` to the rest of the application.
- `frontend/src/components/ChatInterface.jsx`: Restricted the chat input and mock query cards for unauthenticated users. Clicking the chat input or a mock query now intercepts the event and pops up the `AuthOverlay`. Added dynamic placeholder text.
- `frontend/src/components/AuthOverlay.jsx`: Added support for an `isInlineModal` prop to render just the authentication dialog without the background hero sections, acting as a clean pop-up over the existing app state. Also added an `onClose` callback to allow guests to dismiss the prompt.
- `frontend/src/components/MatchIntelligenceCenter.jsx`: Removed the `plan === 'guest'` artificial block that was hiding the scorecard and AI intelligence.
- `backend/app/api/live_scores.py`: Removed the strict `Depends(get_current_user)` requirements for `/scores`, `/scorecard/{match_id}`, and `/scorecard/{match_id}/intelligence`. Replaced it with an optional dependency so guests do not get a `403 Forbidden` response.
- `backend/app/core/security.py`: Added `get_current_user_optional` to support checking the auth token without raising an exception if it is missing.

### 🧪 Testing Performed
- Verified that unauthenticated users land immediately on the AI Match Intelligence Center and can view live scorecards, match stories, win probabilities, and tactical insights.
- Verified that clicking on the chat input, chat suggestions, or settings prompts the user to sign up via the inline AuthModal.
- Verified that closing the AuthModal returns the user seamlessly to the intelligence dashboard without losing their place.
- Verified that signing in through the AuthModal immediately unlocks the chat and hides the modal, with all previous context (selected match, scroll position) perfectly preserved.
- Backend guest testing confirmed that public routes return 200 OK without requiring `Bearer` tokens.

### ⚠️ Known Limitations
- Vercel Analytics custom event tracking (e.g., `track('Chat Clicked')`) is planned for a future minor iteration.
- The lazy loading of chat histories and advanced caching for scorecards are partially implemented via standard React state but may need Redis-backed caching for the `/intelligence` endpoint under extremely high concurrency.
