import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { LuxFadeIn } from "../ui/LuxFadeIn";
import { CONTACT_INFO } from "../../config/contact";
import { trackFormSubmitSuccess, trackFormSubmitError, trackFormStart, trackEmailClick } from "../../utils/analytics";
import { supabase } from "../../lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldErrors = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const EMPTY_ERRORS: FieldErrors = { name: '', email: '', phone: '', message: '' };

// ─── Validation ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// First char: digit, '+', or '(' (formatted US numbers start with open-paren).
// Remaining: digits, spaces, hyphens, parens, periods, slashes.
// eslint-disable-next-line no-useless-escape
const PHONE_RE = /^[+\d(][\d\s\-()\./]+$/;

function validateFields(
  name: string,
  email: string,
  phone: string,
  message: string,
): FieldErrors {
  const errors: FieldErrors = { ...EMPTY_ERRORS };

  const nameTrim    = name.trim();
  const emailTrim   = email.trim();
  const phoneTrim   = phone.trim();
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
    errors.message = `Message is too long (${messageTrim.length.toLocaleString()} / 2,000 characters).`;
  }

  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return !!(errors.name || errors.email || errors.phone || errors.message);
}

// ─── Progress ─────────────────────────────────────────────────────────────────

// Returns 0–3: how many of the three required fields are submission-ready.
// Name: trimmed length 2–100
// Email: matches EMAIL_RE and length ≤ 255
// Message: trimmed length 10–2000
// Phone is optional and is not counted.
function calcProgressStages(name: string, email: string, message: string): number {
  let stages = 0;
  const nameTrim    = name.trim();
  const emailTrim   = email.trim();
  const messageTrim = message.trim();
  if (nameTrim.length >= 2 && nameTrim.length <= 100) stages++;
  if (EMAIL_RE.test(emailTrim) && emailTrim.length <= 255) stages++;
  if (messageTrim.length >= 10 && messageTrim.length <= 2000) stages++;
  return stages;
}

// ─── Field Background & Text ─────────────────────────────────────────────────

// Three visual states, evaluated in priority order:
// 1. Filled (field-specific criteria met)  →  cream bg, dark text
// 2. Empty + error shown  →  red tint, light text
// 3. Empty + no error  →  gold tint, light text
function fieldBg(filled: boolean, hasError: boolean): string {
  if (filled)   return 'bg-[#f7f3ea]/90';
  if (hasError) return 'bg-red-500/10';
  return 'bg-[#F5E6C8]/15';
}

function fieldText(filled: boolean): string {
  return filled
    ? 'text-[#3a2f1e] placeholder:text-[#3a2f1e]/40'
    : 'text-neutral-50 placeholder:text-neutral-300/60';
}

// ─── Phone Formatter ─────────────────────────────────────────────────────────

/**
 * Formats a raw phone input value into a standard US display format.
 *
 * 10 digits → (NXX) NXX-XXXX
 * 11 digits starting with 1 → +1 (NXX) NXX-XXXX
 * Anything else (international, partial) → preserved as-is
 *
 * Returns the formatted string and whether formatting was applied.
 */
