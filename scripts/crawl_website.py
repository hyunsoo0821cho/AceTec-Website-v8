"""
Astro JSON 콘텐츠에서 지식 청크 추출
(레거시 HTML 파싱 대신 src/content/ JSON 파일 사용)
"""
import json, os, glob

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(BASE_DIR, "src", "content")
PRODUCTS_DIR = os.path.join(CONTENT_DIR, "products")
PAGES_DIR = os.path.join(CONTENT_DIR, "pages")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "website_chunks.json")

# 카테고리 매핑
PRODUCT_CAT_MAP = {
    "military": "솔루션",
    "railway": "솔루션",
    "industrial": "제품/가격",
    "telecom": "제품/가격",
    "sensor": "솔루션",
    "hpc": "제품/가격",
}

PAGE_CAT_MAP = {
    "home": "회사정보",
    "about": "회사정보",
    "contact": "서비스",
    "solutions": "솔루션",
    "applications": "응용분야",
    "footer": "회사정보",
}


def extract_text(obj, prefix=""):
    """JSON 객체에서 텍스트 값을 재귀적으로 추출"""
    texts = []
    if isinstance(obj, str):
        if len(obj) > 3:
            texts.append(obj)
    elif isinstance(obj, list):
        for item in obj:
            texts.extend(extract_text(item, prefix))
    elif isinstance(obj, dict):
        for key, val in obj.items():
            if key in ("image", "href", "url", "icon", "badge"):
                continue
            texts.extend(extract_text(val, key))
    return texts


def main():
    chunks = []

    # 1. 제품 JSON에서 청크 추출
    for filepath in sorted(glob.glob(os.path.join(PRODUCTS_DIR, "*.json"))):
        filename = os.path.basename(filepath).replace(".json", "")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        category = PRODUCT_CAT_MAP.get(filename, "제품/가격")
        title = data.get("title", filename)
        description = data.get("description", "")

        # 카테고리 개요 청크
        items_text = ", ".join(item["name"] for item in data.get("items", []))
        content = f"{title}. {description} 제품: {items_text}"
        chunks.append({
            "id": f"chunk_{len(chunks):03d}",
            "category": category,
            "title": title,
            "content": content,
        })

        # 개별 제품 청크
        for item in data.get("items", []):
            parts = [item["name"]]
            if item.get("specs"):
                parts.append(f"사양: {item['specs']}")
            if item.get("detailDescription"):
                parts.append(item["detailDescription"])
            if item.get("partner"):
                parts.append(f"파트너: {item['partner']}")

            chunks.append({
                "id": f"chunk_{len(chunks):03d}",
                "category": category,
                "title": item["name"],
                "content": " ".join(parts),
            })

    # 2. 페이지 JSON에서 청크 추출
    for filepath in sorted(glob.glob(os.path.join(PAGES_DIR, "*.json"))):
        filename = os.path.basename(filepath).replace(".json", "")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        category = PAGE_CAT_MAP.get(filename, "기타")
        texts = extract_text(data)
        content = " ".join(texts)

        if content.strip():
            chunks.append({
                "id": f"chunk_{len(chunks):03d}",
                "category": category,
                "title": filename.upper(),
                "content": content,
            })

    # 3. 연혁 JSON
    timeline_path = os.path.join(CONTENT_DIR, "history", "timeline.json")
    if os.path.exists(timeline_path):
        with open(timeline_path, "r", encoding="utf-8") as f:
            timeline = json.load(f)
        texts = extract_text(timeline)
        if texts:
            chunks.append({
                "id": f"chunk_{len(chunks):03d}",
                "category": "회사연혁",
                "title": "COMPANY HISTORY",
                "content": " ".join(texts),
            })

    # 저장
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    print(f"완료: {len(chunks)}개 청크 -> {OUTPUT_PATH}")
    for c in chunks:
        print(f"  [{c['category']}] {c['title']} ({len(c['content'])}자)")


if __name__ == "__main__":
    main()
