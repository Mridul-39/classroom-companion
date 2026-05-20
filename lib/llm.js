const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_CHAT_MODELS = [
  process.env.GROQ_CHAT_MODEL,
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
].filter(Boolean);

const GEMINI_CHAT_MODELS = [
  process.env.GEMINI_CHAT_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
].filter(Boolean);

async function callGroqChat(prompt, { temperature = 0.3, maxOutputTokens = 512, system } = {}) {
  if (!GROQ_API_KEY) return null;

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const models = [...new Set(GROQ_CHAT_MODELS)];
  let lastError = null;

  for (const model of models) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxOutputTokens,
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      lastError = new Error(`Groq chat failed (${model}): ${response.status} ${body}`);
      continue;
    }

    const json = JSON.parse(body);
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }

  if (lastError) throw lastError;
  return null;
}

async function callGeminiChat(prompt, { temperature = 0.3, maxOutputTokens = 512, system } = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const parts = [{ text: prompt }];
  const models = [...new Set(GEMINI_CHAT_MODELS)];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ parts }],
        generationConfig: { temperature, maxOutputTokens },
      }),
    });

    const body = await response.text();
    if (response.status === 429) continue;
    if (!response.ok) continue;

    const json = JSON.parse(body);
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }

  return null;
}

/** Groq first (if configured), then Gemini generateContent. */
async function callLLM(prompt, options = {}) {
  if (GROQ_API_KEY) {
    try {
      const out = await callGroqChat(prompt, options);
      if (out) return out;
    } catch (err) {
      console.warn('Groq chat failed, trying Gemini:', err.message);
    }
  }

  if (GEMINI_API_KEY) {
    return callGeminiChat(prompt, options);
  }

  throw new Error('No LLM configured — set GROQ_API_KEY or GEMINI_API_KEY in .env');
}

/** Normalize curly quotes so regexes and JSON extraction see straight quotes. */
export function normalizeNlpQuotes(message) {
  if (!message || typeof message !== 'string') return '';
  return message
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
}

/**
 * Route natural-language messages before side effects (assign, progress, etc.).
 * @returns {'ASSIGN'|'FEEDBACK'|'SUBMIT'|'PROGRESS'|'QUESTION'|'GREETING'|'CHAT'|'REMIND'}
 */
