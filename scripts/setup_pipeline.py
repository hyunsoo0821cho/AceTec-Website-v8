"""
데이터 파이프라인 통합 스크립트 (1회 실행)
crawl_website → embed_chunks → generate_questions → generate_paraphrases → bulk_embed
를 단계별로 실행합니다.
"""
import json
import glob
import os
import re
import time
import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://192.168.10.182:11434"
COLLECTION = "acetronix_knowledge"
EMBED_MODEL = "nomic-embed-text-v2-moe"

# 파일 경로
CONTENT_DIR = os.path.join(BASE_DIR, "src", "content")
PRODUCTS_DIR = os.path.join(CONTENT_DIR, "products")
PAGES_DIR = os.path.join(CONTENT_DIR, "pages")
CHUNKS_PATH = os.path.join(DATA_DIR, "website_chunks.json")
QUESTIONS_PATH = os.path.join(DATA_DIR, "base_questions.json")
PARAPHRASED_PATH = os.path.join(DATA_DIR, "paraphrased_qa.json")

# HTTP 세션 재사용 (연결 풀링)
session = requests.Session()


# ============================================================
# Phase 1: HTML 크롤링 → 청크 분리
# ============================================================
def _extract_text(obj):
    """JSON 객체에서 텍스트 값을 재귀적으로 추출"""
    texts = []
    if isinstance(obj, str):
        if len(obj) > 3:
            texts.append(obj)
    elif isinstance(obj, list):
        for item in obj:
            texts.extend(_extract_text(item))
    elif isinstance(obj, dict):
        for key, val in obj.items():
            if key in ("image", "href", "url", "icon", "badge"):
                continue
            texts.extend(_extract_text(val))
    return texts


PRODUCT_CAT_MAP = {
    "military": "솔루션", "railway": "솔루션", "industrial": "제품/가격",
    "telecom": "제품/가격", "sensor": "솔루션", "hpc": "제품/가격",
}
PAGE_CAT_MAP = {
    "home": "회사정보", "about": "회사정보", "contact": "서비스",
    "solutions": "솔루션", "applications": "응용분야", "footer": "회사정보",
}


def phase1_crawl() -> list[dict]:
    print("\n[Phase 1] Astro JSON 콘텐츠 → 청크 분리")
    chunks = []

    # 제품 JSON
    for filepath in sorted(glob.glob(os.path.join(PRODUCTS_DIR, "*.json"))):
        filename = os.path.basename(filepath).replace(".json", "")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        category = PRODUCT_CAT_MAP.get(filename, "제품/가격")
        title = data.get("title", filename)
        description = data.get("description", "")
        items_text = ", ".join(item["name"] for item in data.get("items", []))
        chunks.append({
            "id": f"chunk_{len(chunks):03d}",
            "category": category,
            "title": title,
            "content": f"{title}. {description} 제품: {items_text}",
        })
        for item in data.get("items", []):
            parts = [item["name"]]
            if item.get("specs"): parts.append(f"사양: {item['specs']}")
            if item.get("detailDescription"): parts.append(item["detailDescription"])
            if item.get("partner"): parts.append(f"파트너: {item['partner']}")
            chunks.append({
                "id": f"chunk_{len(chunks):03d}",
                "category": category,
                "title": item["name"],
                "content": " ".join(parts),
            })

    # 페이지 JSON
    for filepath in sorted(glob.glob(os.path.join(PAGES_DIR, "*.json"))):
        filename = os.path.basename(filepath).replace(".json", "")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        category = PAGE_CAT_MAP.get(filename, "기타")
        texts = _extract_text(data)
        content = " ".join(texts)
        if content.strip():
            chunks.append({
                "id": f"chunk_{len(chunks):03d}",
                "category": category,
                "title": filename.upper(),
                "content": content,
            })

    # 연혁 JSON
    timeline_path = os.path.join(CONTENT_DIR, "history", "timeline.json")
    if os.path.exists(timeline_path):
        with open(timeline_path, "r", encoding="utf-8") as f:
            timeline = json.load(f)
        texts = _extract_text(timeline)
        if texts:
            chunks.append({
                "id": f"chunk_{len(chunks):03d}",
                "category": "회사연혁",
                "title": "COMPANY HISTORY",
                "content": " ".join(texts),
            })

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(CHUNKS_PATH, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    print(f"  완료: {len(chunks)}개 청크")
    for c in chunks:
        print(f"    [{c['category']}] {c['title']} ({len(c['content'])}자)")
    return chunks


# ============================================================
# Phase 2: 청크 → Qdrant 임베딩
# ============================================================
def get_embedding(text: str) -> list[float] | None:
    try:
        r = session.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=60,
        )
        return r.json().get("embedding")
    except Exception:
        return None


