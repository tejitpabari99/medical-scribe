# V1-3 (Schema 1.5) Patient Note Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade appointment summaries to Schema 1.5, restructure the Simplify V1.1 pipeline output, and add a discharge summary type — all producing patient-facing notes that meet AHRQ health literacy standards.

**Architecture:** Six independent work areas proceed in dependency order: (1) backend schema + prompt, (2) TypeScript type system, (3) Expo frontend components, (4) appointment-level wiring, (5) Simplify V1.1 pipeline restructure, (6) discharge summary. Areas 3–6 depend on area 2. Areas 5–6 are independently parallel after area 2 is done.

**Tech Stack:** Python Flask (backend), React Native Expo + TypeScript (frontend-expo), React Vite (simplify frontend), Google Vertex AI (LLM), Firebase Firestore (storage)

---

## File Map

### New files to create
- `backend/backend-processing/summarySchema/1.5/schema.json`
- `backend/backend-processing/summarySchema/1.5/prompt.txt`
- `backend/backend-processing/summarySchema/discharge/schema.json`
- `backend/backend-processing/summarySchema/discharge/prompt.txt`
- `frontend/frontend-expo/components/pages/summary1-5/AppointmentSummaryV15.tsx` — main V1.5 container
- `frontend/frontend-expo/components/pages/summary1-5/SummarySection.tsx` — updated header "What You Need to Know"
- `frontend/frontend-expo/components/pages/summary1-5/DiagnosisSection.tsx` — main_conclusion callout + what_it_means_for_you + changed badge
- `frontend/frontend-expo/components/pages/summary1-5/MedicationsSection.tsx` — why first, NEW/CHANGED/STOPPED badges, side_effects_to_watch
- `frontend/frontend-expo/components/pages/summary1-5/TestsSection.tsx` — why + preparation
- `frontend/frontend-expo/components/pages/summary1-5/ProceduresSection.tsx` — why + what_to_expect
- `frontend/frontend-expo/components/pages/summary1-5/OtherInstructionsSection.tsx` — steps array support
- `frontend/frontend-expo/components/pages/summary1-5/WarningSignsSection.tsx` — NEW: color-coded by urgency
- `frontend/frontend-expo/components/pages/summary1-5/QuestionsSection.tsx` — flat array + copy button
- `frontend/frontend-expo/components/pages/summary1-5/SourceLinksSection.tsx` — NEW: footer source links
- `frontend/frontend-expo/components/pages/summary1-5/OtherDetailsSection.tsx` — NEW: collapsible low-importance aggregator
- `frontend/frontend-expo/components/pages/summary1-5/ReasonForVisitSection.tsx` — visible by default (not collapsed), renamed "Why You Came In"
- `frontend/frontend-expo/components/pages/summary1-5/FollowUpSection.tsx` — reuse layout from 1.4
- `frontend/frontend-expo/components/pages/summary1-5/CollapsibleCard.tsx` — copy from summary1-3 (no logic change)
- `frontend/frontend-expo/components/pages/summary1-5/index.ts` — barrel exports
- `frontend/frontend-expo/components/pages/DischargeSummaryView.tsx` — discharge summary screen

### Files to modify
- `backend/backend-processing/utils/constants.py` — add `SUMMARY_SCHEMA_VERSION_1_5 = "1.5"` and `SUMMARY_SCHEMA_VERSION_DISCHARGE = "discharge"`
- `frontend/frontend-expo/api/appointments.ts` — add `ProcessedSummaryV15`, `DischargeSummary`, `isV15Summary()`, `isDischargeSummary()`; extend `ProcessedSummary` union; extend `Appointment`
- `frontend/frontend-expo/app/appointment/[id].tsx` — add V1.5 branch to version-based rendering
- `frontend/frontend-expo/utils/generateAppointmentPdf.ts` — add V1.5 PDF render branch
- `backend/backend-processing/simplify/v1_1/pipeline.py` — replace `_STRUCTURING_SCHEMA` and `structure_appointment_note` with Schema 1.5 output shape

---

## Task 1: Backend — Schema 1.5 JSON

**Files:**
- Create: `backend/backend-processing/summarySchema/1.5/schema.json`
- Modify: `backend/backend-processing/utils/constants.py`

- [ ] **Step 1: Create the 1.5 schema directory and schema.json**

```bash
mkdir -p /root/projects/medical-scribe/backend/backend-processing/summarySchema/1.5
```

Create `backend/backend-processing/summarySchema/1.5/schema.json` with this exact content:

```json
{
    "version": "1.5",
    "title": "string",
    "doctor_name": "string",
    "location": "string",
    "date": "string",
    "summary": "string",
    "source_links": [
        {
            "type": "recording | document | notes",
            "label": "string",
            "url": "string"
        }
    ],
    "reason_for_visit": [
        {
            "reason": "string",
            "description": "string"
        }
    ],
    "diagnosis": {
        "main_conclusion": "string",
        "changed_since_last_visit": "string",
        "details": [
            {
                "title": "string",
                "plain_name": "string",
                "description": "string",
                "what_it_means_for_you": "string",
                "severity": "high | medium | low"
            }
        ]
    },
    "tests": [
        {
            "title": "string",
            "plain_name": "string",
            "why": "string",
            "description": "string",
            "preparation": "string",
            "importance": "high | low",
            "source": "string"
        }
    ],
    "medications": [
        {
            "title": "string",
            "plain_name": "string",
            "why": "string",
            "dosage": "string",
            "frequency": "string",
            "timing": "string",
            "duration": "string",
            "instructions": "string",
            "side_effects_to_watch": "string",
            "importance": "high | low",
            "source": "string",
            "change": "boolean",
            "change_description": "string"
        }
    ],
    "procedures": [
        {
            "title": "string",
            "plain_name": "string",
            "why": "string",
            "what_to_expect": "string",
            "timeframe": "string",
            "importance": "high | low",
            "source": "string"
        }
    ],
    "other": [
        {
            "title": "string",
            "why": "string",
            "steps": ["string"],
            "description": "string",
            "frequency": "string",
            "duration": "string",
            "importance": "high | low",
            "source": "string"
        }
    ],
    "follow_up": [
        {
            "time_frame": "string",
            "description": "string"
        }
    ],
    "warning_signs": [
        {
            "symptom": "string",
            "what_it_might_mean": "string",
            "what_to_do": "string",
            "urgency": "emergency | call_doctor | monitor | normal_side_effect",
            "related_to": "string",
            "importance": "high | low",
            "source": "string"
        }
    ],
    "questions": ["string"],
    "action_todo": [
        {
            "title": "string",
            "importance": "high | low",
            "source": "string"
        }
    ]
}
```

- [ ] **Step 2: Add V1.5 constant to constants.py**

Open `backend/backend-processing/utils/constants.py`. Add `SUMMARY_SCHEMA_VERSION_1_5 = "1.5"` after the existing `SUMMARY_SCHEMA_VERSION_1_4` line. The file should end up as:

```python
class Constants:
    # Summary Schema versions
    SUMMARY_SCHEMA_VERSION_1_2 = "1.2"
    SUMMARY_SCHEMA_VERSION_1_3 = "1.3"
    SUMMARY_SCHEMA_VERSION_1_4 = "1.4"
    SUMMARY_SCHEMA_VERSION_1_5 = "1.5"
    SUMMARY_SCHEMA_VERSION_DISCHARGE = "discharge"
```

- [ ] **Step 3: Verify the schema file is valid JSON**

```bash
python3 -c "import json; json.load(open('/root/projects/medical-scribe/backend/backend-processing/summarySchema/1.5/schema.json')); print('Valid JSON')"
```

Expected output: `Valid JSON`

- [ ] **Step 4: Commit**

```bash
git add backend/backend-processing/summarySchema/1.5/schema.json backend/backend-processing/utils/constants.py
git commit -m "feat(schema): add Schema 1.5 JSON with new fields for plain_name, why, warning_signs, etc."
```

---

## Task 2: Backend — Schema 1.5 LLM Prompt

**Files:**
- Create: `backend/backend-processing/summarySchema/1.5/prompt.txt`

- [ ] **Step 1: Create prompt.txt for Schema 1.5**

Create `backend/backend-processing/summarySchema/1.5/prompt.txt` with this exact content:

```
You are a medical assistant helping patients understand their medical appointments. Using the provided input (transcript, documents, or notes), extract and explain the medical information in plain language that any adult can understand.

For all given medical conversations, assume at least two speakers (doctor and patient) are present. Identify the speakers based on context and treat the doctor's words as ground truth for medical information.

For medical documents, understand the data and treat it as ground truth.

In case of information conflict, follow this hierarchy: Doctor's words in transcript > Medical documents > User notes.

CRITICAL LANGUAGE RULES (apply to every single field):
1. PLAIN LANGUAGE: Replace all medical terms with plain-language alternatives. If you must use a medical term, follow it immediately with a plain-language definition in parentheses. Example: "hypertension (high blood pressure)".
2. ACTIVE VOICE: Address the patient as "you" throughout. Never use passive constructions like "it is recommended that" or "patients should." Wrong: "Medication should be taken with food." Right: "Take this medication with food."
3. NO ABBREVIATIONS OR ACRONYMS: Never write BID, PRN, QD, CBC, EKG, etc. Always write the full form: "twice a day," "as needed," "once a day," "complete blood count," "heart tracing (ECG)."
4. SHORT SENTENCES: Write one idea per sentence. Maximum 20 words per sentence. If a sentence has two clauses joined by "and" or "because," split it into two sentences.
5. PLAIN LANGUAGE SUBSTITUTIONS (use these exact replacements when appropriate):
   - "administer" → "give" or "take"
   - "hypertension" → "high blood pressure"
   - "myocardial infarction" → "heart attack"
   - "contraindicated" → "should not be used"
   - "prognosis" → "what to expect"
   - "benign" → "not harmful" or "not cancer"
   - "dyspnea" → "shortness of breath"
   - "edema" → "swelling"
   - "tachycardia" → "fast heartbeat"
   - "bradycardia" → "slow heartbeat"
   - "hypertension" → "high blood pressure"
   - "hypotension" → "low blood pressure"
   - "febrile" → "feverish"
   - "nausea" → "feeling sick to your stomach"
   - "analgesic" → "pain reliever"
   - "antibiotic" → "infection-fighting medicine"
   - "chronic" → "long-term" or "ongoing"
   - "acute" → "sudden" or "severe"
   - "bilateral" → "on both sides"
   - "subcutaneous" → "under the skin"

FIELD-SPECIFIC RULES:
- summary: Write exactly 3 sentences. Sentence 1: why the patient came in (plain language). Sentence 2: the main clinical conclusion. Sentence 3: the single most important next step the patient must take.
- reason_for_visit.description: Use the patient's own words where possible. Write "knee pain," not "arthralgia."
- diagnosis.main_conclusion: Summarize the overall clinical picture in one plain-language sentence. This is the doctor's bottom-line judgment.
- diagnosis.changed_since_last_visit: Compare current state to previous visit only if prior context exists in the input. Omit (empty string) if no prior context.
- diagnosis.details[].plain_name: Use language a 6th-grader would understand. Example: "high blood pressure" for hypertension, "type 2 diabetes" for diabetes mellitus type 2.
- diagnosis.details[].what_it_means_for_you: 1-2 sentences explaining the real-world impact on this patient's daily life. Not the clinical definition — the personal impact.
- medications[].plain_name: Use common language. Example: "blood pressure medication" for Lisinopril, "blood thinner" for warfarin, "water pill" for furosemide.
- medications[].why: REQUIRED for every medication. One sentence explaining what this medication does for THIS patient's specific condition. Tie it to their diagnosis. Example: "This helps lower your blood pressure and protect your kidneys from long-term damage."
- medications[].side_effects_to_watch: The 1-2 most common or serious side effects in plain language. Example: "Watch for dry cough or dizziness when you stand up."
- medications[].change_description: Only include if change=true. Describe what changed: new medication, dose increase, dose decrease, or stopped.
- tests[].plain_name: Use common language. Example: "blood sugar test" for HbA1c, "cholesterol test" for lipid panel.
- tests[].why: REQUIRED for every test. One sentence explaining why THIS patient needs this test, not a generic description.
- tests[].preparation: Include only if preparation is required (fasting, stopping medications, etc.). Omit (empty string) if no preparation needed.
- procedures[].plain_name: Common language. Example: "heart specialist visit" for cardiology referral.
- procedures[].why: One sentence explaining why this referral or procedure is needed for this patient.
- procedures[].what_to_expect: Brief patient-facing description of what will happen.
- other[].why: What will happen if the patient follows or does not follow this instruction.
- other[].steps: If the instruction involves multiple actions, list them as separate step strings. Example: ["Apply ice to your knee", "Do this 3 times per day", "Keep your leg elevated when sitting"]. Use an empty array for single-step instructions.
- warning_signs[].symptom: Plain-language symptom name. Example: "sudden severe headache."
- warning_signs[].what_to_do: REQUIRED. Specific instruction: "Call your doctor within 24 hours," "Go to the emergency room immediately," or "This is a normal side effect and will improve in a few days." Never write vague instructions like "seek medical attention."
- warning_signs[].urgency: Classify as emergency (go to ER), call_doctor (call within 24-48h), monitor (watch but no immediate action), or normal_side_effect (expected, not alarming).
- warning_signs[].related_to: Name of the medication or condition this warning sign is linked to.
- questions: Return a flat JSON array of strings. Exactly 3 questions. Questions should help the patient understand or manage their care better. Questions should not challenge the doctor's judgment.

GENERAL RULES:
1. Do not hallucinate. Stick to facts from the input only.
2. Do not add knowledge outside the transcript/documents unless specifically required by schema comments.
3. Leave sections blank (empty string or empty array) if there are no relevant details.
4. Do not repeat points across sections. If something fits 2 sections, put it in only one.
5. Do not use patient or doctor names. Use "patient" and "doctor."
6. Only include action_todo items that are the most critical across all sections.

Raw Input:
{{input}}

Return ONLY a valid JSON object. Use this exact structure:
{{schema}}
```

