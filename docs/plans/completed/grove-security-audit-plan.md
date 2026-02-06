# Grove 1.0 Security Audit Plan

## Executive Summary

Pre-launch security audit for Grove using a **6-model AI council** approach combined with traditional static analysis. The codebase is primarily **Svelte + TypeScript** with some JavaScript.

**Total estimated cost: ~$3-8** for comprehensive multi-pass coverage.

---

## Model Configuration

### Primary Model (Main Auditor + Judge)

| Model | ID | Context | Input/1M | Output/1M | Role |
|-------|-----|---------|----------|-----------|------|
| **DeepSeek V3.2** | `deepseek/deepseek-v3.2` | 163K | $0.25 ($0.028 cached) | $0.38 | Main auditor + Judge + Synthesis |

> ⚠️ **IMPORTANT**: Use `deepseek/deepseek-v3.2` specifically. Do NOT use `deepseek-chat` — that's a fallback alias for the older V3 model.

### Council Members

| Model | ID | Context | Input/1M | Output/1M | Strength |
|-------|-----|---------|----------|-----------|----------|
| **DeepSeek V3.2** | `deepseek/deepseek-v3.2` | 163K | $0.25 | $0.38 | Primary auditor, reasoning, efficiency |
| **MiniMax M2.1** | `minimax/minimax-m2.1` | 196K | $0.27 | $1.12 | Multilingual coding, agentic workflows |
| **GLM-4.7** | `z-ai/glm-4.7` | 202K | $0.40 | $1.50 | Vibe coding, UI quality, stable multi-step |
| **Grok 4.1 Fast** | `x-ai/grok-4.1-fast` | **2M** | $0.20 | $0.50 | Massive context, web search |
| **Qwen3-Coder** | `qwen/qwen3-coder` | 262K | $0.22 | $0.95 | Specialized code generation, agentic |
| **Gemini 3 Flash** | `google/gemini-3-flash-preview` | **1M** | $0.50 | $3.00 | Multimodal, configurable reasoning levels |

### Privacy & ZDR Compliance

| Model | Status | Notes |
|-------|--------|-------|
| DeepSeek V3.2 | ✅ ZDR | Standard API privacy |
| MiniMax M2.1 | ✅ ZDR | Standard API privacy |
| GLM-4.7 | ✅ ZDR | Standard API privacy |
| Grok 4.1 Fast | ⚠️ Near-ZDR | 30-day log retention — acceptable for one-time audit |
| Qwen3-Coder | ✅ ZDR | Standard API privacy |
| Gemini 3 Flash | ✅ ZDR | Standard API privacy |

---

## OpenRouter Configuration

```python
# config.py for LLM Council

import os

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"

# Main auditor - handles primary analysis
# Judge - handles final synthesis
# IMPORTANT: Use deepseek-v3.2, NOT deepseek-chat (old V3 fallback)
MAIN_MODEL = "deepseek/deepseek-v3.2"
JUDGE_MODEL = "deepseek/deepseek-v3.2"

# Full council - diverse perspectives for cross-validation
COUNCIL_MODELS = [
    "deepseek/deepseek-v3.2",       # Primary - best value, strong reasoning
    "minimax/minimax-m2.1",          # Fast, multilingual coding
    "z-ai/glm-4.7",                  # Vibe coding, stable multi-step
    "x-ai/grok-4.1-fast",            # 2M context for large files
    "qwen/qwen3-coder",              # Specialized code analysis
    "google/gemini-3-flash-preview", # Google's fast reasoning
]

# Audit settings
TEMPERATURE = 0.2      # Lower for deterministic security analysis
MAX_TOKENS = 8000      # Enough for detailed findings
TIMEOUT = 300          # 5 min timeout for large requests
```

### Model IDs (Copy-Paste Ready)

```
deepseek/deepseek-v3.2
minimax/minimax-m2.1
z-ai/glm-4.7
x-ai/grok-4.1-fast
qwen/qwen3-coder
google/gemini-3-flash-preview
```

