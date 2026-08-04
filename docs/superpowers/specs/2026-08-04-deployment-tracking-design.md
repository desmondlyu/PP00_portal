# Deployment tracking design

## Goal

Keep GitHub Pages runtime assets and rebuildable tool sources versioned while
excluding local agent and browser-test work directories.

## Scope

Update only the root `.gitignore`. Do not remove tracked files or change nested
tool ignore rules.

## Rules

- Add explicit root ignores for `/.agents/`, `/.gemini/`, and
  `/.playwright-mcp/`.
- Keep `/.github/` versionable because it contains repository instructions and
  project skills.
- Keep each tool's static entry, referenced assets, and existing source/build
  inputs versioned.
- Keep `tool/AutoDongle/dev/**` and `tool/T5830_TTO/src/**` versioned so their
  deployed static outputs can be rebuilt.
- Do not change existing ignores for dependencies, logs, environment files,
  caches, build output, OS metadata, or local worktrees.

## Verification

After the change, verify that the three local directories are ignored, the
Portal favicon `logo.png` remains tracked, and existing tool deployment assets
remain tracked.

## Out of scope

Do not fix the separately reported favicon, CDN, or external API availability
risks in this change.