- [ ] **Step 2: Verify prompt.txt exists and is readable**

```bash
wc -l /root/projects/medical-scribe/backend/backend-processing/summarySchema/1.5/prompt.txt
```

Expected: a line count greater than 50.

- [ ] **Step 3: Smoke-test that the schema loader can find schema version 1.5**

```bash
cd /root/projects/medical-scribe/backend/backend-processing && python3 -c "
from utils.vertex_ai import VertexAIService
import os
base_dir = os.path.join('summarySchema', '1.5')
assert os.path.exists(os.path.join(base_dir, 'schema.json')), 'schema.json missing'
assert os.path.exists(os.path.join(base_dir, 'prompt.txt')), 'prompt.txt missing'
print('Schema 1.5 files found OK')
"
```

Expected output: `Schema 1.5 files found OK`

- [ ] **Step 4: Commit**

```bash
git add backend/backend-processing/summarySchema/1.5/prompt.txt
git commit -m "feat(schema): add Schema 1.5 LLM prompt with AHRQ language rules and plain-language enforcement"
```

---

## Task 3: Backend — Wire Schema 1.5 to Processing Route

**Files:**
- Modify: `backend/backend-processing/routes/processing.py` (line ~338, where `SUMMARY_SCHEMA_VERSION_1_4` is currently passed)

- [ ] **Step 1: Find and update the schema version call in processing.py**

Open `backend/backend-processing/routes/processing.py` and find the line:

```python
soap_notes = generate_soap_from_text(combined_text, ai_service, schema_version=Constants.SUMMARY_SCHEMA_VERSION_1_4)
```

Replace it with:

```python
soap_notes = generate_soap_from_text(combined_text, ai_service, schema_version=Constants.SUMMARY_SCHEMA_VERSION_1_5)
```

- [ ] **Step 2: Verify the import of Constants includes the new constant**

In `processing.py`, confirm the existing `from utils.constants import Constants` import is present (it should already be there). No change needed — the new constant is on the `Constants` class.

- [ ] **Step 3: Run a quick import check**

```bash
cd /root/projects/medical-scribe/backend/backend-processing && python3 -c "
from utils.constants import Constants
assert Constants.SUMMARY_SCHEMA_VERSION_1_5 == '1.5', 'constant missing'
print('Constants check passed')
"
```

Expected: `Constants check passed`

- [ ] **Step 4: Commit**

```bash
git add backend/backend-processing/routes/processing.py
git commit -m "feat(backend): wire processing route to use Schema 1.5 by default"
```

---

## Task 4: TypeScript Types — ProcessedSummaryV15 and DischargeSummary

**Files:**
- Modify: `frontend/frontend-expo/api/appointments.ts` (around lines 308–324)

- [ ] **Step 1: Add ProcessedSummaryV15 interface**

Open `frontend/frontend-expo/api/appointments.ts`. After the closing brace of the `ProcessedSummaryV14` interface (around line 308), add the following block:

```typescript
// =============================================================================
// Types — Schema v1.5
// =============================================================================

export interface ProcessedSummaryV15 {
  version: '1.5';
  title?: string;
  doctor_name?: string;
  location?: string;
  date?: string;
  summary?: string;
  source_links?: Array<{
    type: 'recording' | 'document' | 'notes';
    label: string;
    url: string;
  }>;
  reason_for_visit?: Array<{
    reason: string;
    description: string;
  }>;
  diagnosis?: {
    main_conclusion?: string;
    changed_since_last_visit?: string;
    details: Array<{
      title: string;
      plain_name?: string;
      description: string;
      what_it_means_for_you?: string;
      severity?: 'high' | 'medium' | 'low';
    }>;
  };
  tests?: Array<{
    title: string;
    plain_name?: string;
    why?: string;
    description: string;
    preparation?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  medications?: Array<{
    title: string;
    plain_name?: string;
    why?: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    instructions?: string;
    side_effects_to_watch?: string;
    importance: 'high' | 'low';
    source?: string;
    change?: boolean;
    change_description?: string;
  }>;
  procedures?: Array<{
    title: string;
    plain_name?: string;
    why?: string;
    what_to_expect?: string;
    timeframe?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  other?: Array<{
    title: string;
    why?: string;
    steps?: string[];
    description?: string;
    frequency?: string;
    duration?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  follow_up?: Array<{
    description: string;
    time_frame: string;
  }>;
  warning_signs?: Array<{
    symptom: string;
    what_it_might_mean?: string;
    what_to_do: string;
    urgency: 'emergency' | 'call_doctor' | 'monitor' | 'normal_side_effect';
    related_to?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  questions?: string[];
  action_todo?: Array<{
    title: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
}

// =============================================================================
// Types — Discharge Summary
// =============================================================================

export interface DischargeSummary {
  version: 'discharge';
  title?: string;
  admission_date?: string;
  discharge_date?: string;
  summary?: string;
  reason_for_admission?: string;
  what_happened_during_stay?: string;
  source_links?: Array<{
    type: 'recording' | 'document' | 'notes';
    label: string;
    url: string;
  }>;
  medications?: Array<{
    title: string;
    plain_name?: string;
    why?: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    instructions?: string;
    side_effects_to_watch?: string;
    importance: 'high' | 'low';
    source?: string;
    change?: boolean;
    change_description?: string;
  }>;
  medications_stopped?: Array<{
    title: string;
    reason_stopped?: string;
  }>;
  procedures?: Array<{
    title: string;
    plain_name?: string;
    why?: string;
    what_to_expect?: string;
    timeframe?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  other?: Array<{
    title: string;
    why?: string;
    steps?: string[];
    description?: string;
    frequency?: string;
    duration?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  follow_up?: Array<{
    description: string;
    time_frame: string;
  }>;
  return_to_er_if?: Array<{
    symptom: string;
    plain_description: string;
  }>;
  warning_signs?: Array<{
    symptom: string;
    what_it_might_mean?: string;
    what_to_do: string;
    urgency: 'emergency' | 'call_doctor' | 'monitor' | 'normal_side_effect';
    related_to?: string;
    importance: 'high' | 'low';
    source?: string;
  }>;
  questions?: string[];
}
```

- [ ] **Step 2: Extend the ProcessedSummary union type**

Find the line:

```typescript
export type ProcessedSummary = ProcessedSummaryV12 | ProcessedSummaryV13 | ProcessedSummaryV14;
```

Replace it with:

```typescript
export type ProcessedSummary = ProcessedSummaryV12 | ProcessedSummaryV13 | ProcessedSummaryV14 | ProcessedSummaryV15;
```

- [ ] **Step 3: Add isV15Summary type guard**

After the `isV14Summary` function, add:

```typescript
/** Type guard: returns true when the summary follows the v1.5 schema. */
export function isV15Summary(ps: ProcessedSummary | undefined | null): ps is ProcessedSummaryV15 {
  return !!ps && (ps as ProcessedSummaryV15).version === '1.5';
}

/** Type guard: returns true when the document is a discharge summary. */
export function isDischargeSummary(ps: ProcessedSummary | DischargeSummary | undefined | null): ps is DischargeSummary {
  return !!ps && (ps as DischargeSummary).version === 'discharge';
}
```

- [ ] **Step 4: Extend the Appointment interface to allow DischargeSummary**

Find the `Appointment` interface. The `processedSummary` field currently has type `ProcessedSummary`. Update it to also allow `DischargeSummary`:

```typescript
export interface Appointment {
  status: 'InProgress' | 'Completed' | 'Error';
  appointmentDate: string;
  title?: string;
  doctor?: string;
  location?: string;
  processedSummary?: ProcessedSummary | DischargeSummary;
  rawTranscript?: string;
  recordingLink?: string;
  error?: string;
}
```

- [ ] **Step 5: TypeScript compile check**

```bash
cd /root/projects/medical-scribe/frontend/frontend-expo && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the new types. (Other pre-existing errors are acceptable.)

- [ ] **Step 6: Commit**

```bash
git add frontend/frontend-expo/api/appointments.ts
git commit -m "feat(types): add ProcessedSummaryV15, DischargeSummary interfaces and type guards"
```

---

## Task 5: Frontend — CollapsibleCard (copy to summary1-5)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/CollapsibleCard.tsx`

This component is identical to the one in `summary1-3`. Copy it unchanged so the new folder is self-contained.

- [ ] **Step 1: Create the summary1-5 folder and copy CollapsibleCard**

```bash
mkdir -p /root/projects/medical-scribe/frontend/frontend-expo/components/pages/summary1-5
cp /root/projects/medical-scribe/frontend/frontend-expo/components/pages/summary1-3/CollapsibleCard.tsx \
   /root/projects/medical-scribe/frontend/frontend-expo/components/pages/summary1-5/CollapsibleCard.tsx
```

- [ ] **Step 2: Verify the file is present**

```bash
ls /root/projects/medical-scribe/frontend/frontend-expo/components/pages/summary1-5/
```

Expected: `CollapsibleCard.tsx`

---

## Task 6: Frontend — SummarySection (V1.5)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/SummarySection.tsx`

This updates the heading from "Summary" to "What You Need to Know" and adds a light background tint.

- [ ] **Step 1: Create SummarySection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/SummarySection.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface SummarySectionProps {
  summary: string;
}

export function SummarySection({ summary }: SummarySectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.heading}>What You Need to Know</Text>
      </View>
      <Text style={styles.body}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.foreground,
  },
  body: {
    fontSize: 15,
    color: Colors.foreground,
    lineHeight: 26,
  },
});
```

---

## Task 7: Frontend — ReasonForVisitSection (V1.5, visible by default)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/ReasonForVisitSection.tsx`

Change: header renamed "Why You Came In", section starts expanded (not collapsed).

- [ ] **Step 1: Create ReasonForVisitSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/ReasonForVisitSection.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface ReasonForVisit {
  reason: string;
  description: string;
}

interface ReasonForVisitSectionProps {
  reasonForVisit: ReasonForVisit[];
}

export function ReasonForVisitSection({ reasonForVisit }: ReasonForVisitSectionProps) {
  if (!reasonForVisit || reasonForVisit.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="medical-outline" size={20} color={Colors.purple[500]} />
        <Text style={styles.heading}>Why You Came In</Text>
      </View>
      <View style={styles.list}>
        {reasonForVisit.map((item, index) => (
          <View key={index} style={styles.item}>
            <View style={styles.borderAccent} />
            <View style={styles.content}>
              <Text style={styles.reason}>{item.reason}</Text>
              {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.foreground,
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
  },
  borderAccent: {
    width: 4,
    backgroundColor: Colors.purple[500],
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
    paddingVertical: 4,
  },
  reason: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    color: Colors.secondaryForeground,
    lineHeight: 22,
  },
});
```

---

## Task 8: Frontend — DiagnosisSection (V1.5)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/DiagnosisSection.tsx`

New features: `main_conclusion` callout box at top, `what_it_means_for_you` under each item, `changed_since_last_visit` badge, `plain_name` in parentheses.

- [ ] **Step 1: Create DiagnosisSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/DiagnosisSection.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReadMore } from '@/components/shared/ReadMore';
import { Colors } from '@/constants/Colors';

interface DiagnosisDetail {
  title: string;
  plain_name?: string;
  description: string;
  what_it_means_for_you?: string;
  severity?: 'high' | 'medium' | 'low';
}

interface DiagnosisSectionProps {
  diagnosis: {
    main_conclusion?: string;
    changed_since_last_visit?: string;
    details: DiagnosisDetail[];
  };
}

export function DiagnosisSection({ diagnosis }: DiagnosisSectionProps) {
  if (!diagnosis?.details || diagnosis.details.length === 0) return null;

  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedDetails = [...diagnosis.details].sort((a, b) => {
    const aSev = a.severity ? severityOrder[a.severity] ?? 3 : 3;
    const bSev = b.severity ? severityOrder[b.severity] ?? 3 : 3;
    return aSev - bSev;
  });

  const items = sortedDetails.map((detail, index) => (
    <View key={index} style={styles.item}>
      <View style={styles.borderAccent} />
      <View style={styles.content}>
        <Text style={styles.title}>
          {detail.plain_name ? `${detail.plain_name} (${detail.title})` : detail.title}
        </Text>
        <Text style={styles.description}>{detail.description}</Text>
        {detail.what_it_means_for_you ? (
          <View style={styles.meansBox}>
            <Text style={styles.meansLabel}>What this means for you:</Text>
            <Text style={styles.meansText}>{detail.what_it_means_for_you}</Text>
          </View>
        ) : null}
      </View>
    </View>
  ));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="search-outline" size={20} color={Colors.accent2} />
        <Text style={styles.heading}>What the Doctor Found</Text>
      </View>

      {diagnosis.main_conclusion ? (
        <View style={styles.conclusionBox}>
          <Text style={styles.conclusionLabel}>Overall conclusion</Text>
          <Text style={styles.conclusionText}>{diagnosis.main_conclusion}</Text>
        </View>
      ) : null}

      {diagnosis.changed_since_last_visit ? (
        <View style={styles.changedBadge}>
          <Ionicons name="trending-up-outline" size={14} color={Colors.teal[700]} />
          <Text style={styles.changedText}>{diagnosis.changed_since_last_visit}</Text>
        </View>
      ) : null}

      <ReadMore items={items} initialCount={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.foreground,
  },
  conclusionBox: {
    backgroundColor: Colors.teal[50],
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.teal[300],
  },
  conclusionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.teal[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  conclusionText: {
    fontSize: 15,
    color: Colors.foreground,
    lineHeight: 22,
  },
  changedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.teal[100],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  changedText: {
    fontSize: 13,
    color: Colors.teal[700],
    fontWeight: '500',
  },
  item: {
    flexDirection: 'row',
  },
  borderAccent: {
    width: 4,
    backgroundColor: Colors.red[500],
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
    paddingVertical: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  description: {
    fontSize: 15,
    color: Colors.gray[600],
    lineHeight: 22,
  },
  meansBox: {
    marginTop: 8,
    backgroundColor: Colors.amber[50],
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.amber[500],
  },
  meansLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.amber[700],
    marginBottom: 2,
  },
  meansText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
});
```

---

## Task 9: Frontend — MedicationsSection (V1.5)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/MedicationsSection.tsx`

New features: `plain_name` in title, `why` shown first before dosage, NEW/CHANGED/STOPPED badges, `side_effects_to_watch` in amber.

- [ ] **Step 1: Create MedicationsSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/MedicationsSection.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReadMore } from '@/components/shared/ReadMore';
import { CollapsibleCard } from './CollapsibleCard';
import { Colors } from '@/constants/Colors';

