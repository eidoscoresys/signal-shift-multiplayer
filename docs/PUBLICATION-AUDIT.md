# Prepublication audit summary

Status: working-tree, full Git object and index reviews prepared for publication; 77 reviewed candidate files. The final private audit report records hashes and any remaining staged/working-tree differences. No GitHub repository has been created or pushed.

## Original Git state

The user branch is unborn: zero user commits and no remote. Two private Codex checkpoint refs and 185 Git objects (140 blobs, zero commit objects) were present at the initial inspection. All blob contents and commit metadata, including unreachable objects, were included in the pattern scan. The checkpoint refs and objects are preserved locally; they will not be pushed with --all or --mirror. No historical authors, contributor identities or dates are rewritten.

## Findings and sanitation

- No credential-pattern matches were found in the scanned Git blobs or publishable working-tree candidates at initial review. This is evidence from a pattern scan, not a universal guarantee.
- Generated test JSON contains local machine paths. Those reports are ignored and excluded, along with traces, room/session databases, browser data, dependency trees, build outputs, local tooling, private audit files and generated release archives.
- One historical private checkpoint contains the old Cloudflare account identifier. That identifier is not an authentication credential. It remains in the preserved local checkpoint; the reviewed initial source commit will have no checkpoint ancestry. The account identifier was removed from publishable wrangler.jsonc and retained only in ignored local deployment metadata.
- The developer-machine pnpm fallback was replaced with PATH-based tooling and an optional locally supplied PNPM_CLI_PATH. No personal filesystem path is required in source.
- Cover artwork and four gameplay screenshots were reviewed. Screenshots use fictional callsigns and no browser chrome, credentials or local paths.
- Project licensing is explicitly unassigned. No permissive LICENSE file was silently added.

## Scope and limits

The complete first-party working tree is inspected, including ignored first-party text reports. Generated dependencies/caches/runtime directories are inventoried and excluded rather than exhaustively interpreting third-party/binary runtime contents. All Git blob/commit objects are scanned. Git trees/ref paths and the final publication file list are separately checked for prohibited content.

The reproducible audit script is scripts/audit-publication.mjs. Its detailed report, candidate paths/sizes/hashes and any local-only metadata are written under ignored publication/. Matches are reported by category/location/line without printing matched credentials or session values. Inspect the final Git index and new commit objects again immediately before an authorized push. Push only the explicit reviewed branch and version tag, never all refs.

GitHub authorization, the authorized author name/email, repository visibility and permission to push remain separate gates. A completed scan does not itself authorize publication.