export function detectMessageIntent(message, role) {
  const text = normalizeNlpQuotes((message ?? '').trim());
  const lower = text.toLowerCase();

  if (!text) return 'CHAT';

  if (/^\s*(hi|hello|hey|good\s+(morning|afternoon|evening)|howdy|sup)\b/i.test(lower)) {
    return 'GREETING';
  }

  if (/^\s*(thanks|thank you|thx|ok|okay|got it|sure|cool|great)\s*[!.?]*\s*$/i.test(lower)) {
    return 'GREETING';
  }

  const isQuestion =
    /\?/.test(text) ||
    /\b(what|why|how|when|where|who|which|can you|could you|would you|tell me|explain|help me|do you know|is there|are there)\b/i.test(
      lower
    );

  if (role === 'teacher') {
    const looksLikeRemind =
      /\b(send\s+a\s+)?(remind|reminder|nudge|ping|poke)\b/i.test(lower) ||
      /\b(please\s+)?(remind|nudge|ping)\s+[a-z]/i.test(lower) ||
      (/\b(nudge|ping)\s+[a-z]/i.test(lower) && !/\bnew\s+assignment\b/i.test(lower));
    if (
      looksLikeRemind &&
      (/\b(student|assignment|homework|him|her|them|task)\b/i.test(lower) ||
        /\b(to|for)\s+[a-z]/i.test(text))
    ) {
      return 'REMIND';
    }

    if (
      /\bfeedback\b/i.test(lower) &&
      (/\|/.test(text) || /\bfor\b.*\bassignment\b/i.test(lower) || text.length > 40)
    ) {
      return 'FEEDBACK';
    }

    const hasDeadlineCue =
      /\b(due|deadline|hours?|minutes?|days?|tomorrow|tonight|week|from\s+now)\b/i.test(lower) ||
      /\b(in|within)\s+\d+\s*(hours?|minutes?|days?)\b/i.test(lower) ||
      /\d+\s*(hours?|minutes?|days?)\s*(from\s+now|later)?\b/i.test(lower);

    const looksLikeAssign =
      (/\bassign\b/i.test(lower) &&
        (hasDeadlineCue || /"[^"]+"/.test(text) || /\bto\s+[a-z]/i.test(text))) ||
      (/\b(create|add|give|set\s+up)\s+(a\s+)?(new\s+)?(assignment|homework|task)\b/i.test(lower) &&
        hasDeadlineCue &&
        /\b(to|for)\s+[a-z]/i.test(text));

    if (looksLikeAssign) return 'ASSIGN';
  }

  if (role === 'student') {
    if (/\b(submit|submitted|turn in|turned in|uploaded|here is my|here's my)\b/i.test(lower)) {
      return 'SUBMIT';
    }

    const progressSignals =
      /\b(done|finished|completed|working on|started|progress|stuck|struggling|almost|halfway|made|making|finished the|wrote|writing)\b/i.test(
        lower
      );

    if (progressSignals && !isQuestion) return 'PROGRESS';
  }

  if (isQuestion) return 'QUESTION';

  return 'CHAT';
}

export function findAssignmentInText(text, assignments) {
  const lower = text.toLowerCase();
  return (
    assignments.find(
      (a) =>
        lower.includes(a.id.toLowerCase()) ||
        lower.includes(a.title.toLowerCase()) ||
        a.title
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .some((word) => lower.includes(word))
    ) ?? null
  );
}

function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  const jsonText = firstBrace >= 0 && lastBrace >= 0 ? trimmed.slice(firstBrace, lastBrace + 1) : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function capitalize(text) {
  return text
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDueDateFromText(rawText) {
  const lower = rawText.toLowerCase();
  const now = new Date();

  const hoursFromNow = lower.match(/(\d+)\s*hours?\s*(from now|later)?/);
  if (hoursFromNow) {
    return new Date(now.getTime() + Number(hoursFromNow[1]) * 60 * 60 * 1000);
  }

  const minutesFromNow = lower.match(/(\d+)\s*minutes?\s*(from now|later)?/);
  if (minutesFromNow) {
    return new Date(now.getTime() + Number(minutesFromNow[1]) * 60 * 1000);
  }

  const dueDays = lower.match(/due\s+in\s+(\d+)\s*days?/);
  if (dueDays) {
    return new Date(now.getTime() + Number(dueDays[1]) * 24 * 60 * 60 * 1000);
  }

  if (/\bdue\s+tomorrow\b/.test(lower)) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  return null;
}

function extractStudentNameFromAssignText(rawText) {
  const afterQuotedTo = rawText.match(
    /"[^"]+"\s*,?\s*to\s+([a-z][a-z']*(?:\s+[a-z][a-z']*){0,3})/i
  );
  if (afterQuotedTo) return afterQuotedTo[1].trim().replace(/[,.\s]+$/, '');

  const toMatch = rawText.match(
    /\bto\s+([a-z][a-z']*(?:\s+[a-z][a-z']*){0,2})\s*(?:,|\.|the\s+deadline|deadline|due|$)/i
  );
  if (toMatch) return toMatch[1].trim();

  const assignToMatch = rawText.match(/\bassign\b[^]*?\bto\s+([a-z][a-z']*(?:\s+[a-z][a-z']*){0,2})/i);
  if (assignToMatch) return assignToMatch[1].trim();

  const afterAssign = rawText.match(/\bassign\s+(?:a\s+)?(?:new\s+)?(?:assignment\s+)?["']?[^"']*["']?\s+to\s+([a-z][a-z']*(?:\s+[a-z][a-z']*){0,2})/i);
  if (afterAssign) return afterAssign[1].trim();

  const simple = rawText.match(/\bassign\s+([a-z][a-z']*)\b/i);
  return simple ? simple[1].trim() : null;
}

function fallbackAssignIntent(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const text = rawText.trim().replace(/\s+/g, ' ');
  const dueDate = parseDueDateFromText(text);
  if (!dueDate) return null;

  const quoted = text.match(/"([^"]+)"/) || text.match(/'([^']+)'/);
  const studentName = extractStudentNameFromAssignText(text);
  if (!studentName) return null;

  let title;
  let description;

  if (quoted) {
    title = quoted[1].trim();
    description = title;
  } else {
    const stripped = text
      .replace(/^.*?\bassign\b/i, '')
      .replace(/\bto\s+[a-z][a-z']*(?:\s+[a-z][a-z']*){0,2}/i, '')
      .replace(/,?\s*the\s+deadline.*$/i, '')
      .replace(/,?\s*deadline.*$/i, '')
      .trim();
    title = capitalize(stripped.slice(0, 80) || 'Assignment');
    description = stripped || title;
  }

  return {
    studentName,
    title: capitalize(title),
    description,
    dueDate: dueDate.toISOString(),
  };
}

