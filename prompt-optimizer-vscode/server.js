const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9091;
const HOST = '0.0.0.0';

const HTML_PATH = path.join(__dirname, 'index.html');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(HTML_PATH).pipe(res);
  } else if (req.method === 'POST' && req.url === '/api/optimize') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { prompt, apiKey } = JSON.parse(body);
        if (!apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API 키가 필요합니다.' }));
          return;
        }
        if (!prompt || !prompt.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '프롬프트를 입력하세요.' }));
          return;
        }
        callClaude(apiKey, prompt)
          .then(result => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ result }));
          })
          .catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '잘못된 요청입니다.' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function callClaude(apiKey, userPrompt) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
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
      }]
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

    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', chunk => { data += chunk; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (resp.statusCode !== 200) {
            reject(new Error(parsed.error?.message || `API 오류: ${resp.statusCode}`));
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

    req.on('error', e => reject(new Error(`네트워크 오류: ${e.message}`)));
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('요청 시간 초과 (60초)')); });
    req.write(payload);
    req.end();
  });
}

server.listen(PORT, HOST, () => {
  console.log(`Prompt Optimizer running at http://localhost:${PORT}/`);
  console.log(`LAN access: http://192.168.10.182:${PORT}/`);
  console.log('Press Ctrl+C to stop.');
});
