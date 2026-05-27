import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatAppointmentDateLong } from './formatDate';
import type {
  AppointmentWithId,
  ProcessedSummaryV12,
  ProcessedSummaryV13,
  ProcessedSummaryV14,
} from '@/api/appointments';
import { isV13Summary, isV14Summary } from '@/api/appointments';

// =============================================================================
// HTML helpers
// =============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function severityBadge(severity?: 'high' | 'medium' | 'low'): string {
  if (!severity) return '';
  const colors: Record<string, { bg: string; text: string }> = {
    high: { bg: '#FEE2E2', text: '#991B1B' },
    medium: { bg: '#FEF3C7', text: '#92400E' },
    low: { bg: '#DCFCE7', text: '#166534' },
  };
  const c = colors[severity] || colors.low;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${c.bg};color:${c.text};margin-left:8px;text-transform:uppercase;">${severity}</span>`;
}

function importanceDot(importance?: 'high' | 'low'): string {
  if (!importance) return '';
  const color = importance === 'high' ? '#EF4444' : '#9CA3AF';
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:8px;flex-shrink:0;"></span>`;
}

function sourceBadge(source?: string): string {
  if (!source) return '';
  const label = source === 'doctor' ? 'Doctor' : source === 'ai' ? 'AI Suggested' : source;
  const bg = source === 'doctor' ? '#DBEAFE' : '#F3E8FF';
  const color = source === 'doctor' ? '#1E40AF' : '#6B21A8';
  return `<span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:500;background:${bg};color:${color};margin-left:6px;">${escapeHtml(label)}</span>`;
}

function sectionHeading(title: string): string {
  return `<h2 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:24px 0 12px 0;padding-bottom:6px;border-bottom:2px solid #E5E7EB;">${escapeHtml(title)}</h2>`;
}

// =============================================================================
// Section renderers
// =============================================================================

function renderSummary(summary?: string): string {
  if (!summary) return '';
  return `
    ${sectionHeading('Summary')}
    <p style="color:#374151;line-height:1.6;margin:0;">${escapeHtml(summary)}</p>
  `;
}

function renderReasonForVisit(reasons?: Array<{ reason: string; description: string }>): string {
  if (!reasons || reasons.length === 0) return '';
  const items = reasons
    .map(
      (r) => `
    <div style="margin-bottom:10px;">
      <strong style="color:#1a1a2e;">${escapeHtml(r.reason)}</strong>
      <p style="color:#6B7280;margin:4px 0 0 0;line-height:1.5;">${escapeHtml(r.description)}</p>
    </div>`,
    )
    .join('');
  return `${sectionHeading('Reason for Visit')}${items}`;
}

function renderDiagnosis(
  diagnosis?: { details: Array<{ title: string; description: string; severity?: 'high' | 'medium' | 'low' }> },
  heading = 'Diagnosis',
): string {
  if (!diagnosis?.details?.length) return '';
  const items = diagnosis.details
    .map(
      (d) => `
    <div style="margin-bottom:10px;padding:10px 14px;border-left:4px solid ${d.severity === 'high' ? '#EF4444' : d.severity === 'medium' ? '#F59E0B' : '#10B981'};background:#FAFAFA;border-radius:0 8px 8px 0;">
      <div style="display:flex;align-items:center;">
        <strong style="color:#1a1a2e;">${escapeHtml(d.title)}</strong>${severityBadge(d.severity)}
      </div>
      <p style="color:#6B7280;margin:4px 0 0 0;line-height:1.5;">${escapeHtml(d.description)}</p>
    </div>`,
    )
    .join('');
  return `${sectionHeading(heading)}${items}`;
}

function renderActionTodos(
  todos?: Array<{ title: string; importance: 'high' | 'low'; source?: string }>,
): string {
  if (!todos?.length) return '';
  const items = todos
    .map(
      (t) => `
    <div style="display:flex;align-items:center;margin-bottom:8px;padding:8px 12px;background:#F9FAFB;border-radius:8px;">
      ${importanceDot(t.importance)}
      <span style="color:#1a1a2e;font-weight:500;">${escapeHtml(t.title)}</span>${sourceBadge(t.source)}
    </div>`,
    )
    .join('');
  return `${sectionHeading('Action Items')}${items}`;
}

