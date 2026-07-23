import { createClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  source_page?: unknown;
  listing_slug?: unknown;
  'bot-field'?: unknown;
}

interface FieldErrors {
  name: string;
  email: string;
  phone: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 10_000;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// First char: digit, '+', or '(' (formatted US numbers start with open-paren).
// Remaining: digits, spaces, hyphens, parens, periods, slashes.
const PHONE_RE = /^[+\d(][\d\s\-()/.]+$/;

// ─── Validation ──────────────────────────────────────────────────────────────

function validateFields(
  name: string,
  email: string,
  phone: string,
  message: string,
): FieldErrors {
  const errors: FieldErrors = { name: '', email: '', phone: '', message: '' };

  const nameTrim = name.trim();
  const emailTrim = email.trim();
  const phoneTrim = phone.trim();
  const messageTrim = message.trim();

  if (!nameTrim) {
    errors.name = 'Please enter your name.';
  } else if (nameTrim.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (nameTrim.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  if (!emailTrim) {
    errors.email = 'Please enter your email address.';
  } else if (emailTrim.length > 255) {
    errors.email = 'Email address is too long.';
  } else if (!EMAIL_RE.test(emailTrim)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (phoneTrim !== '') {
    if (phoneTrim.length < 10) {
      errors.phone = 'Please enter a valid phone number.';
    } else if (phoneTrim.length > 20) {
      errors.phone = 'Phone number is too long.';
    } else if (!PHONE_RE.test(phoneTrim)) {
      errors.phone = 'Please enter a valid phone number (digits, spaces, hyphens, and parentheses only).';
    }
  }

  if (!messageTrim) {
    errors.message = 'Please enter a message.';
  } else if (messageTrim.length < 10) {
    errors.message = 'Please enter at least 10 characters.';
  } else if (messageTrim.length > 2000) {
    errors.message = 'Message is too long.';
  }

  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return !!(errors.name || errors.email || errors.phone || errors.message);
}

function validateSourcePage(value: unknown): string {
  if (typeof value !== 'string') return '/';
  const trimmed = value.trim().slice(0, 200);
  if (!trimmed.startsWith('/')) return '/';
  return trimmed;
}

function validateListingSlug(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().slice(0, 100);
  if (!/^[a-z0-9-]*$/i.test(trimmed)) return '';
  return trimmed;
}

// ─── HTML Escaping ────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async (req: Request): Promise<Response> => {
  // POST-only enforcement
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: 'POST, OPTIONS',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { ok: false, error: 'Method not allowed.' },
      405,
      { Allow: 'POST, OPTIONS' },
    );
  }

  // Content-Type enforcement
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return jsonResponse(
      { ok: false, error: 'Unsupported content type.' },
      415,
    );
  }

  // Read raw body and enforce actual size (do not rely on Content-Length alone)
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse(
      { ok: false, error: 'Invalid request.' },
      400,
    );
  }

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return jsonResponse(
      { ok: false, error: 'Request too large.' },
      413,
    );
  }

  // Parse JSON safely
  let payload: ContactPayload;
  try {
    payload = JSON.parse(rawBody) as ContactPayload;
  } catch {
    return jsonResponse(
      { ok: false, error: 'Invalid request.' },
      400,
    );
  }

  // Honeypot — silent 200 to avoid tipping off bots
  if (payload['bot-field'] && String(payload['bot-field']).trim() !== '') {
    console.log('[contact] Honeypot triggered — silent rejection');
    return jsonResponse({ ok: true }, 200);
  }

  // Extract and validate fields
  const name = typeof payload.name === 'string' ? payload.name : '';
  const email = typeof payload.email === 'string' ? payload.email : '';
  const phone = typeof payload.phone === 'string' ? payload.phone : '';
  const message = typeof payload.message === 'string' ? payload.message : '';
  const sourcePage = validateSourcePage(payload.source_page);
  const listingSlug = validateListingSlug(payload.listing_slug);

  const errors = validateFields(name, email, phone, message);
  if (hasErrors(errors)) {
    return jsonResponse(
      { ok: false, error: 'Please fill in all required fields.' },
      400,
    );
  }

  // Build explicit insert payload — only the 6 allowed fields
  const insertPayload = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    message: message.trim(),
    source_page: sourcePage,
    listing_slug: listingSlug,
  };

  // Create server-only Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[contact] Missing Supabase server environment variables');
    return jsonResponse(
      { ok: false, error: 'Something went wrong. Please try again.' },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Insert lead into Supabase (source of truth)
  const { error: insertError } = await supabase
    .from('leads')
    .insert(insertPayload);

  if (insertError) {
    console.error('[contact] Supabase insert failed:', insertError.message);
    return jsonResponse(
      { ok: false, error: 'Something went wrong. Please try again.' },
      500,
    );
  }

  // Send notification email via Resend — only after successful insert
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (resendApiKey && emailFrom && notificationEmail) {
    try {
      const htmlBody = [
        '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">',
        '<h2 style="margin: 0 0 24px 0; color: #8B6F47; font-size: 20px;">New Lead from Your Website</h2>',
        '<table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6;">',
        `<tr><td style="padding: 6px 0; color: #666; width: 100px; vertical-align: top;">Name</td><td style="padding: 6px 0;"><strong>${escapeHtml(insertPayload.name)}</strong></td></tr>`,
        `<tr><td style="padding: 6px 0; color: #666; vertical-align: top;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(insertPayload.email)}" style="color: #8B6F47;">${escapeHtml(insertPayload.email)}</a></td></tr>`,
        insertPayload.phone
          ? `<tr><td style="padding: 6px 0; color: #666; vertical-align: top;">Phone</td><td style="padding: 6px 0;">${escapeHtml(insertPayload.phone)}</td></tr>`
          : '',
        `<tr><td style="padding: 6px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 6px 0; white-space: pre-wrap;">${escapeHtml(insertPayload.message)}</td></tr>`,
        `<tr><td style="padding: 6px 0; color: #666; vertical-align: top;">Page</td><td style="padding: 6px 0;">${escapeHtml(insertPayload.source_page)}</td></tr>`,
        insertPayload.listing_slug
          ? `<tr><td style="padding: 6px 0; color: #666; vertical-align: top;">Listing</td><td style="padding: 6px 0;">${escapeHtml(insertPayload.listing_slug)}</td></tr>`
          : '',
        '</table>',
        '<p style="margin: 24px 0 0 0; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;">Reply directly to this email to respond to the lead.</p>',
        '</div>',
      ].join('');

      const textBody = [
        'New Lead from Your Website',
        '',
        `Name:    ${insertPayload.name}`,
        `Email:   ${insertPayload.email}`,
        `Phone:   ${insertPayload.phone || '(not provided)'}`,
        `Message: ${insertPayload.message}`,
        `Page:    ${insertPayload.source_page}`,
        insertPayload.listing_slug ? `Listing: ${insertPayload.listing_slug}` : '',
        '',
        'Reply directly to this email to respond to the lead.',
      ].join('\n');

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: emailFrom,
          to: notificationEmail,
          reply_to: insertPayload.email,
          subject: `New Lead: ${insertPayload.name}`,
          html: htmlBody,
          text: textBody,
        }),
      });

      if (!emailResponse.ok) {
        const errText = await emailResponse.text().catch(() => 'unknown');
        console.error('[contact] Resend email failed:', emailResponse.status, errText);
      }
    } catch (err) {
      console.error('[contact] Resend request error:', err instanceof Error ? err.message : 'unknown');
    }
  } else {
    console.error('[contact] Missing Resend environment variables — email not sent');
  }

  // Return success — lead is in database regardless of email outcome
  return jsonResponse({ ok: true }, 200);
};
