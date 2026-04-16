#!/bin/bash
# SSH Remote Linux 환경에 Prompt Optimizer 확장 설치 스크립트
# 사용법: bash install-remote.sh

TARGET="$HOME/.vscode-server/extensions/prompt-optimizer-1.0.0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$TARGET"
cp "$SCRIPT_DIR/package.json" "$TARGET/"
cp "$SCRIPT_DIR/extension.js" "$TARGET/"

echo "✓ Installed to: $TARGET"
echo ""
echo "API 키 설정 방법 (택1):"
echo "  1) 환경변수: export ANTHROPIC_API_KEY='sk-ant-...' (in ~/.bashrc)"
echo "  2) VS Code Settings: promptOptimizer.apiKey"
echo ""
echo "VS Code를 재시작(Reload Window)하세요."