function renderTests(
  tests?: Array<{ title: string; description: string; importance: 'high' | 'low'; source?: string }>,
): string {
  if (!tests?.length) return '';
  const items = tests
    .map(
      (t) => `
    <div style="margin-bottom:10px;padding:10px 14px;background:#F9FAFB;border-radius:8px;">
      <div style="display:flex;align-items:center;">
        ${importanceDot(t.importance)}
        <strong style="color:#1a1a2e;">${escapeHtml(t.title)}</strong>${sourceBadge(t.source)}
      </div>
      <p style="color:#6B7280;margin:4px 0 0 0;line-height:1.5;">${escapeHtml(t.description)}</p>
    </div>`,
    )
    .join('');
  return `${sectionHeading('Tests')}${items}`;
}

function renderMedications(
  medications?: Array<{
    title: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    instructions?: string;
    importance: 'high' | 'low';
    source?: string;
    change?: boolean;
  }>,
): string {
  if (!medications?.length) return '';
  const rows = medications
    .map((m) => {
      const details: string[] = [];
      if (m.dosage) details.push(`<strong>Dosage:</strong> ${escapeHtml(m.dosage)}`);
      if (m.frequency) details.push(`<strong>Frequency:</strong> ${escapeHtml(m.frequency)}`);
      if (m.timing) details.push(`<strong>Timing:</strong> ${escapeHtml(m.timing)}`);
      if (m.duration) details.push(`<strong>Duration:</strong> ${escapeHtml(m.duration)}`);
      if (m.instructions) details.push(`<strong>Instructions:</strong> ${escapeHtml(m.instructions)}`);

      return `
    <div style="margin-bottom:12px;padding:12px 14px;background:#F9FAFB;border-radius:8px;${m.change ? 'border-left:4px solid #F59E0B;' : ''}">
      <div style="display:flex;align-items:center;margin-bottom:4px;">
        ${importanceDot(m.importance)}
        <strong style="color:#1a1a2e;">${escapeHtml(m.title)}</strong>
        ${m.change ? '<span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:500;background:#FEF3C7;color:#92400E;margin-left:6px;">Changed</span>' : ''}
        ${sourceBadge(m.source)}
      </div>
      ${details.length ? `<div style="color:#6B7280;font-size:13px;line-height:1.6;margin-top:4px;">${details.join(' &nbsp;·&nbsp; ')}</div>` : ''}
    </div>`;
    })
    .join('');
  return `${sectionHeading('Medications')}${rows}`;
}

function renderProcedures(
  procedures?: Array<{ title: string; description: string; timeframe?: string; importance: 'high' | 'low'; source?: string }>,
): string {
  if (!procedures?.length) return '';
  const items = procedures
    .map(
      (p) => `
    <div style="margin-bottom:10px;padding:10px 14px;background:#F9FAFB;border-radius:8px;">
      <div style="display:flex;align-items:center;">
        ${importanceDot(p.importance)}
        <strong style="color:#1a1a2e;">${escapeHtml(p.title)}</strong>${sourceBadge(p.source)}
      </div>
      <p style="color:#6B7280;margin:4px 0 0 0;line-height:1.5;">${escapeHtml(p.description)}</p>
      ${p.timeframe ? `<p style="color:#9CA3AF;font-size:12px;margin:4px 0 0 0;">Timeframe: ${escapeHtml(p.timeframe)}</p>` : ''}
    </div>`,
    )
    .join('');
  return `${sectionHeading('Procedures')}${items}`;
}

