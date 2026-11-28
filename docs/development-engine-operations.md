# Development Engine operations

## New client onboarding
Create a dedicated QA branch and isolated synthetic identity and schema in Alpha Dev. Apply row level security for that identity only. Configure QA_EMAIL, QA_PASSWORD, QA_SUPABASE_URL and QA_SUPABASE_PUBLISHABLE_KEY as repository Actions secrets. Never use production credentials. Verify branch triggers cannot deploy production. Run build, typecheck, regression tests, browser tests and authenticated persistence and cross-client denial tests. Record commit, run ID, conclusion and artifact ID. Require explicit approval before any production release.

## Monitoring
Review each QA run for failures, missing artifacts, dependency audit changes and staging availability. Check that browser traffic is intercepted and external delivery disabled. Treat mock browser results and real isolated database results as separate evidence until integrated browser persistence is verified. Investigate failed runs on QA branches only. Never rerun production jobs or merge automatically. Escalate unexpected production access, credential exposure or external delivery immediately. Do not include secrets or customer data in evidence.

## Acceptance
Require passing build and browser checks, real isolated authentication and persistence, cross-client denial, and reviewed dependency findings. Record unresolved findings and limitations explicitly. A successful workflow alone does not authorize release.
