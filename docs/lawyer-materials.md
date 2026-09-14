# LawyerDesk managed materials

This fork retains the upstream host, browser and build unchanged. `src/lawyer/index.ts` and `src/lawyer/client/index.tsx` form an independent managed entry graph. Merge upstream releases normally; review changes touching shared host contracts before rebuilding this artifact. No runtime invariant entry is exported because there is no independently mutable registry relationship to reconcile.

## Product behavior

The native `files` tab is replaced by a flat, navigable material shelf scoped to the mounted conversation. Materials are discovered from the real session workspace, not a new case database. PDF, raster images and plain text are read-only. HTML/SVG/code are not rendered or edited; Office files can be referenced but must use LawyerDesk's existing installed-office-app workflow. A reference only changes this session's input draft; it never sends a message automatically. The plugin registers no model tools or prompt sections.

The host exposes only GET `/lawyer-materials/list?sessionId=...&path=...` and `/lawyer-materials/preview?sessionId=...&path=...`. `path` is relative, defaulting to the workspace root for listing. Unknown query keys (including cwd), unknown routes and all non-GET requests are rejected. Session IDs must resolve to a live host session with an absolute header cwd; there is no process cwd, client cwd or unverified persistence fallback. Host webserver authentication remains mandatory; requests additionally reject cross-origin browser markers.

The shared managed `@deepseek-ai/dsh-product-policy` must be resolvable and enabled. Its `assertLawyerFileAccess` is applied to the real workspace and each target. The policy stays external in the artifact so the initialized product singleton is reused. Realpath containment, all-component symlink refusal, special-file refusal and bounded previews apply regardless of client settings. Dotfiles and installer/dependency directories are excluded. No file writes, deletion, rename, Git, PTY, WebSocket, arbitrary browser, sidechat, jobs, settings or marketplace APIs are registered. UI visibility is not the authorization boundary.

## Build and verification

`node scripts/package-lawyer.mjs` produces `dist/lawyer/dsh-better-sidebar-0.19.1-lawyer.1.tgz` and its expanded `dist/lawyer/package/package.json`. The artifact retains the upstream identity and MIT notice, exports a string-valued `./client`, and uses insert-only row `lawyer-materials`. It is self-contained except the shared product-policy peer and browser shell's React module table. The production graph never imports upstream `src/index.ts` or `src/client/index.tsx`. The general `pnpm build` remains upstream's build.

Run `pnpm exec vitest run tests/lawyer-materials.spec.ts tests/lawyer-materials-client.spec.tsx` and `pnpm exec tsc --noEmit`. Tests use disposable local directories and local HTTP only. Product integration must additionally verify authenticated real Electron mounting, session switching, PDF rendering, protected files, absent dangerous routes and reference chips in the real composer before reporting user availability.

## Limits

Only attached/live sessions are served; an unattached session gets an explicit not-ready error and can be retried after the host mounts it. Listings inspect at most 5000 immediate entries and return at most 500, with an explicit limited flag; they are not recursive filesystem crawls. Text is capped at 512 KiB; PDF/images at 20 MiB. The browser owns PDF rendering and revokes preview Blob URLs on selection/session changes. References are draft-only, and no material content or selection is persisted in localStorage. This entry assumes the desktop's authenticated single-user session store; it does not add multi-tenant authorization. Windows and real Electron PDF behavior require product acceptance.