interface Medication {
  title: string;
  plain_name?: string;
  why?: string;
  dosage?: string;
  frequency?: string;
  timing?: string;
  duration?: string;
  instructions?: string;
  side_effects_to_watch?: string;
  importance: 'high' | 'low';
  source?: string;
  change?: boolean;
  change_description?: string;
}

interface MedicationsSectionProps {
  medications: Medication[];
}

function MedBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function resolveBadge(med: Medication): React.ReactElement | null {
  if (!med.change) return null;
  const desc = (med.change_description ?? '').toLowerCase();
  if (desc.includes('stop') || desc.includes('discontinu')) {
    return <MedBadge label="STOPPED" color={Colors.red[700]} bg={Colors.red[100]} />;
  }
  if (desc.includes('new') || desc.includes('start')) {
    return <MedBadge label="NEW" color={Colors.teal[700]} bg={Colors.teal[100]} />;
  }
  return <MedBadge label="CHANGED" color={Colors.amber[700]} bg={Colors.amber[100]} />;
}

function renderItem(med: Medication, index: number) {
  return (
    <View key={index} style={styles.item}>
      <View style={styles.titleRow}>
        <Text style={styles.itemTitle}>
          {med.plain_name ? `${med.plain_name} (${med.title})` : med.title}
        </Text>
        {resolveBadge(med)}
      </View>

      {med.why ? (
        <View style={styles.whyBox}>
          <Text style={styles.whyLabel}>Why you're taking this:</Text>
          <Text style={styles.whyText}>{med.why}</Text>
        </View>
      ) : null}

      {med.change_description ? (
        <Text style={styles.changeDesc}>{med.change_description}</Text>
      ) : null}

      {(med.dosage || med.frequency || med.timing || med.duration) && (
        <View style={styles.detailsRow}>
          {med.dosage ? <Text style={styles.detailText}>💊 {med.dosage}</Text> : null}
          {med.frequency ? <Text style={styles.detailText}>⏱ {med.frequency}</Text> : null}
          {med.timing ? <Text style={styles.detailText}>🕐 {med.timing}</Text> : null}
          {med.duration ? <Text style={styles.detailText}>📅 {med.duration}</Text> : null}
        </View>
      )}

      {med.instructions ? <Text style={styles.itemDesc}>{med.instructions}</Text> : null}

      {med.side_effects_to_watch ? (
        <View style={styles.sideEffectsBox}>
          <Text style={styles.sideEffectsLabel}>⚠ Watch for:</Text>
          <Text style={styles.sideEffectsText}>{med.side_effects_to_watch}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function MedicationsSection({ medications }: MedicationsSectionProps) {
  if (!medications || medications.length === 0) return null;

  const sorted = [...medications].sort((a, b) => {
    if (a.importance === b.importance) return 0;
    return a.importance === 'high' ? -1 : 1;
  });

  const allLow = medications.every((m) => m.importance === 'low');
  const highItems = sorted.filter((m) => m.importance === 'high');
  const lowItems = sorted.filter((m) => m.importance === 'low');

  return (
    <CollapsibleCard
      icon="medkit-outline"
      iconColor={Colors.blue[500]}
      heading="Your Medications"
      collapsible
      defaultCollapsed={allLow}
    >
      <View style={styles.list}>
        {highItems.map((m, i) => renderItem(m, i))}
        {lowItems.length > 0 && (
          <ReadMore
            items={lowItems.map((m, i) => renderItem(m, highItems.length + i))}
            initialCount={highItems.length > 0 ? 0 : 2}
          />
        )}
      </View>
    </CollapsibleCard>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  item: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue[500],
    paddingLeft: 12,
    paddingVertical: 10,
    backgroundColor: Colors.gray[50],
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  whyBox: {
    backgroundColor: Colors.blue[50],
    borderRadius: 6,
    padding: 8,
  },
  whyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.blue[700],
    marginBottom: 2,
  },
  whyText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  changeDesc: {
    fontSize: 13,
    color: Colors.amber[700],
    fontStyle: 'italic',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.secondaryForeground,
  },
  itemDesc: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  sideEffectsBox: {
    backgroundColor: Colors.amber[50],
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.amber[500],
  },
  sideEffectsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.amber[700],
    marginBottom: 2,
  },
  sideEffectsText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
});
```

---

## Task 10: Frontend — TestsSection (V1.5)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/TestsSection.tsx`

New features: `plain_name`, `why` shown before description, `preparation` shown with checklist icon.

- [ ] **Step 1: Create TestsSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/TestsSection.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReadMore } from '@/components/shared/ReadMore';
import { CollapsibleCard } from './CollapsibleCard';
import { Colors } from '@/constants/Colors';

interface Test {
  title: string;
  plain_name?: string;
  why?: string;
  description: string;
  preparation?: string;
  importance: 'high' | 'low';
  source?: string;
}

interface TestsSectionProps {
  tests: Test[];
}

function renderItem(test: Test, index: number) {
  return (
    <View key={index} style={styles.item}>
      <Text style={styles.itemTitle}>
        {test.plain_name ? `${test.plain_name} (${test.title})` : test.title}
      </Text>
      {test.why ? (
        <View style={styles.whyBox}>
          <Text style={styles.whyLabel}>Why you need this:</Text>
          <Text style={styles.whyText}>{test.why}</Text>
        </View>
      ) : null}
      {test.description ? <Text style={styles.itemDesc}>{test.description}</Text> : null}
      {test.preparation ? (
        <View style={styles.prepBox}>
          <Ionicons name="checkmark-circle-outline" size={14} color={Colors.teal[700]} />
          <Text style={styles.prepText}>How to prepare: {test.preparation}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function TestsSection({ tests }: TestsSectionProps) {
  if (!tests || tests.length === 0) return null;

  const sorted = [...tests].sort((a, b) => {
    if (a.importance === b.importance) return 0;
    return a.importance === 'high' ? -1 : 1;
  });
  const allLow = tests.every((t) => t.importance === 'low');
  const highItems = sorted.filter((t) => t.importance === 'high');
  const lowItems = sorted.filter((t) => t.importance === 'low');

  return (
    <CollapsibleCard
      icon="flask-outline"
      iconColor="#22C55E"
      heading="Tests & Lab Work"
      collapsible
      defaultCollapsed={allLow}
    >
      <View style={styles.list}>
        {highItems.map((t, i) => renderItem(t, i))}
        {lowItems.length > 0 && (
          <ReadMore
            items={lowItems.map((t, i) => renderItem(t, highItems.length + i))}
            initialCount={highItems.length > 0 ? 0 : 2}
          />
        )}
      </View>
    </CollapsibleCard>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  item: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: Colors.gray[50],
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
  },
  whyBox: {
    backgroundColor: Colors.green[50],
    borderRadius: 6,
    padding: 8,
  },
  whyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.green[700],
    marginBottom: 2,
  },
  whyText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  itemDesc: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  prepBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.teal[50],
    borderRadius: 6,
    padding: 8,
  },
  prepText: {
    fontSize: 14,
    color: Colors.teal[700],
    flex: 1,
    lineHeight: 20,
  },
});
```

---

## Task 11: Frontend — ProceduresSection (V1.5)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/ProceduresSection.tsx`

New features: `plain_name`, `why`, `what_to_expect`.

- [ ] **Step 1: Create ProceduresSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/ProceduresSection.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReadMore } from '@/components/shared/ReadMore';
import { CollapsibleCard } from './CollapsibleCard';
import { Colors } from '@/constants/Colors';

interface Procedure {
  title: string;
  plain_name?: string;
  why?: string;
  what_to_expect?: string;
  timeframe?: string;
  importance: 'high' | 'low';
  source?: string;
}

interface ProceduresSectionProps {
  procedures: Procedure[];
}

function renderItem(proc: Procedure, index: number) {
  return (
    <View key={index} style={styles.item}>
      <Text style={styles.itemTitle}>
        {proc.plain_name ? `${proc.plain_name} (${proc.title})` : proc.title}
      </Text>
      {proc.why ? (
        <View style={styles.whyBox}>
          <Text style={styles.whyLabel}>Why you need this:</Text>
          <Text style={styles.whyText}>{proc.why}</Text>
        </View>
      ) : null}
      {proc.what_to_expect ? (
        <View style={styles.expectBox}>
          <Text style={styles.expectLabel}>What to expect:</Text>
          <Text style={styles.expectText}>{proc.what_to_expect}</Text>
        </View>
      ) : null}
      {proc.timeframe ? <Text style={styles.detailText}>📅 {proc.timeframe}</Text> : null}
    </View>
  );
}

export function ProceduresSection({ procedures }: ProceduresSectionProps) {
  if (!procedures || procedures.length === 0) return null;

  const sorted = [...procedures].sort((a, b) => {
    if (a.importance === b.importance) return 0;
    return a.importance === 'high' ? -1 : 1;
  });
  const allLow = procedures.every((p) => p.importance === 'low');
  const highItems = sorted.filter((p) => p.importance === 'high');
  const lowItems = sorted.filter((p) => p.importance === 'low');

  return (
    <CollapsibleCard
      icon="pulse-outline"
      iconColor={Colors.purple[500]}
      heading="Referrals & Procedures"
      collapsible
      defaultCollapsed={allLow}
    >
      <View style={styles.list}>
        {highItems.map((p, i) => renderItem(p, i))}
        {lowItems.length > 0 && (
          <ReadMore
            items={lowItems.map((p, i) => renderItem(p, highItems.length + i))}
            initialCount={highItems.length > 0 ? 0 : 2}
          />
        )}
      </View>
    </CollapsibleCard>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  item: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.purple[500],
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: Colors.gray[50],
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
  },
  whyBox: {
    backgroundColor: Colors.purple[50],
    borderRadius: 6,
    padding: 8,
  },
  whyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.purple[700],
    marginBottom: 2,
  },
  whyText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  expectBox: {
    backgroundColor: Colors.gray[100],
    borderRadius: 6,
    padding: 8,
  },
  expectLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 2,
  },
  expectText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  detailText: {
    fontSize: 14,
    color: Colors.secondaryForeground,
    marginTop: 2,
  },
});
```

---

## Task 12: Frontend — OtherInstructionsSection (V1.5)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/OtherInstructionsSection.tsx`

New features: `why` field, `steps` array rendered as numbered list (falls back to `description` for single-step).

- [ ] **Step 1: Create OtherInstructionsSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/OtherInstructionsSection.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReadMore } from '@/components/shared/ReadMore';
import { CollapsibleCard } from './CollapsibleCard';
import { Colors } from '@/constants/Colors';

interface OtherInstruction {
  title: string;
  why?: string;
  steps?: string[];
  description?: string;
  frequency?: string;
  duration?: string;
  importance: 'high' | 'low';
  source?: string;
}

interface OtherInstructionsSectionProps {
  other: OtherInstruction[];
}

