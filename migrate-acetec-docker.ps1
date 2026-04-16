# ============================================================================
#  AceTec Qdrant + Reranker 컨테이너 마이그레이션 스크립트
#  ----------------------------------------------------------------------------
#  목적: 0.0.0.0 → 127.0.0.1 바인딩 전환 + 기존 데이터(3개 컬렉션) 보존
#
#  위치: C:\Users\user\Desktop\migrate-acetec-docker.ps1
#        (프로젝트 폴더 바깥 — AceTec-Website-v8 소스/기능/CSS 무영향)
#
#  실행: PowerShell 관리자 권한 X (docker 명령만 필요)
#        PS> cd C:\Users\user\Desktop
#        PS> .\migrate-acetec-docker.ps1
#
#  특징:
#    - 4단계 분할 + 각 단계마다 Y/N 확인 (안전 우선)
#    - 기존 컨테이너는 마지막 검증 완료 후에만 삭제
#    - 모든 스냅샷 Desktop\acetec-docker-backup\ 에 보관 (복원 실패 대비)
#    - 복원 실패 시 exit 1 (기존 컨테이너는 보존된 상태로 남음)
# ============================================================================

$ErrorActionPreference = 'Stop'

# -------- 설정 ------------------------------------------------------------
$OLD_QDRANT     = 'heuristic_montalcini'
$OLD_RERANKER   = 'jina-reranker'
$NEW_QDRANT     = 'qdrant'             # compose 의 container_name 과 일치
$NEW_RERANKER   = 'jina-reranker'      # compose 의 container_name 과 일치
$PROJECT_DIR    = 'C:\Users\user\Desktop\AceTec-Website-v8'
$COMPOSE_FILE   = 'docker-compose.hompage.yml'
$BACKUP_DIR     = 'C:\Users\user\Desktop\AceTec-Website-v8\acetec-docker-backup'
$COLLECTIONS    = @('acetec_knowledge', 'acetronix_knowledge', 'acetronix_memory')
$OLD_QDRANT_URL = 'http://127.0.0.1:6333'   # 전환 전 (이미 0.0.0.0 노출됨)

function Confirm-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    $resp = Read-Host "계속하시겠습니까? (y/N)"
    if ($resp -notmatch '^[yY]$') {
        Write-Host "사용자가 중단함. 지금까지의 변경은 유지됨." -ForegroundColor Red
        exit 0
    }
}

function Info($m)   { Write-Host "[INFO] $m"   -ForegroundColor Green }
function Warn($m)   { Write-Host "[WARN] $m"   -ForegroundColor Yellow }
function ErrMsg($m) { Write-Host "[ERROR] $m"  -ForegroundColor Red }

# -------- 사전 점검 --------------------------------------------------------
Info "사전 점검 시작"

docker version --format '{{.Server.Version}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    ErrMsg "Docker 가 실행 중이 아닙니다. Docker Desktop 을 먼저 시작하세요."
    exit 1
}

$oldQdrantExists = docker ps -a --filter "name=$OLD_QDRANT" --format '{{.Names}}'
if (-not $oldQdrantExists) {
    Warn "기존 Qdrant 컨테이너 '$OLD_QDRANT' 가 없습니다."
    Warn "  → 이 스크립트는 데이터 마이그레이션이 필요할 때만 사용합니다."
    Warn "  → 단순히 compose 를 기동하려면 다음 명령을 쓰세요:"
    Warn "     cd $PROJECT_DIR; docker compose -f $COMPOSE_FILE up -d"
    exit 0
}

if (-not (Test-Path "$PROJECT_DIR\$COMPOSE_FILE")) {
    ErrMsg "compose 파일 없음: $PROJECT_DIR\$COMPOSE_FILE"
    exit 1
}

