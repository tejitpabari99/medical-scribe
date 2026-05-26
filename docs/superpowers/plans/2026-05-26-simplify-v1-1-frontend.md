# Simplify V1.1 — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add React Router versioning (`/`, `/versions`, `/v1`, `/v1-1`) to the simplify web app, build the V1.1 page (text input, hover/tap medical terms, 5-step progress, JSON + PDF download, no questions), and keep the existing V1 page unchanged.

**Architecture:** React Router v6 wraps the app. Current `App.tsx` content moves to `pages/v1/V1Page.tsx` untouched. A new `pages/v1_1/V1_1Page.tsx` holds the V1.1 UI. Root `/` redirects to `VITE_DEFAULT_VERSION`. A `MedicalTerm` component renders hover/tap glossary popovers over underlined terms in the result text. PDF download uses `window.open` + `window.print()` — no new libraries.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, existing CSS variables from `App.css`

**Key constraint:** Do NOT modify `App.css` global styles or any existing component logic. Add new CSS classes only. Keep the existing `App.tsx` V1 logic byte-for-byte identical when moved to `V1Page.tsx`.

---

## File Map

### Created
```
frontend/simplify/src/config.ts
frontend/simplify/src/router.tsx
frontend/simplify/src/pages/VersionsPage.tsx
frontend/simplify/src/pages/v1/V1Page.tsx
frontend/simplify/src/pages/v1_1/V1_1Page.tsx
frontend/simplify/src/pages/v1_1/V1_1Page.css
frontend/simplify/src/components/MedicalTerm.tsx
```

### Modified
```
frontend/simplify/src/App.tsx          — replace with router shell (5 lines)
frontend/simplify/src/main.tsx         — wrap with BrowserRouter
frontend/simplify/.env.local           — add VITE_DEFAULT_VERSION=v1
frontend/simplify/.env.local.example   — add VITE_DEFAULT_VERSION entry
frontend/simplify/.env.production      — add VITE_DEFAULT_VERSION=v1
frontend/simplify/package.json         — add react-router-dom
```

---

## Task 12: Install React Router and add config

**Files:**
- Modify: `frontend/simplify/package.json`
- Create: `frontend/simplify/src/config.ts`
- Modify: `frontend/simplify/.env.local`
- Modify: `frontend/simplify/.env.local.example`
- Modify: `frontend/simplify/.env.production`

- [ ] **Step 1: Install react-router-dom**

```bash
cd frontend/simplify
npm install react-router-dom@6
```

Expected: `react-router-dom` appears in `package.json` dependencies.

- [ ] **Step 2: Create `src/config.ts`**

```typescript
// config.ts — single source of truth for version routing
// To change the default version, update VITE_DEFAULT_VERSION in .env files
// and set SIMPLIFY_DEFAULT_VERSION on the backend to match.

export const DEFAULT_VERSION = import.meta.env.VITE_DEFAULT_VERSION ?? 'v1';

export const VERSIONS = [
  {
    id: 'v1',
    label: 'Version 1',
    path: '/v1',
    description: 'Original pipeline. Supports provider notes, appointment summaries, lab results, and DOCX files. Steps: read → classify → simplify → define → clarify → structure.',
    apiPath: '/simplify/v1',
    isDefault: DEFAULT_VERSION === 'v1',
  },
  {
    id: 'v1-1',
    label: 'Version 1.1',
    path: '/v1-1',
    description: 'Improved pipeline. Supports provider notes and SOAP notes only (no lab results). Uses a curated medical term database for safer, more consistent simplification. Adds a hover/tap medical term glossary. Text input supported.',
    apiPath: '/simplify/v1-1',
    isDefault: DEFAULT_VERSION === 'v1-1',
  },
] as const;
```

- [ ] **Step 3: Add `VITE_DEFAULT_VERSION` to env files**

In `frontend/simplify/.env.local`, add:
```
VITE_DEFAULT_VERSION=v1
```

In `frontend/simplify/.env.local.example`, add:
```
# Default version shown at /. Must match SIMPLIFY_DEFAULT_VERSION on the backend.
# Options: v1 | v1-1
VITE_DEFAULT_VERSION=v1
```

In `frontend/simplify/.env.production`, add:
```
VITE_DEFAULT_VERSION=v1
```

- [ ] **Step 4: Commit**