function renderItem(item: OtherInstruction, index: number) {
  return (
    <View key={index} style={styles.item}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      {item.why ? (
        <View style={styles.whyBox}>
          <Text style={styles.whyLabel}>Why this matters:</Text>
          <Text style={styles.whyText}>{item.why}</Text>
        </View>
      ) : null}
      {item.steps && item.steps.length > 0 ? (
        <View style={styles.stepsList}>
          {item.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : item.description ? (
        <Text style={styles.itemDesc}>{item.description}</Text>
      ) : null}
      {(item.frequency || item.duration) && (
        <View style={styles.detailsRow}>
          {item.frequency ? <Text style={styles.detailText}>⏱ {item.frequency}</Text> : null}
          {item.duration ? <Text style={styles.detailText}>📅 {item.duration}</Text> : null}
        </View>
      )}
    </View>
  );
}

export function OtherInstructionsSection({ other }: OtherInstructionsSectionProps) {
  if (!other || other.length === 0) return null;

  const sorted = [...other].sort((a, b) => {
    if (a.importance === b.importance) return 0;
    return a.importance === 'high' ? -1 : 1;
  });
  const allLow = other.every((o) => o.importance === 'low');
  const highItems = sorted.filter((o) => o.importance === 'high');
  const lowItems = sorted.filter((o) => o.importance === 'low');

  return (
    <CollapsibleCard
      icon="clipboard-outline"
      iconColor="#F97316"
      heading="Home Instructions"
      collapsible
      defaultCollapsed={allLow}
    >
      <View style={styles.list}>
        {highItems.map((o, i) => renderItem(o, i))}
        {lowItems.length > 0 && (
          <ReadMore
            items={lowItems.map((o, i) => renderItem(o, highItems.length + i))}
            initialCount={highItems.length > 0 ? 0 : 2}
          />
        )}
      </View>
    </CollapsibleCard>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  item: {
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
    paddingLeft: 12,
    paddingVertical: 8,
    backgroundColor: Colors.gray[50],
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
  },
  whyBox: {
    backgroundColor: Colors.amber[50],
    borderRadius: 6,
    padding: 8,
  },
  whyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.amber[700],
    marginBottom: 2,
  },
  whyText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
  },
  stepsList: { gap: 6 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 20,
    flex: 1,
  },
  itemDesc: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.secondaryForeground,
  },
});
```

---

## Task 13: Frontend — WarningSignsSection (NEW)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/WarningSignsSection.tsx`

New component. Color-coded by urgency: emergency=red, call_doctor=amber, monitor=gray, normal_side_effect=gray. Sorted emergency first. `what_to_do` is always visible (not collapsed).

- [ ] **Step 1: Create WarningSignsSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/WarningSignsSection.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type Urgency = 'emergency' | 'call_doctor' | 'monitor' | 'normal_side_effect';

interface WarningSign {
  symptom: string;
  what_it_might_mean?: string;
  what_to_do: string;
  urgency: Urgency;
  related_to?: string;
  importance: 'high' | 'low';
  source?: string;
}

interface WarningSignsSectionProps {
  warningSigns: WarningSign[];
}

const URGENCY_ORDER: Record<Urgency, number> = {
  emergency: 0,
  call_doctor: 1,
  monitor: 2,
  normal_side_effect: 3,
};

const URGENCY_CONFIG: Record<Urgency, { borderColor: string; bg: string; labelBg: string; label: string; labelColor: string; icon: string }> = {
  emergency: {
    borderColor: Colors.red[500],
    bg: Colors.red[50],
    labelBg: Colors.red[500],
    label: 'EMERGENCY',
    labelColor: '#fff',
    icon: 'alert-circle',
  },
  call_doctor: {
    borderColor: Colors.amber[500],
    bg: Colors.amber[50],
    labelBg: Colors.amber[500],
    label: 'CALL DOCTOR',
    labelColor: '#fff',
    icon: 'call-outline',
  },
  monitor: {
    borderColor: Colors.gray[300],
    bg: Colors.gray[50],
    labelBg: Colors.gray[400],
    label: 'WATCH',
    labelColor: '#fff',
    icon: 'eye-outline',
  },
  normal_side_effect: {
    borderColor: Colors.gray[300],
    bg: Colors.gray[50],
    labelBg: Colors.gray[400],
    label: 'NORMAL',
    labelColor: '#fff',
    icon: 'checkmark-circle-outline',
  },
};

