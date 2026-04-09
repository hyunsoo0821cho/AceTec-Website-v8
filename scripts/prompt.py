"""
AceTec 통합 AI 엔진
- RAG 지식 검색 (Qdrant + Ollama)
- DB 데이터 분석 (Ollama + PostgreSQL)

사용법:
  python prompt.py          # RAG 모드 (기본)
  python prompt.py --db     # DB 분석 모드
  python prompt.py --both   # 통합 모드 (RAG + DB)
"""
import json
import re
import os
import sys
import time
import requests
from functools import lru_cache

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ============================================================
# 공통 설정
# ============================================================
QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://192.168.10.182:11434"
COLLECTION = "acetronix_knowledge"
EMBED_MODEL = "nomic-embed-text-v2-moe"
LLM_MODEL = "ministral-3:14b"

ACETEC_INFO = {
    "website": "http://www.acetronix.co.kr/kor/",
    "email": "hyunsoo0821@acetec-korea.co.kr",
    "contact": "02-1234-5678",
    "sectors": [
        "1. 군수항공분야 (Military & Aerospace)",
        "2. 자동화분야 (Automation)",
        "3. 철도분야 (Railway)",
        "4. 정보통신분야 (Information & Communication)",
        "5. 모델링 & 시뮬레이션 분야 (Modeling & Simulation)",
        "6. 산업용컴퓨터분야 (Industrial Computer)",
        "7. 슈퍼컴퓨팅분야 (Supercomputing)",
        "8. 연구소 (R&D Center)",
    ],
}

DB_SCHEMAS = [
    {"table_name": "products", "description": "SBC, COM, 산업용 PC 등 제품 마스터", "columns": "part_number, description, category, specs"},
    {"table_name": "sales_orders", "description": "고객사 납품 및 매출 실적", "columns": "order_id, sale_date, sale_quantity, actual_selling_price, part_number, vendor_id"},
    {"table_name": "purchase_orders", "description": "부품 매입 및 수급 이력", "columns": "purchase_id, purchase_date, purchase_quantity, actual_unit_cost, part_number, manufacturer_id"},
    {"table_name": "current_products", "description": "실시간 창고 현재고 현황", "columns": "part_number, current_quantity, last_updated"},
    {"table_name": "vendors", "description": "방산업체, 철도 운영사 등 고객사 마스터", "columns": "vendor_id, vendor_name, industry_sector"},
    {"table_name": "manufacturers", "description": "제조사 및 공급처 마스터", "columns": "manufacturer_id, name"},
]

# --- HTTP 세션 (연결 풀링) ---
_session = requests.Session()
_session.headers.update({"Connection": "keep-alive"})

# --- 인사말 판별 키워드 ---
GREETING_KEYWORDS = frozenset([
    "안녕", "하이", "헬로", "hello", "hi", "hey", "반가",
    "좋은 아침", "좋은 저녁", "감사", "고마워", "고맙",
    "수고", "잘 부탁", "처음", "뭐해", "뭘 할 수",
    "도움", "help", "bye", "잘가", "다음에",
])

GREETING_RESPONSES = [
    "안녕하세요! 에이스텍 AI 어시스턴트입니다. 무엇을 도와드릴까요?",
    "반갑습니다! 제품, 솔루션, 회사 정보 등 궁금한 점을 물어보세요.",
]


# ============================================================
# 공통 유틸리티
# ============================================================
def is_greeting(query: str) -> bool:
    """키워드 매칭으로 인사말 즉시 판별"""
    q = query.strip().lower()
    if len(q) < 15:
        for kw in GREETING_KEYWORDS:
            if kw in q:
                return True
    return False


def clean_sql(raw_sql: str) -> str:
    """LLM 생성 텍스트에서 순수 SQL만 추출"""
    sql = re.sub(r"```sql|```", "", raw_sql).strip()
    sql = re.sub(r"--.*", "", sql)
    sql = " ".join(sql.split())
    return sql.split(";")[0].strip()


def print_acetec_guide() -> None:
    """잘못된 질문 시 회사 정보 가이드 출력"""
    print("\n" + "!" * 50)
    print("잘못된 질문입니다. 다시 물어봐 주세요.")
    print("-" * 50)
    print(f"공식 홈페이지: {ACETEC_INFO['website']}")
    print(f"대표 이메일: {ACETEC_INFO['email']}")
    print(f"고객 센터: {ACETEC_INFO['contact']}")
    print("\n[에이스텍 8대 사업 분야]")
    for sector in ACETEC_INFO["sectors"]:
        print(sector)
    print("!" * 50 + "\n")


