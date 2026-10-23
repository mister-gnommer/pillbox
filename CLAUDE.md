@AGENTS.md

# Pillbox

1–2 hour recruitment assignment (see README.md). One working end-to-end flow beats breadth. Note every scope cut, because the final submission has to explain it.

## Git (overrides the global git rule for this project)

- You may `git add`, commit and push without asking. Everything lands on `main`: no branches, no PRs.
- SDD flow: after the user approves each OpenSpec step (propose, apply, sync, archive), make a separate commit for that step and push it.
- Commit hygiene follows the `update-pr` skill's **rewritable** flow (solo work, no PR). Fold a change into the commit it belongs to with `git commit --fixup` + `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash`, and push with `--force-with-lease`, never with plain `--force`. Never fold one SDD step's commit into another's.
- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).

## Subagents

When delegating coding or spec writing (anything beyond lookups or docs edits), the brief must tell the subagent to first load the `ponytail` skill via the Skill tool, at the same level as the main agent (e.g. `full`), and to follow it.

## Dependencies

`npx expo install` writes `~` ranges. Change them to the exact resolved version (the global exact-pin rule still applies).
