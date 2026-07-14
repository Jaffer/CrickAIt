# API Specification

Project: CrickAIt

Version: 1.0

Status: Living Document

Owner: Vasim

---

# Purpose

This document defines every public API exposed by CrickAIt.

Every endpoint must follow these specifications.

Never introduce endpoints without updating this document.

---

# API Principles

APIs should be

- Predictable
- Versioned
- Typed
- Secure
- Consistent
- Self-documenting

All endpoints return JSON unless explicitly streaming.

Base URL

/api/v1

Future versions

/api/v2

---

# Authentication

Protected endpoints require JWT.

Authorization Header

Authorization: Bearer <JWT_TOKEN>

Public endpoints

- Login
- Register
- Google OAuth
- Health Check
- Public News

Everything else requires authentication.

---

# Standard Response Format

Success

{
    "success": true,
    "data": {},
    "message": null
}

Failure

{
    "success": false,
    "error": {
        "code": "INVALID_REQUEST",
        "message": "Invalid username."
    }
}

Never return inconsistent structures.

---

# Error Codes

400

Bad Request

401

Unauthorized

403

Forbidden

404

Not Found

409

Conflict

422

Validation Error

429

Rate Limited

500

Internal Server Error

503

External Provider Unavailable

---

# Authentication APIs

POST

/auth/register

Request

username

email

password

turnstile_token

Response

JWT

User Profile

---

POST

/auth/login

Request

email

password

Response

JWT

Profile

---

POST

/auth/google

Google OAuth login.

---

POST

/auth/logout

Invalidate current session.

---

POST

/auth/reset-password

Generate OTP.

---

POST

/auth/verify-otp

Verify password reset.

---

# User APIs

GET

/users/me

Returns

User Profile

Preferences

Subscription

Usage

---

PATCH

/users/me

Update

Language

Favorite Team

Favorite Players

Expertise

Verbosity

Avatar

---

GET

/users/preferences

---

PATCH

/users/preferences

---

# Chat APIs

POST

/chat/message

Primary AI endpoint.

Request

conversation_id

message

language

stream

Response

Streaming AI response.

---

GET

/chat/history

Returns

Conversation list.

---

GET

/chat/history/{conversation_id}

Returns

Messages

Summaries

Metadata

---

DELETE

/chat/history/{conversation_id}

Archive conversation.

---

POST

/chat/feedback

Allows users to rate responses.

---

# Live Match APIs

GET

/matches/live

Returns

Current live matches.

---

GET

/matches/{match_id}

Returns

Match overview.

---

GET

/matches/{match_id}/scorecard

Returns

Complete scorecard.

---

GET

/matches/{match_id}/timeline

Returns

Ball-by-ball events.

---

GET

/matches/{match_id}/insights

Returns

AI tactical insights.

---

GET

/matches/{match_id}/prediction

Returns

Winning probability

Momentum

Confidence

Projected score

Reasoning

---

# Player APIs

GET

/players

Search players.

Supports

name

country

role

---

GET

/players/{id}

Complete player profile.

---

GET

/players/{id}/statistics

Career statistics.

---

GET

/players/{id}/analysis

AI analysis.

---

GET

/players/compare

Compare players.

---

# Team APIs

GET

/teams

GET

/teams/{id}

GET

/teams/{id}/statistics

GET

/teams/{id}/players

---

# Search APIs

POST

/search

Natural language search.

Example

Show every Kohli century while chasing.

Returns

Structured results.

Charts.

Sources.

---

# Fantasy APIs

POST

/fantasy/generate

Creates fantasy team.

---

POST

/fantasy/optimize

Optimizes existing team.

---

GET

/fantasy/recommendations

---

GET

/fantasy/history

---

# Prediction APIs

GET

/predictions/{match_id}

---

POST

/predictions/simulate

Runs simulations.

---

# News APIs

GET

/news

Latest articles.

---

GET

/news/headlines

Ticker.

---

GET

/news/{id}

Article details.

---

# Coach APIs

POST

/coach/upload

Upload video.

Future feature.

---

GET

/coach/report/{id}

Returns

Analysis

Suggestions

Score

---

# Community APIs

POST

/community/post

---

GET

/community/feed

---

POST

/community/comment

---

POST

/community/bookmark

---

# Notification APIs

GET

/notifications

---

PATCH

/notifications/{id}/read

---

# Admin APIs

GET

/admin/users

---

PATCH

/admin/users/{id}

Update subscription.

---

POST

/admin/broadcast

Broadcast notification.

---

GET

/admin/analytics

Platform metrics.

---

# Health APIs

GET

/health

Application health.

---

GET

/health/redis

---

GET

/health/database

---

GET

/health/providers

Checks

Groq

CricAPI

Tavily

Wikipedia

---

# Streaming APIs

Streaming endpoints use

Server Sent Events

or

WebSockets

Supported

Chat

Live Scores

Predictions

Notifications

---

# Rate Limits

Guest

20 messages/day

Free

100/day

Pro

Unlimited

Admin

Unlimited

---

# Validation Rules

Validate every request.

Never trust client input.

Use Pydantic models.

Sanitize text.

Reject invalid payloads.

---

# Versioning

Breaking changes

↓

New API version.

Never silently change response structures.

---

# Logging

Log

Endpoint

Latency

Errors

User ID

Provider usage

---

# Security

JWT

HTTPS

Rate limiting

CORS

Input validation

Output sanitization

Audit logs

No secrets in responses.

---

# Future APIs

Voice

Analytics

Academy

Scouting

Enterprise

Webhook support

Public API

GraphQL gateway

---

# API Review Checklist

Before adding any endpoint ask

Does this already exist?

Can an existing endpoint be extended?

Does it follow naming conventions?

Is authentication correct?

Is validation complete?

Is the response consistent?

If not,

redesign before implementation.