def phase2_embed_chunks(chunks: list[dict]) -> None:
    print(f"\n[Phase 2] {len(chunks)}개 청크 → Qdrant 임베딩")

    # 컬렉션 생성
    r = session.get(f"{QDRANT_URL}/collections/{COLLECTION}")
    if r.status_code == 404 or (r.ok and not r.json().get("result")):
        session.put(f"{QDRANT_URL}/collections/{COLLECTION}", json={
            "vectors": {"size": 768, "distance": "Cosine"}
        })
        print("  컬렉션 생성 완료")

    points = []
    for i, chunk in enumerate(chunks):
        print(f"  [{i+1}/{len(chunks)}] {chunk['title']}...", end="", flush=True)
        vec = get_embedding(chunk["content"])
        if not vec:
            print(" 실패!")
            continue
        points.append({
            "id": i + 1,
            "vector": vec,
            "payload": {
                "content": chunk["content"],
                "category": chunk["category"],
                "title": chunk["title"],
                "type": "knowledge",
            }
        })
        print(" OK")
        time.sleep(0.2)

    if points:
        r = session.put(
            f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
            json={"points": points},
        )
        status = "완료" if r.ok else f"실패: {r.text[:100]}"
        print(f"  Qdrant 저장: {len(points)}개 - {status}")


# ============================================================
# Phase 3: 질문 생성
# ============================================================
TARGET_PER_CATEGORY = {
    "회사정보": 100, "솔루션": 150, "제품/가격": 120, "파트너": 80,
    "고객사": 70, "응용분야": 150, "R&D": 60, "서비스": 50,
    "회사연혁": 50, "FAQ": 80, "회사철학": 40, "일반": 50,
}


def ask_ollama(prompt: str, temperature: float = 0.8) -> str:
    try:
        r = session.post(f"{OLLAMA_URL}/api/generate", json={
            "model": "ministral-3:14b",
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": 4096},
        }, timeout=300)
        return r.json().get("response", "")
    except Exception:
        return ""


def parse_json_array(text: str) -> list:
    text = text.strip()
    start = text.find("[")
    end = text.rfind("]")
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    lines = text.split("\n")
    return [
        line.strip().strip("-").strip("0123456789.").strip().strip('"').strip("'")
        for line in lines
        if line.strip() and len(line.strip()) > 5
    ]


def phase3_generate_questions(chunks: list[dict]) -> list[dict]:
    print(f"\n[Phase 3] 카테고리별 질문 생성")
    all_questions = []

    for chunk in chunks:
        cat = chunk["category"]
        target = TARGET_PER_CATEGORY.get(cat, 50)
        generated = []

        while len(generated) < target:
            batch_size = min(30, target - len(generated))
            print(f"  [{cat}] {len(generated)}/{target}개...", end="", flush=True)

            prompt = f"""에이스텍(AceTec) AI 챗봇용 질문을 {batch_size}개 생성하세요.
카테고리: {chunk['category']}
정보: {chunk['content'][:500]}
JSON 배열로만 답하세요: ["질문1", "질문2", ...]"""

            questions = parse_json_array(ask_ollama(prompt))
            for q in questions:
                if q and len(q) > 3 and q not in generated:
                    generated.append(q)
            print(f" {len(generated)}개", flush=True)
            time.sleep(0.5)
            if not questions:
                break

        for q in generated[:target]:
            all_questions.append({
                "id": f"q_{len(all_questions):04d}",
                "category": cat,
                "question": q,
                "source_chunk": chunk["title"],
            })

    with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    print(f"  총 {len(all_questions)}개 질문 저장")
    return all_questions