export function parseRemindIntent(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = normalizeNlpQuotes(rawText.trim());

  const quoted = text.match(/"([^"]+)"/);
  const assignmentHint =
    quoted?.[1] ||
    (text.match(/\b(?:for|on)\s+(.+?)(?:\s+assignment)?$/i)?.[1]?.trim() ?? null);

  const studentMatch = text.match(/\b(?:to|for)\s+([a-z][a-z']*(?:\s+[a-z][a-z']*){0,2})/i);

  return {
    assignmentHint,
    studentHint: studentMatch?.[1]?.trim() ?? null,
    customMessage: quoted?.[1] ? null : undefined,
  };
}

function fallbackStudentMessage(message) {
  if (!message || typeof message !== 'string') return null;

  const text = message.trim().replace(/\s+/g, ' ');
  const lower = text.toLowerCase();

  let intent = 'OTHER';
  if (/[?]|\b(question|help|how|what|why|when|could|would)\b/i.test(lower)) {
    intent = 'QUESTION';
  }

  if (/\b(stuck|blocked|unable|can(?:'t|not)|struggling|lost)\b/i.test(lower)) {
    intent = 'STUCK';
  } else if (/\b(done|finished|completed|submitted|all set|completed)\b/i.test(lower)) {
    intent = 'COMPLETED';
  } else if (/\b(progress|working|started|almost|ongoing|continue|just finished|made|making)\b/i.test(lower)) {
    intent = intent === 'QUESTION' ? 'QUESTION' : 'PROGRESS';
  }

  const numberMatch = lower.match(/(\d+)%?/);
  let estimatedPercent = null;
  if (numberMatch) {
    estimatedPercent = Math.min(100, Math.max(0, Number(numberMatch[1])));
  } else if (intent === 'COMPLETED') {
    estimatedPercent = 100;
  } else if (intent === 'STUCK') {
    estimatedPercent = 25;
  } else if (intent === 'QUESTION') {
    estimatedPercent = 30;
  } else if (intent === 'PROGRESS') {
    estimatedPercent = /almost|nearly|close/.test(lower) ? 80 : 40;
  } else {
    estimatedPercent = 10;
  }

  const progressNote = capitalize(text.replace(/\s+/g, ' ').trim());

  return {
    intent,
    progressNote,
    estimatedPercent,
  };
}

function fallbackMessage(type, context = {}) {
  const studentName = context.studentName || 'Student';
  const title = context.assignmentTitle || context.title || 'assignment';
  const daysLeft = context.daysLeft ?? context.dueDays ?? 'a few';
  const feedbackText = context.feedbackText || 'I will share specific notes soon.';

  switch (type) {
    case 'assignment_received':
      return `Thanks ${studentName}, I received your assignment "${title}". I’ll review it and follow up if there’s anything to improve.`;
    case 'reminder':
      return `Hi ${studentName}, just a quick reminder that "${title}" is due in ${daysLeft} day${Number(daysLeft) === 1 ? '' : 's'}. Keep going, you’re making good progress!`;
    case 'feedback_delivery':
      return `Hi ${studentName}, here’s your feedback on "${title}": ${feedbackText}`;
    case 'submission_received':
      return `Nice work ${studentName}! I’ve got your submission for "${title}" and will review it shortly.`;
    default:
      return `Hello ${studentName}, I’m here to help with your assignment and feedback.`;
  }
}

function localAnswerQuestion(question, dbContext = {}, role = 'teacher') {
  const lower = question.toLowerCase();
  const user = dbContext.currentUser;
  const first = user?.firstName ?? 'there';
  const fullName = user?.fullName ?? 'you';

  const hasAssignment = /assignment|assign|create.*assignment|submit|submission|deadline|due date/.test(lower);
  const hasStudent = /student|students|class|classroom/.test(lower);
  const asksCapabilities = /\b(what can you do|what do you do|help me|how do you work)\b/i.test(lower);
  const shortAck = /^\s*(ok|okay|sure|got it|thanks|thank you|yep|yes|no)\b/i;

  const offTopic =
    /\b(weather|football|cricket|movie|song|recipe|bitcoin|stock|joke|poem|who is the president|capital of)\b/i.test(
      lower
    );

  if (user) {
    if (/\b(my name|what('s| is) my name|who am i|do you know my name|know my name)\b/i.test(lower)) {
      return `Yes — you're ${fullName}, registered as a ${user.role} in Classroom Companion.`;
    }

    if (/\b(how am i|how are you|how i am|how are u)\b/i.test(lower)) {
      return `I can't really know how you're feeling, ${first}, but I hope you're doing well! I'm here whenever you need help with your ${user.role === 'teacher' ? 'class' : 'assignments'}.`;
    }

    if (
      dbContext.fromVoice ||
      (/\b(voice|listen|hear|transcri|understand what i('m| am) saying)\b/i.test(lower) &&
        /\b(can you|do you|are you|did you)\b/i.test(lower))
    ) {
      return `Yes, ${first} — I heard your voice message, turned it into text, and I'm replying to what you said. Ask me anything about your ${user.role === 'teacher' ? 'students or assignments' : 'homework'}, or send another voice note.`;
    }

    if (/\bwho are you\b/i.test(lower)) {
      return `I'm Classroom Companion, your ${user.role} assistant on Telegram. I help with assignments, progress, and feedback — and I know you as ${fullName}.`;
    }
  }

  if (shortAck.test(question)) {
    if (role === 'teacher') {
      return 'You’re welcome! When you’re ready, assign work in plain language — e.g. "assign riya a 500 word essay on photosynthesis due in 3 days".';
    }
    return 'You’re welcome! Share a progress update or say "submit" with your assignment name when you’re ready.';
  }

  if (offTopic) {
    if (role === 'teacher') {
      return 'I’m focused on your classroom here — I can’t help much with that, but I can create assignments, review submissions, or answer questions about your students.';
    }
    return 'I’m here for school work — I can’t help much with that, but I can track your assignments, record progress, or explain what’s due next.';
  }

  if (role === 'teacher') {
    if (asksCapabilities) {
      return `Hi ${first}! I can create assignments ("assign riya essay on plants due in 5 days"), save feedback, list students (/students), and answer questions about your class.`;
    }

    if (/\b(can you|could you)\b.*\b(assign|create).*assignment\b/i.test(lower)) {
      return 'Yes — say something like "assign riya a 500 word essay on photosynthesis due in 3 days".';
    }

    if (/\b(can you|could you)\b.*\b(feedback|review)\b/i.test(lower)) {
      return 'Yes — mention the assignment title and your feedback, e.g. "feedback on Photosynthesis essay | Great work on the intro."';
    }

    if (/\b(website|web app|dashboard|portal|url|link)\b/i.test(lower)) {
      const dash = dbContext.dashboardUrl ?? 'your teacher dashboard';
      const studentsPage = dbContext.studentsPageUrl ?? dash;
      return `Open your teacher dashboard: ${dash}\nView and manage students: ${studentsPage}`;
    }

    if (/\bhow many students\b/i.test(lower) || (hasStudent && /\bhow many\b/i.test(lower))) {
      const count = dbContext.studentCount ?? dbContext.students?.length ?? 0;
      if (count === 0) {
        const addUrl = dbContext.studentsPageUrl ?? dbContext.dashboardUrl ?? 'the web dashboard';
        return `You have no students linked to your account yet. Add students here: ${addUrl}`;
      }
      const names = Array.isArray(dbContext.students)
        ? dbContext.students.map((s) => s.name).join(', ')
        : '';
      return `You have ${count} student${count === 1 ? '' : 's'} in your class: ${names}.`;
    }

    if (hasStudent && dbContext.students) {
      const count = dbContext.studentCount ?? dbContext.students.length;
      const names = dbContext.students.map((s) => s.name).join(', ');
      if (count > 0) {
        return `Your students are: ${names}. Assign work like "assign riya essay on plants due in 5 days" (only your own students).`;
      }
      const addUrl = dbContext.studentsPageUrl ?? 'the Students page on the dashboard';
      return `You do not have any students linked yet. Add them here: ${addUrl}`;
    }

    if (hasAssignment && dbContext.totalAssignments != null) {
      return `You currently have ${dbContext.totalAssignments} assignment${dbContext.totalAssignments === 1 ? '' : 's'}, with ${dbContext.pendingAssignments} pending and ${dbContext.submittedAssignments} submitted. Ask me to create a new assignment when ready.`;
    }
  }

  if (role === 'student') {
    if (asksCapabilities) {
      return `Hi ${first}! I can track your assignments, record progress, accept submissions, and answer questions about due dates and feedback.`;
    }

    if (/\b(can i|can you|could i|could you)\b.*\b(submit|submission)\b/i.test(lower)) {
      return 'Yes — send your submission text and mention the assignment id or title. I’ll save it and notify your teacher.';
    }

    if (/\b(can i|can you|could i|could you)\b.*\b(progress|update|status)\b/i.test(lower)) {
      return 'Yes — tell me how far you are, and I will record it as a progress update on your assignment.';
    }

    if (hasAssignment && dbContext.assignments) {
      if (Array.isArray(dbContext.assignments) && dbContext.assignments.length === 0) {
        return 'You have no active assignments yet. Wait for your teacher to assign work, or ask them to send it here.';
      }
      const first = Array.isArray(dbContext.assignments) ? dbContext.assignments[0] : null;
      if (first) {
        return `Your next assignment is "${first.title}", due ${first.dueDate}. Send your progress update or submission text when you're ready.`;
      }
    }

  }

  return null;
}

/** gemini-2.0-flash free tier is often limit:0; prefer models with active free quotas. */
const GEMINI_TRANSCRIBE_MODELS = [
  process.env.GEMINI_TRANSCRIBE_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
].filter(Boolean);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryMs(bodyText) {
  try {
    const json = JSON.parse(bodyText);
    const retryInfo = json?.error?.details?.find((d) =>
      String(d['@type'] ?? '').includes('RetryInfo')
    );
    const delay = retryInfo?.retryDelay;
    if (typeof delay === 'string' && delay.endsWith('s')) {
      return Math.min(Math.ceil(parseFloat(delay) * 1000) + 500, 60_000);
    }
    const match = json?.error?.message?.match(/retry in ([\d.]+)s/i);
    if (match) {
      return Math.min(Math.ceil(parseFloat(match[1]) * 1000) + 500, 60_000);
    }
  } catch {
    // ignore
  }
  return 31_000;
}

export class TranscriptionQuotaError extends Error {
  constructor(message, provider) {
    super(message);
    this.name = 'TranscriptionQuotaError';
    this.provider = provider;
  }
}

async function transcribeWithGroq(audioBytes, mimeType, fileName) {
  if (!GROQ_API_KEY) return null;

  const form = new FormData();
  form.append('file', new Blob([audioBytes], { type: mimeType }), fileName);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  });

  const body = await response.text();
  if (response.status === 429) {
    throw new TranscriptionQuotaError(
      'Groq free tier limit reached. Wait a minute or add another API key.',
      'groq'
    );
  }
  if (!response.ok) {
    throw new Error(`Groq transcription failed: ${response.status} ${body}`);
  }

  const json = JSON.parse(body);
  return typeof json.text === 'string' ? json.text.trim() : null;
}

async function transcribeWithGeminiModel(model, audioBase64, mimeType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe the speech in this audio verbatim. Return only the spoken words with no labels, timestamps, or commentary.',
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1024,
      },
    }),
  });

  const body = await response.text();
  if (response.status === 429) {
    const err = new TranscriptionQuotaError(
      `Gemini quota exceeded for ${model}. Try again shortly or set GROQ_API_KEY (free at console.groq.com).`,
      'gemini'
    );
    err.retryMs = parseRetryMs(body);
    throw err;
  }
  if (!response.ok) {
    throw new Error(`Gemini transcription failed (${model}): ${response.status} ${body}`);
  }

  const json = JSON.parse(body);
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text.trim() : null;
}

