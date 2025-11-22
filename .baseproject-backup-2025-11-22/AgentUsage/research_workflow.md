# Research Workflow Guide

## Overview

This guide provides a systematic approach to research-only tasks. When activated as a research subagent, focus exclusively on gathering, analyzing, and synthesizing information - not implementing solutions.

### Research Philosophy
- Research and report, don't implement
- Multiple sources beat single sources
- Document confidence levels for all findings
- Acknowledge knowledge gaps openly
- Present alternatives objectively

---

## Research Methodology

### 7-Step Systematic Approach

1. **Define Research Questions** - What exactly needs to be answered?
2. **Identify Information Sources** - Where will you look?
3. **Gather Raw Information** - Collect data systematically
4. **Cross-Reference Findings** - Verify across multiple sources
5. **Validate Accuracy** - Check dates, authority, consensus
6. **Identify Gaps** - What's still unknown?
7. **Synthesize Insights** - Connect findings into actionable knowledge

### Source Prioritization

1. **Primary Sources** (Highest priority)
   - Official documentation
   - Technical specifications
   - RFC documents
   - API references

2. **Authoritative Sources**
   - Well-maintained libraries
   - Established frameworks
   - Industry standards (OWASP, NIST)
   - Academic papers

3. **Community Sources**
   - Stack Overflow discussions
   - GitHub issues and PRs
   - Technical blog posts
   - Conference talks

4. **Experimental Sources** (Use with caution)
   - Beta features
   - Proposals and RFCs in draft
   - Upcoming changes
   - Experimental implementations

### Analysis Framework

For each research topic, answer these questions:

**Current State Assessment**
- What exists today?
- What are established patterns?
- What tools/libraries are available?

**Best Practices Investigation**
- What do experts recommend?
- What patterns have proven successful?
- What anti-patterns should be avoided?
- What are performance considerations?

**Trade-off Analysis**
- What are the alternatives?
- What are pros/cons of each option?
- What constraints influence choices?

**Risk Identification**
- What could go wrong?
- What are common pitfalls?
- What edge cases exist?
- What security concerns apply?

---

## Confidence Scoring

Assign confidence levels to all findings:

- **HIGH (90-100%)**: Multiple authoritative sources agree, well-documented, widely adopted
- **MEDIUM (60-89%)**: Good documentation, some adoption, minor disagreements
- **LOW (30-59%)**: Limited sources, conflicting information, emerging practices
- **SPECULATIVE (<30%)**: Educated guess based on patterns, no direct sources

Always specify confidence level with each finding. Never present speculation as fact.

---

## Research Output Format

### Standard Report Structure

```markdown
# Research Report: [Topic Name]

## Executive Summary
[2-3 paragraphs summarizing key findings, main recommendation, and confidence level]

## Research Questions
1. [Specific question 1]
2. [Specific question 2]
3. [Specific question 3]

## Methodology
- Sources consulted: [Number and types]
- Research depth: [Comprehensive/Moderate/Surface]
- Date conducted: [When research was performed]

## Key Findings

### Finding 1: [Descriptive Title]
**Confidence**: [HIGH/MEDIUM/LOW/SPECULATIVE]
**Sources**: [List 2-3 primary sources with links]

[Detailed explanation of the finding, including:
- What was discovered
- Why it matters
- How it compares to alternatives
- Any caveats or conditions]

**Implications**: [How this affects project decisions]

### Finding 2: [Title]
[Repeat structure for each major finding]

## Comparative Analysis

| Aspect | Option A | Option B | Option C |
|--------|----------|----------|----------|
| Performance | [Details] | [Details] | [Details] |
| Learning Curve | [Details] | [Details] | [Details] |
| Community Support | [Details] | [Details] | [Details] |
| Maturity | [Details] | [Details] | [Details] |
| **Recommended** | Yes/No | Yes/No | Yes/No |

## Best Practices Identified

1. **[Practice Name]**
   - **Why**: [Rationale for this practice]
   - **Source**: [Where it comes from - OWASP, industry leader, etc.]
   - **Adoption**: [How widely used - "industry standard", "emerging", etc.]

2. **[Practice Name]**
   [Continue for 3-5 key practices]

## Risks and Concerns

### Risk 1: [Risk Title]
- **Severity**: [High/Medium/Low]
- **Likelihood**: [High/Medium/Low]
- **Impact**: [Description of potential damage]
- **Mitigation**: [Suggested preventive approach]

### Risk 2: [Risk Title]
[Continue for all identified risks]

## Knowledge Gaps

1. **Gap**: [What is still unknown]
   - **Impact**: [How this uncertainty affects decisions]
   - **Recommendation**: [How to address - further research, testing, prototyping]

2. **Gap**: [Continue for all gaps]

## Implementation Recommendations

### Architecture Approach
[High-level architectural suggestions based on findings]

### Technology Stack
- **Recommended**: [Technology/library name] because [specific reasons]
- **Alternatives**: [Other viable options] if [conditions]
- **Avoid**: [Technologies to avoid] due to [specific concerns]

### Development Approach
[Recommended methodology, workflow, or process based on research]

## Decision Matrix

| Decision Point | Recommendation | Confidence | Rationale |
|---------------|---------------|------------|-----------|
| [Technology choice] | [Specific choice] | [HIGH/MED/LOW] | [Brief explanation] |
| [Architecture pattern] | [Pattern name] | [Level] | [Brief explanation] |
| [Implementation approach] | [Approach] | [Level] | [Brief explanation] |

## Sources and References

### Primary Sources
1. [Official docs/specs] - [URL] - [What it provided]
2. [Continue listing]

### Secondary Sources
1. [Blog/article] - [URL] - [What it contributed]
2. [Continue listing]

---

**Research Completion Checklist:**
- [ ] All research questions answered
- [ ] Confidence levels assigned
- [ ] Sources documented
- [ ] Risks identified
- [ ] Best practices documented
- [ ] Implementation recommendations provided
- [ ] Knowledge gaps acknowledged
```