export function WarningSignsSection({ warningSigns }: WarningSignsSectionProps) {
  if (!warningSigns || warningSigns.length === 0) return null;

  const sorted = [...warningSigns].sort(
    (a, b) => (URGENCY_ORDER[a.urgency] ?? 4) - (URGENCY_ORDER[b.urgency] ?? 4),
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="warning-outline" size={20} color={Colors.red[500]} />
        <Text style={styles.heading}>What to Watch For</Text>
      </View>
      <View style={styles.list}>
        {sorted.map((sign, index) => {
          const cfg = URGENCY_CONFIG[sign.urgency] ?? URGENCY_CONFIG.monitor;
          return (
            <View
              key={index}
              style={[styles.item, { borderLeftColor: cfg.borderColor, backgroundColor: cfg.bg }]}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.symptom}>{sign.symptom}</Text>
                <View style={[styles.urgencyPill, { backgroundColor: cfg.labelBg }]}>
                  <Text style={[styles.urgencyLabel, { color: cfg.labelColor }]}>{cfg.label}</Text>
                </View>
              </View>
              {sign.what_it_might_mean ? (
                <Text style={styles.meaning}>{sign.what_it_might_mean}</Text>
              ) : null}
              <View style={styles.actionBox}>
                <Ionicons name={cfg.icon as any} size={14} color={cfg.borderColor} />
                <Text style={[styles.actionText, { color: cfg.borderColor }]}>{sign.what_to_do}</Text>
              </View>
              {sign.related_to ? (
                <Text style={styles.relatedTo}>Related to: {sign.related_to}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.foreground,
  },
  list: { gap: 10 },
  item: {
    borderLeftWidth: 4,
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 12,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  symptom: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
  },
  urgencyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  meaning: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 6,
    padding: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  relatedTo: {
    fontSize: 12,
    color: Colors.gray[500],
    fontStyle: 'italic',
  },
});
```

---

## Task 14: Frontend — QuestionsSection (V1.5)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/QuestionsSection.tsx`

Changes from V1.4: accepts flat `string[]` (not nested object), new heading and intro text, Copy button per question using `navigator.clipboard` (web) or `Alert` to simulate copy on native.

Note: `expo-clipboard` is not in the package.json. Use `Platform.OS === 'web' ? navigator.clipboard.writeText(q) : Alert.alert('Question copied', q)` as the copy implementation.

- [ ] **Step 1: Create QuestionsSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/QuestionsSection.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface QuestionsSectionProps {
  questions: string[];
}

function copyQuestion(question: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(question).catch(() => {});
  } else {
    Alert.alert('Question', question, [{ text: 'OK' }]);
  }
}

export function QuestionsSection({ questions }: QuestionsSectionProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="help-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.heading}>Questions to Ask at Your Next Visit</Text>
      </View>
      <Text style={styles.intro}>
        These are suggested questions based on what was discussed today. Bring them to your next appointment.
      </Text>
      <View style={styles.list}>
        {questions.map((q, index) => (
          <View key={index} style={styles.questionItem}>
            <Text style={styles.questionText}>{q}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyQuestion(q)}
              activeOpacity={0.7}
              accessibilityLabel="Copy question"
            >
              <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
  },
  intro: {
    fontSize: 13,
    color: Colors.secondaryForeground,
    lineHeight: 20,
    marginBottom: 14,
  },
  list: { gap: 10 },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
    gap: 8,
  },
  questionText: {
    fontSize: 15,
    color: '#0369A1',
    lineHeight: 22,
    flex: 1,
  },
  copyButton: {
    padding: 4,
    borderRadius: 6,
  },
});
```

---

## Task 15: Frontend — SourceLinksSection (NEW)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/SourceLinksSection.tsx`

New component. Shows a footer row linking to the original recording/document.

- [ ] **Step 1: Create SourceLinksSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/SourceLinksSection.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface SourceLink {
  type: 'recording' | 'document' | 'notes';
  label: string;
  url: string;
}

interface SourceLinksSectionProps {
  sourceLinks: SourceLink[];
}

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  recording: 'mic-outline',
  document: 'document-text-outline',
  notes: 'create-outline',
};

export function SourceLinksSection({ sourceLinks }: SourceLinksSectionProps) {
  if (!sourceLinks || sourceLinks.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>This summary was generated from:</Text>
      <View style={styles.links}>
        {sourceLinks.map((link, index) => (
          <TouchableOpacity
            key={index}
            style={styles.linkButton}
            onPress={() => Linking.openURL(link.url)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={TYPE_ICON[link.type] ?? 'link-outline'}
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.linkText}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: Colors.secondaryForeground,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  linkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
});
```

---

## Task 16: Frontend — OtherDetailsSection (NEW, collapsible low-importance aggregator)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/OtherDetailsSection.tsx`

Accepts a count label and any React children. Renders a collapsible section that starts collapsed. Used by `AppointmentSummaryV15` to show all low-importance items.

- [ ] **Step 1: Create OtherDetailsSection.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/OtherDetailsSection.tsx`:

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface OtherDetailsSectionProps {
  count: number;
  children: React.ReactNode;
}

export function OtherDetailsSection({ count, children }: OtherDetailsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (count === 0) return null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-down-outline" size={18} color={Colors.secondaryForeground} />
        <Text style={styles.heading}>
          {count} additional {count === 1 ? 'detail' : 'details'}
        </Text>
        <Text style={[styles.arrow, expanded && styles.arrowExpanded]}>▸</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    fontSize: 15,
    color: Colors.secondaryForeground,
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    color: Colors.gray[400],
  },
  arrowExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  body: {
    marginTop: 14,
    gap: 8,
  },
});
```

---

## Task 17: Frontend — FollowUpSection (V1.5, copy from 1.4)

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/FollowUpSection.tsx`

Identical logic to V1.4 FollowUpSection. Copy it into the new folder.

- [ ] **Step 1: Copy FollowUpSection from summary1-3**

```bash
cp /root/projects/medical-scribe/frontend/frontend-expo/components/pages/summary1-3/FollowUpSection.tsx \
   /root/projects/medical-scribe/frontend/frontend-expo/components/pages/summary1-5/FollowUpSection.tsx
```

No changes needed — the FollowUpSection only uses `description` and `time_frame` which are identical in V1.4 and V1.5.

---

## Task 18: Frontend — AppointmentSummaryV15 main container

**Files:**
- Create: `frontend/frontend-expo/components/pages/summary1-5/AppointmentSummaryV15.tsx`

This is the main container. Section order per spec:
1. SummarySection ("What You Need to Know")
2. ReasonForVisitSection (visible by default)
3. DiagnosisSection (with main_conclusion callout)
4. MedicationsSection
5. TestsSection
6. ProceduresSection
7. OtherInstructionsSection
8. WarningSignsSection (prominently placed)
9. FollowUpSection
10. QuestionsSection
11. SourceLinksSection (footer)
12. OtherDetailsSection (collapsible, aggregates low-importance items)

- [ ] **Step 1: Create AppointmentSummaryV15.tsx**

Create `frontend/frontend-expo/components/pages/summary1-5/AppointmentSummaryV15.tsx`:

```typescript
import React from 'react';
import { View } from 'react-native';
import type { ProcessedSummaryV15 } from '@/api/appointments';
import { SummarySection } from './SummarySection';
import { ReasonForVisitSection } from './ReasonForVisitSection';
import { DiagnosisSection } from './DiagnosisSection';
import { MedicationsSection } from './MedicationsSection';
import { TestsSection } from './TestsSection';
import { ProceduresSection } from './ProceduresSection';
import { OtherInstructionsSection } from './OtherInstructionsSection';
import { WarningSignsSection } from './WarningSignsSection';
import { FollowUpSection } from './FollowUpSection';
import { QuestionsSection } from './QuestionsSection';
import { SourceLinksSection } from './SourceLinksSection';
import { OtherDetailsSection } from './OtherDetailsSection';

interface AppointmentSummaryV15Props {
  summary: ProcessedSummaryV15;
}

export function AppointmentSummaryV15({ summary }: AppointmentSummaryV15Props) {
  // Count low-importance items to show in the "Other Details" section
  const lowMeds = (summary.medications ?? []).filter((m) => m.importance === 'low');
  const lowTests = (summary.tests ?? []).filter((t) => t.importance === 'low');
  const lowProcs = (summary.procedures ?? []).filter((p) => p.importance === 'low');
  const lowOther = (summary.other ?? []).filter((o) => o.importance === 'low');
  const lowWarnings = (summary.warning_signs ?? []).filter((w) => w.importance === 'low');
  const totalLow = lowMeds.length + lowTests.length + lowProcs.length + lowOther.length + lowWarnings.length;

  return (
    <View style={{ gap: 12 }}>
      {/* 1. TL;DR Summary */}
      {summary.summary ? <SummarySection summary={summary.summary} /> : null}

      {/* 2. Why You Came In (visible by default) */}
      {summary.reason_for_visit && summary.reason_for_visit.length > 0 ? (
        <ReasonForVisitSection reasonForVisit={summary.reason_for_visit} />
      ) : null}

      {/* 3. What the Doctor Found */}
      {summary.diagnosis ? <DiagnosisSection diagnosis={summary.diagnosis} /> : null}

      {/* 4. Medications */}
      {summary.medications && summary.medications.length > 0 ? (
        <MedicationsSection medications={summary.medications} />
      ) : null}

      {/* 5. Tests */}
      {summary.tests && summary.tests.length > 0 ? (
        <TestsSection tests={summary.tests} />
      ) : null}

      {/* 6. Procedures & Referrals */}
      {summary.procedures && summary.procedures.length > 0 ? (
        <ProceduresSection procedures={summary.procedures} />
      ) : null}

      {/* 7. Home Instructions */}
      {summary.other && summary.other.length > 0 ? (
        <OtherInstructionsSection other={summary.other} />
      ) : null}

      {/* 8. What to Watch For */}
      {summary.warning_signs && summary.warning_signs.length > 0 ? (
        <WarningSignsSection warningSigns={summary.warning_signs} />
      ) : null}

      {/* 9. Follow-Up */}
      {summary.follow_up && summary.follow_up.length > 0 ? (
        <FollowUpSection followUp={summary.follow_up} />
      ) : null}

      {/* 10. Questions to Ask */}
      {summary.questions && summary.questions.length > 0 ? (
        <QuestionsSection questions={summary.questions} />
      ) : null}

      {/* 11. Other Details (collapsed, low-importance aggregator) */}
      <OtherDetailsSection count={totalLow}>
        {lowMeds.length > 0 && <MedicationsSection medications={lowMeds} />}
        {lowTests.length > 0 && <TestsSection tests={lowTests} />}
        {lowProcs.length > 0 && <ProceduresSection procedures={lowProcs} />}
        {lowOther.length > 0 && <OtherInstructionsSection other={lowOther} />}
        {lowWarnings.length > 0 && <WarningSignsSection warningSigns={lowWarnings} />}
      </OtherDetailsSection>

      {/* 12. Source Links footer */}
      {summary.source_links && summary.source_links.length > 0 ? (
        <SourceLinksSection sourceLinks={summary.source_links} />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Create index.ts barrel**

Create `frontend/frontend-expo/components/pages/summary1-5/index.ts`:

```typescript
export { AppointmentSummaryV15 } from './AppointmentSummaryV15';
export { CollapsibleCard } from './CollapsibleCard';
export { SummarySection } from './SummarySection';
export { ReasonForVisitSection } from './ReasonForVisitSection';
export { DiagnosisSection } from './DiagnosisSection';
export { MedicationsSection } from './MedicationsSection';
export { TestsSection } from './TestsSection';
export { ProceduresSection } from './ProceduresSection';
export { OtherInstructionsSection } from './OtherInstructionsSection';
export { WarningSignsSection } from './WarningSignsSection';
export { FollowUpSection } from './FollowUpSection';
export { QuestionsSection } from './QuestionsSection';
export { SourceLinksSection } from './SourceLinksSection';
export { OtherDetailsSection } from './OtherDetailsSection';
```

- [ ] **Step 3: TypeScript compile check**

```bash
cd /root/projects/medical-scribe/frontend/frontend-expo && npx tsc --noEmit 2>&1 | grep "summary1-5"
```

Expected: no output (no errors in the new files).

- [ ] **Step 4: Commit**

```bash
git add frontend/frontend-expo/components/pages/summary1-5/
git commit -m "feat(frontend): add all V1.5 section components and AppointmentSummaryV15 container"
```

---

## Task 19: Frontend — Wire V1.5 to Appointment Screen

**Files:**
- Modify: `frontend/frontend-expo/app/appointment/[id].tsx`

Add the V1.5 branch alongside existing V1.4 and V1.3 branches.

- [ ] **Step 1: Add imports to [id].tsx**

Open `frontend/frontend-expo/app/appointment/[id].tsx`. Add to the existing import lines:

```typescript
import { isV15Summary, type ProcessedSummaryV15 } from '@/api/appointments';
import { AppointmentSummaryV15 } from '@/components/pages/summary1-5';
```

- [ ] **Step 2: Update the version detection logic**

Find the section (around line 256):
```typescript
const isV14 = isV14Summary(ps);
const isV13 = !isV14 && isV13Summary(ps);
```

Replace with:
```typescript
const isV15 = isV15Summary(ps);
const isV14 = !isV15 && isV14Summary(ps);
const isV13 = !isV15 && !isV14 && isV13Summary(ps);
```

- [ ] **Step 3: Update hasSummaryContent to include V1.5**

Find the `hasSummaryContent` block. Add a V1.5 branch at the top of the IIFE:

```typescript
const hasSummaryContent = (() => {
    if (!ps) return false;
    if (isV15) {
      const v15 = ps as ProcessedSummaryV15;
      return !!(v15.summary || v15.reason_for_visit?.length || v15.diagnosis?.details?.length || v15.medications?.length || v15.tests?.length || v15.procedures?.length || v15.other?.length || v15.follow_up?.length || v15.warning_signs?.length);
    } else if (isV14) {
      // ... existing v14 check unchanged
```

- [ ] **Step 4: Add V1.5 rendering branch in JSX**

Find the JSX section around line 294:
```typescript
{hasSummaryContent && (
  isV14 ? (
    <AppointmentSummaryV14 summary={ps as ProcessedSummaryV14} />
  ) : isV13 ? (
```

Replace with:
```typescript
{hasSummaryContent && (
  isV15 ? (
    <AppointmentSummaryV15 summary={ps as ProcessedSummaryV15} />
  ) : isV14 ? (
    <AppointmentSummaryV14 summary={ps as ProcessedSummaryV14} />
  ) : isV13 ? (
    <AppointmentSummaryV13 summary={ps as ProcessedSummaryV13} />
  ) : (
    <AppointmentSummaryV12 summary={ps as ProcessedSummaryV12} />
  )
)}
```

- [ ] **Step 5: TypeScript compile check**

```bash
cd /root/projects/medical-scribe/frontend/frontend-expo && npx tsc --noEmit 2>&1 | grep "appointment/\[id\]"
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/frontend-expo/app/appointment/[id].tsx
git commit -m "feat(frontend): wire V1.5 rendering branch in appointment detail screen"
```

---

## Task 20: Frontend — Add V1.5 PDF Render Branch

**Files:**
- Modify: `frontend/frontend-expo/utils/generateAppointmentPdf.ts`

Add a V1.5 branch that renders the new fields (`why`, `warning_signs`, `plain_name`, `what_it_means_for_you`, etc.) into the existing HTML-string PDF generator. The existing `renderMedications`, `renderTests`, etc. helper functions in that file handle V1.3/1.4 shape — add V1.5-specific helpers alongside them.

- [ ] **Step 1: Read the top of generateAppointmentPdf.ts to understand helper function signatures**

```bash
head -50 /root/projects/medical-scribe/frontend/frontend-expo/utils/generateAppointmentPdf.ts
```

- [ ] **Step 2: Add isV15Summary import**

In `generateAppointmentPdf.ts`, find the existing import:
```typescript
import { isV13Summary, isV14Summary } from '@/api/appointments';
```

Replace with:
```typescript
import { isV13Summary, isV14Summary, isV15Summary } from '@/api/appointments';
import type { ProcessedSummaryV15 } from '@/api/appointments';
```

- [ ] **Step 3: Add renderV15 helper function**

After the existing V1.4 render block and before the HTML template return, add:

```typescript
function renderV15(s: ProcessedSummaryV15): string {
  const h2 = (title: string) =>
    `<h2 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #E5E7EB;">${escapeHtml(title)}</h2>`;

  const sections: string[] = [];

  if (s.summary) {
    sections.push(`${h2('What You Need to Know')}<p style="background:#E8EDE3;padding:14px;border-radius:8px;color:#374151;line-height:1.6;margin:0;">${escapeHtml(s.summary)}</p>`);
  }

  if (s.reason_for_visit?.length) {
    const items = s.reason_for_visit.map(r =>
      `<div style="padding:8px 0;border-bottom:1px solid #F3F4F6;">
        <strong>${escapeHtml(r.reason)}</strong>
        ${r.description ? `<br><span style="color:#6B7280;">${escapeHtml(r.description)}</span>` : ''}
      </div>`
    ).join('');
    sections.push(`${h2('Why You Came In')}${items}`);
  }

  if (s.diagnosis) {
    const d = s.diagnosis;
    let diagContent = '';
    if (d.main_conclusion) {
      diagContent += `<div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:8px;padding:12px;margin-bottom:12px;"><strong>Overall conclusion:</strong> ${escapeHtml(d.main_conclusion)}</div>`;
    }
    if (d.changed_since_last_visit) {
      diagContent += `<p style="color:#0F766E;margin:0 0 12px 0;">Compared to last visit: ${escapeHtml(d.changed_since_last_visit)}</p>`;
    }
    diagContent += (d.details ?? []).map(det =>
      `<div style="padding:8px 0 8px 12px;border-left:4px solid #EF4444;margin-bottom:8px;">
        <strong>${escapeHtml(det.plain_name ? `${det.plain_name} (${det.title})` : det.title)}</strong><br>
        <span style="color:#6B7280;">${escapeHtml(det.description)}</span>
        ${det.what_it_means_for_you ? `<br><span style="color:#B45309;font-size:13px;"><em>What this means for you: ${escapeHtml(det.what_it_means_for_you)}</em></span>` : ''}
      </div>`
    ).join('');
    sections.push(`${h2('What the Doctor Found')}${diagContent}`);
  }

  if (s.medications?.length) {
    const items = s.medications.map(m => {
      const name = m.plain_name ? `${m.plain_name} (${m.title})` : m.title;
      const badge = m.change ? (m.change_description?.toLowerCase().includes('stop') ? ' <span style="color:#DC2626;font-weight:700;">[STOPPED]</span>' : m.change_description?.toLowerCase().includes('new') ? ' <span style="color:#0F766E;font-weight:700;">[NEW]</span>' : ' <span style="color:#D97706;font-weight:700;">[CHANGED]</span>') : '';
      return `<div style="padding:10px 12px;margin-bottom:8px;background:#F9FAFB;border-left:4px solid #3B82F6;border-radius:0 6px 6px 0;">
        <strong>${escapeHtml(name)}${badge}</strong>
        ${m.why ? `<br><span style="color:#1D4ED8;font-size:13px;">Why: ${escapeHtml(m.why)}</span>` : ''}
        ${m.dosage || m.frequency ? `<br><span style="color:#374151;font-size:13px;">${[m.dosage, m.frequency, m.timing, m.duration].filter(Boolean).map(escapeHtml).join(' · ')}</span>` : ''}
        ${m.side_effects_to_watch ? `<br><span style="color:#D97706;font-size:13px;">Watch for: ${escapeHtml(m.side_effects_to_watch)}</span>` : ''}
      </div>`;
    }).join('');
    sections.push(`${h2('Your Medications')}${items}`);
  }

  if (s.warning_signs?.length) {
    const urgencyLabel: Record<string, string> = { emergency: 'EMERGENCY', call_doctor: 'CALL DOCTOR', monitor: 'WATCH', normal_side_effect: 'NORMAL' };
    const urgencyColor: Record<string, string> = { emergency: '#DC2626', call_doctor: '#D97706', monitor: '#6B7280', normal_side_effect: '#6B7280' };
    const sorted = [...s.warning_signs].sort((a, b) => {
      const order: Record<string, number> = { emergency: 0, call_doctor: 1, monitor: 2, normal_side_effect: 3 };
      return (order[a.urgency] ?? 4) - (order[b.urgency] ?? 4);
    });
    const items = sorted.map(w =>
      `<div style="padding:10px 12px;margin-bottom:8px;background:#FFF7ED;border-left:4px solid ${urgencyColor[w.urgency] ?? '#6B7280'};border-radius:0 6px 6px 0;">
        <strong>${escapeHtml(w.symptom)}</strong> <span style="color:${urgencyColor[w.urgency] ?? '#6B7280'};font-size:11px;font-weight:700;">[${urgencyLabel[w.urgency] ?? w.urgency}]</span>
        ${w.what_it_might_mean ? `<br><span style="color:#6B7280;font-size:13px;">${escapeHtml(w.what_it_might_mean)}</span>` : ''}
        <br><span style="color:${urgencyColor[w.urgency] ?? '#374151'};font-weight:500;font-size:13px;">${escapeHtml(w.what_to_do)}</span>
      </div>`
    ).join('');
    sections.push(`${h2('What to Watch For')}${items}`);
  }

  if (s.questions?.length) {
    const items = s.questions.map(q => `<div style="padding:10px 12px;margin-bottom:6px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:6px;color:#0369A1;">${escapeHtml(q)}</div>`).join('');
    sections.push(`${h2('Questions to Ask at Your Next Visit')}${items}`);
  }

  if (s.follow_up?.length) {
    const items = s.follow_up.map(f => `<div style="padding:10px;margin-bottom:6px;background:#EFF6FF;border-radius:6px;"><span>${escapeHtml(f.description)}</span> <span style="color:#1D4ED8;">📅 ${escapeHtml(f.time_frame)}</span></div>`).join('');
    sections.push(`${h2('Follow-Up')}${items}`);
  }

  return sections.join('');
}
```

- [ ] **Step 4: Wire renderV15 into the main bodyContent block**

Find in `generateAppointmentPdf.ts`:
```typescript
const v14 = isV14Summary(ps);
const v13 = !v14 && isV13Summary(ps);
```

Replace with:
```typescript
const v15 = isV15Summary(ps);
const v14 = !v15 && isV14Summary(ps);
const v13 = !v15 && !v14 && isV13Summary(ps);
```

Then find the `if (v14) {` block and prepend:
```typescript
if (v15) {
  bodyContent = renderV15(ps as ProcessedSummaryV15);
} else if (v14) {
```

- [ ] **Step 5: Compile check**

```bash
cd /root/projects/medical-scribe/frontend/frontend-expo && npx tsc --noEmit 2>&1 | grep "generateAppointmentPdf"
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/frontend-expo/utils/generateAppointmentPdf.ts
git commit -m "feat(frontend): add V1.5 PDF render branch with warning_signs, why, plain_name fields"
```

---

## Task 21: Simplify V1.1 Pipeline — Restructure Output to Schema 1.5 Shape

**Files:**
- Modify: `backend/backend-processing/simplify/v1_1/pipeline.py`

Replace `_STRUCTURING_SCHEMA` constant and `structure_appointment_note` method to produce Schema 1.5-aligned output. The pipeline's AHRQ substitutions already exist in `simplify_language_with_term_plan`; this task adds the structured output shape and adds `warning_signs` and `questions` generation.

- [ ] **Step 1: Replace _STRUCTURING_SCHEMA constant in pipeline.py**

In `backend/backend-processing/simplify/v1_1/pipeline.py`, find the `_STRUCTURING_SCHEMA` string (starts at line 47). Replace the entire constant with:

```python
_STRUCTURING_SCHEMA = """{
  "doc_type": "appointment_note",
  "urgency": "normal|caution|concern|urgent",
  "version": "1.5",
  "summary": "3-sentence plain-language summary: sentence 1 = why the patient came in; sentence 2 = main clinical conclusion; sentence 3 = single most important next step",
  "reason_for_visit": [
    {
      "reason": "plain-language reason for visit",
      "description": "additional details in the patient's own words"
    }
  ],
  "diagnosis": {
    "main_conclusion": "doctor's overall clinical judgment in one plain-language sentence",
    "changed_since_last_visit": "comparison to last visit if context available, else empty string",
    "details": [
      {
        "title": "medical term exactly as used",
        "plain_name": "plain-language name a 6th-grader would understand",
        "description": "what this means explained in plain language",
        "what_it_means_for_you": "1-2 sentences on real-world daily-life impact for this patient",
        "severity": "high|medium|low"
      }
    ]
  },
  "medications": [
    {
      "title": "medication name and dose",
      "plain_name": "common name e.g. blood pressure medication",
      "why": "one sentence why this patient takes this medication, tied to their diagnosis",
      "dosage": "string",
      "frequency": "written out fully e.g. twice a day not BID",
      "timing": "string",
      "duration": "string",
      "instructions": "string",
      "side_effects_to_watch": "1-2 most common or serious side effects in plain language",
      "importance": "high|low",
      "source": "documents|recording|notes",
      "change": false,
      "change_description": "what changed if change is true, else empty string"
    }
  ],
  "tests": [
    {
      "title": "test name",
      "plain_name": "common name",
      "why": "one sentence why this patient needs this test",
      "description": "string",
      "preparation": "preparation required or empty string",
      "importance": "high|low",
      "source": "documents|recording|notes"
    }
  ],
  "procedures": [
    {
      "title": "procedure name",
      "plain_name": "common name",
      "why": "one sentence why this patient needs this",
      "what_to_expect": "brief patient-facing description",
      "timeframe": "string",
      "importance": "high|low",
      "source": "documents|recording|notes"
    }
  ],
  "other": [
    {
      "title": "instruction title",
      "why": "what happens if patient follows or does not follow this",
      "steps": ["step 1", "step 2"],
      "description": "for single-step instructions only",
      "frequency": "string",
      "duration": "string",
      "importance": "high|low",
      "source": "documents|recording|notes"
    }
  ],
  "follow_up": [
    {
      "time_frame": "string",
      "description": "string"
    }
  ],
  "warning_signs": [
    {
      "symptom": "plain-language symptom name",
      "what_it_might_mean": "brief context",
      "what_to_do": "specific instruction: call your doctor, go to the ER, or this is a normal side effect",
      "urgency": "emergency|call_doctor|monitor|normal_side_effect",
      "related_to": "medication or condition name",
      "importance": "high|low",
      "source": "documents|recording|notes"
    }
  ],
  "questions": ["question 1", "question 2", "question 3"],
  "low_priority": ["string - items noted as normal, unremarkable, or informational"]
}"""
```

- [ ] **Step 2: Update structure_appointment_note to use new schema and defaults**

In `pipeline.py`, find the `structure_appointment_note` method. Replace the entire method with:

```python
def structure_appointment_note(self, text: str) -> dict:
    prompt = f"""You are structuring a simplified provider note for a patient.

Return JSON only. Use this schema:
{_STRUCTURING_SCHEMA}

Rules:
1. Use only information found in the source text.
2. Do not add diagnosis, urgency, prognosis, or medical advice not in the source.
3. If the source does not contain a field, use an empty string or empty array.
4. Every medication must have a 'why' field explaining the reason for this specific patient.
5. Every warning sign must have a 'what_to_do' field: specific instruction (call doctor, go to ER, or normal side effect).
6. Classify warning sign urgency as: emergency, call_doctor, monitor, or normal_side_effect.
7. Use active voice. Address the patient as 'you'. No abbreviations.
8. Write one idea per sentence. Maximum 20 words per sentence.
9. The summary must be exactly 3 sentences: (1) why came in, (2) main conclusion, (3) most important next step.
10. Generate exactly 3 questions that help the patient understand or manage their care.
11. Put low-priority details in low_priority array.
12. Do not return term annotations or spans.
13. Output only valid JSON; no markdown, no commentary.

SOURCE TEXT:
{text}

JSON OUTPUT:"""
    raw = self._generate_json(prompt, temperature=0.2, max_tokens=8192)
    if not isinstance(raw, dict):
        raise ValueError(f"Expected dict from structure step, got {type(raw)}")

    defaults = {
        "doc_type": "appointment_note",
        "urgency": "normal",
        "version": "1.5",
        "summary": "",
        "reason_for_visit": [],
        "diagnosis": {"main_conclusion": "", "changed_since_last_visit": "", "details": []},
        "medications": [],
        "tests": [],
        "procedures": [],
        "other": [],
        "follow_up": [],
        "warning_signs": [],
        "questions": [],
        "low_priority": [],
    }
    for key, value in defaults.items():
        if key not in raw:
            raw[key] = value

    raw["doc_type"] = "appointment_note"
    raw["version"] = "1.5"
    return raw
```

- [ ] **Step 3: Update run() to not pop questions**

In the `run()` method of `V1_1Pipeline`, find:
```python
result.pop("questions", None)
```

There are two of them (one in `structure_appointment_note` previously, one in `run`). Remove both `result.pop("questions", None)` calls because questions are now part of the schema.

Also find in `structure_appointment_note` (the old one):
```python
raw.pop("questions", None)
```
This is already replaced by the new method above, so no further action needed.

In `run()`, also remove:
```python
result.pop("questions", None)
```

The updated `run()` method's result merge section should look like:
```python
result = {
    **structured,
    "terms": terms_glossary,
    "raw": {
        "text": text,
        "simplified_text": simplified,
        "clarified_text": clarified,
    },
}
if before_score is not None:
    result["before_score"] = before_score
if after_score is not None:
    result["after_score"] = after_score
return result
```

- [ ] **Step 4: Run pipeline import check**

```bash
cd /root/projects/medical-scribe/backend/backend-processing && python3 -c "
from simplify.v1_1.pipeline import V1_1Pipeline, _STRUCTURING_SCHEMA
import json
# Validate the schema string is valid JSON-like (it uses | for unions so we just check it loads str)
assert 'warning_signs' in _STRUCTURING_SCHEMA, 'warning_signs missing from schema'
assert 'questions' in _STRUCTURING_SCHEMA, 'questions missing from schema'
assert 'what_to_do' in _STRUCTURING_SCHEMA, 'what_to_do missing from schema'
print('Pipeline schema check passed')
"
```

Expected: `Pipeline schema check passed`

- [ ] **Step 5: Commit**

```bash
git add backend/backend-processing/simplify/v1_1/pipeline.py
git commit -m "feat(simplify): restructure V1.1 pipeline output to Schema 1.5 shape with warning_signs and questions"
```

---

## Task 22: Simplify V1.1 Frontend — Update AppointmentNote type and display

**Files:**
- Modify: `frontend/simplify/src/pages/v1_1/V1_1Page.tsx`

The `AppointmentNote` interface in V1_1Page.tsx mirrors the old pipeline output shape. Update it to match the new Schema 1.5 output. Then update `AppointmentNoteV11View` to render the new sections (`warning_signs`, `questions`, structured medications/diagnosis).

- [ ] **Step 1: Replace the AppointmentNote interface in V1_1Page.tsx**

Find the existing `interface AppointmentNote` block (around line 58 in V1_1Page.tsx). Replace it entirely with:

```typescript
interface DiagnosisDetail {
  title: string;
  plain_name?: string;
  description: string;
  what_it_means_for_you?: string;
  severity?: 'high' | 'medium' | 'low';
}

interface Medication {
  title: string;
  plain_name?: string;
  why?: string;
  dosage?: string;
  frequency?: string;
  timing?: string;
  duration?: string;
  instructions?: string;
  side_effects_to_watch?: string;
  importance: 'high' | 'low';
  change?: boolean;
  change_description?: string;
}

interface WarningSign {
  symptom: string;
  what_it_might_mean?: string;
  what_to_do: string;
  urgency: 'emergency' | 'call_doctor' | 'monitor' | 'normal_side_effect';
  related_to?: string;
  importance: 'high' | 'low';
}

interface AppointmentNote {
  doc_type: 'appointment_note';
  urgency: DocUrgency;
  version: '1.5';
  summary: string;
  reason_for_visit: Array<{ reason: string; description: string }>;
  diagnosis: {
    main_conclusion?: string;
    changed_since_last_visit?: string;
    details: DiagnosisDetail[];
  };
  medications: Medication[];
  tests: Array<{ title: string; plain_name?: string; why?: string; description: string; preparation?: string; importance: 'high' | 'low' }>;
  procedures: Array<{ title: string; plain_name?: string; why?: string; what_to_expect?: string; timeframe?: string; importance: 'high' | 'low' }>;
  other: Array<{ title: string; why?: string; steps?: string[]; description?: string; frequency?: string; duration?: string; importance: 'high' | 'low' }>;
  follow_up: Array<{ time_frame: string; description: string }>;
  warning_signs: WarningSign[];
  questions: string[];
  low_priority: string[];
  terms?: TermsMap;
  raw?: { text: string; simplified_text: string; clarified_text: string };
  before_score?: PatientScore;
  after_score?: PatientScore;
}
```

- [ ] **Step 2: Update AppointmentNoteV11View to render new sections**

Find the `AppointmentNoteV11View` function. Replace its return JSX with the following (keeping the existing `ReadabilityCard`, `ResultCard`, and `WhyToggle` helpers — they are not changed):

```tsx
function AppointmentNoteV11View({ result }: { result: AppointmentNote }) {
  const terms = result.terms ?? {};
  const withTerms = (text: string) => renderTextWithTerms(text, terms);
  const URGENCY_COLORS: Record<string, string> = {
    emergency: '#DC2626',
    call_doctor: '#D97706',
    monitor: '#6B7280',
    normal_side_effect: '#6B7280',
  };
  const URGENCY_LABELS: Record<string, string> = {
    emergency: 'EMERGENCY',
    call_doctor: 'CALL DOCTOR',
    monitor: 'WATCH',
    normal_side_effect: 'NORMAL',
  };
  const URGENCY_ORDER: Record<string, number> = { emergency: 0, call_doctor: 1, monitor: 2, normal_side_effect: 3 };

  return (
    <div className="result-cards">
      {result.before_score && result.after_score && (
        <ReadabilityCard before={result.before_score} after={result.after_score} />
      )}

      {result.summary && (
        <div className="result-card" style={{ background: 'var(--surface-green-muted, #E8EDE3)' }}>
          <div className="result-card-body" style={{ paddingTop: '16px' }}>
            <p className="summary-paragraph">{withTerms(result.summary)}</p>
          </div>
        </div>
      )}

      {result.reason_for_visit?.length > 0 && (
        <ResultCard color="blue" icon="📅" title="Why You Came In">
          {result.reason_for_visit.map((r, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <strong>{withTerms(r.reason)}</strong>
              {r.description && <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>{withTerms(r.description)}</p>}
            </div>
          ))}
        </ResultCard>
      )}

      {result.diagnosis && (result.diagnosis.main_conclusion || result.diagnosis.details?.length > 0) && (
        <ResultCard color="teal" icon="🔍" title="What the Doctor Found">
          {result.diagnosis.main_conclusion && (
            <p className="narrative-headline" style={{ background: '#F0FDFA', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
              {withTerms(result.diagnosis.main_conclusion)}
            </p>
          )}
          {result.diagnosis.changed_since_last_visit && (
            <p style={{ color: '#0F766E', fontSize: '0.875rem', marginBottom: '12px' }}>
              Compared to last visit: {withTerms(result.diagnosis.changed_since_last_visit)}
            </p>
          )}
          {(result.diagnosis.details ?? []).map((det, i) => (
            <div key={i} style={{ paddingLeft: '12px', borderLeft: '4px solid #EF4444', marginBottom: '10px' }}>
              <strong>{withTerms(det.plain_name ? `${det.plain_name} (${det.title})` : det.title)}</strong>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0', fontSize: '0.9rem' }}>{withTerms(det.description)}</p>
              {det.what_it_means_for_you && (
                <p style={{ color: '#B45309', fontSize: '0.85rem', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                  What this means for you: {withTerms(det.what_it_means_for_you)}
                </p>
              )}
            </div>
          ))}
        </ResultCard>
      )}

      {result.medications?.length > 0 && (
        <ResultCard color="violet" icon="💊" title="Your Medications">
          {result.medications.map((med, i) => (
            <div key={i} style={{ paddingLeft: '12px', borderLeft: '4px solid #3B82F6', marginBottom: '12px', background: '#F9FAFB', padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>
              <strong>{withTerms(med.plain_name ? `${med.plain_name} (${med.title})` : med.title)}</strong>
              {med.change && <span style={{ marginLeft: '8px', color: '#D97706', fontSize: '0.8rem', fontWeight: '700' }}>[CHANGED]</span>}
              {med.why && <p style={{ color: '#1D4ED8', fontSize: '0.875rem', margin: '6px 0 4px 0' }}>Why: {withTerms(med.why)}</p>}
              {(med.dosage || med.frequency) && (
                <p style={{ color: '#374151', fontSize: '0.875rem', margin: '4px 0' }}>
                  {[med.dosage, med.frequency, med.timing, med.duration].filter(Boolean).join(' · ')}
                </p>
              )}
              {med.side_effects_to_watch && (
                <p style={{ color: '#D97706', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Watch for: {withTerms(med.side_effects_to_watch)}</p>
              )}
            </div>
          ))}
        </ResultCard>
      )}

      {result.warning_signs?.length > 0 && (
        <ResultCard color="gray" icon="⚠️" title="What to Watch For">
          {[...result.warning_signs]
            .sort((a, b) => (URGENCY_ORDER[a.urgency] ?? 4) - (URGENCY_ORDER[b.urgency] ?? 4))
            .map((sign, i) => {
              const color = URGENCY_COLORS[sign.urgency] ?? '#6B7280';
              return (
                <div key={i} style={{ borderLeft: `4px solid ${color}`, paddingLeft: '12px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{withTerms(sign.symptom)}</strong>
                    <span style={{ color, fontSize: '0.75rem', fontWeight: '700' }}>[{URGENCY_LABELS[sign.urgency] ?? sign.urgency}]</span>
                  </div>
                  {sign.what_it_might_mean && <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '4px 0' }}>{withTerms(sign.what_it_might_mean)}</p>}
                  <p style={{ color, fontWeight: '500', fontSize: '0.875rem', margin: '4px 0 0 0' }}>{withTerms(sign.what_to_do)}</p>
                </div>
              );
            })}
        </ResultCard>
      )}

      {result.questions?.length > 0 && (
        <ResultCard color="blue" icon="❓" title="Questions to Ask at Your Next Visit">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px' }}>
            These are suggested questions based on what was discussed.
          </p>
          <ul className="result-list">
            {result.questions.map((q, i) => <li key={i} style={{ color: '#0369A1' }}>{q}</li>)}
          </ul>
        </ResultCard>
      )}

      {result.follow_up?.length > 0 && (
        <ResultCard color="blue" icon="📅" title="Follow-Up">
          {result.follow_up.map((f, i) => (
            <div key={i} style={{ background: '#EFF6FF', padding: '10px', borderRadius: '6px', marginBottom: '6px' }}>
              <span>{withTerms(f.description)}</span>
              {f.time_frame && <span style={{ color: '#1D4ED8', marginLeft: '8px' }}>📅 {f.time_frame}</span>}
            </div>
          ))}
        </ResultCard>
      )}

      {result.low_priority?.length > 0 && (
        <ResultCard color="gray" icon="ℹ️" title="Other Items From Your Visit" collapsible defaultOpen={false}>
          <ul className="result-list">
            {result.low_priority.map((item, i) => <li key={i}>{withTerms(item)}</li>)}
          </ul>
        </ResultCard>
      )}

      {Object.keys(terms).length > 0 && (
        <ResultCard color="gray" icon="📖" title="Medical Terms Glossary" collapsible defaultOpen={false}>
          <div className="glossary-list">
            {Object.entries(terms).map(([term, glossary]) => (
              <div className="glossary-item" key={term}>
                <span className="glossary-term">{term}</span>
                <span className="glossary-def">{glossary.definition}</span>
              </div>
            ))}
          </div>
        </ResultCard>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update buildPdfHtml in V1_1Page.tsx to handle new shape**

Find the `buildPdfHtml` function. It references `result.what_happened`, `result.what_to_do`, and `result.what_it_means` — these no longer exist. Replace the function body sections with the new field names:

```typescript
function buildPdfHtml(result: AppointmentNote): string {
  const sections: string[] = [];
  const h2 = (title: string) =>
    `<h2 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #E5E7EB;">${escapeHtml(title)}</h2>`;

  if (result.summary) {
    sections.push(`${h2('What You Need to Know')}<p style="color:#374151;line-height:1.6;margin:0;">${escapeHtml(result.summary)}</p>`);
  }
  if (result.reason_for_visit?.length) {
    const items = result.reason_for_visit.map(r =>
      `<p style="color:#374151;margin:0 0 8px 0;"><strong>${escapeHtml(r.reason)}</strong>${r.description ? `: ${escapeHtml(r.description)}` : ''}</p>`
    ).join('');
    sections.push(`${h2('Why You Came In')}${items}`);
  }
  if (result.medications?.length) {
    const items = result.medications.map(m =>
      `<div style="padding:8px 12px;margin-bottom:6px;background:#F9FAFB;border-radius:6px;">
        <strong>${escapeHtml(m.plain_name ? `${m.plain_name} (${m.title})` : m.title)}</strong>
        ${m.why ? `<br><span style="color:#1D4ED8;font-size:13px;">Why: ${escapeHtml(m.why)}</span>` : ''}
      </div>`
    ).join('');
    sections.push(`${h2('Your Medications')}${items}`);
  }
  if (result.warning_signs?.length) {
    const items = result.warning_signs.map(w =>
      `<div style="padding:8px 12px;margin-bottom:6px;background:#FFF7ED;border-radius:6px;">
        <strong>${escapeHtml(w.symptom)}</strong> [${escapeHtml(w.urgency)}]
        <br><span style="font-size:13px;">${escapeHtml(w.what_to_do)}</span>
      </div>`
    ).join('');
    sections.push(`${h2('What to Watch For')}${items}`);
  }
  if (result.questions?.length) {
    const items = result.questions.map(q => `<li>${escapeHtml(q)}</li>`).join('');
    sections.push(`${h2('Questions to Ask')}<ul style="margin:0;padding-left:20px;color:#0369A1;">${items}</ul>`);
  }
  if (result.follow_up?.length) {
    const items = result.follow_up.map(f => `<li>${escapeHtml(f.description)} — ${escapeHtml(f.time_frame)}</li>`).join('');
    sections.push(`${h2('Follow-Up')}<ul style="margin:0;padding-left:20px;color:#374151;">${items}</ul>`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; margin: 0 auto; padding: 32px; max-width: 800px; background: #fff; }
.header { border-bottom: 3px solid #4F46E5; padding-bottom: 16px; margin-bottom: 8px; }
.header h1 { font-size: 22px; font-weight: 700; color: #4F46E5; margin: 0; }
.footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 11px; }
</style></head><body>
<div class="header"><h1>Simplified Appointment Summary</h1></div>
${sections.join('')}
<div class="footer">Generated by Juno - Simplified for patient understanding - Data deleted after processing</div>
</body></html>`;
}
```

- [ ] **Step 4: TypeScript compile check for simplify frontend**

```bash
cd /root/projects/medical-scribe/frontend/simplify && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors, or only pre-existing unrelated errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/simplify/src/pages/v1_1/V1_1Page.tsx
git commit -m "feat(simplify-fe): update V1.1 page types and display to render Schema 1.5 output"
```

---

## Task 23: Discharge Summary — Backend Schema and Prompt

**Files:**
- Create: `backend/backend-processing/summarySchema/discharge/schema.json`
- Create: `backend/backend-processing/summarySchema/discharge/prompt.txt`

- [ ] **Step 1: Create the discharge schema directory and schema.json**

```bash
mkdir -p /root/projects/medical-scribe/backend/backend-processing/summarySchema/discharge
```

Create `backend/backend-processing/summarySchema/discharge/schema.json`:

```json
{
    "version": "discharge",
    "title": "string",
    "admission_date": "string",
    "discharge_date": "string",
    "summary": "string",
    "reason_for_admission": "string",
    "what_happened_during_stay": "string",
    "source_links": [
        {
            "type": "recording | document | notes",
            "label": "string",
            "url": "string"
        }
    ],
    "medications": [
        {
            "title": "string",
            "plain_name": "string",
            "why": "string",
            "dosage": "string",
            "frequency": "string",
            "timing": "string",
            "duration": "string",
            "instructions": "string",
            "side_effects_to_watch": "string",
            "importance": "high | low",
            "source": "string",
            "change": "boolean",
            "change_description": "string"
        }
    ],
    "medications_stopped": [
        {
            "title": "string",
            "reason_stopped": "string"
        }
    ],
    "procedures": [
        {
            "title": "string",
            "plain_name": "string",
            "why": "string",
            "what_to_expect": "string",
            "timeframe": "string",
            "importance": "high | low",
            "source": "string"
        }
    ],
    "other": [
        {
            "title": "string",
            "why": "string",
            "steps": ["string"],
            "description": "string",
            "frequency": "string",
            "duration": "string",
            "importance": "high | low",
            "source": "string"
        }
    ],
    "follow_up": [
        {
            "time_frame": "string",
            "description": "string"
        }
    ],
    "return_to_er_if": [
        {
            "symptom": "string",
            "plain_description": "string"
        }
    ],
    "warning_signs": [
        {
            "symptom": "string",
            "what_it_might_mean": "string",
            "what_to_do": "string",
            "urgency": "emergency | call_doctor | monitor | normal_side_effect",
            "related_to": "string",
            "importance": "high | low",
            "source": "string"
        }
    ],
    "questions": ["string"]
}
```

- [ ] **Step 2: Create discharge/prompt.txt**

Create `backend/backend-processing/summarySchema/discharge/prompt.txt`:

```
You are a medical assistant helping patients understand their hospital discharge instructions. Using the provided discharge documents, translate all clinical information into plain language that any adult can understand.

The patient has just left the hospital. They may still be tired or unwell. Everything you write must be immediately clear with no effort required from the reader.

CRITICAL LANGUAGE RULES (apply to every single field):
1. PLAIN LANGUAGE: Replace all medical terms with plain-language alternatives. Follow every medical term with a plain-language definition in parentheses.
2. ACTIVE VOICE: Address the patient as "you." Never use passive constructions.
3. NO ABBREVIATIONS OR ACRONYMS: Write "twice a day" not "BID." Write "heart tracing (ECG)" not "EKG."
4. SHORT SENTENCES: One idea per sentence. Maximum 20 words per sentence.
5. Apply all AHRQ plain-language substitutions: hypertension → high blood pressure, myocardial infarction → heart attack, dyspnea → shortness of breath, edema → swelling, tachycardia → fast heartbeat, etc.

FIELD-SPECIFIC RULES:
- summary: Exactly 3 sentences: (1) why you were in the hospital, (2) what happened and how things went, (3) the single most important thing you must do now that you are home.
- reason_for_admission: One plain-language sentence explaining why the patient was admitted.
- what_happened_during_stay: Brief narrative of what was done (tests, procedures, treatments) and how the patient responded. Plain language, no jargon.
- medications[].why: REQUIRED for every medication. Tie it to the patient's specific condition.
- medications[].change_description: For new medications: "This is a new medication." For stopped: "This medication was stopped — do NOT take it anymore." For dose changes: explain exactly what changed.
- medications_stopped: List every medication that was discontinued. CRITICAL: patients must know explicitly what to stop taking.
- return_to_er_if: Only include symptoms that require IMMEDIATE emergency room visit. Be very specific. Example: "Chest pain or pressure" not "any chest discomfort."
- warning_signs: Include call-doctor and monitor-level warning signs here (not ER-level — those go in return_to_er_if).
- follow_up: Be specific about timing and purpose of each follow-up.
- questions: 3 questions the patient should ask at their first follow-up appointment.

GENERAL RULES:
1. Do not hallucinate. Stick to facts from the discharge documents only.
2. Leave sections blank (empty string or empty array) if no relevant details exist.
3. Do not use patient or provider names. Use "you" and "your doctor."

Raw Input:
{{input}}

Return ONLY a valid JSON object. Use this exact structure:
{{schema}}
```

- [ ] **Step 3: Validate schema files**

```bash
python3 -c "import json; json.load(open('/root/projects/medical-scribe/backend/backend-processing/summarySchema/discharge/schema.json')); print('Discharge schema valid')"
```

Expected: `Discharge schema valid`

- [ ] **Step 4: Commit**

```bash
git add backend/backend-processing/summarySchema/discharge/
git commit -m "feat(schema): add discharge summary schema and LLM prompt"
```

---

## Task 24: Frontend — DischargeSummaryView component

**Files:**
- Create: `frontend/frontend-expo/components/pages/DischargeSummaryView.tsx`

Discharge-specific display. Priority order: `return_to_er_if` at TOP (red, most prominent), then medications (highlighting changes/stops), then follow-up, then everything else.

- [ ] **Step 1: Create DischargeSummaryView.tsx**

Create `frontend/frontend-expo/components/pages/DischargeSummaryView.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DischargeSummary } from '@/api/appointments';
import { Colors } from '@/constants/Colors';
import { MedicationsSection } from './summary1-5/MedicationsSection';
import { FollowUpSection } from './summary1-5/FollowUpSection';
import { WarningSignsSection } from './summary1-5/WarningSignsSection';
import { QuestionsSection } from './summary1-5/QuestionsSection';
import { OtherInstructionsSection } from './summary1-5/OtherInstructionsSection';
import { SourceLinksSection } from './summary1-5/SourceLinksSection';

interface DischargeSummaryViewProps {
  discharge: DischargeSummary;
}

function ReturnToERSection({ items }: { items: DischargeSummary['return_to_er_if'] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={erStyles.card}>
      <View style={erStyles.header}>
        <Ionicons name="alert-circle" size={22} color="#fff" />
        <Text style={erStyles.heading}>Return to the ER Immediately If You Experience:</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={erStyles.item}>
          <Text style={erStyles.bullet}>•</Text>
          <View style={erStyles.itemContent}>
            <Text style={erStyles.symptom}>{item.symptom}</Text>
            {item.plain_description ? <Text style={erStyles.desc}>{item.plain_description}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const erStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.red[500],
    borderRadius: 12,
    padding: 18,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    lineHeight: 22,
  },
  item: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'flex-start',
  },
  bullet: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 22,
  },
  itemContent: { flex: 1 },
  symptom: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  desc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginTop: 2,
  },
});

function StoppedMedsSection({ items }: { items: DischargeSummary['medications_stopped'] }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={stopStyles.card}>
      <View style={stopStyles.header}>
        <Ionicons name="close-circle-outline" size={20} color={Colors.red[700]} />
        <Text style={stopStyles.heading}>Medications You Must Stop Taking</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={stopStyles.item}>
          <Text style={stopStyles.title}>{item.title}</Text>
          {item.reason_stopped ? <Text style={stopStyles.reason}>{item.reason_stopped}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const stopStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.red[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.red[300],
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.red[700],
    flex: 1,
  },
  item: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.red[500],
    paddingLeft: 10,
    paddingVertical: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
  },
  reason: {
    fontSize: 14,
    color: Colors.red[700],
    marginTop: 2,
  },
});

export function DischargeSummaryView({ discharge }: DischargeSummaryViewProps) {
  return (
    <View style={{ gap: 12 }}>
      {/* 1. Return to ER — always at top, most prominent */}
      {discharge.return_to_er_if && discharge.return_to_er_if.length > 0 ? (
        <ReturnToERSection items={discharge.return_to_er_if} />
      ) : null}

      {/* 2. TL;DR Summary */}
      {discharge.summary ? (
        <View style={summaryStyles.card}>
          <Text style={summaryStyles.text}>{discharge.summary}</Text>
        </View>
      ) : null}

      {/* 3. Why you were admitted */}
      {discharge.reason_for_admission ? (
        <View style={admitStyles.card}>
          <Text style={admitStyles.label}>Why you were admitted</Text>
          <Text style={admitStyles.text}>{discharge.reason_for_admission}</Text>
        </View>
      ) : null}

      {/* 4. What happened during your stay */}
      {discharge.what_happened_during_stay ? (
        <View style={stayStyles.card}>
          <Text style={stayStyles.label}>What happened during your stay</Text>
          <Text style={stayStyles.text}>{discharge.what_happened_during_stay}</Text>
        </View>
      ) : null}

      {/* 5. Medications you must stop */}
      {discharge.medications_stopped && discharge.medications_stopped.length > 0 ? (
        <StoppedMedsSection items={discharge.medications_stopped} />
      ) : null}

      {/* 6. Your discharge medications */}
      {discharge.medications && discharge.medications.length > 0 ? (
        <MedicationsSection medications={discharge.medications} />
      ) : null}

      {/* 7. Follow-up appointments */}
      {discharge.follow_up && discharge.follow_up.length > 0 ? (
        <FollowUpSection followUp={discharge.follow_up} />
      ) : null}

      {/* 8. Other warning signs (non-ER) */}
      {discharge.warning_signs && discharge.warning_signs.length > 0 ? (
        <WarningSignsSection warningSigns={discharge.warning_signs} />
      ) : null}

      {/* 9. Home instructions */}
      {discharge.other && discharge.other.length > 0 ? (
        <OtherInstructionsSection other={discharge.other} />
      ) : null}

      {/* 10. Questions for follow-up */}
      {discharge.questions && discharge.questions.length > 0 ? (
        <QuestionsSection questions={discharge.questions} />
      ) : null}

      {/* 11. Source links */}
      {discharge.source_links && discharge.source_links.length > 0 ? (
        <SourceLinksSection sourceLinks={discharge.source_links} />
      ) : null}
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  text: { fontSize: 15, color: Colors.foreground, lineHeight: 24 },
});

const admitStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontSize: 12, fontWeight: '600', color: Colors.secondaryForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  text: { fontSize: 15, color: Colors.foreground, lineHeight: 22 },
});

const stayStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: { fontSize: 12, fontWeight: '600', color: Colors.secondaryForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  text: { fontSize: 15, color: Colors.foreground, lineHeight: 22 },
});
```

- [ ] **Step 2: Wire DischargeSummaryView in appointment/[id].tsx**

In `frontend/frontend-expo/app/appointment/[id].tsx`, add imports:
```typescript
import { isDischargeSummary, type DischargeSummary } from '@/api/appointments';
import { DischargeSummaryView } from '@/components/pages/DischargeSummaryView';
```

In the version detection logic, add:
```typescript
const isDischarge = isDischargeSummary(ps);
const isV15 = !isDischarge && isV15Summary(ps);
const isV14 = !isDischarge && !isV15 && isV14Summary(ps);
const isV13 = !isDischarge && !isV15 && !isV14 && isV13Summary(ps);
```

Update `hasSummaryContent`:
```typescript
if (isDischarge) {
  const d = ps as DischargeSummary;
  return !!(d.summary || d.return_to_er_if?.length || d.medications?.length || d.follow_up?.length);
} else if (isV15) {
  // ... existing v15 check
```

Add the JSX rendering branch:
```typescript
{hasSummaryContent && (
  isDischarge ? (
    <DischargeSummaryView discharge={ps as DischargeSummary} />
  ) : isV15 ? (
    <AppointmentSummaryV15 summary={ps as ProcessedSummaryV15} />
  ) : isV14 ? (
    // ... rest unchanged
```

- [ ] **Step 3: TypeScript compile check**

```bash
cd /root/projects/medical-scribe/frontend/frontend-expo && npx tsc --noEmit 2>&1 | grep -E "DischargeSummary|discharge" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit all discharge work**

```bash
git add frontend/frontend-expo/components/pages/DischargeSummaryView.tsx frontend/frontend-expo/app/appointment/[id].tsx
git commit -m "feat(frontend): add DischargeSummaryView with ER warning signs at top and stopped medications section"
```

---

## Task 25: Verification

- [ ] **Step 1: Run all TypeScript checks**

```bash
cd /root/projects/medical-scribe/frontend/frontend-expo && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: no new errors introduced by any of the tasks above.

- [ ] **Step 2: Run simplify frontend TypeScript checks**

```bash
cd /root/projects/medical-scribe/frontend/simplify && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 3: Verify backend schema files exist**

```bash
python3 -c "
import json, os
for version in ['1.5', 'discharge']:
    base = f'/root/projects/medical-scribe/backend/backend-processing/summarySchema/{version}'
    for f in ['schema.json', 'prompt.txt']:
        path = os.path.join(base, f)
        assert os.path.exists(path), f'Missing: {path}'
        if f.endswith('.json'):
            json.load(open(path))
    print(f'Schema {version}: OK')
"
```

Expected:
```
Schema 1.5: OK
Schema discharge: OK
```

- [ ] **Step 4: Verify constants are in place**

```bash
cd /root/projects/medical-scribe/backend/backend-processing && python3 -c "
from utils.constants import Constants
assert Constants.SUMMARY_SCHEMA_VERSION_1_5 == '1.5'
assert Constants.SUMMARY_SCHEMA_VERSION_DISCHARGE == 'discharge'
print('Constants OK')
"
```

- [ ] **Step 5: Verify V1.1 pipeline restructure compiles**

```bash
cd /root/projects/medical-scribe/backend/backend-processing && python3 -c "
from simplify.v1_1.pipeline import V1_1Pipeline, _STRUCTURING_SCHEMA
assert 'warning_signs' in _STRUCTURING_SCHEMA
assert '\"version\": \"1.5\"' in _STRUCTURING_SCHEMA
assert 'what_to_do' in _STRUCTURING_SCHEMA
print('Pipeline OK')
"
```

- [ ] **Step 6: Verify V1.5 type guard is importable**

```bash
cd /root/projects/medical-scribe/frontend/frontend-expo && node -e "
// Quick CommonJS check that the file parses
const fs = require('fs');
const content = fs.readFileSync('api/appointments.ts', 'utf8');
const checks = ['ProcessedSummaryV15', 'DischargeSummary', 'isV15Summary', 'isDischargeSummary'];
checks.forEach(c => {
  if (!content.includes(c)) console.error('MISSING:', c);
  else console.log('OK:', c);
});
"
```

Expected: all lines print `OK:`.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: V1-3 implementation complete — Schema 1.5, Simplify V1.1 restructure, discharge summary"
```

---

## Self-Review Checklist

### Spec coverage
- [x] Schema 1.5 JSON with all 14 new fields (Tasks 1–2)
- [x] LLM prompt with plain language rules, AHRQ substitutions, per-medication `why`, `main_conclusion`, `what_to_do` on warning signs, active voice, short sentences, medical terms explained (Task 2)
- [x] `plain_name` on diagnoses, medications, tests, procedures (Tasks 1, 8–11)
- [x] `why` on medications (MUST), tests, procedures, home instructions (Tasks 1, 9–12)
- [x] `diagnosis.main_conclusion` (Tasks 1, 8)
- [x] `diagnosis.changed_since_last_visit` (Tasks 1, 8)
- [x] `diagnosis.details[].what_it_means_for_you` (Tasks 1, 8)
- [x] `medications[].side_effects_to_watch` (Tasks 1, 9)
- [x] `medications[].change_description` (Tasks 1, 9)
- [x] `tests[].preparation` (Tasks 1, 10)
- [x] `procedures[].what_to_expect` (Tasks 1, 11)
- [x] `other[].steps` array (Tasks 1, 12)
- [x] `warning_signs` structured array replacing `risks_side_effects` (Tasks 1, 13)
- [x] `questions` fixed to flat string array (Tasks 1, 4, 14)
- [x] `source_links` top-level array (Tasks 1, 4, 15)
- [x] Section header "What You Need to Know" (Task 6)
- [x] `ReasonForVisitSection` visible by default, renamed "Why You Came In" (Task 7)
- [x] `DiagnosisSection` with main_conclusion callout box and changed_since_last_visit badge (Task 8)
- [x] `MedicationsSection` with `why` FIRST, NEW/CHANGED/STOPPED badges (Task 9)
- [x] `TestsSection` with why + preparation (Task 10)
- [x] `ProceduresSection` with why + what_to_expect (Task 11)
- [x] `OtherInstructionsSection` with steps numbered list (Task 12)
- [x] `WarningSignsSection` NEW component, color-coded by urgency (Task 13)
- [x] `QuestionsSection` flat array, copy button, new header (Task 14)
- [x] `SourceLinksSection` NEW footer component (Task 15)
- [x] `OtherDetailsSection` NEW collapsible low-importance aggregator (Task 16)
- [x] `AppointmentSummaryV15` container with correct section order (Task 18)
- [x] Wire V1.5 into appointment screen (Task 19)
- [x] PDF render for V1.5 (Task 20)
- [x] Simplify V1.1 pipeline output restructured to Schema 1.5 shape (Task 21)
- [x] Simplify V1.1 frontend updated to render new shape (Task 22)
- [x] Discharge summary schema + prompt (Task 23)
- [x] `DischargeSummaryView` with ER warning signs at top, stopped medications section (Task 24)
- [x] `DischargeSummary` TypeScript type (Task 4)

### Type consistency check
- `ProcessedSummaryV15.warning_signs[]` uses type `'emergency' | 'call_doctor' | 'monitor' | 'normal_side_effect'` — matches `WarningSignsSection.Urgency` type
- `ProcessedSummaryV15.questions` is `string[]` — matches `QuestionsSection.questions: string[]` prop
- `ProcessedSummaryV15.medications[].change_description` is `string | undefined` — matches `MedicationsSection.Medication.change_description?: string`
- `DischargeSummary.medications` uses same shape as `ProcessedSummaryV15.medications` — `DischargeSummaryView` passes it directly to `MedicationsSection`
- `AppointmentSummaryV15` receives `ProcessedSummaryV15` — all sub-components receive their specific field slices
- `isV15Summary()` returns `ps is ProcessedSummaryV15` — used in `[id].tsx` cast `ps as ProcessedSummaryV15`