```bash
cd frontend/simplify
git add package.json package-lock.json src/config.ts .env.local .env.local.example .env.production
git commit -m "feat(simplify-fe): add react-router-dom + version config"
```

---

## Task 13: Set up router — update `main.tsx` and `App.tsx`

**Files:**
- Modify: `frontend/simplify/src/main.tsx`
- Modify: `frontend/simplify/src/App.tsx`
- Create: `frontend/simplify/src/router.tsx`

- [ ] **Step 1: Update `main.tsx` to wrap with BrowserRouter**

Replace the full contents of `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './App.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 2: Replace `App.tsx` with a router shell**

The current `App.tsx` content will move to `V1Page.tsx` in Task 14.
Replace `App.tsx` with:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { DEFAULT_VERSION } from './config';
import VersionsPage from './pages/VersionsPage';
import V1Page from './pages/v1/V1Page';
import V1_1Page from './pages/v1_1/V1_1Page';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${DEFAULT_VERSION}`} replace />} />
      <Route path="/versions" element={<VersionsPage />} />
      <Route path="/v1" element={<V1Page />} />
      <Route path="/v1-1" element={<V1_1Page />} />
      <Route path="*" element={<Navigate to={`/${DEFAULT_VERSION}`} replace />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat(simplify-fe): add React Router shell, redirect / to default version"
```

---

## Task 14: Create `pages/v1/V1Page.tsx` (existing UI, untouched)

**Files:**
- Create: `frontend/simplify/src/pages/v1/V1Page.tsx`

This is the entire current `App.tsx` content copied verbatim, with only the export name changed from `App` to `V1Page`. Every type, constant, helper, and component stays identical.

- [ ] **Step 1: Copy current `App.tsx` to `pages/v1/V1Page.tsx`**

```bash
cp frontend/simplify/src/App.tsx frontend/simplify/src/pages/v1/V1Page.tsx
```

- [ ] **Step 2: Change the export name in `V1Page.tsx`**

Find the line:
```tsx
export default function App() {
```
Replace with:
```tsx
export default function V1Page() {
```

That is the only change. All types, constants, sub-components, and logic remain byte-for-byte identical.

- [ ] **Step 3: Verify the file compiles**

```bash
cd frontend/simplify
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors for `V1Page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/v1/V1Page.tsx
git commit -m "feat(simplify-fe): move existing UI to pages/v1/V1Page.tsx"
```

---

## Task 15: Create `VersionsPage.tsx`

**Files:**
- Create: `frontend/simplify/src/pages/VersionsPage.tsx`

Lists all versions with a link to each. Shows which is default.

- [ ] **Step 1: Write `VersionsPage.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { VERSIONS } from '../config';

export default function VersionsPage() {
  return (
    <>
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>

      <div className="page-wrapper">
        <div className="container">
          <section className="hero">
            <div className="hero-badge">✦ Pipeline Versions</div>
            <h1>Simplify Versions</h1>
            <p className="hero-desc">
              Each version represents a different iteration of the simplification pipeline.
            </p>
          </section>

          <section style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {VERSIONS.map(v => (
              <div key={v.id} className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{v.label}</h2>
                  {v.isDefault && (
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px',
                      borderRadius: '999px', background: 'var(--accent)', color: '#fff',
                    }}>
                      default
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                  {v.description}
                </p>
                <Link
                  to={v.path}
                  style={{
                    display: 'inline-block', padding: '8px 20px',
                    borderRadius: 'var(--radius-pill)', background: 'var(--accent)',
                    color: '#fff', fontSize: '0.875rem', fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  Open {v.label} →
                </Link>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/VersionsPage.tsx
git commit -m "feat(simplify-fe): add /versions page listing all pipeline versions"
```

---

## Task 16: Create `MedicalTerm` component

**Files:**
- Create: `frontend/simplify/src/components/MedicalTerm.tsx`

Renders a single underlined term with a hover/click/tap popover showing the definition and source.

- [ ] **Step 1: Write `MedicalTerm.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react';

interface MedicalTermProps {
  term: string;
  definition: string;
  source: string;
}

export default function MedicalTerm({ term, definition, source }: MedicalTermProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
      <span
        className="medical-term"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-label={`${term}: ${definition}`}
      >
        {term}
      </span>
      {open && (
        <span className="medical-term-popover" role="tooltip">
          <span className="medical-term-popover-definition">{definition}</span>
          <span className="medical-term-popover-source">{source}</span>
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MedicalTerm.tsx
git commit -m "feat(simplify-fe): add MedicalTerm hover/tap popover component"
```

---

## Task 17: Create `V1_1Page.tsx` and its CSS

**Files:**
- Create: `frontend/simplify/src/pages/v1_1/V1_1Page.tsx`
- Create: `frontend/simplify/src/pages/v1_1/V1_1Page.css`

The V1.1 page differs from V1 in:
- Input: text textarea OR file upload (both supported)
- Steps: 5 steps (not 7), different labels
- Calls `POST /simplify/v1-1` (file or text in FormData)
- Result: same `AppointmentNote` schema + `terms` glossary
- No questions section rendered
- `terms` dict renders as hover/tap underlined words inline in text fields
- JSON download button (downloads raw result JSON)
- PDF download button (html → `window.open` → `window.print()`)

- [ ] **Step 1: Write `V1_1Page.css`**

```css
/* V1.1 specific styles — extends App.css globals */

.input-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.input-tab {
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  font-family: Inter, sans-serif;
  transition: all 0.15s;
}

.input-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.text-input-area {
  width: 100%;
  min-height: 200px;
  padding: 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
  color: var(--text-primary);
  font-family: Inter, sans-serif;
  font-size: 0.9rem;
  line-height: 1.6;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.text-input-area:focus {
  outline: none;
  border-color: var(--accent);
}

.medical-term {
  text-decoration: underline dotted var(--accent);
  text-underline-offset: 2px;
  cursor: help;
  color: inherit;
}

.medical-term:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}

.medical-term-popover {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 100;
  min-width: 200px;
  max-width: 300px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 10px 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.medical-term-popover-definition {
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.medical-term-popover-source {
  font-size: 0.72rem;
  color: var(--text-secondary);
  font-style: italic;
}

.glossary-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.download-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.download-btn-json,
.download-btn-pdf {
  padding: 10px 24px;
  border-radius: var(--radius-pill);
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  font-family: Inter, sans-serif;
  transition: opacity 0.15s;
}

.download-btn-json {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.download-btn-pdf {
  background: var(--accent);
  color: #fff;
}

.download-btn-json:hover,
.download-btn-pdf:hover {
  opacity: 0.85;
}
```

- [ ] **Step 2: Write `V1_1Page.tsx`**

```tsx
import './V1_1Page.css';
import { useState, useRef, useCallback, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../../api/firebase';
import MedicalTerm from '../../components/MedicalTerm';

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = 'waiting' | 'active' | 'done';
type UrgencyLevel = 'immediate' | 'soon' | 'routine' | 'informational';
type DocUrgency = 'normal' | 'caution' | 'concern' | 'urgent';
type InputMode = 'file' | 'text';
type AppState = 'upload' | 'processing' | 'result';

interface PipelineStep {
  id: number;
  label: string;
  description: string;
  status: StepStatus;
}

interface PatientScoreDimension {
  score: number;
  raw: number;
  label: string;
  unit: string;
}

interface PatientScore {
  composite: number;
  grade_estimate: number;
  label: string;
  word_count: number;
  low_confidence?: boolean;
  dimensions: {
    grade_level: PatientScoreDimension;
    jargon_density: PatientScoreDimension;
    sentence_complexity: PatientScoreDimension;
    passive_voice: PatientScoreDimension;
    actionability: PatientScoreDimension;
    numeracy_clarity: PatientScoreDimension;
    structural_clarity: PatientScoreDimension;
  };
}

interface GlossaryTerm {
  definition: string;
  source: string;
}

type TermsMap = Record<string, GlossaryTerm>;

interface Finding {
  item: string;
  urgency: UrgencyLevel;
}

interface AppointmentNote {
  doc_type: 'appointment_note';
  urgency: DocUrgency;
  summary: string;
  what_happened: { summary: string; date: string | null; reason: string };
  what_it_means: { headline: string; findings: Finding[] };
  what_to_do: {
    text: string;
    urgency: 'immediate' | 'soon' | 'routine';
    category: string;
    why: string;
  }[];
  low_priority: string[];
  follow_ups: string[];
  terms?: TermsMap;
  before_score?: PatientScore;
  after_score?: PatientScore;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_STEPS: PipelineStep[] = [
  { id: 1, label: 'Reading your note',                description: 'Extracting text from your input',                         status: 'waiting' },
  { id: 2, label: 'Finding difficult and medical terms', description: 'Matching terms from AHRQ and medical dictionary',       status: 'waiting' },
  { id: 3, label: 'Simplifying language',             description: 'Rewriting to a 6th-grade reading level',                  status: 'waiting' },
  { id: 4, label: 'Clarifying actions and numbers',   description: 'Active voice, plain action verbs, clear instructions',    status: 'waiting' },
  { id: 5, label: 'Organizing your care plan',        description: 'Structuring into sections that are easy to follow',       status: 'waiting' },
];

const CATEGORY_ICONS: Record<string, string> = {
  medication:       '💊',
  appointment:      '📅',
  lifestyle:        '🏃',
  monitoring:       '📊',
  test:             '🧪',
  referral:         '👨‍⚕️',
  home_instruction: '🏠',
  warning_sign:     '⚠️',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stepIcon(status: StepStatus): string {
  if (status === 'done')   return '✓';
  if (status === 'active') return '◉';
  return '○';
}

function scoreColor(composite: number): string {
  if (composite >= 70) return 'score-green';
  if (composite >= 40) return 'score-amber';
  return 'score-red';
}

function renderTextWithTerms(text: string, terms: TermsMap): ReactNode {
  if (!terms || Object.keys(terms).length === 0) return text;

  // Sort terms longest-first to avoid matching sub-terms inside longer phrases
  const sortedTerms = Object.keys(terms).sort((a, b) => b.length - a.length);

  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let matched = false;
    for (const term of sortedTerms) {
      const idx = remaining.toLowerCase().indexOf(term.toLowerCase());
      if (idx === 0) {
        const displayTerm = remaining.slice(0, term.length);
        const glossaryEntry = terms[term];
        parts.push(
          <MedicalTerm
            key={key++}
            term={displayTerm}
            definition={glossaryEntry.definition}
            source={glossaryEntry.source}
          />
        );
        remaining = remaining.slice(term.length);
        matched = true;
        break;
      }
      if (idx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
        const displayTerm = remaining.slice(idx, idx + term.length);
        const glossaryEntry = terms[term];
        parts.push(
          <MedicalTerm
            key={key++}
            term={displayTerm}
            definition={glossaryEntry.definition}
            source={glossaryEntry.source}
          />
        );
        remaining = remaining.slice(idx + term.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      parts.push(<span key={key++}>{remaining}</span>);
      remaining = '';
    }
  }
  return <>{parts}</>;
}

function buildPdfHtml(result: AppointmentNote): string {
  const sections: string[] = [];

  const h2 = (t: string) =>
    `<h2 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #E5E7EB;">${t}</h2>`;

  if (result.summary) {
    sections.push(`${h2('Summary')}<p style="color:#374151;line-height:1.6;margin:0;">${result.summary}</p>`);
  }

  if (result.what_happened) {
    const wh = result.what_happened;
    sections.push(`${h2('What Happened')}
      ${wh.date ? `<p style="color:#6B7280;margin:0 0 4px 0;"><strong>Date:</strong> ${wh.date}</p>` : ''}
      ${wh.reason ? `<p style="color:#374151;margin:0 0 4px 0;">${wh.reason}</p>` : ''}
      <p style="color:#374151;margin:0;">${wh.summary}</p>`);
  }

  if (result.what_to_do.length > 0) {
    const items = result.what_to_do.map(a =>
      `<div style="padding:8px 12px;margin-bottom:6px;background:#F9FAFB;border-radius:6px;">
        <strong>[${a.urgency.toUpperCase()}]</strong> ${a.text}
        ${a.why ? `<br><span style="color:#6B7280;font-size:13px;">${a.why}</span>` : ''}
      </div>`
    ).join('');
    sections.push(`${h2('What To Do')}${items}`);
  }

  if (result.what_it_means) {
    const wm = result.what_it_means;
    const findings = wm.findings.map(f =>
      `<div style="padding:6px 12px;margin-bottom:4px;background:#F0FDF4;border-radius:6px;">
        <span style="color:#166534;font-weight:600;">[${f.urgency.toUpperCase()}]</span> ${f.item}
      </div>`
    ).join('');
    sections.push(`${h2('What It Means')}
      ${wm.headline ? `<p style="color:#374151;font-weight:500;margin:0 0 8px 0;">${wm.headline}</p>` : ''}
      ${findings}`);
  }

  if (result.low_priority.length > 0) {
    const items = result.low_priority.map(i => `<li>${i}</li>`).join('');
    sections.push(`${h2('Other Items')}<ul style="margin:0;padding-left:20px;color:#6B7280;">${items}</ul>`);
  }

  if (result.follow_ups.length > 0) {
    const items = result.follow_ups.map(f => `<li>${f}</li>`).join('');
    sections.push(`${h2('Follow-Ups')}<ul style="margin:0;padding-left:20px;color:#374151;">${items}</ul>`);
  }

  if (result.terms && Object.keys(result.terms).length > 0) {
    const items = Object.entries(result.terms).map(([term, g]) =>
      `<div style="margin-bottom:6px;"><strong>${term}:</strong> <span style="color:#6B7280;">${g.definition}</span></div>`
    ).join('');
    sections.push(`${h2('Medical Terms Glossary')}${items}`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; margin: 0; padding: 32px; max-width: 800px; margin: 0 auto; background: #fff; }
.header { border-bottom: 3px solid #4F46E5; padding-bottom: 16px; margin-bottom: 8px; }
.header h1 { font-size: 22px; font-weight: 700; color: #4F46E5; margin: 0; }
.footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 11px; }
</style></head><body>
<div class="header"><h1>Simplified Appointment Summary</h1></div>
${sections.join('')}
<div class="footer">Generated by Juno · Simplified for patient understanding · Data deleted after processing</div>
</body></html>`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UrgencyChip({ urgency }: { urgency: string }) {
  return <span className={`urgency-chip urgency-chip-${urgency}`}>{urgency}</span>;
}

function WhyToggle({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="why-wrapper">
      <button className="why-btn" onClick={() => setOpen(o => !o)}>
        {open ? 'Less ▲' : 'Why? ▼'}
      </button>
      {open && <div className="why-content">{text}</div>}
    </div>
  );
}

function ResultCard({
  color, icon, title, collapsible = false, defaultOpen = true, children,
}: {
  color: string; icon: string; title: string;
  collapsible?: boolean; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  return (
    <div className={`result-card ${color}`}>
      <div
        className="result-card-header"
        onClick={() => collapsible && setOpen(o => !o)}
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        <span className="result-card-title"><span>{icon}</span><span>{title}</span></span>
        {collapsible && <span className={`result-card-toggle ${open ? 'open' : ''}`}>▼</span>}
      </div>
      <div className={`result-card-body ${open ? '' : 'collapsed'}`}>{children}</div>
    </div>
  );
}

function ReadabilityCard({ before, after }: { before: PatientScore; after: PatientScore }) {
  const [expanded, setExpanded] = useState(false);
  const jargonBefore = `${Math.round(before.dimensions.jargon_density.raw * 100)}%`;
  const jargonAfter  = `${Math.round(after.dimensions.jargon_density.raw * 100)}%`;
  return (
    <div className="result-card score-card">
      <div className="result-card-header">
        <span className="result-card-title"><span>📊</span><span>Readability</span></span>
        {before.low_confidence && <span className="score-low-confidence">low confidence</span>}
      </div>
      <div className="result-card-body">
        <div className="score-comparison">
          <div className="score-side">
            <div className={`score-bubble ${scoreColor(before.composite)}`}>{before.composite}</div>
            <div className={`score-label-tag ${scoreColor(before.composite)}`}>{before.label}</div>
            <div className="score-side-caption">Before</div>
          </div>
          <div className="score-arrow">→</div>
          <div className="score-side">
            <div className={`score-bubble ${scoreColor(after.composite)}`}>{after.composite}</div>
            <div className={`score-label-tag ${scoreColor(after.composite)}`}>{after.label}</div>
            <div className="score-side-caption">After</div>
          </div>
        </div>
        <div className="score-highlights">
          <span>Grade level: {before.grade_estimate} → {after.grade_estimate}</span>
          <span>Jargon density: {jargonBefore} → {jargonAfter}</span>
        </div>
        <button className="score-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Hide breakdown ▲' : 'View full breakdown ▼'}
        </button>
        {expanded && (
          <div className="score-breakdown">
            {(Object.entries(after.dimensions) as [keyof PatientScore['dimensions'], PatientScoreDimension][]).map(([key, dim]) => {
              const bd = before.dimensions[key];
              return (
                <div className="score-breakdown-row" key={key}>
                  <span className="score-breakdown-label">{dim.label}</span>
                  <div className="score-breakdown-bars">
                    <div className="score-bar-wrap"><div className={`score-bar ${scoreColor(bd.score)}`} style={{ width: `${bd.score}%` }} /></div>
                    <div className="score-bar-wrap"><div className={`score-bar ${scoreColor(dim.score)}`} style={{ width: `${dim.score}%` }} /></div>
                  </div>
                  <span className="score-breakdown-vals">{bd.score} → {dim.score}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentNoteV11View({ result }: { result: AppointmentNote }) {
  const terms = result.terms ?? {};
  const withTerms = (text: string) => renderTextWithTerms(text, terms);

  return (
    <div className="result-cards">
      {result.before_score && result.after_score && (
        <ReadabilityCard before={result.before_score} after={result.after_score} />
      )}

      {result.summary && (
        <div className="result-card">
          <div className="result-card-body" style={{ paddingTop: '16px' }}>
            <p className="summary-paragraph">{withTerms(result.summary)}</p>
          </div>
        </div>
      )}

      <ResultCard color="blue" icon="📅" title="What Happened">
        {result.what_happened.date && <p className="narrative-date">{result.what_happened.date}</p>}
        {result.what_happened.reason && <p className="narrative-reason">{withTerms(result.what_happened.reason)}</p>}
        <p className="narrative-summary">{withTerms(result.what_happened.summary)}</p>
      </ResultCard>

      {result.what_to_do.length > 0 && (
        <ResultCard color="violet" icon="✅" title="What To Do">
          <div className="action-list">
            {result.what_to_do.map((a, i) => (
              <div key={i} className="action-row-with-why">
                <div className="action-row">
                  <span className="action-category-icon">{CATEGORY_ICONS[a.category] ?? '•'}</span>
                  <div className="action-content">
                    <UrgencyChip urgency={a.urgency} />
                    <span className="action-text">{withTerms(a.text)}</span>
                  </div>
                </div>
                <WhyToggle text={a.why} />
              </div>
            ))}
          </div>
        </ResultCard>
      )}

      <ResultCard color="teal" icon="🔍" title="What It Means">
        {result.what_it_means.headline && (
          <p className="narrative-headline">{withTerms(result.what_it_means.headline)}</p>
        )}
        <div className="findings-list">
          {result.what_it_means.findings.map((f, i) => (
            <div key={i} className="finding-row">
              <div className="finding-header">
                <UrgencyChip urgency={f.urgency} />
                <span className="finding-text">{withTerms(f.item)}</span>
              </div>
            </div>
          ))}
        </div>
      </ResultCard>

      {result.low_priority.length > 0 && (
        <ResultCard color="gray" icon="ℹ️" title="Other Items From Your Visit" collapsible defaultOpen={false}>
          <ul className="result-list">
            {result.low_priority.map((item, i) => <li key={i}>{withTerms(item)}</li>)}
          </ul>
        </ResultCard>
      )}

      {result.follow_ups.length > 0 && (
        <ResultCard color="blue" icon="📅" title="Follow-Ups">
          <ul className="result-list">
            {result.follow_ups.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </ResultCard>
      )}

      {Object.keys(terms).length > 0 && (
        <ResultCard color="gray" icon="📖" title="Medical Terms Glossary" collapsible defaultOpen={false}>
          <div className="glossary-list">
            {Object.entries(terms).map(([term, g]) => (
              <div className="glossary-item" key={term}>
                <span className="glossary-term">{term}</span>
                <span className="glossary-def">{g.definition}</span>
              </div>
            ))}
          </div>
        </ResultCard>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function V1_1Page() {
  const [appState, setAppState]   = useState<AppState>('upload');
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [file, setFile]           = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const [steps, setSteps]         = useState<PipelineStep[]>(INITIAL_STEPS);
  const [result, setResult]       = useState<AppointmentNote | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const abortRef                  = useRef<AbortController | null>(null);

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'txt', 'docx'].includes(ext ?? '')) {
      setError('Please upload a PDF, .txt, or .docx file.');
      return;
    }
    setError(null);
    setFile(f);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const updateStep = useCallback((stepId: number, status: StepStatus) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s));
  }, []);

  const canSubmit = inputMode === 'file' ? !!file : textInput.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setError(null);
    setResult(null);
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'waiting' })));
    setAppState('processing');

    const formData = new FormData();
    if (inputMode === 'file' && file) {
      formData.append('file', file);
    } else {
      formData.append('text', textInput);
    }

    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/simplify/v1-1`, {
        method: 'POST',
        body: formData,
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || `Server error: ${response.status}`);
      }

      const reader  = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const event = JSON.parse(payload) as {
              step: number | 'result';
              status?: 'active' | 'done';
              data?: AppointmentNote;
              error?: string;
            };
            if (event.error) throw new Error(event.error);
            if (event.step === 'result' && event.data) {
              setResult(event.data);
              setAppState('result');
            } else if (typeof event.step === 'number' && event.status) {
              updateStep(event.step, event.status);
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setAppState('upload');
    }
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'simplified-document.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    const html = buildPdfHtml(result);
    const win  = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setFile(null);
    setTextInput('');
    setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'waiting' })));
    setResult(null);
    setError(null);
    setAppState('upload');
  };

  return (
    <>
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>

      <div className="page-wrapper">
        <div className="container">

          {/* ── Hero ── */}
          <section className="hero">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '8px' }}>
              <div className="hero-badge">✦ AI-Powered Health Literacy</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <Link to="/versions" style={{ color: 'var(--accent)', textDecoration: 'none' }}>v1.1</Link>
                {' · '}
                <Link to="/versions" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>all versions</Link>
              </span>
            </div>
            <h1>Understand Your Appointment Note</h1>
            <p className="hero-sub">Built with experienced neuro professionals</p>
            <p className="hero-desc">
              Upload a provider note, appointment summary, or SOAP note.
              Juno will turn it into plain-language next steps you can understand and follow.
            </p>
          </section>

          {/* ── Upload ── */}
          {appState === 'upload' && (
            <section className="upload-section">
              <div className="glass-card" style={{ padding: '32px' }}>

                {/* Input mode tabs */}
                <div className="input-tabs">
                  <button
                    className={`input-tab ${inputMode === 'file' ? 'active' : ''}`}
                    onClick={() => setInputMode('file')}
                  >
                    Upload file
                  </button>
                  <button
                    className={`input-tab ${inputMode === 'text' ? 'active' : ''}`}
                    onClick={() => setInputMode('text')}
                  >
                    Paste text
                  </button>
                </div>

                {inputMode === 'file' ? (
                  <div
                    className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                  >
                    <input type="file" accept=".pdf,.txt,.docx" onChange={onFileChange} />
                    <div className="upload-icon">📄</div>
                    {file ? (
                      <p className="upload-file-name">✓ {file.name}</p>
                    ) : (
                      <>
                        <p className="upload-title">
                          {dragOver ? 'Drop to upload' : 'Drag & drop your document here'}
                        </p>
                        <p className="upload-hint">
                          PDF, TXT, or DOCX · Best for provider notes, appointment summaries, and SOAP notes
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <textarea
                    className="text-input-area"
                    placeholder="Paste your provider note, appointment summary, or SOAP note here…"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                  />
                )}

                <div className="privacy-note">
                  <span className="privacy-note-icon">🔒</span>
                  <span>Your data is deleted immediately after processing.</span>
                </div>

                {error && <div className="error-box">⚠ {error}</div>}

                <button className="cta-btn" disabled={!canSubmit} onClick={handleSubmit}>
                  Simplify My Note →
                </button>
              </div>
            </section>
          )}

          {/* ── Progress ── */}
          {appState === 'processing' && (
            <section className="progress-section">
              <div className="glass-card" style={{ padding: '32px' }}>
                <p className="section-title">Simplifying your note…</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '-8px', marginBottom: '16px' }}>
                  Finding medical terms, rewriting to plain language, and organizing your care plan.
                </p>
                <div className="step-list">
                  {steps.map(step => (
                    <div className="step-item" key={step.id}>
                      <div className={`step-node ${step.status}`}>{stepIcon(step.status)}</div>
                      <div className="step-content">
                        <p className={`step-label ${step.status === 'waiting' ? 'waiting' : ''}`}>{step.label}</p>
                        <p className="step-desc">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Result ── */}
          {appState === 'result' && result && (
            <section className="result-section">
              <div className="result-header">
                <h2 className="result-title">Your Simplified Note</h2>
                <span className="deleted-note">🔒 Deleted from servers</span>
              </div>

              <AppointmentNoteV11View result={result} />

              <div style={{ marginTop: '32px', textAlign: 'center' }}>
                <button
                  onClick={handleReset}
                  style={{
                    background: 'none', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-pill)', color: 'var(--text-secondary)',
                    fontSize: '0.85rem', padding: '8px 20px', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  ← Simplify another note
                </button>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Download bar */}
      {appState === 'result' && result && (
        <div className="download-bar">
          <div className="download-actions">
            <button className="download-btn-json" onClick={handleDownloadJson}>
              ↓ Download JSON
            </button>
            <button className="download-btn-pdf" onClick={handleDownloadPdf}>
              ↓ Download PDF
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify it builds**

```bash
cd frontend/simplify
npm run build 2>&1 | tail -30
```

Expected: no TypeScript errors. Bundle size increase is expected (new page + router).

- [ ] **Step 4: Commit**

```bash
git add src/pages/v1_1/
git commit -m "feat(simplify-fe): add V1.1 page with text input, hover/tap terms, JSON+PDF download"
```

---

## Task 18: Update `.firebaserc` versioning link (optional — no code change)

No change needed. The existing `firebase.json` `simplify` target rewrites all routes to `index.html`, so React Router handles `/versions`, `/v1`, and `/v1-1` automatically.

Confirm by checking `frontend/firebase.json`:
```json
{
  "target": "simplify",
  "rewrites": [{ "source": "**", "destination": "/index.html" }]
}
```
This is already in place — no action needed.

---

## Task 19: Smoke test

- [ ] **Step 1: Start local dev server**

```bash
cd frontend/simplify
npm run dev
```

- [ ] **Step 2: Verify routes**

Open browser and check:
- `http://localhost:5173/` → redirects to `/v1`
- `http://localhost:5173/v1` → existing upload UI with 7 steps
- `http://localhost:5173/v1-1` → new UI with file/text tabs and 5 steps
- `http://localhost:5173/versions` → version listing with links
- `http://localhost:5173/anything-else` → redirects to `/v1`

- [ ] **Step 3: Test V1.1 text input**

On `/v1-1`, click "Paste text", enter some sample text, click "Simplify My Note →".
Should call `POST /simplify/v1-1` with `text` in FormData.

- [ ] **Step 4: Verify download buttons appear after result**

After a successful result, the download bar shows "↓ Download JSON" and "↓ Download PDF".
- JSON button: downloads a `.json` file containing the result object.
- PDF button: opens a new tab with formatted HTML and triggers print dialog.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(simplify-fe): full V1.1 frontend — versioned routing, text input, hover/tap terms, downloads"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| React Router versioning (`/`, `/versions`, `/v1`, `/v1-1`) | Tasks 13, 15 |
| Default `/` points to configurable version | Task 12 (`VITE_DEFAULT_VERSION`) + Task 13 |
| Existing V1 UI unchanged | Task 14 (exact copy) |
| Text box input on V1.1 | Task 17 |
| V1.1 file input with updated copy | Task 17 |
| Updated "Simplifying your note…" copy + 5 steps | Task 17 |
| Remove follow-up questions from V1.1 | Task 17 (no questions in `AppointmentNote`, no section rendered) |
| Hover/tap medical term definitions | Tasks 16 + 17 |
| Longest-term-first matching | Task 17 (`renderTextWithTerms`) |
| JSON download button | Task 17 (`handleDownloadJson`) |
| PDF download (html → window.print) | Task 17 (`handleDownloadPdf` + `buildPdfHtml`) |
| Versions page listing all versions | Task 15 |
| `VITE_DEFAULT_VERSION` to switch default | Task 12 |
| Firebase rewrites already handle client-side routing | Task 18 (confirmed no change needed) |

**Placeholder scan:** None. All components contain complete TypeScript.

**Type consistency:** `AppointmentNote` type in V1_1Page includes `terms?: TermsMap`. `renderTextWithTerms` accepts `TermsMap`. `MedicalTerm` props match usage in `renderTextWithTerms`. `buildPdfHtml` accepts `AppointmentNote` and iterates `result.terms`.