function renderOther(
  other?: Array<{
    title: string;
    description: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    importance: 'high' | 'low';
    source?: string;
  }>,
): string {
  if (!other?.length) return '';
  const items = other
    .map((o) => {
      const details: string[] = [];
      if (o.dosage) details.push(`Dosage: ${escapeHtml(o.dosage)}`);
      if (o.frequency) details.push(`Frequency: ${escapeHtml(o.frequency)}`);
      if (o.timing) details.push(`Timing: ${escapeHtml(o.timing)}`);
      if (o.duration) details.push(`Duration: ${escapeHtml(o.duration)}`);

      return `
    <div style="margin-bottom:10px;padding:10px 14px;background:#F9FAFB;border-radius:8px;">
      <div style="display:flex;align-items:center;">
        ${importanceDot(o.importance)}
        <strong style="color:#1a1a2e;">${escapeHtml(o.title)}</strong>${sourceBadge(o.source)}
      </div>
      <p style="color:#6B7280;margin:4px 0 0 0;line-height:1.5;">${escapeHtml(o.description)}</p>
      ${details.length ? `<p style="color:#9CA3AF;font-size:12px;margin:4px 0 0 0;">${details.join(' · ')}</p>` : ''}
    </div>`;
    })
    .join('');
  return `${sectionHeading('Other Instructions')}${items}`;
}

function renderFollowUp(followUp?: Array<{ description: string; time_frame: string }>): string {
  if (!followUp?.length) return '';
  const items = followUp
    .map(
      (f) => `
    <div style="display:flex;align-items:baseline;margin-bottom:8px;padding:8px 12px;background:#F0FDF4;border-radius:8px;">
      <span style="color:#166534;font-weight:600;margin-right:10px;white-space:nowrap;">${escapeHtml(f.time_frame)}</span>
      <span style="color:#374151;">${escapeHtml(f.description)}</span>
    </div>`,
    )
    .join('');
  return `${sectionHeading('Follow-up')}${items}`;
}

function renderWhyRecommended(text?: string): string {
  if (!text) return '';
  return `
    ${sectionHeading('Why This Was Recommended')}
    <p style="color:#374151;line-height:1.6;margin:0;padding:10px 14px;background:#EFF6FF;border-radius:8px;">${escapeHtml(text)}</p>
  `;
}

function renderQuestions(questions?: Array<Record<string, string>>): string {
  if (!questions?.length) return '';
  const allQuestions: string[] = [];
  questions.forEach((q) => {
    Object.values(q).forEach((val) => {
      if (val && typeof val === 'string') allQuestions.push(val);
    });
  });
  if (allQuestions.length === 0) return '';

  const items = allQuestions
    .map(
      (q, i) => `
    <div style="margin-bottom:8px;padding:8px 12px;background:#FDF4FF;border-radius:8px;">
      <span style="color:#6B21A8;font-weight:600;margin-right:8px;">${i + 1}.</span>
      <span style="color:#374151;">${escapeHtml(q)}</span>
    </div>`,
    )
    .join('');
  return `${sectionHeading('Questions to Ask Your Doctor')}${items}`;
}

// V1.2 specific
function renderTodos(
  todos?: Array<{
    type: string;
    title: string;
    description: string;
    recommended: boolean;
    verified: boolean;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    timeframe?: string;
  }>,
): string {
  if (!todos?.length) return '';
  const items = todos
    .map((t) => {
      const details: string[] = [];
      if (t.dosage) details.push(`Dosage: ${escapeHtml(t.dosage)}`);
      if (t.frequency) details.push(`Frequency: ${escapeHtml(t.frequency)}`);
      if (t.timing) details.push(`Timing: ${escapeHtml(t.timing)}`);
      if (t.duration) details.push(`Duration: ${escapeHtml(t.duration)}`);
      if (t.timeframe) details.push(`Timeframe: ${escapeHtml(t.timeframe)}`);

      return `
    <div style="margin-bottom:10px;padding:10px 14px;background:#F9FAFB;border-radius:8px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:500;background:#E0E7FF;color:#3730A3;">${escapeHtml(t.type)}</span>
        <strong style="color:#1a1a2e;">${escapeHtml(t.title)}</strong>
        ${t.verified ? '<span style="color:#16A34A;font-size:11px;">✓ Verified</span>' : ''}
        ${t.recommended ? '<span style="color:#2563EB;font-size:11px;">★ Recommended</span>' : ''}
      </div>
      <p style="color:#6B7280;margin:4px 0 0 0;line-height:1.5;">${escapeHtml(t.description)}</p>
      ${details.length ? `<p style="color:#9CA3AF;font-size:12px;margin:4px 0 0 0;">${details.join(' · ')}</p>` : ''}
    </div>`;
    })
    .join('');
  return `${sectionHeading('To-Do Items')}${items}`;
}

