import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Validation helpers ─────────────────────────────────────────────────────

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// eslint-disable-next-line no-useless-escape
const PHONE_RE = /^[+\d(][\d\s\-()\./]+$/;

interface ValidationError {
  field: string;
  message: string;
}

function validatePayload(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  const name = String(data.name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const phone = String(data.phone ?? "").trim();
  const message = String(data.message ?? "").trim();
  const sourcePage = String(data.source_page ?? "").trim();
  const listingSlug = String(data.listing_slug ?? "").trim();

  if (name.length < 2 || name.length > 100) {
    errors.push({ field: "name", message: "Name must be 2–100 characters." });
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 255) {
    errors.push({ field: "email", message: "A valid email is required." });
  }
  if (phone) {
    if (phone.length < 10 || phone.length > 20 || !PHONE_RE.test(phone)) {
      errors.push({ field: "phone", message: "Invalid phone format." });
    }
  }
  if (message.length < 10 || message.length > 2000) {
    errors.push({ field: "message", message: "Message must be 10–2000 characters." });
  }
  if (sourcePage.length > 200) {
    errors.push({ field: "source_page", message: "source_page too long." });
  }
  if (listingSlug.length > 200) {
    errors.push({ field: "listing_slug", message: "listing_slug too long." });
  }

  return errors;
}

// ─── JWS verification ────────────────────────────────────────────────────────

/**
 * Verify the Netlify webhook JWS signature.
 *
 * Netlify sends a JWT in the `X-Webhook-Signature` header, signed with the
 * shared secret using HS256. The JWT payload contains:
 *   - iss: "netlify"
 *   - sha256: HMAC-SHA256 of the raw request body using the same secret
 *
 * We verify:
 *   1. The JWT signature is valid (HS256 with the shared secret)
 *   2. The iss claim equals "netlify"
 *   3. The sha256 claim matches the SHA-256 of the raw body
 */
async function verifyWebhookSignature(
  signatureHeader: string,
  rawBody: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = signatureHeader.split(".");
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header to check algorithm
    const header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (header.alg !== "HS256") return false;

    // Verify the JWT signature
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = Uint8Array.from(
      atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );

    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      signingInput,
    );
    if (!signatureValid) return false;

    // Decode payload and verify claims
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));

    if (payload.iss !== "netlify") return false;

    // Verify sha256 claim matches SHA-256 of the raw body
    const bodyHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody));
    const bodyHashHex = Array.from(new Uint8Array(bodyHash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (payload.sha256 !== bodyHashHex) return false;

    return true;
  } catch {
    return false;
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Read configuration ──
    const webhookSecret = Deno.env.get("NETLIFY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("NETLIFY_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Read raw body as text (do not parse before hash verification) ──
    const rawBody = await req.text();

    // ── Read and verify signature ──
    const signatureHeader = req.headers.get("X-Webhook-Signature");
    if (!signatureHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signatureValid = await verifyWebhookSignature(
      signatureHeader,
      rawBody,
      webhookSecret,
    );
    if (!signatureValid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse the verified JSON body ──
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate form name ──
    const formName = String(payload.form_name ?? "");
    if (formName !== "contact") {
      return new Response(JSON.stringify({ error: "Unexpected form name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate submission ID ──
    const submissionId = String(payload.id ?? "").trim();
    if (!submissionId) {
      return new Response(JSON.stringify({ error: "Missing submission ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Extract and validate field data ──
    const data = (payload.data ?? {}) as Record<string, unknown>;
    const validationErrors = validatePayload(data);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validationErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Build the lead row with forced server-side values ──
    const leadRow = {
      name: String(data.name ?? "").trim(),
      email: String(data.email ?? "").trim(),
      phone: String(data.phone ?? "").trim(),
      message: String(data.message ?? "").trim(),
      source_page: String(data.source_page ?? "").trim(),
      listing_slug: String(data.listing_slug ?? "").trim(),
      status: "new",
      notes: "",
      netlify_submission_id: submissionId,
    };

    // ── Insert with idempotency (ON CONFLICT DO NOTHING) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase server credentials not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: insertError } = await supabase
      .from("leads")
      .insert(leadRow);

    // Check for unique constraint violation (duplicate delivery)
    if (insertError) {
      if (insertError.code === "23505") {
        // Unique constraint — already processed, not an error
        return new Response(
          JSON.stringify({ message: "Submission already processed" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      console.error("Insert failed:", insertError.code, insertError.message);
      return new Response(JSON.stringify({ error: "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: "Lead created successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
