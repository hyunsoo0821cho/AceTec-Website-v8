#!/bin/bash
BASE="http://192.168.10.182:8080"

echo "=============================================="
echo "  CATEGORY 4: AUTH & SECURITY FLOWS"
echo "=============================================="

# Auth/me without cookie
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/api/auth/me")
echo "AUTH_ME_NO_COOKIE: $CODE"

# Logout
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "$BASE/api/auth/logout")
echo "LOGOUT: $CODE"

# Admin dashboard without auth
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/admin/dashboard")
echo "ADMIN_DASHBOARD_NO_AUTH: $CODE"

# Account without auth
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/account")
echo "ACCOUNT_NO_AUTH: $CODE"

# Admin API endpoints
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/api/admin/users")
echo "ADMIN_USERS_NO_AUTH: $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/api/admin/stats")
echo "ADMIN_STATS_NO_AUTH: $CODE"

CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/api/admin/access-requests")
echo "ADMIN_ACCESS_REQ_NO_AUTH: $CODE"

# Security headers
curl -sI --max-time 10 "$BASE/" > /tmp/sec_headers.txt
echo ""
echo "--- Security Headers ---"
for H in "content-security-policy" "strict-transport-security" "x-frame-options" "x-content-type-options" "referrer-policy" "permissions-policy"; do
  if grep -qi "$H" /tmp/sec_headers.txt; then
    echo "HEADER_$H: FOUND"
  else
    echo "HEADER_$H: MISSING"
  fi
done

echo ""
echo "=============================================="
echo "  CATEGORY 5: CONTENT INTEGRITY"
echo "=============================================="

# Home page content
curl -s --max-time 10 "$BASE/" > /tmp/home.html
if grep -qi 'hero\|hero-section\|hero_section' /tmp/home.html; then echo "HOME_HERO: FOUND"; else echo "HOME_HERO: MISSING"; fi
if grep -qi 'solution-card\|solution_card\|sol-card' /tmp/home.html; then echo "HOME_SOLUTION_CARDS: FOUND"; else echo "HOME_SOLUTION_CARDS: MISSING"; fi
if grep -qi 'partner\|partners' /tmp/home.html; then echo "HOME_PARTNER_LOGOS: FOUND"; else echo "HOME_PARTNER_LOGOS: MISSING"; fi
if grep -qi 'plan\|pricing\|service-plan\|service_plan' /tmp/home.html; then echo "HOME_SERVICE_PLANS: FOUND"; else echo "HOME_SERVICE_PLANS: MISSING"; fi

# Solutions page
curl -s --max-time 10 "$BASE/solutions" > /tmp/solutions.html
if grep -qi 'solution-card\|sol-card\|tab\|solution_card' /tmp/solutions.html; then echo "SOLUTIONS_CARDS_TABS: FOUND"; else echo "SOLUTIONS_CARDS_TABS: MISSING"; fi

# Catalog page
curl -s --max-time 10 "$BASE/catalog" > /tmp/catalog.html
if grep -qi 'category\|product-cat\|catalog-grid\|catalog-card' /tmp/catalog.html; then echo "CATALOG_CATEGORIES: FOUND"; else echo "CATALOG_CATEGORIES: MISSING"; fi

# Applications page
curl -s --max-time 10 "$BASE/applications" > /tmp/apps.html
if grep -qi 'chapter\|accordion\|app-section' /tmp/apps.html; then echo "APPS_CHAPTERS: FOUND"; else echo "APPS_CHAPTERS: MISSING"; fi
if grep -qi 'faq\|FAQ' /tmp/apps.html; then echo "APPS_FAQ: FOUND"; else echo "APPS_FAQ: MISSING"; fi

# About page
curl -s --max-time 10 "$BASE/about" > /tmp/about.html
if grep -qi 'stat\|stats\|counter\|numbers' /tmp/about.html; then echo "ABOUT_STATS: FOUND"; else echo "ABOUT_STATS: MISSING"; fi
if grep -qi 'philosophy\|value\|mission\|vision' /tmp/about.html; then echo "ABOUT_PHILOSOPHY: FOUND"; else echo "ABOUT_PHILOSOPHY: MISSING"; fi