function renderLearnings(learnings?: Array<{ title: string; description: string }>): string {
  if (!learnings?.length) return '';
  const items = learnings
    .map(
      (l) => `
    <div style="margin-bottom:10px;padding:10px 14px;background:#EFF6FF;border-radius:8px;">
      <strong style="color:#1a1a2e;">${escapeHtml(l.title)}</strong>
      <p style="color:#6B7280;margin:4px 0 0 0;line-height:1.5;">${escapeHtml(l.description)}</p>
    </div>`,
    )
    .join('');
  return `${sectionHeading('Key Learnings')}${items}`;
}

// =============================================================================
// Main HTML generator
// =============================================================================

function generateAppointmentHtml(appointment: AppointmentWithId): string {
  const ps = appointment.processedSummary;
  const title = appointment.title || 'Appointment Summary';
  const dateStr = formatAppointmentDateLong(appointment.appointmentDate);

  // Metadata rows
  const metaRows: string[] = [];
  if (appointment.doctor) metaRows.push(`<strong>Doctor:</strong> ${escapeHtml(appointment.doctor)}`);
  if (appointment.location) metaRows.push(`<strong>Location:</strong> ${escapeHtml(appointment.location)}`);
  metaRows.push(`<strong>Date:</strong> ${escapeHtml(dateStr)}`);

  let bodyContent = '';

  if (ps) {
    const v14 = isV14Summary(ps);
    const v13 = !v14 && isV13Summary(ps);

    if (v14) {
      const s = ps as ProcessedSummaryV14;
      bodyContent = [
        renderSummary(s.summary),
        renderDiagnosis(s.diagnosis, 'Diagnosis & Assessment'),
        renderActionTodos(s.action_todo),
        renderReasonForVisit(s.reason_for_visit),
        renderTests(s.tests),
        renderMedications(s.medications),
        renderProcedures(s.procedures),
        renderOther(s.other),
        renderFollowUp(s.follow_up),
        renderWhyRecommended(s.why_recommended),
        renderQuestions(s.questions),
      ].join('');
    } else if (v13) {
      const s = ps as ProcessedSummaryV13;
      bodyContent = [
        renderSummary(s.summary),
        renderDiagnosis(s.diagnosis, 'Diagnosis & Assessment'),
        renderActionTodos(s.action_todo),
        renderReasonForVisit(s.reason_for_visit),
        renderTests(s.tests),
        renderMedications(s.medications),
        renderProcedures(s.procedures),
        renderOther(s.other),
        renderFollowUp(s.follow_up),
        renderWhyRecommended(s.why_recommended),
      ].join('');
    } else {
      const s = ps as ProcessedSummaryV12;
      bodyContent = [
        renderSummary(s.summary),
        renderReasonForVisit(s.reason_for_visit),
        renderDiagnosis(s.diagnosis),
        renderTodos(s.todos),
        renderFollowUp(s.follow_up),
        renderLearnings(s.learnings),
      ].join('');
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a2e;
      margin: 0;
      padding: 32px;
      background: #fff;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #4F46E5;
      padding-bottom: 16px;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #4F46E5;
      margin: 0 0 8px 0;
    }
    .meta {
      color: #6B7280;
      font-size: 13px;
      line-height: 1.8;
    }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #9CA3AF;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${metaRows.join(' &nbsp;|&nbsp; ')}</div>
  </div>

  ${bodyContent}

  <div class="footer">
    Generated on ${escapeHtml(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}
  </div>
</body>
</html>`;
}

// =============================================================================
// Download / Share
// =============================================================================

export async function downloadAppointmentPdf(appointment: AppointmentWithId): Promise<void> {
  const html = generateAppointmentHtml(appointment);
  const fileName = `appointment-${appointment.appointmentId.slice(0, 8)}`;

  if (Platform.OS === 'web') {
    // Web: create a hidden iframe, write HTML, trigger print (save as PDF)
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      // Give it a moment to render, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 400);
    }
    return;
  }

  // Native (iOS / Android): generate a PDF file and share it
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save Appointment PDF',
      UTI: 'com.adobe.pdf',
    });
  } else {
    // Fallback: just print
    await Print.printAsync({ uri });
  }
}
