import json, os, time, requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA_PATH = os.path.join(BASE_DIR, "data", "paraphrased_qa.json")
QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://192.168.10.182:11434/api/embeddings"
COLLECTION = "acetronix_knowledge"
BATCH_SIZE = 50


def get_embedding(text):
    r = requests.post(OLLAMA_URL, json={
        "model": "nomic-embed-text-v2-moe", "prompt": text
    }, timeout=60)
    data = r.json()
    return data.get("embedding")


def main():
    with open(QA_PATH, "r", encoding="utf-8") as f:
        qa_data = json.load(f)

    # 모든 질문 (원본 + 패러프레이즈)을 벡터로 변환
    all_items = []
    for entry in qa_data:
        # 원본 질문
        all_items.append({
            "question": entry["original"],
            "category": entry["category"],
            "original_id": entry["id"],
            "type": "original",
        })
        # 패러프레이즈
        for j, p in enumerate(entry.get("paraphrases", [])):
            if p and isinstance(p, str) and len(p) > 2:
                all_items.append({
                    "question": p,
                    "category": entry["category"],
                    "original_id": entry["id"],
                    "type": "paraphrase",
                })

    print(f"총 {len(all_items)}개 질문 임베딩 시작")
    print("=" * 50)

    # 기존 knowledge 청크 ID (1~11) 이후부터 시작
    point_id = 100

    for batch_start in range(0, len(all_items), BATCH_SIZE):
        batch = all_items[batch_start:batch_start + BATCH_SIZE]
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
            r = requests.put(
                f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                json={"points": points}
            )
            status = "OK" if r.ok else f"FAIL: {r.text[:100]}"
        else:
            status = "SKIP (empty)"

        done = min(batch_start + BATCH_SIZE, len(all_items))
        print(f"  [{done}/{len(all_items)}] {len(points)}개 저장 - {status}")
        time.sleep(0.2)

    # 최종 확인
    r = requests.get(f"{QDRANT_URL}/collections/{COLLECTION}")
    info = r.json().get("result", {})
    count = info.get("points_count", "?")
    print(f"\n{'=' * 50}")
    print(f"Qdrant '{COLLECTION}' 총 포인트: {count}")

if __name__ == "__main__":
    main()
