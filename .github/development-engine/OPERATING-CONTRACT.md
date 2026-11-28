# Development Engine operating contract

## Onboarding checklist
Record repository, owner, staging Worker name, staging URL, production host, authoritative database project reference, approved test identity and rollback reference. Never record credential values.
Create an isolated qa/development-engine branch from the approved staging baseline. Verify that QA pushes cannot trigger production or staging deployment. Use read-only workflow permissions and checkout without persisted credentials. Set a zero additional spending limit before enabling execution.
Configure repository-specific typecheck, regression commands, local asset entry point and expected Worker name. Verify the staging target guard before building. Run locked installs, typecheck, regression tests, Worker dry run, dependency inventory and local browser smoke at 390, 820 and 1440 pixels.
Record exact commit, workflow run, artifact and conclusions. Review root and staging dependency inventories separately. A successful inventory is not a security clearance.
Authenticated tests must use synthetic data and isolated identities; block production writes and external delivery. Verify navigation, edit/save/reload, archive/restore where supported, logout and access denial. Physical device push receipt is a separate acceptance check.
Require explicit owner approval before production merge or deployment. Record rollback and post-deploy verification. Never delete databases or rotate credentials as part of routine QA.
## Operating procedure
Inspect current branch and blob SHA. Make the smallest authorized change. Use [skip netlify] on QA commits. Retrieve the exact commit's workflow result and sanitized evidence. If a check fails, diagnose and repeat on QA only. Do not treat an HTTP access redirect as proof of signed-in functionality.
## Escalation
Use Work Chat only when connector capabilities prevent required execution or interactive configuration. Do not paste credentials into chat, logs or artifacts. If a credential was exposed, request separate rotation authorization.
## Acceptance
All applicable checks must pass; unresolved advisories, untested authenticated flows and physical-device checks must be explicitly recorded. No production release is implied by QA success.

## Isolated browser onboarding
Use a reserved .invalid identity and a synthetic record factory. Test the sign in form against an explicit in-memory Auth response and assert fixture authorization on CRM API requests. Never put a hosted identity or password into this workflow.
Map only the app's actual read and write endpoints and assert every expected mutation and reload. The runner serves loopback assets only, blocks service workers and WebSockets and sends other browser traffic to a closed proxy. All fixture requests are fulfilled by the harness. Missy's approval list is substituted on the loopback response only. It never changes app source or a deployment artifact.
Check navigation, edits, save and reload at 390, 820 and 1440. Identify archive and restore as applicable or give the feature-specific reason. Physical push and real identity provider verification require a separate controlled environment.

## Monitoring and evidence
Use get_qa_run to find the exact run and compare its commit SHA against qa/development-engine. Open summary.json in the run's sanitized artifact. Confirm every applicable check and all three authenticated fixture rows, rather than relying on the green job badge.
Review root and staging security inventories separately, noting critical, high and production findings. A dependency repair preview produces candidate manifest and lockfile artifacts for review only. Test compatible upgrades in isolation and keep changes on QA until release approval.
Use get_staging_status to compare the expected staging workflow and its HTTP response. A Cloudflare Access redirect shows that the protected route responded. Track hosted sign in, device and integration acceptance separately. Record branch, commit, run ID, result and remaining owner decisions before closing a task. If output is stale, locate the exact run by commit before initiating another QA run.

### Hosted browser evidence
The hosted browser step uses a fixed QA Supabase origin and the repository's synthetic identity. Browser network interception remains in place. The fixture adapter translates supported CRM requests into isolated database writes, independently reads each write, and reloads browser state from those rows. CRM API responses and the browser-side token remain simulated. The run publishes hosted-browser.json separately from summary.json. Require both artifacts to pass at 390, 820 and 1440 pixels. The hosted JSON includes six tenant isolation assertions at the first width and contains neither passwords nor tokens.