async function transcribeWithGemini(audioBytes, mimeType) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const base64 = Buffer.from(audioBytes).toString('base64');
  const models = [...new Set(GEMINI_TRANSCRIBE_MODELS)];
  let lastQuotaError = null;

  for (const model of models) {
    try {
      return await transcribeWithGeminiModel(model, base64, mimeType);
    } catch (err) {
      if (err instanceof TranscriptionQuotaError) {
        lastQuotaError = err;
        if (err.retryMs) {
          await sleep(err.retryMs);
          try {
            return await transcribeWithGeminiModel(model, base64, mimeType);
          } catch (retryErr) {
            if (retryErr instanceof TranscriptionQuotaError) {
              lastQuotaError = retryErr;
              continue;
            }
            throw retryErr;
          }
        }
        continue;
      }
      throw err;
    }
  }

  if (lastQuotaError) throw lastQuotaError;
  throw new Error('No Gemini transcription models configured');
}

/**
 * Transcribe Telegram voice/audio.
 * Order: Groq Whisper (optional, free tier) → Gemini multimodal (fallback).
 */
export async function transcribeAudio(audioBytes, mimeType = 'audio/ogg', fileName = 'voice.ogg') {
  if (GROQ_API_KEY) {
    try {
      const text = await transcribeWithGroq(audioBytes, mimeType, fileName);
      if (text) return text;
    } catch (err) {
      if (err instanceof TranscriptionQuotaError) throw err;
      console.warn('Groq transcription failed, falling back to Gemini:', err.message);
    }
  }

  return transcribeWithGemini(audioBytes, mimeType);
}

