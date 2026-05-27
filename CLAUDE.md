# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Medical Scribe is a healthcare app for automated appointment transcription and AI-powered analysis. It is a monorepo with:
- **Backend**: Python Flask service for audio processing, transcription, and AI
- **Frontend**: React Native (Expo) mobile/web app + React web landing page
- **Cloud**: Google Cloud (Cloud Run, Firestore, Speech-to-Text, Vertex AI), Firebase Hosting

## Worker Delegation Rules

When asked to analyze, summarize, or search across multiple files:
DELEGATE to ask-kimi with relevant file paths.

When asked to generate boilerplate, tests, or documentation:
DELEGATE to kimi-write with appropriate reference files.

When asked to review session history:
DELEGATE to extract-chat.

DO NOT delegate:
- Architecture decisions
- Debugging complex logic
- Refactoring plans