---

## Specialized Research Templates

### Template 1: Library/Framework Research

```markdown
# Library Research: [Library Name]

## Overview
- **Purpose**: [What it does in one sentence]
- **Maturity**: [Stable/Beta/Experimental]
- **Maintenance**: [Active - last commit date / Moderate / Abandoned]
- **Community Size**: [GitHub stars, NPM downloads/week]
- **License**: [License type and any restrictions]

## Technical Assessment
- **Performance**: [Benchmark results, comparisons with alternatives]
- **Scalability**: [Tested limits, known scaling challenges]
- **Dependencies**: [Number and quality of dependencies]
- **Compatibility**: [Supported versions, platforms, browsers]
- **Bundle Size**: [Size impact on production builds]

## Developer Experience
- **Documentation Quality**: [Excellent/Good/Fair/Poor - with examples]
- **Learning Curve**: [Steep/Moderate/Gentle - time to productivity]
- **TypeScript Support**: [Built-in/DefinitelyTyped/None]
- **Debugging Experience**: [Tools available, error messages quality]
- **Testing Support**: [Integration with test frameworks]

## Ecosystem
- **Plugins/Extensions**: [Number and quality of available additions]
- **Integrations**: [Compatibility with other popular tools]
- **Migration Path**: [How to migrate from/to alternatives]

## Adoption Metrics
- **GitHub Stars**: [Number and trend]
- **Weekly Downloads**: [NPM/PyPI statistics]
- **Production Users**: [Known companies using it]
- **Trend**: [Growing/Stable/Declining - based on data]

## Comparative Analysis
[Compare with 2-3 main alternatives using table format]

## Verdict
**Recommendation**: [Use / Don't Use / Conditional Use]
**Confidence**: [HIGH/MEDIUM/LOW]
**Rationale**: [3-4 sentence explanation of recommendation]
**When to Use**: [Specific scenarios where this library excels]
**When to Avoid**: [Situations where alternatives are better]
```

### Template 2: Security Research

```markdown
# Security Research: [Component/Feature Name]

## Threat Model
- **Assets to Protect**: [Data, systems, user information]
- **Potential Threats**: [Types of attacks relevant to this component]
- **Known Vulnerabilities**: [CVEs, common weakness patterns]
- **Attack Surface**: [Entry points for potential attacks]

## Common Vulnerabilities

### 1. [Vulnerability Type - e.g., SQL Injection]
- **CVE/CWE Reference**: [Identifier if applicable]
- **Risk Level**: [Critical/High/Medium/Low]
- **Attack Vector**: [How this vulnerability is exploited]
- **Mitigation**: [Specific prevention strategies]
- **Detection**: [How to identify if you're vulnerable]
- **Source**: [OWASP/NIST reference]

### 2. [Vulnerability Type]
[Repeat structure]

## Security Best Practices

1. **[Practice Name - e.g., Input Validation]**
   - **Implementation**: [Specific steps to implement]
   - **Validation Method**: [How to verify it's working]
   - **Standard**: [OWASP Top 10, NIST guidelines, etc.]
   - **Common Mistakes**: [What to avoid]

2. **[Practice Name]**
   [Continue for key practices]

## Compliance Requirements
- **Applicable Standards**: [GDPR, HIPAA, PCI-DSS, etc.]
- **Key Requirements**: [Specific obligations]
- **Audit Trail**: [What needs to be logged]

## Recommended Security Tools
- **Static Analysis**: [SAST tools for this technology]
- **Dynamic Testing**: [DAST approaches]
- **Dependency Scanning**: [Tools to check for vulnerable dependencies]
- **Runtime Protection**: [WAF, monitoring solutions]

## Incident Response Plan
- **Detection Indicators**: [Signs of a breach]
- **Immediate Response**: [First 24 hours action steps]
- **Recovery Process**: [How to restore secure operations]
- **Post-Incident**: [Learning and improvement steps]
```

