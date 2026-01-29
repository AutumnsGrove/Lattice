#!/bin/bash
set -e

echo "🔒 Grove Security Scanner"
echo "========================="
echo ""

# Check if semgrep is installed
if ! command -v semgrep &> /dev/null; then
    echo "📦 Installing Semgrep..."
    pip install semgrep
    echo ""
fi

echo "🔍 Running security scan..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

semgrep scan \
  --config=p/security-audit \
  --config=p/typescript \
  --config=p/xss \
  --config=p/jwt \
  --config=p/secrets \
  --config=p/svelte \
  --include='*.svelte' \
  --include='*.ts' \
  --include='*.js' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='.svelte-kit' \
  --json --output=security-scan-results.json \
  .

echo ""
echo "📊 Scan Results"
echo "---------------"

if [ -f security-scan-results.json ]; then
  ERROR_COUNT=$(cat security-scan-results.json | jq '[.results[] | select(.extra.severity == "ERROR")] | length')
  WARNING_COUNT=$(cat security-scan-results.json | jq '[.results[] | select(.extra.severity == "WARNING")] | length')
  INFO_COUNT=$(cat security-scan-results.json | jq '[.results[] | select(.extra.severity == "INFO")] | length')

  echo "High Severity (ERROR):   $ERROR_COUNT"
  echo "Medium/Low (WARNING):    $WARNING_COUNT"
  echo "Info (INFO):             $INFO_COUNT"
  echo ""

  if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "⚠️  High severity issues found! Details:"
    echo ""
    cat security-scan-results.json | jq -r '
      .results[] | select(.extra.severity == "ERROR") |
      "[\(.extra.severity)] \(.path):\(.start.line)"
      "   Rule: \(.check_id)"
      "   \(.extra.message)"
      ""'
  fi

  rm -f security-scan-results.json
fi

echo ""
echo "✅ Scan complete!"
