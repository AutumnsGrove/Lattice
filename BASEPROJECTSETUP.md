I want to add BaseProject structure to my CURRENT project. Follow this workflow:

1. Analyze my existing project: read README.md, AGENT.md, git history for commit patterns, detect tech stack and package managers, identify architecture (monorepo/single/etc), read TODOS.md if exists
2. Clone https://github.com/AutumnsGrove/BaseProject (main branch) to /tmp/bp
3. Copy AgentUsage/ to my project (preserve any existing AgentUsage/ files, only add new guides)
4. Intelligently merge AGENT.md: if exists, parse sections and merge BaseProject sections using markers like "<!-- BaseProject: Git Workflow -->". If doesn't exist, create from template with detected project details
5. Enhance .gitignore by merging entries (preserve existing, add missing from BaseProject)
6. Analyze commit messages and suggest adopting BaseProject conventional commit style if inconsistent
7. Check if using branches like dev/main and suggest workflow if not
8. Ask if I want to install git hooks (they auto-detect my language and back up existing hooks first)
9. If yes, run ./AgentUsage/pre_commit_hooks/install_hooks.sh interactively
10. Ask if I want to install house-agents (includes house-coder and house-planner for enhanced workflows)
11. If yes, check if ~/.claude/agents/house-research.md exists; if not, clone https://github.com/AutumnsGrove/house-agents.git and copy agents to ~/.claude/agents/
12. Generate/update TODOS.md with project-aware tasks
13. Create integration-summary.md report showing what was added/merged/skipped
14. Backup all modified files to ./.baseproject-backup-[TIMESTAMP]/
15. Cleanup /tmp/bp
16. Display next steps

Start by analyzing my current project.