---

## Cost Estimate

**Assumptions for Grove codebase:**
- Lattice + Heartwood: ~80K lines Svelte/TS/JS → ~320K tokens
- Per-model input: ~400K tokens (with system prompts)
- Per-model output: ~80K tokens

| Model | Input Cost | Output Cost | Per Pass |
|-------|------------|-------------|----------|
| DeepSeek V3.2 | $0.10 | $0.03 | **$0.13** |
| MiniMax M2.1 | $0.11 | $0.09 | **$0.20** |
| GLM-4.7 | $0.16 | $0.12 | **$0.28** |
| Grok 4.1 Fast | $0.08 | $0.04 | **$0.12** |
| Qwen3-Coder | $0.09 | $0.08 | **$0.17** |
| Gemini 3 Flash | $0.20 | $0.24 | **$0.44** |

**Full 6-model council pass: ~$1.34**

### 3-Stage Workflow Cost

| Stage | Description | Cost |
|-------|-------------|------|
| Stage 1 | Individual reviews (6 models parallel) | ~$1.34 |
| Stage 2 | Cross-validation (3 models review others) | ~$0.60 |
| Stage 3 | Judge synthesis (DeepSeek V3.2) | ~$0.20 |
| **Total** | **Per full audit cycle** | **~$2.14** |

**Budget for 2-3 passes: ~$5-8**

---

## Phase 1: CI/CD Static Analysis Setup

### Languages to Scan

| Include | Exclude |
|---------|---------|
| `*.svelte` | `*.json` |
| `*.ts` | `*.md` |
| `*.js` | `node_modules/` |
| | `dist/`, `build/` |
| | `.svelte-kit/` |

### Semgrep GitHub Action

Create `.github/workflows/semgrep.yml`:

```yaml
name: Semgrep Security Scan

on:
  push:
    branches: [main, develop]
    paths:
      - '**.svelte'
      - '**.ts'
      - '**.js'
  pull_request:
    branches: [main]
    paths:
      - '**.svelte'
      - '**.ts'
      - '**.js'
  schedule:
    # Weekly on Sundays at midnight
    - cron: '0 0 * * 0'
  workflow_dispatch:

jobs:
  semgrep:
    name: Semgrep Security Scan
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Semgrep
        run: |
          semgrep scan \
            --config=p/security-audit \
            --config=p/typescript \
            --config=p/javascript \
            --config=p/xss \
            --config=p/jwt \
            --config=p/secrets \
            --include='*.svelte' \
            --include='*.ts' \
            --include='*.js' \
            --exclude='node_modules' \
            --exclude='dist' \
            --exclude='build' \
            --exclude='.svelte-kit' \
            --sarif --output=semgrep-results.sarif \
            --json --output=semgrep-results.json

      - name: Upload SARIF to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep-results.sarif
        if: always()

      - name: Upload JSON results
        uses: actions/upload-artifact@v4
        with:
          name: semgrep-results
          path: |
            semgrep-results.json
            semgrep-results.sarif
        if: always()

      - name: Fail on high severity
        run: |
          if [ -f semgrep-results.json ]; then
            HIGH_COUNT=$(cat semgrep-results.json | jq '[.results[] | select(.extra.severity == "ERROR")] | length')
            if [ "$HIGH_COUNT" -gt 0 ]; then
              echo "❌ Found $HIGH_COUNT high severity issues!"
              cat semgrep-results.json | jq '.results[] | select(.extra.severity == "ERROR") | {path, line: .start.line, message: .extra.message}'
              exit 1
            fi
          fi
          echo "✅ No high severity issues found"
```

### CodeQL GitHub Action

Create `.github/workflows/codeql.yml`:

