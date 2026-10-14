@AGENTS.md

# Claude Code — extra notes

The shared rules are in `AGENTS.md` (imported above). This part is only for Claude Code.

- **Browser:** Playwright uses this project's own profile (see `../_shared/playbooks/browser.md`). When a site asks for a login, stop and ask Saba to log in in that window.
- **Messages to the portfolio session:** send a short `STATUS` when the game design document is ready and when each station is done (format: `~/.claude/rules/agent-coordination.md`). Find the session with `ListAgents`.
- No MCP servers or project skills yet.
