import json, os, time, requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHUNKS_PATH = os.path.join(BASE_DIR, "data", "website_chunks.json")

QDRANT_URL = "http://localhost:6333"
OLLAMA_URL = "http://192.168.10.182:11434"
COLLECTION = "acetronix_knowledge"

def create_collection():
    r = requests.get(f"{QDRANT_URL}/collections/{COLLECTION}")
    if r.status_code == 404 or (r.ok and not r.json().get("result")):
        requests.put(f"{QDRANT_URL}/collections/{COLLECTION}", json={
            "vectors": {"size": 768, "distance": "Cosine"}
        })
        print(f"컬렉션 '{COLLECTION}' 생성 완료")
    else:
        print(f"컬렉션 '{COLLECTION}' 이미 존재")

def get_embedding(text):
    r = requests.post(f"{OLLAMA_URL}/api/embeddings", json={
        "model": "nomic-embed-text-v2-moe", "prompt": text
    }, timeout=60)
    return r.json().get("embedding")

def main():
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"총 {len(chunks)}개 청크 임베딩 시작")
    create_collection()

    points = []
    for i, chunk in enumerate(chunks):
        print(f"  [{i+1}/{len(chunks)}] {chunk['title']} 임베딩 중...", end="", flush=True)
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
        print(" 완료")
        time.sleep(0.3)

    # 배치 업서트
    r = requests.put(f"{QDRANT_URL}/collections/{COLLECTION}/points?wait=true",
                     json={"points": points})
    if r.ok:
        print(f"\nQdrant 저장 완료: {len(points)}개 포인트")
    else:
        print(f"\nQdrant 저장 실패: {r.text}")

if __name__ == "__main__":
    main()