```yaml
name: CodeQL Security Analysis

on:
  push:
    branches: [main, develop]
    paths:
      - '**.svelte'
      - '**.ts'
      - '**.js'
  pull_request:
    branches: [main]
    paths:
      - '**.svelte'
      - '**.ts'
      - '**.js'
  schedule:
    # Weekly on Mondays at midnight
    - cron: '0 0 * * 1'
  workflow_dispatch:

jobs:
  analyze:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read

    strategy:
      fail-fast: false
      matrix:
        include:
          - language: javascript-typescript
            build-mode: none  # No build needed for TS/JS

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          build-mode: ${{ matrix.build-mode }}
          queries: +security-extended,security-and-quality
          config: |
            paths-ignore:
              - 'node_modules/**'
              - 'dist/**'
              - 'build/**'
              - '.svelte-kit/**'
              - '**/*.json'
              - '**/*.md'

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
          output: codeql-results
          upload: always

      - name: Upload CodeQL results
        uses: actions/upload-artifact@v4
        with:
          name: codeql-results
          path: codeql-results
        if: always()
```

### Combined Security Gate

Create `.github/workflows/security-gate.yml`:

```yaml
name: Security Gate

on:
  pull_request:
    branches: [main]
    paths:
      - '**.svelte'
      - '**.ts'
      - '**.js'

jobs:
  semgrep:
    name: Semgrep
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep
    steps:
      - uses: actions/checkout@v4
      - name: Run Semgrep
        run: |
          semgrep scan \
            --config=p/security-audit \
            --config=p/typescript \
            --include='*.svelte' --include='*.ts' --include='*.js' \
            --exclude='node_modules' --exclude='.svelte-kit' \
            --error  # Exit 1 on findings

  codeql:
    name: CodeQL
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          build-mode: none
      - uses: github/codeql-action/analyze@v3

  security-check:
    name: Security Check Passed
    runs-on: ubuntu-latest
    needs: [semgrep, codeql]
    steps:
      - run: echo "✅ All security checks passed!"
```

### Local Development Setup

```bash
#!/bin/bash
# scripts/setup-security.sh

echo "🔧 Setting up security tools..."

# Install Semgrep
pip install semgrep

# Create local scan script
cat > scripts/security-scan.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "🔍 Running Semgrep security scan..."
echo ""

semgrep scan \
  --config=p/security-audit \
  --config=p/typescript \
  --config=p/javascript \
  --config=p/xss \
  --config=p/jwt \
  --config=p/secrets \
  --include='*.svelte' \
  --include='*.ts' \
  --include='*.js' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='.svelte-kit' \
  .

echo ""
echo "✅ Semgrep scan complete!"
SCRIPT

chmod +x scripts/security-scan.sh

echo "✅ Setup complete! Run ./scripts/security-scan.sh to scan locally."
```

### Semgrep Quick Commands

```bash
# Full security scan (Svelte/TS/JS only)
semgrep scan --config=p/security-audit --config=p/typescript \
  --include='*.svelte' --include='*.ts' --include='*.js' \
  --exclude='node_modules' --exclude='.svelte-kit'

# XSS focused
semgrep scan --config=p/xss --include='*.svelte' --include='*.ts'

# Secrets detection
semgrep scan --config=p/secrets

# JWT/Auth focused
semgrep scan --config=p/jwt

# Output as JSON for LLM processing
semgrep scan --config=p/security-audit --json > semgrep-results.json
```

---

## Phase 2: LLM Council Audit

### Setup LLM Council

```bash
# Clone Karpathy's LLM Council
git clone https://github.com/karpathy/llm-council
cd llm-council

# Install dependencies
uv sync  # Backend (Python)
cd frontend && npm install && cd ..  # Frontend (React)

# Set environment
export OPENROUTER_API_KEY="your_key_here"
```

### Custom Audit Runner Script

Create `scripts/grove-audit.py`:

