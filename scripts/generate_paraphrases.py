import json, os, time, requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUESTIONS_PATH = os.path.join(BASE_DIR, "data", "base_questions.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "paraphrased_qa.json")
CHECKPOINT_PATH = os.path.join(BASE_DIR, "data", "paraphrase_checkpoint.json")
OLLAMA_URL = "http://192.168.10.182:11434/api/generate"

BATCH_SIZE = 5  # 한번에 5개 질문 처리


def ask_ollama(prompt):
    r = requests.post(OLLAMA_URL, json={
        "model": "ministral-3:14b",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.9, "num_predict": 4096}
    }, timeout=300)
    return r.json().get("response", "")


def parse_paraphrases(response_text):
    """LLM 응답에서 패러프레이즈 파싱"""
    text = response_text.strip()
    # JSON 파싱 시도
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        try:
            data = json.loads(text[start:end + 1])
            return data
        except json.JSONDecodeError:
            pass
    # 배열 시도
    start = text.find("[")
    end = text.rfind("]")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    return {}


def generate_paraphrases_batch(questions):
    """5개 질문에 대해 각 10개 패러프레이즈 생성"""
    q_list = "\n".join([f'{i+1}. "{q["question"]}"' for i, q in enumerate(questions)])

    prompt = f"""아래 {len(questions)}개 질문 각각에 대해, 같은 의미지만 다른 표현으로 10개씩 변형하세요.

변형 규칙:
1. 존댓말/격식체
2. 반말/캐주얼
3. 간접적 질문
4. 키워드만 축약
5. 우회 표현
6. 비교형 질문
7. 상황 포함
8. 구어체/오타 포함
9. 영어 혼용
10. 장문형

질문 목록:
{q_list}

JSON으로만 답하세요. 형식:
{{"1": ["변형1", "변형2", ...], "2": ["변형1", ...], ...}}"""

    response = ask_ollama(prompt)
    return parse_paraphrases(response)


def main():
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        questions = json.load(f)

    # 체크포인트 로드
    results = []
    start_idx = 0
    if os.path.exists(CHECKPOINT_PATH):
        with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
            checkpoint = json.load(f)
            results = checkpoint.get("results", [])
            start_idx = checkpoint.get("next_idx", 0)
        print(f"체크포인트 복원: {start_idx}번부터 재개 ({len(results)}개 완료)")

    total = len(questions)
    print(f"총 {total}개 질문 x 10개 패러프레이즈 = 목표 {total * 10}개")
    print("=" * 50)

    for batch_start in range(start_idx, total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch = questions[batch_start:batch_end]

        print(f"  [{batch_start+1}-{batch_end}/{total}] 패러프레이즈 생성 중...", end="", flush=True)

        paraphrases = generate_paraphrases_batch(batch)

        for i, q in enumerate(batch):
            key = str(i + 1)
            variants = []
            if isinstance(paraphrases, dict) and key in paraphrases:
                variants = paraphrases[key]
            elif isinstance(paraphrases, list) and i < len(paraphrases):
                variants = paraphrases[i] if isinstance(paraphrases[i], list) else []

            # 원본 질문 포함
            entry = {
                "id": q["id"],
                "category": q["category"],
                "original": q["question"],
                "paraphrases": variants[:10] if isinstance(variants, list) else [],
            }
            results.append(entry)

        print(f" 완료 ({len(results)}개 누적)")

        # 20개마다 체크포인트 저장
        if batch_end % 20 == 0 or batch_end >= total:
            with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
                json.dump({"results": results, "next_idx": batch_end}, f, ensure_ascii=False)

        time.sleep(0.5)

    # 최종 저장
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # 통계
    total_paraphrases = sum(len(r["paraphrases"]) for r in results)
    empty_count = sum(1 for r in results if not r["paraphrases"])

    print(f"\n{'=' * 50}")
    print(f"원본 질문: {len(results)}개")
    print(f"패러프레이즈 총: {total_paraphrases}개")
    print(f"평균: {total_paraphrases / max(len(results), 1):.1f}개/질문")
    print(f"빈 결과: {empty_count}개")
    print(f"저장: {OUTPUT_PATH}")

    # 체크포인트 삭제
    if os.path.exists(CHECKPOINT_PATH):
        os.remove(CHECKPOINT_PATH)

if __name__ == "__main__":
    main()
