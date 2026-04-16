const vscode = require('vscode');
const https = require('https');

let statusBarItem;

function activate(context) {
  // Register command
  const cmd = vscode.commands.registerCommand('promptOptimizer.optimize', optimizePrompt);
  context.subscriptions.push(cmd);

  // Create status bar button (left side, high priority)
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(sparkle) Optimize Prompt';
  statusBarItem.tooltip = 'Clipboard의 텍스트를 Claude로 프롬프트 최적화';
  statusBarItem.command = 'promptOptimizer.optimize';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

async function optimizePrompt() {
  // Get API key from settings or environment variable
  const config = vscode.workspace.getConfiguration('promptOptimizer');
  const apiKey = config.get('apiKey') || process.env.ANTHROPIC_API_KEY || '';

  if (!apiKey) {
    const action = await vscode.window.showErrorMessage(
      'API 키가 설정되지 않았습니다. Settings에서 promptOptimizer.apiKey를 설정하거나 ANTHROPIC_API_KEY 환경변수를 설정하세요.',
      'Settings 열기'
    );
    if (action === 'Settings 열기') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'promptOptimizer.apiKey');
    }
    return;
  }

  // Read clipboard
  const clipboardText = await vscode.env.clipboard.readText();
  if (!clipboardText || !clipboardText.trim()) {
    vscode.window.showWarningMessage('클립보드가 비어있습니다. 먼저 텍스트를 복사하세요.');
    return;
  }

  // Show progress
  statusBarItem.text = '$(loading~spin) Optimizing...';

  try {
    const result = await callClaudeAPI(apiKey, clipboardText);

    // Copy result to clipboard
    await vscode.env.clipboard.writeText(result);

    statusBarItem.text = '$(check) Done!';
    vscode.window.showInformationMessage('최적화된 프롬프트가 클립보드에 복사되었습니다!');

    // Show result in output channel
    const outputChannel = vscode.window.createOutputChannel('Prompt Optimizer');
    outputChannel.clear();
    outputChannel.appendLine('=== 원본 프롬프트 ===');
    outputChannel.appendLine(clipboardText);
    outputChannel.appendLine('');
    outputChannel.appendLine('=== 최적화된 프롬프트 ===');
    outputChannel.appendLine(result);
    outputChannel.show(true);

    // Reset status bar after 3 seconds
    setTimeout(() => {
      statusBarItem.text = '$(sparkle) Optimize Prompt';
    }, 3000);
  } catch (err) {
    statusBarItem.text = '$(error) Failed';
    vscode.window.showErrorMessage(`프롬프트 최적화 실패: ${err.message}`);
    setTimeout(() => {
      statusBarItem.text = '$(sparkle) Optimize Prompt';
    }, 3000);
  }
}

function callClaudeAPI(apiKey, userPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `당신은 프롬프트 엔지니어링 전문가입니다. 아래 프롬프트를 더 체계적이고 명확하며 효과적인 프롬프트로 다시 작성해주세요.

규칙:
1. 역할(Role), 맥락(Context), 구체적 지시(Instructions), 출력 형식(Output Format)을 포함하여 구조화
2. 모호한 표현을 구체적으로 변환
3. 필요시 예시나 제약조건 추가
4. 원래 의도와 목적을 정확히 유지
5. 최적화된 프롬프트만 출력 (설명이나 메타 코멘트 없이)

원본 프롬프트:
${userPrompt}`
        }
      ]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(parsed.error?.message || `API error: ${res.statusCode}`));
            return;
          }
          const text = parsed.content?.[0]?.text;
          if (!text) {
            reject(new Error('API 응답에 텍스트가 없습니다.'));
            return;
          }
          resolve(text);
        } catch (e) {
          reject(new Error(`응답 파싱 실패: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`네트워크 오류: ${e.message}`)));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('요청 시간 초과 (30초)'));
    });
    req.write(body);
    req.end();
  });
}

function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}

module.exports = { activate, deactivate };