```python
#!/usr/bin/env python3
"""
Grove Security Audit Runner
Uses 6-model LLM Council pattern via OpenRouter
"""

import asyncio
import httpx
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

# === Configuration ===

OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"
API_KEY = os.environ.get("OPENROUTER_API_KEY")

# IMPORTANT: Use deepseek-v3.2, NOT deepseek-chat
MAIN_MODEL = "deepseek/deepseek-v3.2"
JUDGE_MODEL = "deepseek/deepseek-v3.2"

COUNCIL_MODELS = [
    "deepseek/deepseek-v3.2",
    "minimax/minimax-m2.1",
    "z-ai/glm-4.7",
    "x-ai/grok-4.1-fast",
    "qwen/qwen3-coder",
    "google/gemini-3-flash-preview",
]

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "HTTP-Referer": "https://grove.place",
    "X-Title": "Grove Security Audit"
}

# === Prompt Templates ===

SECURITY_AUDIT_PROMPT = """You are a senior security engineer performing a comprehensive security audit of a Svelte/TypeScript web application.

## Application Context
- **Project**: Grove - A blogging and social platform
- **Stack**: Svelte, TypeScript, JavaScript
- **Component**: {component}

## Audit Focus Areas

### 1. Authentication & Authorization
- Session management vulnerabilities
- JWT implementation flaws (if present)
- RBAC/permission bypasses
- Token handling issues

### 2. Input Validation & Injection
- XSS (stored, reflected, DOM-based)
- SQL/NoSQL injection
- Command injection
- Template injection in Svelte
- Path traversal

### 3. Svelte-Specific Issues
- Unsafe {@html} usage
- Reactive statement security
- Store manipulation vulnerabilities
- SSR data exposure
- Client-side routing bypasses

### 4. TypeScript/JavaScript Issues
- Type coercion vulnerabilities
- Prototype pollution
- Insecure deserialization
- Regex DoS (ReDoS)

### 5. API Security
- CORS misconfigurations
- Rate limiting gaps
- Information disclosure
- IDOR vulnerabilities

### 6. Cryptography
- Weak algorithms
- Insecure key storage/transmission
- Improper random generation

## Output Format

For each finding, provide:

```
### [SEVERITY] - [Title]
**Severity**: Critical / High / Medium / Low
**CWE**: CWE-XXX
**Location**: `path/to/file.ts:line`
**Confidence**: High / Medium / Low

**Description**:
[What the vulnerability is]

**Impact**:
[What an attacker could do]

**Vulnerable Code**:
```typescript
// The problematic code
```

