import json, os, time, requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHUNKS_PATH = os.path.join(BASE_DIR, "data", "website_chunks.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "base_questions.json")
OLLAMA_URL = "http://192.168.10.182:11434/api/generate"

# 카테고리별 목표 질문 수
TARGET_PER_CATEGORY = {
    "회사정보": 100, "솔루션": 150, "제품/가격": 120, "파트너": 80,
    "고객사": 70, "응용분야": 150, "R&D": 60, "서비스": 50,
    "회사연혁": 50, "FAQ": 80, "회사철학": 40, "일반": 50,
}

GENERAL_QUESTIONS_PROMPT = """당신은 에이스텍(AceTec) 회사 웹사이트의 AI 챗봇을 위한 질문을 생성하는 역할입니다.
아래는 일반적인 인사/잡담 질문입니다. 50개의 다양한 일반 질문을 한국어로 생성하세요.
예: "안녕하세요", "도움이 필요해요", "뭐 할 수 있어?", "감사합니다"

JSON 배열로만 답하세요. 다른 설명 없이 순수 JSON만 출력하세요.
형식: ["질문1", "질문2", ...]"""


def ask_ollama(prompt):
    r = requests.post(OLLAMA_URL, json={
        "model": "ministral-3:14b",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.8, "num_predict": 4096}
    }, timeout=120)
    return r.json().get("response", "")


def parse_questions(response_text):
    """LLM 응답에서 질문 리스트 추출"""
    text = response_text.strip()
    # JSON 배열 찾기
    start = text.find("[")
    end = text.rfind("]")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    # 줄 단위 파싱 폴백
    lines = text.split("\n")
    questions = []
    for line in lines:
        line = line.strip().strip("-").strip("0123456789.").strip()
        if line and len(line) > 5 and ("?" in line or "요" in line or "까" in line):
            questions.append(line.strip('"').strip("'"))
    return questions


def generate_for_chunk(chunk, count):
    """하나의 청크에서 질문 생성"""
    prompt = f"""당신은 에이스텍(AceTec) 회사 웹사이트의 AI 챗봇을 위한 질문을 생성하는 역할입니다.
아래 회사 정보를 읽고, 고객이 챗봇에 물어볼 만한 질문을 {count}개 생성하세요.

규칙:
- 한국어로 작성
- 다양한 난이도 (쉬운 질문 ~ 전문적 질문)
- 다양한 의도 (정보요청, 비교, 추천, 견적, 기술문의 등)
- 실제 고객이 물어볼 법한 자연스러운 질문

회사 정보:
[카테고리: {chunk['category']}]
{chunk['content']}

JSON 배열로만 답하세요. 다른 설명 없이 순수 JSON만 출력하세요.
형식: ["질문1", "질문2", ...]"""

    response = ask_ollama(prompt)
    return parse_questions(response)


def main():
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    all_questions = []
    total_target = sum(TARGET_PER_CATEGORY.values())

    print(f"목표: {total_target}개 질문 생성")
    print("=" * 50)

    for chunk in chunks:
        cat = chunk["category"]
        target = TARGET_PER_CATEGORY.get(cat, 50)
        # 한번에 너무 많이 요청하면 품질 떨어지므로 30개씩 배치
        generated = []
        while len(generated) < target:
            batch_size = min(30, target - len(generated))
            print(f"  [{cat}] {chunk['title']}: {len(generated)}/{target}개 생성 중...", flush=True)
            questions = generate_for_chunk(chunk, batch_size)
            for q in questions:
                if q and len(q) > 3 and q not in generated:
                    generated.append(q)
            time.sleep(1)
            if not questions:
                break  # LLM이 응답 못하면 중단

        for q in generated[:target]:
            all_questions.append({
                "id": f"q_{len(all_questions):04d}",
                "category": cat,
                "question": q,
                "source_chunk": chunk["title"],
            })
        print(f"  -> [{cat}] {min(len(generated), target)}개 완료")

    # 일반 질문 추가
    print(f"\n  [일반] 일반 질문 생성 중...")
    general_resp = ask_ollama(GENERAL_QUESTIONS_PROMPT)
    general_qs = parse_questions(general_resp)
    for q in general_qs[:50]:
        all_questions.append({
            "id": f"q_{len(all_questions):04d}",
            "category": "일반",
            "question": q,
            "source_chunk": "general",
        })
    print(f"  -> [일반] {min(len(general_qs), 50)}개 완료")

    # 저장
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 50}")
    print(f"총 {len(all_questions)}개 질문 생성 완료 -> {OUTPUT_PATH}")

    # 카테고리별 통계
    stats = {}
    for q in all_questions:
        stats[q["category"]] = stats.get(q["category"], 0) + 1
    for cat, cnt in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {cnt}개")

if __name__ == "__main__":
    main()
