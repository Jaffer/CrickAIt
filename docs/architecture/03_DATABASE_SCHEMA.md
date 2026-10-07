# Database Schema

Project: CrickAIt

Version: 1.0

Status: Living Document

Owner: Vasim

---

# Purpose

This document defines the logical database design for CrickAIt.

The database must support current features while remaining flexible for future
modules such as Fantasy Copilot, Player Intelligence, AI Coach, Community,
Predictions and Analytics.

---

# Database Philosophy

The database is the source of truth.

Rules

- Store structured data only.
- Never store derived values unless caching.
- Normalize where practical.
- Denormalize only for performance.
- Every table must have indexes.
- Every table must support future scaling.

---

# Database Technology

Current

SQLite

Future

PostgreSQL

Target Version

PostgreSQL 16+

---

# Primary Domains

The platform is divided into domains.

Authentication

Users

Profiles

Chat

Matches

Players

Teams

News

Fantasy

Predictions

Analytics

Notifications

Community

Admin

Each domain owns its own tables.

---

# Authentication Domain

## users

Stores registered users.

Fields

id

username

email

password_hash

google_id

subscription_tier

status

created_at

updated_at

Indexes

username

email

google_id

---

## sessions

Stores active sessions.

Fields

id

user_id

token

expires_at

created_at

---

## password_resets

Stores OTP requests.

Fields

id

user_id

otp

expires_at

used

created_at

---

# Profile Domain

## user_profiles

Stores persistent user preferences.

Fields

user_id

favorite_team

favorite_players

favorite_format

language

expertise_level

verbosity

banter_enabled

avatar

timezone

updated_at

---

# Chat Domain

## conversations

Fields

id

user_id

title

created_at

updated_at

archived

---

## messages

Fields

id

conversation_id

role

content

sources

token_count

latency_ms

created_at

---

## conversation_summaries

Stores LangGraph summaries.

Fields

conversation_id

summary

updated_at

---

# Match Domain

## matches

Fields

id

match_type

series

venue

status

start_time

end_time

team_a

team_b

winner

result

---

## innings

Fields

id

match_id

batting_team

innings_number

runs

wickets

overs

extras

---

## score_events

Stores over-by-over events.

Fields

id

match_id

over

ball

batsman

bowler

runs

wicket

event_type

timestamp

---

# Player Domain

## players

Fields

id

name

country

role

batting_style

bowling_style

birth_date

debut_date

image

---

## player_statistics

Fields

player_id

format

matches

innings

runs

average

strike_rate

centuries

fifties

wickets

economy

updated_at

---

## player_form

Recent performances.

Fields

player_id

match_id

rating

notes

---

# Team Domain

## teams

Fields

id

name

country

short_name

logo

---

## team_statistics

Fields

team_id

format

wins

losses

ties

no_results

updated_at

---

# Fantasy Domain

## fantasy_recommendations

Fields

id

user_id

match_id

captain

vice_captain

expected_points

risk_score

generated_at

---

## fantasy_teams

Fields

id

user_id

match_id

players

budget

strategy

created_at

---

# Prediction Domain

## predictions

Fields

id

match_id

winning_team

confidence

projected_score

reasoning

generated_at

---

## simulations

Fields

id

match_id

simulation_count

results

generated_at

---

# News Domain

## articles

Fields

id

title

summary

source

url

published_at

---

## article_embeddings

Future vector search support.

Fields

article_id

embedding

model

---

# Community Domain

## saved_analyses

Fields

id

user_id

title

content

created_at

---

## bookmarks

Fields

id

user_id

resource_type

resource_id

created_at

---

# Notification Domain

## notifications

Fields

id

user_id

title

message

type

read

created_at

---

# Admin Domain

## audit_logs

Fields

id

admin_id

action

resource

details

created_at

---

# Analytics Domain

## user_events

Stores anonymous product analytics.

Examples

Chat Opened

Prediction Viewed

Fantasy Generated

Player Compared

Fields

id

user_id

event

metadata

timestamp

---

# Relationships

users

↓

profiles

↓

conversations

↓

messages

↓

summaries

users

↓

fantasy

↓

predictions

↓

analytics

matches

↓

innings

↓

events

↓

predictions

players

↓

statistics

↓

form

---

# Index Strategy

Index

username

email

match_id

player_id

conversation_id

user_id

created_at

status

Optimize

Search

Sorting

Filtering

---

# Soft Deletes

Use soft deletes where appropriate.

Fields

deleted_at

deleted_by

Never permanently remove important user data without an explicit cleanup process.

---

# Migrations

All schema changes must be versioned.

Every migration should be reversible.

No manual schema modifications in production.

---

# Caching Strategy

Redis caches

Live scores

News

Player statistics

Predictions

Conversation summaries

Rate limits

User preferences

Never cache permanent data indefinitely.

---

# Backup Strategy

Daily database backups.

Periodic Redis snapshots where appropriate.

Test restore procedures regularly.

---

# Security

Encrypt passwords.

Never store API keys.

Audit sensitive actions.

Restrict admin access.

Use least privilege.

---

# Future Considerations

The schema should support:

- PostgreSQL partitioning
- Full-text search
- Vector search
- Time-series analytics
- Read replicas
- Multi-region deployment

without requiring major redesign.s