**Remediation**:
```typescript
// Fixed code
```
```

If no vulnerabilities are found, explain what security measures are in place.

## Code to Audit

{code}
"""

CROSS_VALIDATION_PROMPT = """You are reviewing security audit findings from multiple independent auditors.

The following are anonymized security findings from {num_auditors} different security auditors:

{findings}

Please analyze these findings and:

1. **Confirmed Vulnerabilities**: Issues found by 2+ auditors (high confidence)
2. **Likely Vulnerabilities**: Strong single-auditor findings with clear evidence
3. **Potential Issues**: Need further investigation
4. **False Positive Candidates**: Disputed or unclear findings

For each category, explain your reasoning.

Also rank the auditors (A, B, C, etc.) by quality of analysis.
"""

SYNTHESIS_PROMPT = """You are the chairman of a security audit council, synthesizing the final report.

## Original Findings from {num_auditors} Auditors

{findings}

## Cross-Validation Results

{validations}

## Your Task

Create the FINAL security audit report for Grove. Include:

### Executive Summary
- Overall security posture
- Critical issues count
- Recommended priority

### Confirmed Vulnerabilities
For each, include: Severity, CWE, Location, Description, Impact, Remediation

### Likely Vulnerabilities
Issues with strong evidence but only one auditor

### Recommendations
Prioritized list of fixes before 1.0 launch

### Security Strengths
What's already done well

End with a clear GO / NO-GO recommendation for launch.
"""

# === Helper Functions ===

async def query_model(
    client: httpx.AsyncClient,
    model: str,
    prompt: str,
    max_tokens: int = 8000
) -> dict:
    """Query a single model via OpenRouter."""
    try:
        response = await client.post(
            OPENROUTER_BASE,
            headers=HEADERS,
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": max_tokens,
            },
            timeout=300.0
        )
        response.raise_for_status()
        data = response.json()
        return {
            "model": model,
            "content": data["choices"][0]["message"]["content"],
            "usage": data.get("usage", {}),
            "success": True
        }
    except Exception as e:
        return {
            "model": model,
            "content": f"Error: {str(e)}",
            "success": False,
            "error": str(e)
        }

def load_code(path: Path) -> str:
    """Load code from file or directory, filtering for Svelte/TS/JS."""
    if path.is_dir():
        extensions = ['*.svelte', '*.ts', '*.js']
        excludes = ['node_modules', '.svelte-kit', 'dist', 'build']
        
        files = []
        for ext in extensions:
            files.extend(path.rglob(ext))
        
        code_parts = []
        for f in sorted(files):
            # Skip excluded directories
            if any(ex in str(f) for ex in excludes):
                continue
            try:
                content = f.read_text()
                rel_path = f.relative_to(path)
                code_parts.append(f"// ===== File: {rel_path} =====\n{content}")
            except Exception as e:
                print(f"  ⚠️ Could not read {f}: {e}")
        
        return "\n\n".join(code_parts)
    else:
        return path.read_text()

# === Audit Stages ===

async def stage1_individual_reviews(
    client: httpx.AsyncClient,
    code: str,
    component: str
) -> list:
    """Stage 1: Get independent reviews from all models."""
    print("🔍 Stage 1: Individual reviews from 6 models...")
    
    prompt = SECURITY_AUDIT_PROMPT.format(component=component, code=code)
    
    tasks = [query_model(client, model, prompt) for model in COUNCIL_MODELS]
    responses = await asyncio.gather(*tasks)
    
    for resp in responses:
        status = "✅" if resp["success"] else "❌"
        model_short = resp["model"].split("/")[-1]
        tokens = resp.get("usage", {}).get("total_tokens", "?")
        print(f"  {status} {model_short} ({tokens} tokens)")
    
    return responses

async def stage2_cross_validation(
    client: httpx.AsyncClient,
    responses: list
) -> list:
    """Stage 2: Cross-validate findings."""
    print("🔄 Stage 2: Cross-validation...")
    
    # Anonymize responses
    successful = [r for r in responses if r["success"]]
    anonymized_parts = []
    for i, resp in enumerate(successful):
        anonymized_parts.append(f"## Auditor {chr(65 + i)}\n\n{resp['content']}")
    
    prompt = CROSS_VALIDATION_PROMPT.format(
        num_auditors=len(successful),
        findings="\n\n---\n\n".join(anonymized_parts)
    )
    
    # Use top 3 models for cross-validation
    validators = COUNCIL_MODELS[:3]
    tasks = [query_model(client, model, prompt) for model in validators]
    validations = await asyncio.gather(*tasks)
    
    for v in validations:
        status = "✅" if v["success"] else "❌"
        print(f"  {status} {v['model'].split('/')[-1]}")
    
    return validations

async def stage3_synthesis(
    client: httpx.AsyncClient,
    responses: list,
    validations: list
) -> str:
    """Stage 3: Judge synthesizes final report."""
    print("📋 Stage 3: Final synthesis by DeepSeek V3.2...")
    
    successful_findings = [r["content"] for r in responses if r["success"]]
    successful_validations = [v["content"] for v in validations if v["success"]]
    
    prompt = SYNTHESIS_PROMPT.format(
        num_auditors=len(successful_findings),
        findings="\n\n---\n\n".join(successful_findings),
        validations="\n\n---\n\n".join(successful_validations)
    )
    
    result = await query_model(client, JUDGE_MODEL, prompt, max_tokens=12000)
    
    if result["success"]:
        print("  ✅ Synthesis complete")
    else:
        print(f"  ❌ Synthesis failed: {result.get('error')}")
    
    return result["content"]

# === Main Entry Point ===

async def run_audit(code_path: str, component: str, output_dir: Optional[str] = None):
    """Run full 3-stage security audit."""
    
    print(f"\n🛡️  Grove Security Audit")
    print(f"   Component: {component}")
    print(f"   Path: {code_path}")
    print("")
    
    # Load code
    path = Path(code_path)
    code = load_code(path)
    print(f"📦 Loaded {len(code):,} characters of code")
    print("")
    
    # Run audit
    async with httpx.AsyncClient() as client:
        responses = await stage1_individual_reviews(client, code, component)
        print("")
        
        validations = await stage2_cross_validation(client, responses)
        print("")
        
        final_report = await stage3_synthesis(client, responses, validations)
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = Path(output_dir) if output_dir else Path(f"audit-results/{component}-{timestamp}")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Save individual responses
    for i, resp in enumerate(responses):
        model_name = resp["model"].replace("/", "-")
        filename = f"stage1-{chr(65+i)}-{model_name}.md"
        (out_dir / filename).write_text(resp["content"])
    
    # Save validations
    for i, v in enumerate(validations):
        model_name = v["model"].replace("/", "-")
        (out_dir / f"stage2-validation-{i+1}-{model_name}.md").write_text(v["content"])
    
    # Save final report
    (out_dir / "FINAL-REPORT.md").write_text(final_report)
    
    print(f"\n✅ Audit complete!")
    print(f"   Results saved to: {out_dir}")
    print(f"   Final report: {out_dir}/FINAL-REPORT.md")
    
    return final_report

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python grove-audit.py <code_path> <component_name> [output_dir]")
        print("")
        print("Examples:")
        print("  python grove-audit.py ../heartwood Heartwood")
        print("  python grove-audit.py ../lattice/src Lattice ./results")
        sys.exit(1)
    
    code_path = sys.argv[1]
    component = sys.argv[2]
    output_dir = sys.argv[3] if len(sys.argv) > 3 else None
    
    asyncio.run(run_audit(code_path, component, output_dir))
```

