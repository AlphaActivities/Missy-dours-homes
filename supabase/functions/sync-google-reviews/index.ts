import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GoogleReview {
  name: string;
  reviewId?: string;
  reviewer?: {
    displayName?: string;
    profilePhotoUrl?: string;
  };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: {
    comment?: string;
    updateTime?: string;
  };
}

interface ReviewRow {
  google_review_id: string;
  reviewer_name: string | null;
  reviewer_profile_photo_url: string | null;
  star_rating: number | null;
  comment: string | null;
  review_created_at: string | null;
  review_updated_at: string | null;
  owner_reply: string | null;
  owner_reply_updated_at: string | null;
}

function parseStarRating(rating: string | undefined): number | null {
  if (!rating) return null;
  const map: Record<string, number> = {
    "ONE": 1,
    "TWO": 2,
    "THREE": 3,
    "FOUR": 4,
    "FIVE": 5,
  };
  return map[rating.toUpperCase()] ?? null;
}

function extractReviewId(name: string): string | null {
  const parts = name.split("/");
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
    const accountId = Deno.env.get("GOOGLE_BUSINESS_ACCOUNT_ID");
    const locationId = Deno.env.get("GOOGLE_BUSINESS_LOCATION_ID");

    const missing: string[] = [];
    if (!clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    if (!refreshToken) missing.push("GOOGLE_REFRESH_TOKEN");
    if (!accountId) missing.push("GOOGLE_BUSINESS_ACCOUNT_ID");
    if (!locationId) missing.push("GOOGLE_BUSINESS_LOCATION_ID");

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Missing secrets: ${missing.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 1: Exchange refresh token for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: refreshToken!,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Google token exchange failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "No access token returned" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 2: Fetch reviews from Google Business Profile API
    const reviewsUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=100`;
    const reviewsRes = await fetch(reviewsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!reviewsRes.ok) {
      const errStatus = reviewsRes.status;
      return new Response(
        JSON.stringify({ success: false, error: `Google reviews API returned ${errStatus}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reviewsData = await reviewsRes.json();
    const reviews: GoogleReview[] = reviewsData.reviews || [];

    if (reviews.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          fetchedCount: 0,
          upsertedCount: 0,
          syncedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 3: Map Google reviews to our table schema
    const rows: ReviewRow[] = reviews.map((r) => {
      const reviewId = r.reviewId || extractReviewId(r.name) || r.name;
      return {
        google_review_id: reviewId,
        reviewer_name: r.reviewer?.displayName || null,
        reviewer_profile_photo_url: r.reviewer?.profilePhotoUrl || null,
        star_rating: parseStarRating(r.starRating),
        comment: r.comment || null,
        review_created_at: r.createTime || null,
        review_updated_at: r.updateTime || null,
        owner_reply: r.reviewReply?.comment || null,
        owner_reply_updated_at: r.reviewReply?.updateTime || null,
      };
    });

    // Step 4: Upsert into google_reviews using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    const now = new Date().toISOString();
    let upsertedCount = 0;

    for (const row of rows) {
      const { error } = await supabase
        .from("google_reviews")
        .upsert(
          {
            ...row,
            synced_at: now,
            updated_at: now,
          },
          { onConflict: "google_review_id" },
        );

      if (error) {
        // Log the review ID (not sensitive) but not the error details that might contain data
        console.error(`Upsert failed for review: ${row.google_review_id}`);
      } else {
        upsertedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        fetchedCount: reviews.length,
        upsertedCount,
        syncedAt: now,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