export async function parseAssignIntent(teacherMessage, allowedStudentNames = []) {
  const normalized = normalizeNlpQuotes(String(teacherMessage ?? '').trim());

  const rosterRule =
    allowedStudentNames.length > 0
      ? `The teacher may ONLY assign to these students: ${allowedStudentNames.join(', ')}. Use the best matching name (first name or full name). If no match, return null.`
      : 'This teacher has no students yet. Return null.';

  try {
    const prompt = `You extract assignment creation intent from a teacher message. Respond with ONLY valid JSON or null.

Fields:
- studentName: first name or full name of the student
- title: short assignment title
- description: full instructions (can match title)
- dueDate: ISO 8601 datetime for the deadline

${rosterRule}

Examples:
Input: assign riya a 500 word essay on photosynthesis due in 3 days
Output: {"studentName":"riya","title":"Essay on Photosynthesis","description":"500 words","dueDate":"..."}

Input: can you assign "create a telegram bot" to Mridul Goyal, deadline 6 hours from now
Output: {"studentName":"Mridul Goyal","title":"Create a telegram bot","description":"create a telegram bot and share the github repo link","dueDate":"..."}

Input: ${normalized}
Output:`;

    const output = await callLLM(prompt, { temperature: 0.0, maxOutputTokens: 280 });
    const parsed = extractJson(output);
    if (parsed?.studentName && parsed?.title && parsed?.dueDate) {
      const due = new Date(parsed.dueDate);
      if (!Number.isNaN(due.getTime()) && due.getTime() > Date.now()) {
        return {
          studentName: String(parsed.studentName).trim(),
          title: String(parsed.title).trim(),
          description: String(parsed.description ?? parsed.title).trim(),
          dueDate: due,
        };
      }
    }
    if (parsed?.studentName && parsed?.title && Number.isFinite(parsed.dueDays)) {
      return {
        studentName: String(parsed.studentName).trim(),
        title: String(parsed.title).trim(),
        description: String(parsed.description ?? parsed.title).trim(),
        dueDate: new Date(Date.now() + Number(parsed.dueDays) * 24 * 60 * 60 * 1000),
      };
    }
  } catch (error) {
    // ignore and fall back
  }

  const fallback = fallbackAssignIntent(normalized);
  if (fallback?.dueDate) {
    return {
      studentName: fallback.studentName,
      title: fallback.title,
      description: fallback.description,
      dueDate: new Date(fallback.dueDate),
    };
  }
  return null;
}

