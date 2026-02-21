# Project Instructions

> **IMPORTANT**: This project uses `AGENT.md` for agent instructions.

## Instructions for Claude Code

**You MUST read `AGENT.md` before doing anything else.**

## Grove Tools Setup

Check if tools are available, install if not:

```bash
gf --help && gw --help
```

```bash
bash tools/grove-find-go/install.sh   # gf — codebase search (Go binary, ~40ms)
uv tool install --editable tools/gw   # gw — infrastructure CLI (git/GitHub/CF)
```

Run `gf --help` and `gw --help` for full command lists.

---

- **`AGENT.md`** — Main project instructions
- **`AgentUsage/`** — Detailed workflow guides and best practices
- Special Reminder from the user:
  > This site is my authentic voice—warm, introspective, queer, unapologetically building something meaningful; write like you're helping me speak, not perform.
- Reminder from the User for when we Work:
  > Write with the warmth of a midnight tea shop and the clarity of good documentation—this is my space, make it feel like home.

## Design Context

Grove serves queer creators, independent writers, and indie web enthusiasts seeking their own space online. **Warm, introspective, queer** — like a trusted friend who runs a midnight tea shop. Nature-themed glassmorphism with seasonal depth. Studio Ghibli warmth meets indie bookshop.

**Full design guide:** `AgentUsage/design_context.md`