Make executable:
```bash
chmod +x scripts/grove-audit.py
```

### Running the Audit

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY="sk-or-..."

# Audit Heartwood (authentication) - Priority 1
python scripts/grove-audit.py ~/grove/heartwood Heartwood

# Audit Lattice (core platform) - Priority 2
python scripts/grove-audit.py ~/grove/lattice Lattice

# Custom output directory
python scripts/grove-audit.py ~/grove/heartwood Heartwood ./security-audits/heartwood-v1
```

---

## Phase 3: Execution Timeline

### Week 1: Static Analysis Foundation

| Day | Task |
|-----|------|
| 1 | Create `.github/workflows/semgrep.yml` |
| 1 | Create `.github/workflows/codeql.yml` |
| 2 | Push workflows, verify they run on CI |
| 3 | Run initial Semgrep scan on Heartwood |
| 4 | Run initial Semgrep scan on Lattice |
| 5 | Triage SAST findings, create GitHub issues for Critical/High |

```bash
# Day 3: Heartwood scan
cd ~/grove/heartwood
semgrep scan --config=p/security-audit --config=p/jwt \
  --include='*.svelte' --include='*.ts' --include='*.js' \
  --exclude='node_modules' --json > semgrep-heartwood.json

# Day 4: Lattice scan  
cd ~/grove/lattice
semgrep scan --config=p/security-audit --config=p/xss \
  --include='*.svelte' --include='*.ts' --include='*.js' \
  --exclude='node_modules' --json > semgrep-lattice.json