export async function classifyStudentMessage(message) {
  try {
    const prompt = `You are a student message classifier. Return ONLY valid JSON with these fields: intent, progressNote, estimatedPercent.
Intent must be one of PROGRESS, COMPLETED, STUCK, QUESTION, OTHER.
progressNote should be a short clean summary of the student's message.
estimatedPercent should be a number between 0 and 100.

Example input: done with intro, stuck on conclusion
Example output: {"intent":"PROGRESS","progressNote":"Done with intro, struggling with conclusion","estimatedPercent":40}

Input: ${message}`;

    const output = await callLLM(prompt, { temperature: 0.0, maxOutputTokens: 180 });
    const parsed = extractJson(output);
    if (parsed && parsed.intent && parsed.progressNote && Number.isFinite(parsed.estimatedPercent)) {
      return {
        intent: String(parsed.intent).trim(),
        progressNote: String(parsed.progressNote).trim(),
        estimatedPercent: Math.min(100, Math.max(0, Number(parsed.estimatedPercent))),
      };
    }
  } catch (error) {
    // ignore and fall back
  }

  return fallbackStudentMessage(message);
}

export async function generateMessage(type, context = {}) {
  try {
    const contextPairs = Object.entries(context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const prompt = `You are a helpful assistant writing a short Telegram message. Keep output under 150 words, warm but not cringe. Return only plain text.

Type: ${type}
Context:
${contextPairs}

Write the message now.`;

    const output = await callLLM(prompt, { temperature: 0.6, maxOutputTokens: 220 });
    if (typeof output === 'string' && output.trim()) {
      return output.trim();
    }
  } catch (error) {
    // ignore and fall back
  }

  return fallbackMessage(type, context);
}

const CHAT_SYSTEM = `You are Classroom Companion, a friendly Telegram bot for teachers and students.

Rules:
- Reply in plain text only (no markdown). Keep answers under 100 words unless listing assignments.
- The "Logged-in user" block is the person you are talking to. Use their first name naturally.
- If they ask their name, mood, or whether you heard their voice: answer from logged-in user info and fromVoice flag.
- Use ONLY classroom facts from context for students/assignments. Never invent grades or due dates.
- If dashboardUrl or studentsPageUrl is in context, use those exact links when asked about the website.
- studentCount and students list are authoritative for "how many students" questions.
- Answer the actual question asked — do NOT list generic capabilities unless they ask what you can do.
- Off-topic (weather, sports): one short friendly line, then offer classroom help.
- Warm, conversational tone — never sound like a FAQ brochure.
- For teachers: never say you cannot create or assign homework in Telegram — assignments are created from structured messages; suggest they rephrase with student name, task, and deadline (e.g. assign Riya essay due in 3 days), or use /assign.`;

export async function answerQuestion(question, dbContext = {}, role = 'teacher') {
  const intent = detectMessageIntent(question, role);

  const { currentUser, fromVoice, ...classroomData } = dbContext;

  const contextStr = Object.entries(classroomData)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) return `${key}: (none)`;
        return `${key}:\n${value.map((v) => `  - ${JSON.stringify(v)}`).join('\n')}`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    })
    .join('\n');

  const userBlock = currentUser
    ? `Logged-in user:\n${JSON.stringify(currentUser, null, 2)}\nfromVoice: ${Boolean(fromVoice)}`
    : 'Logged-in user: unknown';

  const capabilities =
    role === 'teacher'
      ? `Teacher capabilities:
- Create assignments: "assign riya a 500 word essay on photosynthesis due in 3 days"
- Give feedback: mention assignment title/id and your comment
- Commands: /students, /assignments, /assign, /feedback, /help`
      : `Student capabilities:
- Share progress: describe what you finished or where you're stuck
- Submit work: say "submit" and include assignment title or id
- Commands: /myassignments, /progress, /submit, /help`;

  const intentHint =
    intent === 'GREETING'
      ? 'The user is greeting or thanking you. Respond warmly and mention one thing you can help with.'
      : intent === 'QUESTION'
        ? 'Answer their question using context when possible.'
        : 'Respond naturally to their message.';

  try {
    const prompt = `${userBlock}

User role: ${role}
Message intent: ${intent}
${intentHint}

Classroom data:
${contextStr || '(no assignments yet)'}

User message:
${question}

Reply directly to what they asked:`;

    const output = await callLLM(prompt, {
      system: CHAT_SYSTEM,
      temperature: 0.65,
      maxOutputTokens: 400,
    });
    if (typeof output === 'string' && output.trim()) {
      return output.trim();
    }
  } catch (error) {
    console.warn('answerQuestion LLM failed:', error.message);
  }

  const local = localAnswerQuestion(question, dbContext, role);
  if (local) {
    return local;
  }

  const name = dbContext.currentUser?.firstName ?? 'there';
  if (role === 'teacher') {
    return `Sorry ${name}, I'm having a brief connection issue with my AI. You can still use /students, /assignments, or say "assign riya essay due in 3 days".`;
  }
  return `Sorry ${name}, I'm having a brief connection issue. Try /myassignments or tell me which assignment you need help with.`;
}