# ============================================================
# Phase 4: 패러프레이즈 생성
# ============================================================
def phase4_paraphrases(questions: list[dict]) -> list[dict]:
    print(f"\n[Phase 4] 패러프레이즈 생성 ({len(questions)}개 질문)")
    results = []
    batch_size = 5

    for i in range(0, len(questions), batch_size):
        batch = questions[i:i + batch_size]
        q_list = "\n".join([f'{j+1}. "{q["question"]}"' for j, q in enumerate(batch)])

        prompt = f"""아래 {len(batch)}개 질문 각각에 대해 다른 표현 10개씩 변형하세요.
{q_list}
JSON으로만: {{"1": ["변형1", ...], "2": [...], ...}}"""

        response = ask_ollama(prompt, temperature=0.9)
        parsed = {}
        text = response.strip()
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                parsed = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass

        for j, q in enumerate(batch):
            variants = parsed.get(str(j + 1), [])
            results.append({
                "id": q["id"],
                "category": q["category"],
                "original": q["question"],
                "paraphrases": variants[:10] if isinstance(variants, list) else [],
            })

        done = min(i + batch_size, len(questions))
        print(f"  [{done}/{len(questions)}] 완료", flush=True)
        time.sleep(0.3)

    with open(PARAPHRASED_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    total_p = sum(len(r["paraphrases"]) for r in results)
    print(f"  패러프레이즈 총 {total_p}개 저장")
    return results


# ============================================================
# Phase 5: 패러프레이즈 벌크 임베딩
# ============================================================
def phase5_bulk_embed(qa_data: list[dict]) -> None:
    print(f"\n[Phase 5] 패러프레이즈 벌크 임베딩")

    all_items = []
    for entry in qa_data:
        all_items.append({
            "question": entry["original"],
            "category": entry["category"],
            "original_id": entry["id"],
            "type": "original",
        })
        for p in entry.get("paraphrases", []):
            if p and isinstance(p, str) and len(p) > 2:
                all_items.append({
                    "question": p,
                    "category": entry["category"],
                    "original_id": entry["id"],
                    "type": "paraphrase",
                })

    print(f"  총 {len(all_items)}개 임베딩 시작")
    point_id = 100
    batch_size = 50

    for batch_start in range(0, len(all_items), batch_size):
        batch = all_items[batch_start:batch_start + batch_size]
        points = []
        for item in batch:
            vec = get_embedding(item["question"])
            if not vec:
                continue
            points.append({
                "id": point_id,
                "vector": vec,
                "payload": {
                    "content": item["question"],
                    "category": item["category"],
                    "original_id": item["original_id"],
                    "type": item["type"],
                }
            })
            point_id += 1

        if points:
            session.put(
                f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                json={"points": points},
            )

        done = min(batch_start + batch_size, len(all_items))
        print(f"  [{done}/{len(all_items)}] {len(points)}개 저장", flush=True)
        time.sleep(0.1)

    r = session.get(f"{QDRANT_URL}/collections/{COLLECTION}")
    count = r.json().get("result", {}).get("points_count", "?")
    print(f"  Qdrant 총 포인트: {count}")


# ============================================================
# 메인 실행
# ============================================================
def main():
    print("=" * 60)
    print("AceTec RAG 데이터 파이프라인 (통합 1회 실행)")
    print("=" * 60)

    start = time.time()

    # Phase 1: HTML → 청크
    chunks = phase1_crawl()
    if not chunks:
        print("청크 생성 실패. 종료.")
        return

    # Phase 2: 청크 → Qdrant
    phase2_embed_chunks(chunks)

    # Phase 3: 질문 생성
    questions = phase3_generate_questions(chunks)

    # Phase 4: 패러프레이즈
    qa_data = phase4_paraphrases(questions)

    # Phase 5: 벌크 임베딩
    phase5_bulk_embed(qa_data)

    elapsed = time.time() - start
    print(f"\n{'=' * 60}")
    print(f"전체 파이프라인 완료: {elapsed:.1f}초")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
