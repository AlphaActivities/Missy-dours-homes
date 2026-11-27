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