# History page
curl -s --max-time 10 "$BASE/history" > /tmp/history.html
if grep -qi 'period\|tab\|timeline\|year' /tmp/history.html; then echo "HISTORY_TABS: FOUND"; else echo "HISTORY_TABS: MISSING"; fi

# Contact page
curl -s --max-time 10 "$BASE/contact" > /tmp/contact.html
if grep -qi 'form\|contact-form\|contactForm' /tmp/contact.html; then echo "CONTACT_FORM: FOUND"; else echo "CONTACT_FORM: MISSING"; fi
if grep -qi 'office\|address\|location\|map' /tmp/contact.html; then echo "CONTACT_OFFICE_INFO: FOUND"; else echo "CONTACT_OFFICE_INFO: MISSING"; fi

# Login page
curl -s --max-time 10 "$BASE/login" > /tmp/login.html
if grep -qi 'type="email"\|type=.email.' /tmp/login.html; then echo "LOGIN_EMAIL_INPUT: FOUND"; else echo "LOGIN_EMAIL_INPUT: MISSING"; fi
if grep -qi 'type="password"\|type=.password.' /tmp/login.html; then echo "LOGIN_PASSWORD_INPUT: FOUND"; else echo "LOGIN_PASSWORD_INPUT: MISSING"; fi
if grep -qi 'details\|admin\|관리자' /tmp/login.html; then echo "LOGIN_ADMIN_SECTION: FOUND"; else echo "LOGIN_ADMIN_SECTION: MISSING"; fi

echo ""
echo "=============================================="
echo "  CATEGORY 6: PRODUCT PAGES CONTENT"
echo "=============================================="

PRODUCTS="military railway industrial telecom sensor hpc ipc radar interconnect"
for prod in $PRODUCTS; do
  curl -s --max-time 10 "$BASE/products/$prod" > /tmp/prod_$prod.html
  echo "--- /products/$prod ---"
  if grep -qi 'p-card\|product-card\|prod-card' /tmp/prod_$prod.html; then echo "  PRODUCT_CARDS: FOUND"; else echo "  PRODUCT_CARDS: MISSING"; fi
  if grep -qi '<h[1-3]\|section-header\|section-title' /tmp/prod_$prod.html; then echo "  SECTION_HEADERS: FOUND"; else echo "  SECTION_HEADERS: MISSING"; fi
  if grep -qi 'access-request\|login-prompt\|request-access\|로그인\|견적' /tmp/prod_$prod.html; then echo "  ACCESS_BANNER: FOUND"; else echo "  ACCESS_BANNER: MISSING"; fi
  if grep -qi '<img' /tmp/prod_$prod.html; then echo "  IMAGES: FOUND"; else echo "  IMAGES: MISSING"; fi
done

echo ""
echo "=============================================="
echo "  CATEGORY 7: API HEALTH & INTEGRATION"
echo "=============================================="

# Health endpoint
HEALTH=$(curl -s --max-time 10 "$BASE/api/health")
echo "HEALTH_RESPONSE: $HEALTH"

HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE/api/health")
echo "HEALTH_STATUS: $HEALTH_CODE"

if echo "$HEALTH" | grep -qi '"server".*"ok"\|"status".*"ok"'; then echo "HEALTH_SERVER_OK: YES"; else echo "HEALTH_SERVER_OK: NO"; fi
if echo "$HEALTH" | grep -qi 'ai\|ollama'; then echo "HEALTH_AI_STATUS: PRESENT"; else echo "HEALTH_AI_STATUS: ABSENT"; fi

# Contact form graceful fallback
CONTACT_VALID=$(curl -s -w "\nHTTPCODE:%{http_code}" --max-time 10 -X POST "$BASE/api/contact" -H "Content-Type: application/json" -d '{"firstName":"Test","lastName":"User","email":"test@example.com","company":"TestCo","phone":"010-1234-5678","message":"E2E test message"}')
echo "CONTACT_VALID_RESP: $CONTACT_VALID"