```

### Week 2: LLM Council Audit

| Day | Task |
|-----|------|
| 1 | Set up OpenRouter account, add $10 credits |
| 1 | Clone and configure LLM Council |
| 2-3 | Run full audit on Heartwood (authentication) |
| 4-5 | Run full audit on Lattice (core platform) |

```bash
# Day 2-3: Heartwood audit
python scripts/grove-audit.py ~/grove/heartwood Heartwood

# Day 4-5: Lattice audit
python scripts/grove-audit.py ~/grove/lattice Lattice
```

### Week 3: Remediation & Documentation

| Day | Task |
|-----|------|
| 1 | Combine SAST + LLM findings into master list |
| 2-3 | Fix all Critical severity issues |
| 3-4 | Fix all High severity issues |
| 4 | Document Medium/Low as accepted risk or future work |
| 5 | Write `SECURITY.md` for public security story |
| 5 | Re-run audit to verify fixes |

---

## Audit Targets

### Priority 1: Heartwood (Authentication)

**Critical paths to audit:**
```
src/lib/auth/          # Core auth logic
src/routes/login/      # Login flow
src/routes/api/auth/   # Auth API endpoints
src/lib/stores/user.ts # User state management
```

**Key security questions:**
- [ ] How are sessions created and validated?
- [ ] Is JWT properly configured (algorithm, expiration, refresh)?
- [ ] Are passwords hashed with Argon2/bcrypt + proper cost?
- [ ] Is rate limiting in place for login attempts?
- [ ] How is CSRF protection implemented?

### Priority 2: Lattice (Core Platform)

**Critical paths to audit:**
```
src/routes/api/        # All API endpoints
src/lib/server/        # Server-side logic
src/lib/components/    # Any {@html} usage
src/hooks.server.ts    # Request handling
```

**Key security questions:**
- [ ] Is all user input validated and sanitized?
- [ ] Are API endpoints properly authorized?
- [ ] Is CORS configured correctly?
- [ ] Any XSS vectors via `{@html}` or similar?
- [ ] Are database queries parameterized?

---

## Success Criteria

### Pre-Launch Checklist

**CI/CD:**
- [ ] Semgrep CI running on all PRs to main
- [ ] CodeQL CI running on all PRs to main
- [ ] Security gate blocks PRs with high severity findings

**Vulnerabilities:**
- [ ] Zero Critical severity findings
- [ ] Zero High severity findings (or documented exceptions with mitigations)
- [ ] All confirmed LLM council findings addressed

**Documentation:**
- [ ] `SECURITY.md` published in repo
- [ ] Vulnerability disclosure process documented
- [ ] Audit trail saved for reference

**Verification:**
- [ ] Re-run audit after fixes confirms remediation
- [ ] No regressions introduced

---

## Quick Reference Card

### Model IDs
```
deepseek/deepseek-v3.2       # Main + Judge (NOT deepseek-chat!)
minimax/minimax-m2.1
z-ai/glm-4.7
x-ai/grok-4.1-fast
qwen/qwen3-coder
google/gemini-3-flash-preview
```

### Semgrep Commands
```bash
# Full audit
semgrep scan --config=p/security-audit --config=p/typescript \
  --include='*.svelte' --include='*.ts' --include='*.js' \
  --exclude='node_modules' --exclude='.svelte-kit'

# XSS only
semgrep scan --config=p/xss

# Auth/JWT only
semgrep scan --config=p/jwt

# Secrets
semgrep scan --config=p/secrets
```

### Estimated Costs

| Scenario | Cost |
|----------|------|
| Single model pass | ~$0.13-0.44 |
| Full 6-model council (1 pass) | ~$1.34 |
| 3-stage audit cycle | ~$2.14 |
| Comprehensive (2-3 cycles) | ~$5-8 |
| SAST (Semgrep + CodeQL) | **Free** |

---

*Document updated: January 2026*  
*Stack: Svelte + TypeScript + JavaScript*  
*Models: 6-model council via OpenRouter*  
*Architecture: Karpathy LLM Council pattern*