---

## Research Quality Checklist

Before submitting research, verify:

### Completeness
- [ ] All research questions have clear answers
- [ ] Multiple sources consulted for each topic (minimum 2-3)
- [ ] Both advantages and disadvantages investigated
- [ ] Edge cases and limitations considered
- [ ] Future implications assessed

### Accuracy
- [ ] Sources are authoritative and current
- [ ] Publication/update dates checked (prefer recent)
- [ ] Conflicting information acknowledged and explained
- [ ] All assumptions explicitly stated
- [ ] Confidence levels assigned to every finding

### Clarity
- [ ] Executive summary provides clear overview
- [ ] Technical jargon defined or avoided
- [ ] Complex concepts broken down simply
- [ ] Tables/comparisons used for multi-option decisions
- [ ] Recommendations are unambiguous

### Actionability
- [ ] Findings translate to specific next steps
- [ ] Implementation path suggested (without implementing)
- [ ] Risks quantified where possible
- [ ] Alternative approaches provided
- [ ] Decision criteria clearly stated

---

## Common Research Patterns

### Pattern 1: Technology Selection Research
1. Define technical and business requirements
2. Identify all viable technology options (3-5 candidates)
3. Create weighted evaluation criteria
4. Score each option against criteria
5. Identify risks and mitigation for top choices
6. Provide recommendation with rationale and alternatives

### Pattern 2: Problem Investigation Research
1. Deeply understand the problem domain
2. Research how others have solved similar problems
3. Analyze why existing solutions may not fit
4. Identify gaps in current approaches
5. Propose potential approaches (research-level, not implementation)
6. Validate feasibility through documentation and case studies

### Pattern 3: Best Practice Discovery Research
1. Survey current industry standards and guidelines
2. Analyze documented successful implementations
3. Identify recurring patterns across sources
4. Document known anti-patterns and failures
5. Synthesize findings into practical guidelines
6. Create decision framework for when to apply practices

---

## Anti-Patterns to Avoid

### Critical Mistakes to Never Make:

**Single Source Syndrome**
- ❌ "According to this one article..."
- ✅ "Multiple sources agree (Source A, B, C)..."

**Premature Implementation**
- ❌ "Here's the code to implement this..."
- ✅ "Implementation would follow this approach based on [pattern]..."

**Assumption Stacking**
- ❌ "This probably works like X..."
- ✅ "Documentation confirms this works like X (Source)..."

**Missing Confidence Levels**
- ❌ "This is the way to do it."
- ✅ "HIGH confidence: This is recommended by [sources]..."

**Outdated Information**
- ❌ Using 2020 best practices without checking updates
- ✅ Verifying current practices and noting any recent changes

**Ignoring Trade-offs**
- ❌ "Option A is clearly the best."
- ✅ "Option A excels at X but sacrifices Y, while Option B..."

---

## Quick Reference: Research Mission Template

When starting a research task, structure your mission:

```markdown
## Research Mission: [Topic]

**Scope**:
- In Scope: [What to research]
- Out of Scope: [What to skip]
- Depth: [Surface/Moderate/Deep]

**Questions**:
1. [Specific question 1]
2. [Specific question 2]
3. [Specific question 3]

**Context**:
- Requirements: [Key project needs]
- Constraints: [Technical/business limitations]
- Timeline: [Any time-sensitive factors]

**Deliverables**:
- Main research report with confidence levels
- Comparative analysis if multiple options
- Risk assessment
- Clear recommendations

**Success Criteria**:
- All questions answered with sources
- Multiple perspectives considered
- No implementation code written
```

---

## Related Documentation

- **Subagent Usage Guide**: `[[subagent_usage.md]]`
- **House Agents Guide**: `[[house_agents.md]]`
- **Research Metaprompt**: `[[research_subagent_metaprompt.md]]`

---

## Core Research Principles

Remember these fundamentals:

1. **Thoroughness beats speed** - Take time to find multiple sources
2. **Accuracy beats confidence** - Admit uncertainty when it exists
3. **Objectivity beats preference** - Present all viable options fairly
4. **Clarity beats completeness** - Make findings understandable
5. **Actionability beats theory** - Focus on decisions that need to be made

**You research so others can build with confidence.**
