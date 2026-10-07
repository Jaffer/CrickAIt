# Frontend Development Guidelines

Project: CrickAIt

Version: 1.0

Status: Living Document

Owner: Vasim

---

# Purpose

This document defines how the frontend should be designed, structured, implemented, and maintained.

Every frontend contribution must follow these guidelines.

Consistency is more important than individual preferences.

---

# Frontend Philosophy

The frontend should feel like an AI-powered analytics platform rather than a traditional chatbot.

Users should immediately understand that CrickAIt provides intelligence, not just conversations.

Every screen should answer three questions:

• What is happening?

• Why is it happening?

• What should I do next?

---

# Design Principles

Prioritize

Clarity

Consistency

Performance

Accessibility

Responsiveness

Scalability

Never sacrifice usability for visual effects.

---

# UI Personality

Professional

Minimal

Fast

Modern

Information Rich

Calm

Premium

Avoid playful or overly animated interfaces.

---

# Color System

Primary

Cricket Green

Accent

Blue

Success

Green

Warning

Orange

Error

Red

Background

Light Mode

White

Dark Mode

Near Black

Text

High Contrast

Never use colors without semantic meaning.

---

# Typography

Use a maximum of three font sizes per section.

Hierarchy

Heading

Subheading

Body

Caption

Avoid excessive font weights.

Maintain generous spacing.

---

# Layout Principles

Responsive first.

Desktop

Tablet

Mobile

Every page should adapt gracefully.

Never rely on fixed pixel layouts.

---

# Grid System

Use CSS Grid for page layouts.

Use Flexbox for component layouts.

Avoid deeply nested layouts.

---

# Navigation

Primary Navigation

Sidebar

Secondary Navigation

Top Bar

Context Navigation

Tabs

Breadcrumbs where appropriate.

---

# Component Philosophy

Every component should be

Reusable

Composable

Independent

Testable

Accessible

Never duplicate UI components.

---

# Folder Structure

src/

components/

common/

chat/

matches/

players/

fantasy/

analytics/

layout/

pages/

hooks/

services/

contexts/

utils/

types/

assets/

styles/

---

# Component Rules

Components should only render UI.

Business logic belongs in

Hooks

Services

Context

Never inside JSX.

---

# Hooks

Custom hooks manage

Fetching

State

WebSockets

Authentication

Pagination

Filtering

Examples

useChat()

useLiveMatches()

usePlayer()

usePredictions()

useFantasy()

---

# State Management

Local State

Component State

Shared State

Context

Server State

React Query

Avoid prop drilling.

Keep state close to where it is used.

---

# API Layer

Never call fetch directly inside components.

Use

services/

Example

ChatService

PlayerService

PredictionService

FantasyService

NewsService

---

# Error Handling

Every screen should have

Loading State

Empty State

Error State

Retry Action

Never leave the user with a blank screen.

---

# Loading Experience

Skeleton loaders

Progress indicators

Streaming responses

Optimistic updates where appropriate.

Avoid blocking the UI.

---

# Chat Experience

Features

Streaming

Markdown

Tables

Charts

Code blocks

Sources

Suggested prompts

Conversation history

Typing indicator

Retry response

Copy response

Share response

Feedback

---

# Live Match Center

Components

Live Score

Win Probability

Momentum Graph

Timeline

Scorecard

AI Insights

Partnership Widget

Weather

Pitch Report

Upcoming Matches

Recent Matches

Everything updates in real time.

---

# Player Intelligence

Player Header

Career Stats

Recent Form

Venue Performance

Opponent Analysis

Strength Radar

Weakness Radar

Comparison View

Timeline

Charts

---

# Fantasy Module

Components

Team Builder

Captain Selector

Vice Captain Selector

Expected Points

Budget Meter

Risk Meter

Pitch Insights

Recommendations

---

# Search Experience

Natural language input.

Examples displayed.

Search suggestions.

Recent searches.

Popular searches.

Interactive filters.

---

# Data Visualization

Use charts where they improve understanding.

Examples

Win Probability

Run Rate

Strike Rate

Momentum

Partnership

Career Timeline

Performance Trend

Never use charts without purpose.

---

# Accessibility

Keyboard navigation.

Screen reader labels.

Semantic HTML.

Proper contrast.

Visible focus states.

Responsive font sizing.

---

# Performance

Lazy load pages.

Lazy load charts.

Virtualize long lists.

Memoize expensive calculations.

Cache server responses.

Reduce bundle size.

---

# Responsiveness

Desktop

Primary experience.

Tablet

Fully supported.

Mobile

Fully supported.

No horizontal scrolling.

---

# Animations

Animations should communicate state.

Examples

Loading

Streaming

Transitions

Notifications

Avoid decorative animations.

---

# Notifications

Use toast notifications for

Success

Errors

Warnings

Background updates

Avoid modal overload.

---

# Forms

Every form should have

Validation

Helpful errors

Inline feedback

Loading indicators

Disabled submit during processing

---

# Icons

Use one icon library.

Maintain consistent sizes.

Icons should support labels.

Never rely on icons alone.

---

# Dark Mode

Dark mode is a first-class experience.

Do not treat it as an afterthought.

Every component must support

Light

Dark

---

# Empty States

Every empty state should

Explain why.

Suggest next action.

Provide CTA.

Example

"No favorite players yet."

↓

"Add your first favorite player."

---

# Feature Flags

Future features should be hidden behind flags.

Never expose unfinished functionality.

---

# Analytics

Track

Button clicks

Searches

Feature usage

Drop-off points

Conversation starts

Prediction usage

Fantasy generation

Respect user privacy.

---

# Frontend Review Checklist

Before merging

Is the component reusable?

Is business logic separated?

Is it responsive?

Is it accessible?

Does it support dark mode?

Does it handle errors?

Does it handle loading?

Can another developer understand it?

If any answer is "No",

refactor before merging.

---

# Long-Term Goal

The frontend should become an AI-powered cricket intelligence dashboard that feels closer to Bloomberg Terminal, Linear, or Notion than a traditional chatbot.

Every new page should increase user understanding rather than simply display information.