# System Architecture

Project: CrickAIt

Version: 1.0

Status: Living Document

Owner: Vasim

---

# Purpose

This document defines the official architecture of CrickAIt.

Every implementation must follow this document.

No developer or AI agent should introduce architectural changes without updating this document first.

The architecture should prioritize:

- Scalability
- Maintainability
- Reliability
- Performance
- Modularity
- AI extensibility

---

# High Level Architecture

```
                    React Frontend
                           │
                    HTTPS / WebSocket
                           │
                  FastAPI Application
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
 Authentication      Application API      AI Layer
        │                  │                  │
        └──────────────┬───┴──────────────────┘
                       │
                 Service Layer
                       │
        ┌──────────────┼───────────────────┐
        │              │                   │
     Redis        PostgreSQL         External APIs
        │              │                   │
        │         Long-term Data      CricAPI
        │                              Cricbuzz
        │                              Tavily
        │                              Wikipedia
        │
     Session Cache
     Rate Limits
     Memory Cache
```

---

# Architectural Principles

CrickAIt follows a layered architecture.

Presentation Layer

↓

API Layer

↓

Business Logic Layer

↓

AI Layer

↓

Data Layer

↓

External Services

Each layer has a single responsibility.

No layer should bypass another.

---

# Core Modules

The platform consists of independent modules.

Every module owns its own logic.

Modules communicate through services.

Current modules

- Authentication
- User Profiles
- Chat
- AI
- Live Matches
- News
- Preferences
- Admin

Future modules

- Fantasy
- Predictions
- Coaching
- Analytics
- Community
- Voice
- Player Intelligence

---

# Frontend Architecture

Technology

React

Vite

React Router

Component-based architecture

Recommended Folder Structure

frontend/

src/

components/

pages/

hooks/

services/

contexts/

layouts/

assets/

styles/

utils/

types/

Every component should be reusable.

Pages should never contain business logic.

Business logic belongs inside hooks or services.

---

# Backend Architecture

Technology

FastAPI

Python

AsyncIO

Backend Layers

API

↓

Controllers

↓

Services

↓

Repositories

↓

Database

Controllers

Responsible for HTTP only.

Services

Contain business logic.

Repositories

Contain database logic.

Never access the database directly from controllers.

---

# AI Architecture

The AI system is independent from the HTTP layer.

Current Components

Router Agent

↓

Expert Agent

↓

Summarizer

↓

Memory Extraction

Future Components

Prediction Agent

Fantasy Agent

Coach Agent

Statistics Agent

Search Agent

News Agent

Every AI agent should have one responsibility.

Avoid giant prompts.

Compose multiple small agents.

---

# Memory Architecture

Memory has three levels.

Level 1

Conversation Memory

Current conversation.

Temporary.

Level 2

User Memory

Persistent preferences.

Favorite teams

Favorite players

Language

Expertise level

Level 3

Knowledge Base

Structured cricket knowledge.

Never store conversation here.

---

# Database Architecture

Current

SQLite

Future

PostgreSQL

Logical Domains

Users

Chat

Matches

Players

Teams

News

Fantasy

Predictions

Analytics

Each domain should own its own tables.

---

# Redis Responsibilities

Redis is the system cache.

Use Redis for

Rate limiting

User sessions

Conversation cache

Memory cache

Live match cache

News cache

Prediction cache

Never use Redis as permanent storage.

---

# External Services

Current

Groq

CricAPI

Wikipedia

Tavily

Cricbuzz

Future

OpenAI

Anthropic

Google Gemini

Weather APIs

Fantasy APIs

Every external service must be wrapped in its own adapter.

Never call APIs directly from business logic.

---

# API Design

REST first.

Streaming where appropriate.

Future GraphQL support is optional.

Every endpoint must

Validate input

Validate output

Return typed responses

Handle failures gracefully

Log errors

---

# Authentication

Current

Google OAuth

JWT

Email login

Cloudflare Turnstile

Future

Enterprise SSO

Role Based Access Control

Permissions

---

# Background Processing

Long-running tasks should never block requests.

Examples

News aggregation

Player updates

Prediction generation

Summaries

Analytics

Background workers should process these tasks.

---

# File Storage

Images

Documents

Training videos

Exports

Future cloud storage support.

Do not store uploaded files in the application directory.

---

# Event Flow

Example

User sends message

↓

Authentication

↓

Rate Limit Check

↓

Conversation Memory

↓

Router Agent

↓

Tool Selection

↓

External APIs

↓

Reasoning

↓

Streaming Response

↓

Conversation Storage

↓

Memory Extraction

↓

Analytics

---

# Error Handling

Every layer handles only its own errors.

Controllers

HTTP errors

Services

Business errors

Repositories

Database errors

Adapters

External API errors

Never leak internal exceptions to users.

---

# Logging

Structured logging only.

Every request should include

Timestamp

User ID

Request ID

Duration

Errors

Never log secrets.

---

# Security

Validate every request.

Sanitize all inputs.

Escape outputs.

Protect secrets.

Use HTTPS.

Rotate credentials.

Rate limit APIs.

Audit admin actions.

---

# Testing Strategy

Every module requires

Unit tests

Integration tests

API tests

End-to-end tests

Performance tests

AI evaluation tests

No feature is complete without testing.

---

# Monitoring

Monitor

Latency

Errors

Token usage

API failures

Prediction accuracy

Search quality

Conversation quality

Redis health

Database health

---

# Scaling Strategy

Current

Monolith

↓

Modular Monolith

↓

Microservices (only when justified)

Do not split into microservices prematurely.

---

# Design Principles

Every new feature should

Reuse existing services.

Reuse components.

Reuse prompts.

Reuse AI agents.

Avoid duplication.

Favor composition.

Keep modules independent.

---

# Architecture Review Checklist

Before merging any feature ask

Does it follow this architecture?

Does it introduce duplicate code?

Does it violate separation of concerns?

Can it scale?

Can it be tested?

Can it be reused?

If any answer is "No", redesign before implementation.

---

# Future Vision

CrickAIt should evolve into a modular AI platform where new capabilities can be added with minimal changes to existing systems.

The architecture should support millions of users, multiple AI providers, new cricket intelligence modules, and future enterprise integrations without requiring major rewrites.