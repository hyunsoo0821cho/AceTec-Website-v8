import json, os, requests, time

# 최적화된 RAG 엔진 임포트
from rag_prompt import (
    run_unified_rag, search_knowledge, format_response,
    warmup, get_embedding, _session, QDRANT_URL, COLLECTION,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA_PATH = os.path.join(BASE_DIR, "data", "paraphrased_qa.json")

# 테스트 질문 (카테고리별 샘플 + 기대 의도)
TEST_QUESTIONS = [
    ("회사정보", "에이스텍은 언제 설립됐나요?", "SYSTEM_INFO"),
    ("회사정보", "에이스텍 대표이사가 누구예요?", "SYSTEM_INFO"),
    ("제품/가격", "팬리스 PC 어떤 제품이 있나요?", "SYSTEM_INFO"),
    ("제품/가격", "4U 랙마운트 서버 종류 알려줘", "SYSTEM_INFO"),
    ("솔루션", "군수용 임베디드 보드 뭐가 있어요?", "SYSTEM_INFO"),
    ("솔루션", "철도 신호 시스템에 쓸 수 있는 제품은?", "SYSTEM_INFO"),
    ("파트너", "Wind River랑 무슨 관계에요?", "SYSTEM_INFO"),
    ("고객사", "방산 분야 고객사 알려줘", "SYSTEM_INFO"),
    ("응용분야", "원자력 발전소에도 납품하나요?", "SYSTEM_INFO"),
    ("R&D", "FPGA 관련 기술 있어요?", "SYSTEM_INFO"),
    ("서비스", "제품 도입 절차가 어떻게 되나요?", "SYSTEM_INFO"),
    ("FAQ", "데모 요청 가능한가요?", "SYSTEM_INFO"),
    ("일반", "안녕하세요", "GREETING"),
    ("회사철학", "에이스텍의 핵심 가치가 뭔가요?", "SYSTEM_INFO"),
]


def test_paraphrase_consistency():
    """같은 의미 질문이 같은 결과를 반환하는지 확인 (rag_prompt 캐시 활용)"""
    if not os.path.exists(QA_PATH):
        print("  패러프레이즈 데이터 없음 - 건너뜀")
        return

    with open(QA_PATH, "r", encoding="utf-8") as f:
        qa_data = json.load(f)

    samples = [q for q in qa_data if len(q.get("paraphrases", [])) >= 3][:5]
    if not samples:
        print("  패러프레이즈 샘플 부족 - 건너뜀")
        return

    consistent = 0
    total = 0
    for sample in samples:
        orig_results = search_knowledge(sample["original"], limit=3)
        if not orig_results:
            continue
        orig_top = orig_results[0]["content"]

        for p in sample["paraphrases"][:3]:
            p_results = search_knowledge(p, limit=3)
            if p_results and p_results[0]["content"] == orig_top:
                consistent += 1
            total += 1

    rate = (consistent / total * 100) if total > 0 else 0
    print(f"  일관성: {consistent}/{total} ({rate:.0f}%)")


def test_rag_pipeline():
    """RAG 통합 파이프라인 테스트 (프롬프트 제약조건 + 응답속도 검증)"""
    print(f"\n[4] RAG 파이프라인 테스트 ({len(TEST_QUESTIONS)}개 질문):")
    print("    제약: intent(GREETING/SYSTEM_INFO/OUT_OF_SCOPE) + JSON")

    intent_correct = 0
    json_valid = 0
    has_all_fields = 0
    total = len(TEST_QUESTIONS)
    latencies = []

    for cat, question, expected_intent in TEST_QUESTIONS:
        result = run_unified_rag(question)

        # 레이턴시 수집
        lat = result.get("latency_ms", {})
        total_ms = lat.get("total", 0)
        latencies.append(total_ms)

        # [검증 1] 필수 필드
        required = {"intent", "sql", "answer", "reasoning"}
        fields_ok = required.issubset(result.keys())
        if fields_ok:
            has_all_fields += 1

        # [검증 2] intent 유효성
        intent_valid = result.get("intent") in {"GREETING", "SYSTEM_INFO", "OUT_OF_SCOPE"}
        if intent_valid:
            json_valid += 1

        # [검증 3] 기대 의도 일치
        intent_match = result.get("intent") == expected_intent
        if intent_match:
            intent_correct += 1

        # [검증 4] OUT_OF_SCOPE 확인
        sql_tag = ""
        if result.get("intent") == "OUT_OF_SCOPE":
            sql_tag = " (범위 밖 질문)"

        status = "PASS" if (fields_ok and intent_match) else "FAIL"
        speed = f"{total_ms}ms" if total_ms else "cached"

        print(f"  [{status}] [{cat}] \"{question}\"")
        print(f"         intent={result.get('intent')} (기대: {expected_intent}){sql_tag} | {speed}")

        formatted = format_response(result)
        preview = formatted[:80] + ("..." if len(formatted) > 80 else "")
        print(f"         -> {preview}")

    # 레이턴시 통계
    real_latencies = [l for l in latencies if l > 0]
    avg_ms = sum(real_latencies) / len(real_latencies) if real_latencies else 0
    max_ms = max(real_latencies) if real_latencies else 0
    min_ms = min(real_latencies) if real_latencies else 0

    print(f"\n  --- 결과 ---")
    print(f"  JSON 필드 완전성: {has_all_fields}/{total}")
    print(f"  intent 유효성:    {json_valid}/{total}")
    print(f"  intent 정확도:    {intent_correct}/{total}")
    print(f"  응답 속도 (LLM 호출): avg={avg_ms:.0f}ms | min={min_ms}ms | max={max_ms}ms")

    return has_all_fields, json_valid, intent_correct, avg_ms


def main():
    print("=" * 60)
    print("채팅봇 품질 테스트 (최적화 RAG 엔진)")
    print("=" * 60)

    # 0. 모델 워밍업
    print("\n[0] 모델 워밍업:")
    warmup()

    # 1. 컬렉션 상태
    print("\n[1] Qdrant 컬렉션 상태:")
    r = _session.get(f"{QDRANT_URL}/collections/{COLLECTION}")
    if r.ok:
        info = r.json().get("result", {})
        print(f"  포인트 수: {info.get('points_count', '?')}")
        print(f"  벡터 크기: {info.get('config', {}).get('params', {}).get('vectors', {}).get('size', '?')}")
    else:
        print(f"  컬렉션 없음! 먼저 setup_pipeline.py를 실행하세요.")
        return

    # 2. 벡터 검색 품질 (rag_prompt 엔진 사용)
    print(f"\n[2] 벡터 검색 품질 ({len(TEST_QUESTIONS)}개):")
    hits = 0
    search_times = []

    for cat, question, _ in TEST_QUESTIONS:
        t0 = time.time()
        results = search_knowledge(question, limit=3)
        elapsed_ms = int((time.time() - t0) * 1000)
        search_times.append(elapsed_ms)

        if results:
            top = results[0]
            hit = top["score"] > 0.3
            hits += 1 if hit else 0
            status = "HIT" if hit else "LOW"
            print(f"  [{status}] [{cat}] \"{question}\" -> {top['score']:.3f} | {elapsed_ms}ms")
        else:
            print(f"  [MISS] [{cat}] \"{question}\"")

    hit_rate = hits / len(TEST_QUESTIONS) * 100
    avg_search = sum(search_times) / len(search_times)
    print(f"  Hit Rate: {hits}/{len(TEST_QUESTIONS)} ({hit_rate:.0f}%) | 평균 검색: {avg_search:.0f}ms")

    # 3. 패러프레이즈 일관성
    print(f"\n[3] 패러프레이즈 일관성:")
    test_paraphrase_consistency()

    # 4. RAG 파이프라인 (제약조건 + 속도)
    fields_ok, intent_valid, intent_correct, avg_rag = test_rag_pipeline()

    # 5. 최종 요약
    print(f"\n{'=' * 60}")
    print(f"최종 요약:")
    print(f"  벡터 검색:  {hits}/{len(TEST_QUESTIONS)} ({hit_rate:.0f}%) | avg {avg_search:.0f}ms")
    print(f"  RAG 정확도: {intent_correct}/{len(TEST_QUESTIONS)} | avg {avg_rag:.0f}ms")
    print(f"  JSON 유효:  {intent_valid}/{len(TEST_QUESTIONS)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
