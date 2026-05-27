# Patient-Facing Medical Note Display: Design & Requirements Analysis

**Date:** 2026-05-27  
**Branch:** users/tejitpabari/simplifyV2  
**Scope:** Appointment summaries, provider notes, SOAP notes, discharge summaries  
**Source requirements:** [Good quality summary criteria](https://docs.google.com/document/d/1TzanOZWIb8iHzzSavnJwxrVh_OFM03FvNYcVLNWcbtc), [Test results literacy](https://docs.google.com/document/d/10jldiDT-z4APFVY213lY5QwNAegHqbvx6OHjanviotk), AHRQ PEMAT

---

## Overview

This document analyzes what must be added, changed, or removed to bring the current patient-facing note display in line with evidence-based health literacy standards. It covers every note type: appointment summaries (Schema 1.4), provider notes, SOAP notes, and discharge summaries. Each section describes **what** to display, **why** it matters (backed by research), and **what specifically needs to change** in schema, LLM prompts, and frontend.

The core problem: the current system extracts the right clinical information but presents it in a way that still requires medical literacy to interpret. Patients get structured data, not understanding. The research is unambiguous — access to information is not the same as understanding. In one study, 65% of patients underestimated the need for action at least once when reviewing results, regardless of presentation format. In another, patients preferred having a doctor explain results over reading them in a portal, even when they had access. Our job is to close that gap.

The ROI for clinics is direct: patients who understand their care plan adhere to medications more consistently, make fewer unnecessary follow-up calls about confusion, recognize warning signs sooner, and report higher satisfaction. Every section below is designed to drive one of those outcomes.

---

## Section 1: Short Summary (the "TL;DR")

### What to display
A 3-sentence summary at the very top of the note. It must answer:
1. Why you came in today
2. What the doctor concluded
3. The single most important thing you need to do next

**Example:** "You came in today because of chest pain that started two days ago. The doctor found that your heart is healthy and the pain is likely coming from muscle tension. Your most important next step is to take ibuprofen as needed and rest for 3 days."

### Why this must be here
Research consistently shows that patients overwhelmingly want the most important information first. The current `summary` field in Schema 1.4 does exist, but the prompt only specifies "key points of the visit" without requiring the three-part structure above. Many patients — especially those with lower health literacy — will read only the first section and act on it. If the first section is vague or clinical, comprehension fails before it begins. The PEMAT framework requires that "the purpose of the material is stated" — the three-part TL;DR structure ensures this for every note type.

**Critically missing:** The current schema's `summary` field has no "most important next step" requirement. Patients in studies rated "provide timely test result explanation and follow-up instructions" as their #1 requested feature. The summary must include a concrete next action.

### Changes needed

**Schema:** Add explicit instructions to the summary field:
```
"summary": "3-sentence plain-language summary. Sentence 1: why the patient came in. Sentence 2: the main conclusion. Sentence 3: the single most important next step."
```

**LLM prompt:** Add to requirements section: "The summary MUST include: (1) reason for visit in plain language, (2) the main clinical conclusion, (3) the single highest-priority next step. Write it as if explaining to someone with no medical training."

**Frontend:** No structural change needed — summary is already displayed first. But add visual weight: larger font, light background tint, "What you need to know" as the section header (not "Summary").

---

## Section 2: Why You Were Seen

### What to display
A plain-language restatement of the reason for the visit. If there are multiple reasons, list each one. Keep it to 1-2 sentences per reason.

**Example:**
- "High blood pressure — Your readings have been consistently above 140/90 over the past month."
- "Dizziness when standing up — You've been feeling lightheaded when you stand, especially in the morning."

### Why this must be here
Patients need to see their own concern reflected back to them before they can engage with what the doctor found. This is a trust anchor — it confirms the system understood why they were there. The current implementation has `reason_for_visit` and it displays correctly. This section is largely working.

### Changes needed

**Schema:** Minor. The `description` field in `reason_for_visit` sometimes contains clinical language. Add to schema comments: "Use the patient's own words where possible. Explain in plain language."

**LLM prompt:** Add: "For reason_for_visit, describe in the patient's own terms, not clinical terms. If the patient said 'my knee hurts,' write 'knee pain,' not 'arthralgia.'"

**Frontend:** Section header change from "Reason for Visit" to "Why You Came In." Currently this is a collapsible section — it should be visible by default (not behind a ReadMore toggle) because it orients the rest of the note.

---

## Section 3: What the Doctor Found

### What to display
Three subsections:

**3a. Key Findings** — What the doctor observed or measured. For each finding:
- The finding in plain language
- What it means for the patient

**3b. How This Compares to Before** (new — currently missing)
- Only show if previous data exists: "This is better/worse/the same as your last visit."
- For test results: show the trend direction, not just the current value.

**3c. Main Conclusion** (new — currently missing as a distinct field)
- The doctor's overall clinical judgment in one sentence.
- Must be separate from the list of diagnoses.
- Example: "Overall, your blood pressure is improving but not yet at the target range."

### Why this must be here

The research on test results is particularly strong here. Zhang et al. (2020) — a study of 203 patients and 13 interviews — found that patients need two types of information: generic (what does this test measure?) and contextual (what does THIS result mean FOR ME?). The current diagnosis display only addresses the generic layer. The contextual layer — what changed, what it means in total — is entirely absent.

The "How This Compares to Before" subsection addresses a major finding from multiple studies: patients with chronic conditions found tracking over time more valuable than any single data point. "What I really, really think needs to be done is the ability to track your abnormal results over time" is a direct patient quote from Zhang et al. (2020). Struikman et al. (2020) found that showing longitudinal trends significantly improved engagement and comprehension.

The "Main Conclusion" subsection addresses the finding from Lazaro (2023) that counterintuitive language causes confusion — "positive" meaning disease found, a high value being bad in some cases but good in others. A single plain-language conclusion from the doctor cuts through this. Currently, patients must infer the overall conclusion from a list of individual diagnoses, which research shows they often cannot do correctly.

### Changes needed

**Schema:**
```json
"diagnosis": {
  "main_conclusion": "string", // NEW: Doctor's overall clinical judgment in 1 plain-language sentence
  "changed_since_last_visit": "string", // NEW: How this compares to the last appointment. Omit if no prior context.
  "details": [
    {
      "title": "string",           // Medical term (keep exact wording)
      "plain_name": "string",       // NEW: Plain-language name, e.g., "high blood pressure"
      "description": "string",      // What it means for the patient
      "what_it_means_for_you": "string",  // NEW: Patient-specific impact, 1-2 sentences
      "severity": "high | medium | low"
    }
  ]
}
```

**LLM prompt additions:**
- "For each diagnosis, provide a `plain_name` that a 6th-grader would understand."
- "For each diagnosis, write a `what_it_means_for_you` sentence explaining the real-world impact on the patient's daily life — not the clinical definition."
- "Provide a `main_conclusion` that summarizes the overall clinical picture in one sentence."
- "If prior appointment context is available, provide `changed_since_last_visit` comparing current state to previous."

**Frontend:**
- Show "Main Conclusion" as a highlighted callout box at the top of this section (visually prominent, not buried in a list)
- Show "What This Means for You" under each diagnosis item
- Show "Compared to Last Visit" as a trend line or simple text badge ("Better," "Stable," "Needs attention") — green/amber/red color coding
- Keep diagnoses sorted by severity (high first)

---

## Section 4: Other Details (Expandable)

### What to display
A collapsed/expandable section containing clinical details that are complete but secondary:
- Test procedure details (how a test is performed)
- Family/patient history mentioned but not directly relevant to this visit
- Administrative context
- Repeated medication lists that haven't changed

### Why this must be here
The MUST requirement from the Google Doc is explicit: "Remove or hide information or content that distracts from its purpose." The research supports this strongly — presenting too much information reduces comprehension for the primary content. Information that is complete but not actionable should still be accessible (for patients who want it) but should not compete visually with the action items and key findings.

Currently, no such filtering exists. The current display shows all extracted information at equal visual weight. This creates cognitive overload.

### Changes needed

**Schema:** Add a classification to each item for whether it's "primary" (shown by default) or "contextual" (shown in expandable). Alternatively, drive this from `importance: "high | low"` fields that already exist.

**LLM prompt:** Add classification guidance: "Mark `importance: 'low'` for: (a) unchanged medication refills, (b) tests performed as routine without new indication, (c) background history not discussed in this visit, (d) administrative or billing information."

**Frontend:** Add a collapsible "Other Details" section that aggregates all low-importance items from all categories. The section should show a count: "3 additional details" before expanding. This keeps the main view focused on what changed and what the patient needs to do.

---

## Section 5: Your Care Plan

This is the most critical section for patient outcomes. The care plan must answer four questions for every single item: **What? Why? When? How?**

The current implementation gives "What" and sometimes "When." "Why" and "How" (in actionable steps) are almost entirely absent.

### 5a. Medications

### What to display
For each medication:
- **Name** (plain name + medical name, e.g., "Blood pressure medication (Lisinopril)")
- **Why you're taking this** — one sentence explaining what this medication does for the patient's specific condition. This is a MUST per the Google Doc.
- **How to take it** — Dose, frequency, timing in plain language
- **For how long**
- **What to watch for** — specific side effects to be aware of (moved from global risks section to per-medication)
- A **"Changed"** badge if this is new or modified since last visit

**Example:**
> **Blood pressure medication (Lisinopril 10mg)**
> **Why you're taking this:** To lower your blood pressure and protect your kidneys from long-term damage.
> **How to take it:** Once every morning, with or without food.
> **For how long:** Continue until your next visit in 3 months.
> **Watch for:** Dry cough or dizziness when standing — call if these bother you.

### Why this is critical
"Explain reason of a medication" is listed as **MUST** in the Google Doc. Multiple studies confirm why: patients who understand WHY they take a medication adhere significantly better. A patient who understands that Lisinopril protects their kidneys (not just "controls blood pressure") is more motivated to take it consistently. Currently, the LLM generates a blanket `why_recommended` that covers all items at once. That is insufficient — each medication needs its own rationale.

The ROI for clinics here is medication adherence. Poor adherence is the single largest driver of preventable hospitalizations. A patient who understands their medication is a patient who takes it.

### Changes needed

**Schema:** Add `why` field to each medication:
```json
"medications": [
  {
    "title": "string",
    "plain_name": "string",        // NEW: "Blood pressure medication"
    "why": "string",               // NEW: MUST. "Why you're taking this: ..."
    "dosage": "string",
    "frequency": "string",
    "timing": "string",
    "duration": "string",
    "instructions": "string",
    "side_effects_to_watch": "string",  // NEW: Move from global risks to per-medication
    "importance": "high | low",
    "change": "boolean",
    "change_description": "string"  // NEW: What specifically changed, if change=true
  }
]
```

**LLM prompt additions:**
- "For every medication, provide a `why` field: 1 sentence in plain language explaining what this medication does for THIS patient's specific condition. Do not use generic drug descriptions. Tie it to their diagnosis."
- "For every medication, provide `side_effects_to_watch`: the 1-2 most common or serious side effects to watch for, in plain language."
- "Provide `plain_name` using common language (e.g., 'blood pressure medication' for Lisinopril, 'blood thinner' for warfarin)."
- "If `change=true`, describe in `change_description` what changed (new medication, dose increase, dose decrease, stopped)."

**Frontend:**
- Show medication name as "Plain Name (Medical Name)" — e.g., "Blood pressure medication (Lisinopril)"
- Show "Why you're taking this" as the FIRST piece of information under the name, before dosage
- Show a "NEW" or "CHANGED" badge prominently for medication changes — this is high-stakes information
- Group the how/when/how-long into a compact grid, not a prose paragraph
- Show "Watch for" in amber/yellow, not buried in the general card

### 5b. Tests

### What to display
For each test:
- **Name** (plain name + medical name)
- **Why this test is needed** (NEW)
- **When to get it done**
- **Where to go** (if specified)
- **What to do before** (fasting, preparation)

**Example:**
> **Blood sugar test (HbA1c)**
> **Why you need this:** To see how well your blood sugar has been controlled over the past 3 months. This helps your doctor adjust your diabetes treatment.
> **When:** Within the next 2 weeks, before your next appointment.
> **How to prepare:** No fasting required for this specific test.

### Why this matters
Patients frequently don't get tests done because they don't understand why they matter. Research from Zhang et al. (2020) showed that patients need "generic information" about what the test measures — not just a name and a timeframe. When patients understand "this test tells the doctor if the medication is working," the completion rate improves. The `description` field currently exists but doesn't consistently capture the "why" and "how to prepare."

### Changes needed

**Schema:**
```json
"tests": [
  {
    "title": "string",
    "plain_name": "string",     // NEW
    "why": "string",            // NEW: Why this test is needed for this patient
    "description": "string",    
    "preparation": "string",    // NEW: What to do before (fasting, etc.) — omit if none
    "importance": "high | low",
    "source": "string"
  }
]
```

**LLM prompt additions:**
- "For every test, provide `why`: 1 sentence explaining why THIS patient needs this test, not a generic description of the test."
- "For every test, provide `preparation` if any preparation is needed (fasting, stopping medications, etc.)."

**Frontend:**
- Show "Why you need this" before the timeframe
- Show preparation requirements in a distinct visual element (e.g., checklist icon)
- High-importance tests get a visual priority badge

### 5c. Referrals & Procedures

### What to display
- **Who** you're being referred to (specialty, plain language)
- **Why** (what the specialist will look at or do)
- **When** (urgency level, timeframe)
- **What to expect** (brief description of the process)

**Example:**
> **Heart specialist (Cardiologist)**
> **Why:** Your doctor wants a specialist to review your irregular heartbeat and determine if any further treatment is needed.
> **When:** Within the next 2 weeks — this is important, please schedule soon.
> **What to expect:** The specialist will likely do an ECG and may order additional heart monitoring.

### Changes needed

**Schema:**
```json
"procedures": [
  {
    "title": "string",
    "plain_name": "string",         // NEW
    "why": "string",                // NEW: Reason for referral/procedure
    "what_to_expect": "string",     // NEW: Brief patient-facing description
    "timeframe": "string",
    "importance": "high | low",
    "source": "string"
  }
]
```

### 5d. Home Instructions

### What to display
Each instruction must be broken into manageable steps. Not "rest and ice the knee" but:
1. Apply ice for 20 minutes
2. Do this 3 times per day
3. Keep your leg elevated when sitting

The PEMAT MUST requirement: "Breaks down any action into manageable steps."

### Changes needed

**Schema:**
```json
"other": [
  {
    "title": "string",
    "why": "string",              // NEW: Why this instruction matters
    "steps": ["string"],          // NEW: Array of numbered steps (if multi-step)
    "description": "string",       // Kept for single-step instructions
    "frequency": "string",
    "duration": "string",
    "importance": "high | low",
    "source": "string"
  }
]
```

**LLM prompt additions:**
- "For any instruction that involves multiple actions, list them as separate steps in the `steps` array."
- "For every instruction, provide `why`: what will happen if they follow/don't follow this."
- "Address the patient directly: 'Apply ice to your knee' not 'Ice should be applied to the knee.'"

---

## Section 6: What to Watch For

### What to display
A distinct section listing specific symptoms the patient should watch for, with clear guidance on what to do if they occur:

**Format for each warning sign:**
- **Symptom** (in plain language)
- **What it might mean** (brief)
- **What to do** (specific action: call your doctor, go to ER, etc.)

**Example:**
> - **Sudden severe headache** — Could be a sign of very high blood pressure. Go to the emergency room immediately.
> - **Dry cough that won't go away** — A known side effect of Lisinopril. Call your doctor to discuss switching medications.
> - **Swelling in your legs or ankles** — Could be a sign of fluid retention. Call your doctor within 1-2 days.

### Why this is critical
This section is currently absent from the display as a distinct entity. The `risks_side_effects` field exists in Schema 1.4 but is:
1. Not displayed prominently enough in the current frontend
2. Mixed together (medication side effects, general condition risks, emergency warning signs)
3. Not clearly actionable — no "what to do when" attached to each

The research on this is stark. Fraccaro et al. (2018) found that 65% of patients underestimated the urgency of action needed at least once. The current display does nothing to help patients triage. A patient who sees "watch for signs of low blood sugar" with no context about severity or what to do is no better off than a patient who saw nothing.

For discharge summaries, this section is arguably the most important in the entire document. Discharge summary reading comprehension directly predicts 30-day readmission rates. Patients who understand their warning signs call before they deteriorate; patients who don't end up back in the hospital.

The ROI for clinics: every avoided unnecessary ER visit or readmission is a direct financial win and a quality metric improvement.

### Changes needed

**Schema:** Reorganize `risks_side_effects` into a `warning_signs` section with clearer structure:
```json
"warning_signs": [
  {
    "symptom": "string",          // Plain-language symptom name
    "what_it_might_mean": "string",  // Brief context (not clinical jargon)
    "what_to_do": "string",        // Specific action: "Call your doctor", "Go to ER", "This is normal"
    "urgency": "emergency | call_doctor | monitor | normal_side_effect",
    "related_to": "string",        // Which medication/condition this is related to
    "importance": "high | low",
    "source": "string"
  }
]
```

**LLM prompt additions:**
- "For every warning sign, provide `what_to_do` as a specific instruction: 'Call your doctor within 24 hours,' 'Go to the emergency room,' or 'This is normal and will improve.' Not just 'seek medical attention.'"
- "Classify `urgency` as: `emergency` (go to ER), `call_doctor` (call within 24-48h), `monitor` (watch but no immediate action), or `normal_side_effect` (expected, not alarming)."
- "For medication side effects, mark `related_to` with the medication name."

**Frontend:**
- Show "What to Watch For" as a visually distinct section with a distinct icon (e.g., bell or flag)
- Color-code by urgency: red for emergency, amber for call-doctor, gray for monitor/normal
- Sort by urgency (emergency first)
- For each item, the "What to do" action must be displayed prominently — not collapsed

---

## Section 7: Questions to Ask Your Doctor

### What to display
3 suggested questions, specifically tailored to the patient's situation. Questions should address:
- Things the patient might be confused about
- Decisions where the patient has a role
- Lifestyle implications they might not have raised

**Example:**
> 1. "Are there foods or drinks I should avoid while taking Lisinopril?"
> 2. "Will my blood pressure target change as my readings improve?"
> 3. "If I'm feeling better, can I reduce my medication dose before my next appointment?"

### Why this must be here
This section already exists in Schema 1.4 but has a structural bug: questions are nested in an object with `question1/question2/question3` keys instead of a clean array. More importantly, the current display doesn't make the purpose of this section clear to patients — it just shows a list of questions without explaining that these are starter questions they can use.

Patients consistently say they want a way to ask their doctor questions but often forget or feel intimidated. Providing suggested questions reduces that friction and improves the quality of follow-up appointments — a win for both patient and clinic.

### Changes needed

**Schema:** Fix the questions structure (current is wrong):
```json
// CURRENT (broken):
"questions": [
  {
    "question1": "string",
    "question2": "string",
    "question3": "string"
  }
]

// SHOULD BE:
"questions": [
  "string",
  "string",
  "string"
]
```

**LLM prompt:** Fix to generate a flat array. Add: "Questions should help the patient understand or manage their care better. Avoid questions that challenge the doctor's judgment or that the doctor already answered in the visit."

**Frontend:** 
- Add a heading: "Questions You May Want to Ask at Your Next Visit"
- Add a brief intro: "These are suggested questions based on what was discussed today."
- Each question should have a "Copy" or "Save" button so patients can bring them to their next appointment

---

## Section 8: Source (Link to Raw Data)

### What to display
A link to: the original recording (if appointment), the original document (if provider note), or the original lab data.

**Example:** "Source: [View original appointment notes] [Listen to recording]"

### Why this must be here
The Google Doc lists this as a MUST: "Source: link to the raw data." Transparency is a trust signal. Patients who know they can verify the summary against the original are more likely to trust the system. This also supports the requirement to "restrict addition of information to reliable sources" — the source link proves nothing was invented.

### Changes needed

**Schema:** No schema change needed — the `source` field already exists on each item and tracks "documents | recording | notes." A top-level `source_links` array needs to be added:
```json
"source_links": [
  {
    "type": "recording | document | notes",
    "label": "string",  // "Appointment recording", "Lab results PDF"
    "url": "string"     // URL to the original resource
  }
]
```

**Frontend:** Add a footer section to every note: "This summary was generated from [recording / document / notes]. View the original." Link should open in the existing document/recording viewer.

---

## Language & Style Requirements (Apply Everywhere)

These are cross-cutting MUST requirements from the Google Doc that apply to every field generated by the LLM. They are currently not enforced systematically.

### 1. Plain Language (MUST)
Replace all medical terms with plain-language alternatives. The AHRQ plain language guide provides specific substitutions. Key ones:
- "administer" → "give" or "take"
- "hypertension" → "high blood pressure" (but keep the medical term in parentheses)
- "myocardial infarction" → "heart attack"
- "contraindicated" → "should not be used"
- "prognosis" → "outlook" or "what to expect"
- "benign" → "not harmful" or "not cancer"

**Implementation:** The AHRQ substitution list already exists in the Simplify V1.1 pipeline (`/backend/backend-processing/simplify/v1_1/pipeline.py`). These same substitutions must be applied in the appointment summary LLM prompt, not just the simplify pipeline.

### 2. No Acronyms or Abbreviations (MUST)
Never: "BID," "PRN," "QD," "CBC," "EKG"  
Always: "twice a day," "as needed," "once a day," "complete blood count," "heart tracing (ECG)"

**Implementation:** Add to LLM prompt: "Never use abbreviations or acronyms. Write out every term in full. 'BID' must always appear as 'twice a day.' 'CBC' must appear as 'complete blood count (CBC).'"

### 3. Active Voice Addressing the Patient (MUST)
Wrong: "Patients are advised to monitor blood pressure daily."  
Right: "Check your blood pressure every day."

Wrong: "Medication should be taken with food."  
Right: "Take this medication with food."

**Implementation:** Add to LLM prompt: "Use active voice throughout. Address the patient as 'you.' Never use passive constructions like 'it is recommended that' or 'patients should.'"

### 4. Short Sentences (MUST)
One idea per sentence. If a sentence has two clauses connected by "and" or "because," split it into two sentences.

**Implementation:** Add to LLM prompt: "Write one idea per sentence. Maximum 20 words per sentence. If you are tempted to write a compound sentence, write two sentences instead."

### 5. Medical Terms Must Be Both Kept and Explained (MUST)
The Google Doc requirement is: "Keep and explain important medical terms." This means the medical term should appear (for precision and because the patient may hear it from other providers), but always followed by a plain-language definition.

Format: "You have hypertension (high blood pressure) — this means the force of blood pushing against your artery walls is consistently too high."

**Implementation:** Add to LLM prompt: "For any medical term you use, follow it immediately with a plain-language definition in parentheses or a short explanatory clause. Never use a medical term without explaining it."

---

## Provider Notes & SOAP Notes: Mapping the Required Structure

The Simplify V1.1 pipeline currently produces: `what_happened`, `what_it_means`, `what_to_do`, `follow_ups`. This structure needs to be aligned with the required section order above.

### Required Mapping

| Current Simplify V1.1 output | Maps to required section |
|---|---|
| `what_happened` | Section 2 (Why You Were Seen) + Section 3a (Key Findings) |
| `what_it_means` | Section 3c (Main Conclusion) + per-diagnosis `what_it_means_for_you` |
| `what_to_do` | Section 5 (Care Plan) — medications, tests, home instructions |
| `follow_ups` | Follow-up section (currently already displayed) |
| (missing) | Section 1 (TL;DR summary) |
| (missing) | Section 6 (What to Watch For) |
| (missing) | Section 7 (Questions to Ask) |

### Changes needed for Simplify V1.1

**Schema/output restructuring:** Replace the current flat structure with the same schema used for appointment summaries (adapted for documents rather than recordings). The pipeline should produce:
```json
{
  "summary": "...",
  "reason_for_visit": [...],
  "diagnosis": {...},
  "medications": [...],
  "tests": [...],
  "other": [...],
  "follow_up": [...],
  "warning_signs": [...],
  "questions": [...]
}
```

**LLM prompt for Simplify:** Add all the language/style requirements listed above. The current prompt already enforces 6th-grade reading level but does not enforce:
- Active voice
- No acronyms
- Medical terms must be explained
- Per-item "why" for medications

---

## Discharge Summary: New Implementation Required

Discharge summaries are not currently implemented. They require the highest clarity of any note type — patients leave the hospital often still recovering, sometimes with new medications, and need to understand exactly when to return.

### Required Sections (discharge-specific)

**1. Why You Were in the Hospital** (reason for admission, plain language)

**2. What Happened During Your Stay** (brief narrative: tests done, procedures performed, how you improved)

**3. Your Discharge Medications** (CRITICAL)
- Full medication reconciliation: what's new, what changed, what stopped
- Every medication needs "why" field (MUST)
- This section often has 5-10+ medications — clear "NEW" / "CHANGED" / "STOPPED" badges are essential
- Drugs stopped must be listed explicitly: "Do NOT take [medication] anymore — it has been replaced by [new medication]"

**4. Your Care Plan After Discharge** (same as Section 5 above)

**5. What to Watch For — Return to the ER If** (most critical section for discharge)
- Must distinguish: "Call your doctor" vs "Go to the ER immediately"
- Research shows that patients who receive clear, written warning sign instructions have significantly lower 30-day readmission rates
- Each warning sign needs "what to do" (call doctor vs go to ER)

**6. Your Follow-Up Appointments**
- Specific dates and times if known
- What to discuss at each appointment
- Who to call to schedule

**7. Questions to Ask at Your Follow-Up**

### Changes needed

**Schema:** Create a new schema type `discharge_summary` in `/backend/backend-processing/summarySchema/`. It shares most fields with `1.4` but adds:
```json
{
  "type": "discharge_summary",
  "admission_date": "string",
  "discharge_date": "string",
  "reason_for_admission": "string",
  "what_happened_during_stay": "string",
  "medications_stopped": [
    {
      "title": "string",
      "reason_stopped": "string"  // Why it was discontinued
    }
  ],
  "return_to_er_if": [           // Distinct from warning_signs — this is ER-urgent only
    {
      "symptom": "string",
      "plain_description": "string"
    }
  ],
  // ... all other standard fields (medications, tests, follow_up, warning_signs, questions)
}
```

**Frontend:** A new screen for discharge summary display. Priority visual order:
1. "Return to the ER immediately if you experience..." (top, red, most prominent)
2. Your medications (second, especially highlighting changes)
3. Your follow-up appointments
4. Everything else

---

## What the Current System Gets Right

Before listing gaps, it's worth noting what works:
- The `action_todo` section for prioritized action items is well-conceived — most important items first
- The `importance: high | low` system for prioritizing content is sound
- The `source: documents | recording | notes` provenance tracking is good
- The `change: boolean` flag on medications is present (though not prominently displayed)
- The overall section structure is reasonable and improvable rather than wrong
- The Simplify V1.1 pipeline's use of AHRQ term substitutions is exactly right

---

## Summary of All Required Changes

### Schema changes (create schema 1.5)
1. Add `plain_name` to: diagnoses, medications, tests, procedures
2. Add `why` field to: medications (MUST), tests, procedures, home instructions
3. Add `main_conclusion` to `diagnosis` object
4. Add `changed_since_last_visit` to `diagnosis` object
5. Add `what_it_means_for_you` to each `diagnosis.details` item
6. Add `side_effects_to_watch` to each medication
7. Add `change_description` to each medication
8. Add `preparation` to each test
9. Add `what_to_expect` to each procedure
10. Add `steps` array to `other` instructions
11. Rename/replace `risks_side_effects` with structured `warning_signs` (with `urgency` field and `what_to_do`)
12. Fix `questions` from nested object to flat array
13. Add `source_links` top-level array
14. New discharge summary schema (see above)

### LLM prompt changes
1. Enforce plain language (active voice, no abbreviations, medical terms explained)
2. Require per-medication `why` (MUST)
3. Require short sentences (max 20 words)
4. Require `main_conclusion` for diagnosis section
5. Require `what_to_do` for every warning sign (not just description)
6. Require questions as flat array
7. Enforce "address patient as 'you'"
8. Port AHRQ term substitutions from Simplify V1.1 into the appointment summary prompt

### Frontend display changes
1. Rename sections to patient-friendly language (e.g., "Why You Came In" not "Reason for Visit")
2. Move `why` field to the top of each medication card (before dose/frequency)
3. Show "Why You Were Seen" by default (not collapsed)
4. Show "Main Conclusion" as a highlighted callout box
5. Show "Changed/New/Stopped" badges prominently for medication changes
6. Separate and prominently display "What to Watch For" with color-coded urgency
7. Add "Other Details" expandable section for low-importance items
8. Add source link footer
9. Fix questions display with "Questions to Ask at Your Next Visit" header and intro text
10. Add "Copy" functionality to questions
11. New discharge summary screen with ER warning signs at top

---

## Clinic ROI Summary

Each change above maps to a measurable outcome clinics care about:

| Change | Clinic Benefit |
|---|---|
| "Why" for every medication | Higher medication adherence → fewer complications, fewer calls |
| "What to Watch For" with urgency | Patients call before deteriorating → fewer ER escalations |
| Plain language throughout | Fewer "I didn't understand" follow-up calls |
| Discharge medication reconciliation | Fewer medication errors → fewer readmissions |
| Short summary with #1 next step | Patients actually do the most important thing |
| Suggested questions | Higher-quality follow-up appointments, better shared decision-making |
| Source link | Patient trust in the platform → higher engagement, reduced legal risk |

The core proposition for clinics: every note generated by this system should reduce the work the clinic has to do after the appointment, not create more. A patient who walks out understanding their care plan calls less, adheres better, and returns only when they actually need to.