# 404 page
CODE_404=$(curl -s -o /tmp/page404.html -w "%{http_code}" --max-time 10 "$BASE/nonexistent-page-xyz")
echo "404_STATUS: $CODE_404"
if grep -qi '404\|not found\|페이지를 찾을 수 없' /tmp/page404.html; then echo "404_CUSTOM_PAGE: YES"; else echo "404_CUSTOM_PAGE: NO"; fi

echo ""
echo "=============================================="
echo "  CATEGORY 8: RESPONSIVE & ACCESSIBILITY"
echo "=============================================="

PAGES="/ /solutions /catalog /applications /about /history /contact /login /register /forgot-password /products/military /products/railway /products/industrial /products/telecom /products/sensor /products/hpc /products/ipc /products/radar /products/interconnect"

VIEWPORT_PASS=0
VIEWPORT_FAIL=0
META_DESC_PASS=0
META_DESC_FAIL=0
MOBILE_MENU_PASS=0
MOBILE_MENU_FAIL=0
SEMANTIC_PASS=0
SEMANTIC_FAIL=0

for page in $PAGES; do
  HTML=$(curl -s --max-time 10 "$BASE$page")

  # Viewport meta
  if echo "$HTML" | grep -qi 'viewport'; then
    VIEWPORT_PASS=$((VIEWPORT_PASS + 1))
  else
    VIEWPORT_FAIL=$((VIEWPORT_FAIL + 1))
    echo "VIEWPORT_MISSING: $page"
  fi

  # Meta description
  if echo "$HTML" | grep -qi 'meta.*description\|meta.*name="description"'; then
    META_DESC_PASS=$((META_DESC_PASS + 1))
  else
    META_DESC_FAIL=$((META_DESC_FAIL + 1))
    echo "META_DESC_MISSING: $page"
  fi

  # Mobile menu
  if echo "$HTML" | grep -qi 'mobile-menu\|MobileMenu\|hamburger\|menu-toggle\|nav-toggle'; then
    MOBILE_MENU_PASS=$((MOBILE_MENU_PASS + 1))
  else
    MOBILE_MENU_FAIL=$((MOBILE_MENU_FAIL + 1))
    echo "MOBILE_MENU_MISSING: $page"
  fi

  # Semantic HTML (header, main, footer, nav)
  HAS_HEADER=$(echo "$HTML" | grep -ci '<header')
  HAS_MAIN=$(echo "$HTML" | grep -ci '<main')
  HAS_FOOTER=$(echo "$HTML" | grep -ci '<footer')
  HAS_NAV=$(echo "$HTML" | grep -ci '<nav')
  if [ "$HAS_HEADER" -gt 0 ] && [ "$HAS_FOOTER" -gt 0 ] && [ "$HAS_NAV" -gt 0 ]; then
    SEMANTIC_PASS=$((SEMANTIC_PASS + 1))
  else
    SEMANTIC_FAIL=$((SEMANTIC_FAIL + 1))
    echo "SEMANTIC_MISSING: $page (header=$HAS_HEADER main=$HAS_MAIN footer=$HAS_FOOTER nav=$HAS_NAV)"
  fi
done

echo "VIEWPORT: $VIEWPORT_PASS pass, $VIEWPORT_FAIL fail"
echo "META_DESC: $META_DESC_PASS pass, $META_DESC_FAIL fail"
echo "MOBILE_MENU: $MOBILE_MENU_PASS pass, $MOBILE_MENU_FAIL fail"
echo "SEMANTIC: $SEMANTIC_PASS pass, $SEMANTIC_FAIL fail"

# ARIA check on home page
curl -s --max-time 10 "$BASE/" > /tmp/aria_check.html
ARIA_COUNT=$(grep -ci 'aria-' /tmp/aria_check.html)
echo "ARIA_ATTRIBUTES_ON_HOME: $ARIA_COUNT"

echo ""
echo "=============================================="
echo "  CHAT API TEST (longer timeout)"
echo "=============================================="
CHAT=$(curl -s -w "\nHTTPCODE:%{http_code}" --max-time 60 -X POST "$BASE/api/chat" -H "Content-Type: application/json" -d '{"message":"안녕하세요","history":[]}')
echo "CHAT_RESPONSE: $(echo "$CHAT" | head -c 500)"

echo ""
echo "=== ALL TESTS COMPLETE ==="
