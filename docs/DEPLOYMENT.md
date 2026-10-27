# Cloudflare deployment and public acceptance

Current public candidate: https://signal-shift.signal-shift.workers.dev. Build 1.0.0-rc.3; deployment 759a616d-9912-43cd-a655-1380d07c2c7f. Current verification is recorded in PORTFOLIO-TEST-REPORT.md; TEST-REPORT.md preserves the prior rc.2 baseline.

## Ready locally

The project uses one Cloudflare Worker, static frontend assets and a SQLite Durable Object class named GameRoom. wrangler.jsonc includes the ROOMS binding and its initial new_sqlite_classes migration. Existing namespaces retain their migration history. Rate-limit bindings cover creation and other API traffic. No D1, R2, third-party backend, login service or application secret is required.

Before deployment, run the checks listed in TEST-REPORT.md. A successful `wrangler deploy --dry-run --outdir .wrangler/deploy-check` verifies local bundling/configuration only; it does not create a public application.

## Authentication — completed for this release; instructions for future owners

From a local terminal on the workstation:

```powershell
./scripts/pnpm.ps1 exec wrangler login --use-keyring
./scripts/pnpm.ps1 exec wrangler whoami
```

Complete Cloudflare's own browser OAuth flow. Do not send passwords, OAuth material or API tokens in chat. Use the intended account with permission to deploy Workers and create/migrate SQLite Durable Objects. If more than one account is available, set CLOUDFLARE_ACCOUNT_ID locally for the authorized account; do not commit an account-specific value. Account IDs identify the account but are not session credentials.

Enable/confirm the account's workers.dev subdomain, or configure an owned custom domain. Confirm Durable Objects availability and usage limits for the selected plan. The two rate-limit namespace IDs 233001 and 233002 must not unintentionally share counters with another application; change them to unused positive integer strings in this account if needed. Production quotas and account eligibility cannot be established by local emulation.

## Publish

```powershell
./scripts/pnpm.ps1 install --frozen-lockfile
./scripts/pnpm.ps1 check
./scripts/pnpm.ps1 test
./scripts/pnpm.ps1 test:browser
./scripts/pnpm.ps1 exec wrangler deploy
```

Record the exact HTTPS URL printed by a successful deployment. If the selected workers.dev URL is unavailable, fix the account/subdomain/domain configuration rather than substituting a local preview URL. Do not replace authoritative multiplayer with browser-local state or a static hosting fallback.

## Exact-URL public acceptance

1. Open the exact HTTPS URL from two separate real browsers/devices on different networks. Verify landing, asset loading, secure WebSockets and account-free participation.
2. Create/share/join a room, complete all three crises, and compare deadline, integrity, results and replay. Repeat with four and eight participants/browser profiles.
3. Refresh a controller and a reader during different crises. Temporarily disconnect a commander; command should reassign after close or server heartbeat expiry. Reconnect and verify the same role, sector and progress.
4. Try capacity overflow, a late join, a second tab and an unrelated room. Verify clear responses and isolation.
5. Verify session cookies are HttpOnly, SameSite=Strict and Secure. Check real platform rate limits/logs without recording tokens or private clues.
6. Check physical iOS/Android portrait layouts, Safari/Firefox and real voice collaboration. Exercise wrong submissions, interlock recovery and an actual deadline failure.
7. Record URL, deployment date/version, browser/device/network details and any failures in TEST-REPORT.md. Only then call the public URL verified/playable.

## Rollout and recovery

Browser bundles use hashed asset filenames. Ask existing local/test tabs to refresh when moving from the power-only slice to protocol v2. Stored room identity, original dials, seed and deadline migrate; old terminal power victories retain their original result and completed-system count. New/replayed flights use the full campaign.

Authentication on this workstation is stored as an encrypted Wrangler profile with its key in Windows Credential Manager. Neither the encrypted profile nor credential material is included in the source package. The pinned Windows keyring helper is installed outside the project. For another account, select it locally with CLOUDFLARE_ACCOUNT_ID after authenticating; never paste secrets in chat.

If deployment fails, preserve local source, SQLite state and test evidence. Inspect the failing Wrangler output, account selection, migration history and bindings. Never delete or rename an existing Durable Object namespace to work around an error. A rollback must preserve data compatibility. The public account now contains the deployed game and anonymous automated-test rooms. These expire under the normal 24-hour room policy. Preserve production namespaces and data during future deployments.



## Portfolio release verification

The rc.3 credits release and its repository link were published with explicit creator approval. Its complete suites contain 27 local scenarios and 23 public scenarios (including two credits checks). Use the source revision matching the deployed build for public checks. After authorized deployment, run the matching full public suite and supply the actual new Worker deployment identifier to scripts/package-source.ps1. The package script rejects a mismatched deployed/package version and incomplete reports. The matching rc.3 suite passed all 23 public scenarios.