function formatPhone(raw: string): string {
  // Strip everything except digits and leading '+'.
  const hasLeadingPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/\D/g, '');

  // 11 digits starting with 1: US number with country code
  if (digits.length === 11 && digits[0] === '1') {
    const area = digits.slice(1, 4);
    const mid  = digits.slice(4, 7);
    const last = digits.slice(7, 11);
    return `+1 (${area}) ${mid}-${last}`;
  }

  // 10 digits: standard US number
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const mid  = digits.slice(3, 6);
    const last = digits.slice(6, 10);
    return `(${area}) ${mid}-${last}`;
  }

  // More than 11 digits, or 11 digits not starting with 1:
  // treat as international — preserve the user's input unchanged.
  if (digits.length > 11 || (digits.length === 11 && digits[0] !== '1')) {
    return raw;
  }

  // Partial entry (< 10 digits): format progressively up to the point where
  // structure is clear. Only apply light progressive formatting once we have
  // enough digits to start the area code.
  if (digits.length === 0) return '';

  // If the user is explicitly typing a +1 international prefix, let them type freely.
  if (hasLeadingPlus) return raw;

  // Progressive US formatting for partial input.
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  // 7–9 digits
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ContactSection() {
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]     = useState<FieldErrors>(EMPTY_ERRORS);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [filledFields, setFilledFields]   = useState({ name: false, email: false, phone: false, message: false });
  // Derived completion: 0–3 required fields ready. Kept separate from filledFields
  // so the field background/text color logic (which uses looser "filled" criteria)
  // is not affected.
  const [progressStages, setProgressStages] = useState(0);

  const formStartedRef   = useRef(false);
  const submittingRef    = useRef(false);  // synchronous duplicate-submit lock
  const nameRef          = useRef<HTMLInputElement>(null);
  const emailRef         = useRef<HTMLInputElement>(null);
  const phoneRef         = useRef<HTMLInputElement>(null);
  const messageRef       = useRef<HTMLTextAreaElement>(null);

  const sourcePage = location.pathname;

  const encode = (data: FormData) =>
    new URLSearchParams(data as unknown as Record<string, string>).toString();

  // Recalculates the progress count from current DOM ref values.
  const recalcProgress = () => {
    setProgressStages(calcProgressStages(
      nameRef.current?.value    ?? '',
      emailRef.current?.value   ?? '',
      messageRef.current?.value ?? '',
    ));
  };

  const handleFieldFocus = () => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    trackFormStart('contact_section', sourcePage);
  };

  // Re-validate a single field on blur after the first submit attempt.
  const handleBlur = (field: keyof FieldErrors) => {
    if (!attemptedSubmit) return;
    const name    = nameRef.current?.value    ?? '';
    const email   = emailRef.current?.value   ?? '';
    const phone   = phoneRef.current?.value   ?? '';
    const message = messageRef.current?.value ?? '';
    const fresh = validateFields(name, email, phone, message);
    setFieldErrors(prev => ({ ...prev, [field]: fresh[field] }));
  };

  // Per-field filled criteria (unchanged — controls field bg/text color):
  //   name    → any character typed
  //   email   → passes EMAIL_RE (valid format)
  //   message → any character typed
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilledFields(prev => ({ ...prev, name: e.target.value.trim().length > 0 }));
    recalcProgress();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilledFields(prev => ({ ...prev, email: EMAIL_RE.test(e.target.value.trim()) }));
    recalcProgress();
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFilledFields(prev => ({ ...prev, message: e.target.value.trim().length > 0 }));
    recalcProgress();
  };

  // Progressive phone formatting on every keystroke.
  // Phone filled → 10+ digits entered (complete US number).
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    e.target.value = formatted;
    // Keep cursor at end — standard behavior for phone formatters.
    const len = formatted.length;
    e.target.setSelectionRange(len, len);
    setFilledFields(prev => ({ ...prev, phone: formatted.replace(/\D/g, '').length >= 10 }));
    // Re-validate phone in real-time only after first submit attempt.
    if (attemptedSubmit) {
      const fresh = validateFields(
        nameRef.current?.value    ?? '',
        emailRef.current?.value   ?? '',
        formatted,
        messageRef.current?.value ?? '',
      );
      setFieldErrors(prev => ({ ...prev, phone: fresh.phone }));
    }
    // Phone is not a progress field — no recalcProgress() call needed.
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Capture the live form element synchronously before any await.
    // e.currentTarget becomes null once the event handler yields.
    const form = e.currentTarget;

    // Synchronous lock — guards against programmatic/keyboard duplicate fires.
    if (submittingRef.current) return;

    // Read current DOM values for validation.
    const nameVal    = nameRef.current?.value    ?? '';
    const emailVal   = emailRef.current?.value   ?? '';
    const phoneVal   = phoneRef.current?.value   ?? '';
    const messageVal = messageRef.current?.value ?? '';

    const errors = validateFields(nameVal, emailVal, phoneVal, messageVal);

    // Always mark as attempted so field errors become visible.
    setAttemptedSubmit(true);
    setFieldErrors(errors);

    if (hasErrors(errors)) {
      // Focus the first invalid visible field — do not proceed to network.
      if (errors.name)    { nameRef.current?.focus();    return; }
      if (errors.email)   { emailRef.current?.focus();   return; }
      if (errors.phone)   { phoneRef.current?.focus();   return; }
      if (errors.message) { messageRef.current?.focus(); return; }
      return;
    }

    // Client-side reCAPTCHA presence check — improves UX, does not replace server validation.
    const recaptchaToken = typeof window.grecaptcha !== 'undefined'
      ? window.grecaptcha.getResponse()
      : '';
    if (!recaptchaToken) {
      setAttemptedSubmit(true);
      setError("Please complete the 'I'm not a robot' verification.");
      return;
    }

    // Build FormData from the live form reference (captured before any await).
    const formData = new FormData(form);
    formData.set('form-name', 'contact');
    formData.set('name',    nameVal.trim());
    formData.set('email',   emailVal.trim());
    formData.set('phone',   phoneVal.trim());
    formData.set('message', messageVal.trim());
    // bot-field is left as-is from the DOM (empty for real users).
    // g-recaptcha-response is captured automatically by FormData from the widget input.

    // Clear all previous state before the async fetch so:
    //   • any prior success timer is cancelled (submitted → false triggers cleanup)
    //   • stale field errors are hidden during the request
    //   • onBlur cannot reveal validation errors while submitting
    setSubmitted(false);
    setAttemptedSubmit(false);
    setFieldErrors(EMPTY_ERRORS);
    setError(null);

    // Activate synchronous lock before any async work.
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode(formData),
        redirect: 'manual',
      });

      // With redirect: 'manual', a genuine Netlify acceptance returns 200 with
      // response.type === 'basic'. A CAPTCHA/honeypot rejection returns a 303
      // which fetch surfaces as response.type === 'opaqueredirect' (status 0, ok false).
      if (response.ok && response.type === 'basic') {
        trackFormSubmitSuccess('contact_section', sourcePage);

        const listingSlug = sourcePage.startsWith('/listings/')
          ? sourcePage.replace('/listings/', '').replace(/\/$/, '')
          : '';

        supabase.from('leads').insert({
          name:         formData.get('name')    as string,
          email:        formData.get('email')   as string,
          phone:        formData.get('phone')   as string,
          message:      formData.get('message') as string,
          source_page:  sourcePage,
          listing_slug: listingSlug,
        }).then(({ error: insertError }) => {
          if (insertError) console.warn('[leads] Supabase insert failed:', insertError.message);
        });

        // Reset the form via the captured live reference — safe to call after await.
        form.reset();
        if (typeof window.grecaptcha !== 'undefined') window.grecaptcha.reset();
        setFilledFields({ name: false, email: false, phone: false, message: false });
        setProgressStages(0);
        setAttemptedSubmit(false);
        setFieldErrors(EMPTY_ERRORS);
        setError(null);
        formStartedRef.current = false;
        setSubmitted(true);
        // Six-second success-message dismissal handled by the useEffect below.
      } else {
        trackFormSubmitError('contact_section', 'server_error', sourcePage);
        setError('Something went wrong. Please try again.');
        if (typeof window.grecaptcha !== 'undefined') window.grecaptcha.reset();
        // Entered values preserved — no reset on failure.
      }
    } catch {
      trackFormSubmitError('contact_section', 'network_error', sourcePage);
      setError('Something went wrong. Please try again.');
      if (typeof window.grecaptcha !== 'undefined') window.grecaptcha.reset();
      // Entered values preserved — no reset on failure.
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Six-second success-message dismissal — preserved from original.
  useEffect(() => {
    if (!submitted) return;
    const timer = setTimeout(() => {
      setSubmitted(false);
      setError(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [submitted]);

  // Progress fraction for the button sweep (0.0 – 1.0).
  const progressFraction = progressStages / 3;

  // Accessibility label for screen readers.
  const progressLabel = progressStages > 0
    ? `${progressStages} of 3 required fields complete`
    : '';

  return (
    <section
      id="contact"
      className="relative bg-transparent text-white py-24 md:py-32 lg:py-40"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-14 lg:gap-20">

          {/* LEFT – COPY / DETAILS */}
          <LuxFadeIn delay={0.05}>
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-200">
                  Private Consultation
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
                  Begin a{" "}
                  <span className="text-[#F5E6C8]">confidential conversation</span>
                </h2>
                <p className="max-w-xl text-sm md:text-base text-neutral-200/90">
                  Share a few details about your goals and timeline. Whether
                  you are exploring a sale, a discreet purchase, or simply
                  evaluating options, Missy will respond personally.
                </p>
              </div>

              <div className="space-y-3 text-sm md:text-base text-neutral-100">
                <div>
                  <p className="text-neutral-300 text-xs uppercase tracking-[0.22em] mb-1">
                    Direct Contact
                  </p>
                  <p>Dallas · Fort Worth · Carrollton · Farmers Branch · Addison · Coppell · North Dallas Metroplex</p>
                  <p className="mt-1">Phone: {CONTACT_INFO.phone.display}</p>
                  <p>Email: <a href={CONTACT_INFO.email.mailto} onClick={() => trackEmailClick('contact_section')} className="hover:text-[#F5E6C8] transition-colors">{CONTACT_INFO.email.display}</a></p>
                </div>

                <div className="pt-3 border-t border-white/10 max-w-md text-xs md:text-[13px] text-neutral-300/90">
                  Your information is handled with discretion and will never be
                  shared or used for unsolicited marketing.
                </div>

                <div className="pt-4">
                  <p className="text-neutral-300 text-xs uppercase tracking-[0.22em] mb-2">
                    Service Area
                  </p>
                  <a
                    href="https://www.google.com/maps/place/Clancy+Realty/@32.9405561,-96.8235514,17z/data=!3m1!4b1!4m6!3m5!1s0x8e6b8a480b85908b:0x6124928e9cc64901!8m2!3d32.9405561!4d-96.8209765!16s%2Fg%2F11z5c6y4vw?entry=ttu&g_ep=EgoyMDI2MDcxNS4wIKXMDSoASAFQAw%3D%3D"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl overflow-hidden border border-white/20 shadow-lg hover:border-white/40 transition-colors cursor-pointer"
                  >
                    <img
                      src="/images/google-maps.photo/Service-areas.png"
                      alt="Service Areas Map"
                      className="w-full h-auto object-cover"
                    />
                  </a>
                </div>
              </div>
            </div>
          </LuxFadeIn>

          {/* RIGHT – LUXURY FORM CARD */}
          <LuxFadeIn delay={0.12}>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-[#8B6F47]/40 blur-[80px] pointer-events-none" />
              <div className="relative rounded-3xl bg-gradient-to-br from-[#8B6F47]/95 via-[#7A5F3C]/95 to-[#6B5335]/95 border border-[#c29f63]/40 backdrop-blur-[40px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] px-6 py-7 md:px-8 md:py-9 lg:px-10 lg:py-10">
                <h3 className="text-lg md:text-xl font-medium mb-2">
                  Reach out with a Message
                </h3>
                <p className="text-xs md:text-sm text-neutral-200/90 mb-6">
                  A few key details help tailor the conversation to your
                  property, budget, and desired timing.
                </p>

                <form
                  name="contact"
                  method="POST"
                  data-netlify="true"
                  data-netlify-recaptcha="true"
                  data-netlify-honeypot="bot-field"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  noValidate
                >
                  <input type="hidden" name="form-name" value="contact" />

                  {/* Honeypot — hidden from real users and assistive technology */}
                  <p style={{ display: 'none' }} aria-hidden="true">
                    <label>
                      Do not fill this field
                      <input name="bot-field" tabIndex={-1} autoComplete="off" />
                    </label>
                  </p>

                  {/* Name */}
                  <div className="space-y-2">
                    <label
                      htmlFor="contact-name"
                      className="text-xs md:text-sm font-medium tracking-wide text-neutral-100"
                    >
                      Name
                    </label>
                    <input
                      ref={nameRef}
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="First and last name"
                      data-hj-suppress
                      onFocus={handleFieldFocus}
                      onChange={handleNameChange}
                      onBlur={() => handleBlur('name')}
                      aria-invalid={attemptedSubmit && !!fieldErrors.name}
                      aria-describedby={fieldErrors.name && attemptedSubmit ? 'error-name' : undefined}
                      className={`w-full rounded-xl ${fieldBg(filledFields.name, attemptedSubmit && !!fieldErrors.name)} border px-4 py-3.5 text-base md:text-[16px] ${fieldText(filledFields.name)} focus:outline-none focus:ring-2 focus:ring-[#F5E6C8] focus:border-transparent transition-all duration-200 ${attemptedSubmit && fieldErrors.name ? 'border-red-400/60' : 'border-white/18'}`}
                    />
                    {attemptedSubmit && fieldErrors.name && (
                      <p id="error-name" className="text-xs mt-1 text-red-300/90">
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label
                      htmlFor="contact-email"
                      className="text-xs md:text-sm font-medium tracking-wide text-neutral-100"
                    >
                      Email
                    </label>
                    <input
                      ref={emailRef}
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Preferred email for follow-up"
                      data-hj-suppress
                      onFocus={handleFieldFocus}
                      onChange={handleEmailChange}
                      onBlur={() => handleBlur('email')}
                      aria-invalid={attemptedSubmit && !!fieldErrors.email}
                      aria-describedby={fieldErrors.email && attemptedSubmit ? 'error-email' : undefined}
                      className={`w-full rounded-xl ${fieldBg(filledFields.email, attemptedSubmit && !!fieldErrors.email)} border px-4 py-3.5 text-base md:text-[16px] ${fieldText(filledFields.email)} focus:outline-none focus:ring-2 focus:ring-[#F5E6C8] focus:border-transparent transition-all duration-200 ${attemptedSubmit && fieldErrors.email ? 'border-red-400/60' : 'border-white/18'}`}
                    />
                    {attemptedSubmit && fieldErrors.email && (
                      <p id="error-email" className="text-xs mt-1 text-red-300/90">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Phone (optional) */}
                  <div className="space-y-2">
                    <label
                      htmlFor="contact-phone"
                      className="text-xs md:text-sm font-medium tracking-wide text-neutral-100"
                    >
                      Phone (optional)
                    </label>
                    <input
                      ref={phoneRef}
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Best number for a brief call"
                      data-hj-suppress
                      onFocus={handleFieldFocus}
                      onChange={handlePhoneChange}
                      onBlur={() => handleBlur('phone')}
                      aria-invalid={attemptedSubmit && !!fieldErrors.phone}
                      aria-describedby={fieldErrors.phone && attemptedSubmit ? 'error-phone' : undefined}
                      className={`w-full rounded-xl ${fieldBg(filledFields.phone, attemptedSubmit && !!fieldErrors.phone)} border px-4 py-3.5 text-base md:text-[16px] ${fieldText(filledFields.phone)} focus:outline-none focus:ring-2 focus:ring-[#F5E6C8] focus:border-transparent transition-all duration-200 ${attemptedSubmit && fieldErrors.phone ? 'border-red-400/60' : 'border-white/18'}`}
                    />
                    {attemptedSubmit && fieldErrors.phone && (
                      <p id="error-phone" className="text-xs mt-1 text-red-300/90">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <label
                      htmlFor="contact-message"
                      className="text-xs md:text-sm font-medium tracking-wide text-neutral-100"
                    >
                      How can Missy help?
                    </label>
                    <textarea
                      ref={messageRef}
                      id="contact-message"
                      name="message"
                      rows={4}
                      required
                      placeholder="Share a quick overview of your property, price range, and ideal timeframe."
                      data-hj-suppress
                      onFocus={handleFieldFocus}
                      onChange={handleMessageChange}
                      onBlur={() => handleBlur('message')}
                      aria-invalid={attemptedSubmit && !!fieldErrors.message}
                      aria-describedby={fieldErrors.message && attemptedSubmit ? 'error-message' : undefined}
                      className={`w-full rounded-xl ${fieldBg(filledFields.message, attemptedSubmit && !!fieldErrors.message)} border px-4 py-3.5 text-base md:text-[16px] ${fieldText(filledFields.message)} focus:outline-none focus:ring-2 focus:ring-[#F5E6C8] focus:border-transparent transition-all duration-200 resize-none ${attemptedSubmit && fieldErrors.message ? 'border-red-400/60' : 'border-white/18'}`}
                    />
                    {attemptedSubmit && fieldErrors.message && (
                      <p id="error-message" className="text-xs mt-1 text-red-300/90">
                        {fieldErrors.message}
                      </p>
                    )}
                  </div>

                  {/* General server/network error — never shown while success banner is visible */}
                  {!submitted && error && (
                    <div
                      role="alert"
                      className="rounded-xl px-4 py-3 text-xs md:text-sm text-red-300/90"
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        boxShadow: '0 0 0 1px rgba(239,68,68,0.2)',
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div className="flex justify-center py-2">
                    <div
                      className="g-recaptcha"
                      data-sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    />
                  </div>

                  <div className="pt-1">
                    {/* Visually hidden progress announcement for screen readers */}
                    <span
                      className="sr-only"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {progressLabel}
                    </span>

                    {/*
                      Button: position relative + overflow hidden to clip the sweep layer.
                      All existing styles are preserved; only these two additions are new.
                    */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="relative overflow-hidden w-full inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#F5E6C8] via-[#F2D9A3] to-[#E9C88A] px-6 py-3.5 text-sm md:text-[15px] font-semibold text-black shadow-[0_14px_35px_rgba(0,0,0,0.65)] hover:brightness-110 active:translate-y-px transition-transform transition-[filter] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {/* Satin-light progress sweep — decorative, behind text, no pointer events */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 motion-reduce:transition-none"
                        style={{
                          transformOrigin: 'left center',
                          transform: `scaleX(${progressFraction})`,
                          background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.16) 60%, transparent 100%)',
                          transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                          pointerEvents: 'none',
                        }}
                      />
                      {/* Button label — above the sweep */}
                      <span className="relative">
                        {submitting ? "Sending..." : "Send Message Now"}
                      </span>
                    </button>
                  </div>
                </form>

                {submitted && (
                  <div className="mt-4 rounded-xl bg-green-600/20 border border-green-500/50 px-4 py-3.5 text-sm text-green-100 backdrop-blur-sm">
                    Your message has been sent successfully. We'll be in touch soon.
                  </div>
                )}
              </div>
            </div>
          </LuxFadeIn>
        </div>
      </div>
    </section>
  );
}
