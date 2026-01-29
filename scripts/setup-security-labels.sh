#!/bin/bash
set -e

echo "🔒 Creating Grove Security Labels"
echo "=================================="

gh label create "security" --color "E11D48" --description "Security concern or hardening" --force 2>/dev/null || true
echo "✅ security"

gh label create "severity/critical" --color "ff0000" --description "Critical severity security finding" --force 2>/dev/null || true
echo "✅ severity/critical"

gh label create "severity/high" --color "ff7b00" --description "High severity security finding" --force 2>/dev/null || true
echo "✅ severity/high"

gh label create "severity/medium" --color "ffcc00" --description "Medium severity security finding" --force 2>/dev/null || true
echo "✅ severity/medium"

gh label create "severity/low" --color "00cc00" --description "Low severity security finding" --force 2>/dev/null || true
echo "✅ severity/low"

gh label create "sast" --color "0075ca" --description "Static analysis security finding" --force 2>/dev/null || true
echo "✅ sast"

echo ""
echo "All security labels ready!"
