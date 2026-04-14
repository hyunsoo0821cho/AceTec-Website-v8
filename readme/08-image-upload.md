# 8. 이미지 업로드 & 저장 과정 (상세)

## 8-1. 이미지 교체 흐름

```
1. Admin 로그인 상태에서 페이지 탐색
2. data-img 속성이 있는 이미지에 마우스 hover
3. Replace 배지 오버레이 표시
4. 배지 클릭 -> <input type="file"> 열림
5. 이미지 선택
       |
       v
6. POST /api/images/upload
   Body: FormData { image: File, preset: string }
       |
       v
7. 서버 처리 (src/lib/image.ts):
   +-- 파일 검증 (15MB 이하, jpeg/png/webp/gif)
   +-- sharp로 preset별 리사이즈:
   |   +-- hero:    1400 x 600
   |   +-- service:  800 x 600
   |   +-- product:  800 x 600
   |   +-- plan:    1792 x 1024
   |   +-- partner:  400 x 400
   |   +-- about:    800 x 650
   |   +-- misc:    1400 x 600
   +-- WebP 변환 (품질 82%)
   +-- 파일명: {timestamp}-{slug}.webp
   |
   v
8. 저장 위치 (3곳):
   +-- public/uploads/{preset}/{filename}.webp    (소스)
   +-- dist/client/uploads/{preset}/{filename}.webp (빌드, 있는 경우)
   +-- 이미지/{filename}.webp                      (백업)
       |
       v
9. 응답: { image_path: "/uploads/{preset}/{filename}.webp" }
       |
       v
10. 클라이언트에서 이미지 즉시 교체 (메모리)
11. Save 버튼 클릭 -> JSON 파일에 새 이미지 경로 저장
```

---

## 8-2. Preset 크기표

| Preset | 너비 x 높이 | 저장 경로 | 용도 |
|--------|------------|----------|------|
| `hero` | 1400 x 600 | uploads/hero/ | 히어로 배너 이미지 |
| `service` | 800 x 600 | uploads/services/ | 서비스 섹션 이미지 |
| `product` | 800 x 600 | uploads/products/ | 제품 카드 이미지 |
| `plan` | 1792 x 1024 | uploads/plans/ | 서비스 플랜 이미지 |
| `partner` | 400 x 400 | uploads/partners/ | 파트너 로고 |
| `about` | 800 x 650 | uploads/about/ | 회사 소개 이미지 |
| `misc` | 1400 x 600 | uploads/misc/ | 기타 이미지 |
