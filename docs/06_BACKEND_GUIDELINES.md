# Backend Development Guidelines

Project: CrickAIt

Version: 1.0

Status: Living Document

Owner: Vasim

---

# Purpose

This document defines how every backend feature should be designed, implemented,
reviewed, tested, and deployed.

Every backend implementation must follow these guidelines.

Architecture consistency is more important than implementation speed.

---

# Backend Philosophy

The backend is responsible for

- Business Logic
- AI Orchestration
- Authentication
- Security
- Data Management
- External Integrations
- Performance
- Reliability

The backend is NOT responsible for UI decisions.

---

# Core Principles

Every feature must be

Scalable

Reusable

Testable

Observable

Documented

Asynchronous

Secure

---

# Technology Stack

Python

FastAPI

LangGraph

Redis

PostgreSQL (Future)

SQLite (Current)

Pydantic

AsyncIO

JWT

Docker

---

# Backend Layers

Every request flows through the following layers

```

HTTP Request

↓

Router

↓

Controller

↓

Service

↓

Repository

↓

Database

↓

Response

```

Never skip layers.

---

# Router

Responsibilities

- Route registration
- Authentication
- Authorization
- Request validation
- Response models

Routers should never contain business logic.

---

# Controllers

Responsibilities

- Receive validated input
- Call services
- Return responses

Controllers should remain small.

Maximum recommended size

150 lines

---

# Services

Services contain

Business Logic

Examples

ChatService

PredictionService

FantasyService

PlayerService

SearchService

NotificationService

NewsService

CoachService

AdminService

Services may call multiple repositories.

Services may call AI agents.

Services never access HTTP objects.

---

# Repository Layer

Repositories manage

Database access only.

Repositories never contain

Business logic

AI

Caching

HTTP

---

# AI Layer

The AI system is isolated.

Current

Router Agent

Expert Agent

Summarizer

Memory Extractor

Future

Prediction Agent

Fantasy Agent

Coach Agent

Statistics Agent

News Agent

Search Agent

Every AI agent has one responsibility.

---

# Provider Layer

Every external integration must be wrapped.

Current

GroqProvider

CricAPIProvider

WikipediaProvider

TavilyProvider

CricbuzzProvider

Future

GeminiProvider

ClaudeProvider

OpenAIProvider

WeatherProvider

Never call external APIs directly.

Always use providers.

---

# Dependency Injection

Always inject

Repositories

Providers

AI agents

Configuration

Never instantiate inside services.

Bad

```

service = ChatService()

```

Good

```

ChatService(
repository,
provider,
cache
)

```

---

# Configuration

All configuration belongs inside

config/

Never hardcode

API Keys

URLs

Timeouts

Limits

Models

Use environment variables.

---

# Error Handling

Create custom exceptions.

Examples

AuthenticationError

PredictionError

ValidationError

ProviderUnavailable

RateLimitExceeded

ConversationNotFound

Handle errors centrally.

---

# Logging

Every request should generate

Request ID

User ID

Timestamp

Duration

Provider

Model

Token Usage

Error Details

Never log

Passwords

JWT

API Keys

Personal Information

---

# Validation

Use Pydantic models.

Never trust user input.

Validate

Length

Types

Enums

Required Fields

Ranges

Sanitize text.

---

# AI Design Rules

AI should reason.

AI should not invent.

Prefer

Structured Data

↓

Reasoning

↓

Answer

Instead of

Prompt

↓

Guess

↓

Answer

---

# Prompt Management

Never write prompts inline.

Store prompts inside

prompts/

Example

prompts/

chat.md

prediction.md

coach.md

fantasy.md

news.md

search.md

Prompts are version controlled.

---

# Memory

Conversation Memory

↓

Redis

User Memory

↓

Database

Knowledge

↓

Structured Sources

Never mix them.

---

# Background Jobs

Use background workers for

News refresh

Prediction refresh

Analytics

Email

Cache warming

Player updates

Long-running AI tasks

Never block HTTP requests.

---

# Caching Strategy

Cache

Live matches

News

Player statistics

Predictions

Conversation summaries

Frequently accessed users

Invalidate intelligently.

---

# Streaming

Streaming should be supported for

Chat

Predictions

Live insights

Never wait for entire AI responses.

---

# Rate Limiting

Guest

20/day

Free

100/day

Pro

Unlimited

Admin

Unlimited

Rate limiting belongs in middleware.

---

# Security

JWT

HTTPS

Input validation

Output sanitization

Password hashing

Cloudflare Turnstile

CSRF protection (where applicable)

Secure cookies

Audit logging

Least privilege

---

# Database Rules

Never write SQL inside services.

Always use repositories.

Transactions should be explicit.

Indexes required.

Migration required.

Rollback supported.

---

# API Design

REST

Typed

Versioned

Consistent

Documented

Streaming when needed.

---

# Folder Structure

backend/

app/

api/

routers/

controllers/

services/

repositories/

agents/

providers/

models/

schemas/

prompts/

middleware/

config/

core/

utils/

tests/

---

# Naming

Files

snake_case

Classes

PascalCase

Variables

snake_case

Constants

UPPER_CASE

Routes

kebab-case

---

# Documentation

Every module requires

Purpose

Inputs

Outputs

Dependencies

Examples

---

# Testing

Every feature requires

Unit Tests

Integration Tests

API Tests

Load Tests

AI Evaluation Tests

Regression Tests

---

# Performance

Use AsyncIO.

Batch requests.

Reuse HTTP clients.

Avoid duplicate provider calls.

Cache aggressively.

Optimize database queries.

Measure latency.

---

# Monitoring

Track

Latency

Errors

Provider failures

Redis

Database

LLM latency

Prompt failures

Search accuracy

Prediction accuracy

---

# Feature Development Workflow

Every feature follows

Understand

↓

Plan

↓

Architecture Review

↓

Database Review

↓

API Review

↓

Implementation

↓

Testing

↓

Performance Review

↓

Documentation

↓

Merge

Never skip planning.

---

# Code Review Checklist

Before merging ask

Does it follow architecture?

Is business logic separated?

Can it scale?

Can it be tested?

Is it documented?

Is logging complete?

Is security handled?

Can it be reused?

Would another engineer understand this?

If any answer is No

Refactor before merging.

---

# Long-Term Vision

The backend should evolve into a modular AI platform capable of supporting

Millions of users

Multiple AI providers

Enterprise customers

Academy integrations

Third-party APIs

Future mobile applications

without requiring architectural rewrites.