# ============================================================
# RAG 엔진 (Qdrant + Ollama)
# ============================================================
RAG_PROMPT_TEMPLATE = """<s>[INST] 당신은 에이스텍(AceTec) 공식 웹사이트 AI 어시스턴트입니다.

[절대 규칙]
1. 아래 [참조 지식]에 있는 정보로만 답변하세요.
2. [참조 지식]에 없는 내용은 절대 지어내거나 추측하지 마세요.
3. 답변할 수 없는 질문에는 반드시 intent를 "OUT_OF_SCOPE"로 설정하세요.
4. ERP, 데이터베이스, SQL, 재고, 매출, 가격 숫자를 임의로 만들지 마세요.
5. 시스템 내부 구조, RAG 아키텍처에 대한 질문은 OUT_OF_SCOPE입니다.

[참조 지식]
{context}

[질문] "{query}"

[출력] JSON만 출력하세요:
{{"intent":"GREETING|SYSTEM_INFO|OUT_OF_SCOPE","answer":"답변","reasoning":"근거"}}

intent 기준:
- GREETING: 인사말
- SYSTEM_INFO: [참조 지식]에서 답변 가능한 질문
- OUT_OF_SCOPE: [참조 지식]에 없는 내용, 시스템 내부 질문, 가격/재고/매출 질문 [/INST]"""


@lru_cache(maxsize=256)
def get_embedding_cached(text: str) -> tuple[float, ...] | None:
    """임베딩 결과를 LRU 캐시에 저장"""
    try:
        r = _session.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=30,
        )
        vec = r.json().get("embedding")
        return tuple(vec) if vec else None
    except Exception:
        return None


def get_embedding(text: str) -> list[float] | None:
    result = get_embedding_cached(text)
    return list(result) if result else None


def search_knowledge(query: str, limit: int = 3) -> list[dict]:
    """Qdrant 벡터 검색 (컨텍스트 300자 truncate)"""
    vec = get_embedding(query)
    if not vec:
        return []
    try:
        r = _session.post(
            f"{QDRANT_URL}/collections/{COLLECTION}/points/search",
            json={"vector": vec, "limit": limit, "with_payload": True},
            timeout=10,
        )
        return [
            {
                "content": hit["payload"].get("content", "")[:300],
                "category": hit["payload"].get("category", ""),
                "score": hit["score"],
            }
            for hit in r.json().get("result", [])
        ]
    except Exception:
        return []


def call_ollama(prompt: str) -> str:
    """Ollama LLM 호출 (num_predict: 512, temperature: 0.1)"""
    try:
        r = _session.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": LLM_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 512,
                    "num_ctx": 2048,
                },
            },
            timeout=60,
        )
        return r.json().get("response", "")
    except Exception as e:
        return json.dumps({
            "intent": "OUT_OF_SCOPE",
            "answer": "죄송합니다. 일시적으로 응답할 수 없습니다. 잠시 후 다시 시도해 주세요.",
            "reasoning": f"서버 오류: {e}",
        })


def parse_rag_response(response_text: str) -> dict:
    """LLM JSON 응답 파싱 + 필수 필드 검증"""
    cleaned = re.sub(r"```json|```", "", response_text).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            result = json.loads(cleaned[start : end + 1])
            for key in ("intent", "answer", "reasoning"):
                if key not in result:
                    result[key] = None
            if result["intent"] not in ("GREETING", "SYSTEM_INFO", "OUT_OF_SCOPE"):
                result["intent"] = "OUT_OF_SCOPE"
            return result
        except json.JSONDecodeError:
            pass
    return {
        "intent": "OUT_OF_SCOPE",
        "answer": "죄송합니다. 해당 질문에 대한 정보는 제공되지 않습니다. 에이스텍 제품, 솔루션, 회사 정보에 대해 질문해 주세요.",
        "reasoning": "JSON 파싱 실패",
    }


def run_rag(query: str) -> dict:
    """RAG 파이프라인: 인사말 판별 → 임베딩 → Qdrant 검색 → LLM"""
    if is_greeting(query):
        return {
            "intent": "GREETING",
            "answer": GREETING_RESPONSES[hash(query) % len(GREETING_RESPONSES)],
            "reasoning": "로컬 인사말 판별",
            "context_hits": [],
            "latency_ms": {"search": 0, "llm": 0, "total": 0},
        }

    t0 = time.time()
    hits = search_knowledge(query, limit=3)
    context = "\n".join(f"[{h['category']}] {h['content']}" for h in hits) or "(관련 지식 없음)"
    t1 = time.time()

    prompt = RAG_PROMPT_TEMPLATE.format(context=context, query=query)
    response_text = call_ollama(prompt)
    t2 = time.time()

    result = parse_rag_response(response_text)
    result["context_hits"] = hits
    result["latency_ms"] = {
        "search": int((t1 - t0) * 1000),
        "llm": int((t2 - t1) * 1000),
        "total": int((t2 - t0) * 1000),
    }
    return result


