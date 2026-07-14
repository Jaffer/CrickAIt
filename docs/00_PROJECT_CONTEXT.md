# CrickAIt Project Context

Version: 1.0

Status: Active Development

Owner: Vasim

---

# Vision

CrickAIt is not a chatbot.

CrickAIt is an AI-powered Cricket Intelligence Platform designed to become the most comprehensive AI ecosystem for cricket fans, analysts, fantasy players, coaches, academies, journalists, and organizations.

The chatbot is only one interface through which users interact with the platform.

The long-term objective is to build the Bloomberg Terminal of Cricket by combining live data, artificial intelligence, predictive analytics, tactical explanations, coaching, personalized insights, and structured cricket knowledge into a single product.

---

# Mission

Help every cricket fan understand cricket like an expert.

Whether the user is a beginner watching their first IPL game or a professional analyst studying bowling patterns, CrickAIt should provide intelligent, personalized, explainable, and trustworthy insights.

---

# Core Product Principles

Every feature must satisfy at least one of these principles.

• Save time.

• Improve understanding.

• Personalize the experience.

• Provide insights unavailable elsewhere.

• Increase daily engagement.

• Build proprietary cricket intelligence.

If a feature does not satisfy at least one of these principles, it should not be implemented.

---

# Current Product

Current application includes:

- AI Cricket Chat
- LangGraph multi-agent architecture
- Live score retrieval
- CricAPI integration
- Cricbuzz scraping
- Wikipedia integration
- Tavily Search
- User authentication
- Google OAuth
- Profile memory
- Redis caching
- SQLite persistence
- Rate limiting
- Admin dashboard
- User preferences
- Multilingual support
- Conversation memory
- Streaming AI responses

---

# Product Evolution

Stage 1

AI Cricket Chat

↓

Stage 2

AI Cricket Assistant

↓

Stage 3

AI Cricket Platform

↓

Stage 4

AI Cricket Intelligence Platform

↓

Stage 5

AI Operating System for Cricket

Every engineering decision should move the platform toward Stage 5.

---

# Future Product

The future platform consists of independent but connected modules.

## AI Chat

Natural conversations

Streaming

Context memory

Source citations

Personalized responses

---

## Live Match Intelligence

Live score

Win probability

Momentum analysis

Pressure index

Partnership analysis

Projected score

Required run rate forecasting

Session summaries

Turning points

AI tactical insights

---

## Fantasy Cricket Copilot

Dream11 optimization

Captain recommendations

Vice captain recommendations

Expected fantasy points

Risk analysis

Pitch-aware recommendations

Budget optimization

Differential picks

---

## Player Intelligence

Career statistics

Venue analysis

Opponent analysis

Strengths

Weaknesses

AI scouting report

Career timeline

Player comparison

---

## Natural Language Cricket Search

Users should be able to ask questions like

Show every Virat Kohli century while chasing.

Compare Bumrah and Starc in ICC tournaments.

Show Rohit's record at Wankhede.

The AI should convert natural language into structured data retrieval.

---

## Match Prediction

Projected totals

Winning probability

Confidence score

Simulation

Momentum shifts

Expected outcome

Explainable reasoning

---

## AI Coach

Future architecture for

Video analysis

Batting coaching

Bowling coaching

Fielding coaching

Pose estimation

Training recommendations

---

## AI News

Daily AI-generated cricket briefing

Transfer news

Selection news

Injury reports

Series summaries

---

## Voice AI

Speech recognition

Voice conversations

Audio summaries

---

## Community

Shared analyses

Predictions

Saved conversations

Public discussions

Bookmarks

---

# Target Users

Primary

• Cricket fans

• Fantasy cricket users

• Students of cricket

Secondary

• Coaches

• Cricket academies

• Journalists

• Analysts

• Scouts

Long Term

• Broadcasters

• Professional teams

• Media companies

---

# Tech Stack

Frontend

React

Vite

Vanilla CSS

Backend

FastAPI

Python

LangGraph

Redis

SQLite

Authentication

Google OAuth

JWT

Cloudflare Turnstile

AI

Groq

LLMs

Tool Calling

Memory

Infrastructure

Render

Vercel

Redis Cloud

---

# Engineering Philosophy

Architecture first.

Implementation second.

Every feature must begin with planning.

Never introduce duplicate code.

Reuse existing abstractions.

Prefer composition over duplication.

Every new module must integrate into the existing architecture.

Never rewrite working systems without justification.

Scalability is preferred over shortcuts.

Maintainability is preferred over cleverness.

---

# AI Philosophy

AI should never hallucinate when structured cricket data exists.

Whenever possible:

Structured Data

↓

Reasoning

↓

Natural Language

instead of

LLM

↓

Guess

↓

Response

Explain every prediction.

Explain every recommendation.

Explain every tactical insight.

Users should understand WHY.

---

# Design Philosophy

Fast.

Minimal.

Professional.

Information dense.

Accessible.

Responsive.

No unnecessary animations.

Every screen should communicate intelligence.

The UI should feel like a premium analytics platform rather than a generic chatbot.

---

# Repository Rules

Never create duplicate utilities.

Never duplicate API clients.

Never duplicate React components.

Never duplicate prompts.

Never duplicate AI agents.

Always search the repository before adding new functionality.

---

# Coding Principles

SOLID

DRY

KISS

Clean Architecture

Dependency Injection

Reusable Components

Strong Typing

Meaningful Naming

Comprehensive Documentation

High Test Coverage

---

# Success Metrics

The project should be measured using

Daily Active Users

Weekly Retention

Average Session Duration

Messages per User

Prediction Accuracy

Fantasy Recommendation Accuracy

Search Accuracy

Performance

Latency

Error Rate

User Satisfaction

---

# Long-Term Goal

CrickAIt should become the world's most intelligent AI platform dedicated exclusively to cricket.

The objective is not to compete with ChatGPT.

The objective is to provide cricket intelligence that generic AI assistants cannot.