Info "Docker OK, 기존 Qdrant 존재, compose 파일 확인됨"
Write-Host ""
Write-Host "현재 상태:" -ForegroundColor Cyan
docker ps --filter "name=$OLD_QDRANT" --filter "name=$OLD_RERANKER" `
          --format "  {{.Names}}  →  {{.Ports}}"

# ============================================================================
#  PHASE 1 — 스냅샷 백업 (기존 컨테이너에서 추출)
# ============================================================================
Confirm-Step "PHASE 1/4: 기존 Qdrant 컨테이너에서 3개 컬렉션의 스냅샷을 생성하고 '$BACKUP_DIR' 에 저장합니다. (기존 컨테이너는 그대로 유지)"

if (-not (Test-Path $BACKUP_DIR)) { New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null }

$snapshotMap = @{}   # collection → snapshot filename
foreach ($col in $COLLECTIONS) {
    Info "[$col] 스냅샷 생성 중..."
    $resp = Invoke-RestMethod -Method Post -Uri "$OLD_QDRANT_URL/collections/$col/snapshots" -TimeoutSec 300
    $snapName = $resp.result.name
    if (-not $snapName) {
        ErrMsg "[$col] 스냅샷 생성 실패: $($resp | ConvertTo-Json -Compress)"
        exit 1
    }
    $snapshotMap[$col] = $snapName
    Info "[$col] 생성됨 → $snapName"

    # 컨테이너 내부 경로: /qdrant/storage/snapshots/<collection>/<snapshot>.snapshot
    $srcPath = "/qdrant/storage/snapshots/$col/$snapName"
    $dstDir  = Join-Path $BACKUP_DIR $col
    if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir | Out-Null }
    docker cp "${OLD_QDRANT}:$srcPath" "$dstDir\$snapName"
    if ($LASTEXITCODE -ne 0) {
        ErrMsg "[$col] docker cp 실패"
        exit 1
    }
    Info "[$col] 호스트로 복사 완료 → $dstDir\$snapName"
}

Info "PHASE 1 완료 — 모든 스냅샷이 '$BACKUP_DIR' 에 안전하게 저장됨"

# ============================================================================
#  PHASE 2 — 기존 컨테이너 정지 (삭제 아님) + 새 compose 기동
# ============================================================================
Confirm-Step "PHASE 2/4: 기존 컨테이너를 '정지' 하고 (삭제 아님), docker-compose 로 localhost-only 바인딩의 새 컨테이너를 기동합니다."

Info "기존 컨테이너 정지 중..."
docker stop $OLD_QDRANT    2>$null | Out-Null
docker stop $OLD_RERANKER  2>$null | Out-Null

# compose 의 container_name 이 'jina-reranker' 인데 기존 컨테이너 이름과 충돌하므로 rename
$oldRerankerState = docker ps -a --filter "name=^$OLD_RERANKER$" --format '{{.Names}}'
if ($oldRerankerState -eq $OLD_RERANKER) {
    Info "기존 reranker 컨테이너 rename: $OLD_RERANKER → ${OLD_RERANKER}_old"
    docker rename $OLD_RERANKER "${OLD_RERANKER}_old" 2>$null | Out-Null
}

Info "compose 기동 중..."
Push-Location $PROJECT_DIR
try {
    docker compose -f $COMPOSE_FILE up -d
    if ($LASTEXITCODE -ne 0) {
        ErrMsg "compose up 실패. 기존 컨테이너를 다시 시작하려면 수동으로:"
        ErrMsg "  docker start $OLD_QDRANT ${OLD_RERANKER}_old"
        exit 1
    }
} finally { Pop-Location }

# 새 Qdrant 가 healthy 될 때까지 대기
Info "새 Qdrant 헬스체크 대기 중 (최대 60초)..."
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $null = Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections" -TimeoutSec 2
        $ok = $true; break
    } catch { }
}
if (-not $ok) {
    ErrMsg "새 Qdrant 응답 없음. docker logs qdrant 를 확인하세요."
    exit 1
}
Info "새 Qdrant 응답 확인됨"

# ============================================================================
#  PHASE 3 — 스냅샷 복구 (새 qdrant 에 업로드)
# ============================================================================
Confirm-Step "PHASE 3/4: 백업한 스냅샷을 새 qdrant 컨테이너에 복구합니다. 3개 컬렉션 모두 순차 처리."

foreach ($col in $COLLECTIONS) {
    $snapName = $snapshotMap[$col]
    $localSnap = Join-Path $BACKUP_DIR "$col\$snapName"
    if (-not (Test-Path $localSnap)) {
        ErrMsg "[$col] 백업 파일 없음: $localSnap"
        exit 1
    }

    # 새 qdrant 컨테이너의 snapshots 디렉토리에 복사
    $inContainerDir = "/qdrant/snapshots/$col"
    docker exec $NEW_QDRANT mkdir -p $inContainerDir 2>$null | Out-Null
    docker cp $localSnap "${NEW_QDRANT}:$inContainerDir/$snapName"
    if ($LASTEXITCODE -ne 0) {
        ErrMsg "[$col] docker cp → 새 컨테이너 실패"
        exit 1
    }

    # recover API 호출 (file:// URL)
    Info "[$col] 복구 요청 중..."
    $body = @{ location = "file://$inContainerDir/$snapName" } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Method Put `
                -Uri "http://127.0.0.1:6333/collections/$col/snapshots/recover" `
                -ContentType "application/json" -Body $body -TimeoutSec 600
        if ($resp.status -ne 'ok') {
            ErrMsg "[$col] 복구 응답이 ok 아님: $($resp | ConvertTo-Json -Compress)"
            exit 1
        }
    } catch {
        ErrMsg "[$col] 복구 API 호출 실패: $_"
        exit 1
    }
    Info "[$col] 복구 완료"
}

# 복구 검증: 컬렉션 목록 확인
Info "복구 검증 — 새 Qdrant 의 컬렉션 목록:"
$newCols = (Invoke-RestMethod -Uri "http://127.0.0.1:6333/collections").result.collections.name
foreach ($col in $COLLECTIONS) {
    if ($newCols -contains $col) {
        Write-Host "  ✅ $col" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $col (누락!)" -ForegroundColor Red
        ErrMsg "복구가 불완전합니다. 기존 컨테이너는 아직 살아있습니다."
        ErrMsg "수동 복구: docker start $OLD_QDRANT 후 조사"
        exit 1
    }
}
Info "PHASE 3 완료 — 3개 컬렉션 모두 복구됨"

# ============================================================================
#  PHASE 4 — 기존 컨테이너 삭제 (선택)
# ============================================================================
Confirm-Step "PHASE 4/4: [선택] 기존 컨테이너('$OLD_QDRANT', '${OLD_RERANKER}_old')를 완전 삭제합니다. 며칠간 관찰 후 수동 삭제를 원하면 N 를 누르세요."

docker rm $OLD_QDRANT        2>$null | Out-Null
docker rm "${OLD_RERANKER}_old"  2>$null | Out-Null

Info "기존 컨테이너 삭제 완료"

# ============================================================================
#  완료 리포트
# ============================================================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  ✅ 마이그레이션 완료" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "현재 상태:"
docker ps --format "  {{.Names}}  →  {{.Ports}}"
Write-Host ""
Write-Host "보안 확인 (외부에서 접근 시 거부되어야 함):" -ForegroundColor Cyan
Write-Host "  PS> curl.exe http://192.168.10.182:6333/collections"
Write-Host "  → Connection refused / timeout 예상"
Write-Host ""
Write-Host "앱 연결 확인 (localhost 는 정상 접근):"  -ForegroundColor Cyan
Write-Host "  PS> curl.exe http://127.0.0.1:6333/collections"
Write-Host "  → 3개 컬렉션 JSON 반환 예상"
Write-Host ""
Write-Host "백업 스냅샷은 '$BACKUP_DIR' 에 보관됨 (필요 시 수동 삭제)."
Write-Host ""