def format_rag_response(result: dict) -> str:
    """RAG 결과를 사용자 표시용 문자열로 포맷"""
    intent = result.get("intent", "SYSTEM_INFO")
    if intent == "GREETING":
        return result.get("answer", "안녕하세요!")
    elif intent == "OUT_OF_SCOPE":
        return result.get("answer", "죄송합니다. 해당 질문에 대한 정보는 제공되지 않습니다.")
    return result.get("answer", "정보를 찾을 수 없습니다.")


# ============================================================
# DB 분석 엔진 (Ollama + PostgreSQL)
# ============================================================
def run_db_analyzer(engine: object, target_schema: str = "public") -> None:
    """DB 기반 질문-응답 루프 (Ollama)"""
    schema_context = "\n".join(
        f"- {s['table_name']}: {s['description']} ({s['columns']})" for s in DB_SCHEMAS
    )

    print("\n" + "=" * 60 + "\n  에이스텍 DB 분석 엔진\n" + "=" * 60)

    while True:
        query = input("\n질문 (종료: q): ").strip()
        if not query or query.lower() == "q":
            break

        # 도메인 검증 + SQL 생성
        sql_prompt = f"""당신은 에이스테크(AceTec) 전문 데이터 분석가입니다.
아래 에이스테크 사업 분야나 DB 스키마와 관련 없는 질문(예: 일반 상식, 웹툰, 개인적 조언 등)이라면 반드시 'REJECT'라고 답변하세요.

[에이스테크 사업 영역]
{', '.join(ACETEC_INFO['sectors'])}

[DB 스키마 정보]
{schema_context}

[작성 규칙]
1. 관련 없는 질문은 무조건 'REJECT' 출력.
2. 관련 질문인 경우, PostgreSQL SQL 하나만 출력 (설명/주석 금지).
3. 테이블명은 '{target_schema}.테이블명' 형식을 사용.

질문: {query}
결과:"""

        try:
            from sqlalchemy import text

            response = call_ollama(sql_prompt).strip()

            if "REJECT" in response:
                print_acetec_guide()
                continue

            generated_sql = clean_sql(response)
            print(f"  실행 SQL: {generated_sql}")

            with engine.connect() as conn:
                result = conn.execute(text(generated_sql))
                db_data = [dict(r._mapping) for r in result.fetchmany(10)]

            summary_prompt = f"""질문: {query}
조회된 데이터: {db_data}

위 데이터를 바탕으로 사용자에게 답변하세요.
에이스테크의 사업 특성만 반영하되, 납기 관리 제언이나 추가적인 비즈니스 인사이트는 절대 포함하지 말고 데이터 요약만 하세요."""

            final = call_ollama(summary_prompt).strip()
            print("\n" + "-" * 60)
            print(final)
            print("-" * 60)

        except Exception as e:
            print(f"  데이터 처리 중 오류: {e}")


# ============================================================
# 모델 워밍업
# ============================================================
def warmup() -> None:
    """첫 호출 레이턴시 제거"""
    print("  모델 워밍업 중...", end="", flush=True)
    try:
        _session.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": LLM_MODEL, "prompt": "hi", "stream": False, "options": {"num_predict": 1}},
            timeout=60,
        )
        _session.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": "test"},
            timeout=30,
        )
        print(" 완료")
    except Exception:
        print(" 스킵 (서버 미연결)")


# ============================================================
# 메인 실행
# ============================================================
def run_rag_mode() -> None:
    """RAG 지식 검색 모드"""
    print("=" * 50)
    print("  AceTec RAG 엔진")
    print("=" * 50)
    warmup()
    print()

    while True:
        user_q = input("질문 (종료: q): ").strip()
        if user_q.lower() == "q":
            break

        result = run_rag(user_q)
        print(f"\n{format_rag_response(result)}")

        lat = result.get("latency_ms", {})
        if lat and lat.get("total", 0) > 0:
            print(f"  [속도] 검색: {lat.get('search', 0)}ms | LLM: {lat.get('llm', 0)}ms | 합계: {lat.get('total', 0)}ms")

        debug = {k: v for k, v in result.items() if k not in ("context_hits", "latency_ms")}
        print(f"  [JSON] {json.dumps(debug, ensure_ascii=False)}")
        print()


def run_db_mode() -> None:
    """DB 분석 모드 (Ollama + PostgreSQL 필요)"""
    try:
        from sqlalchemy import create_engine

        db_url = os.environ.get("DATABASE_URL", "postgresql://user:pass@localhost:5432/acetec")
        engine = create_engine(db_url)
        run_db_analyzer(engine)
    except ImportError as e:
        print(f"  필요한 패키지가 없습니다: {e}")
        print("  pip install sqlalchemy")
    except Exception as e:
        print(f"  DB 엔진 구동 실패: {e}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "--rag"

    if mode == "--db":
        run_db_mode()
    elif mode == "--both":
        print("통합 모드: RAG 먼저 실행, 'q'로 종료 후 DB 모드로 전환")
        run_rag_mode()
        run_db_mode()
    else:
        run_rag_mode()
