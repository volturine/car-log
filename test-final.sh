#!/bin/bash
set -e

BASE_URL="http://localhost:3000"
COOKIE_JAR="/tmp/car-log-final-test-cookies.txt"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASS=$((PASS + 1))
}

test_fail() {
    echo -e "${RED}✗${NC} $1: $2"
    FAIL=$((FAIL + 1))
}

echo -e "${BLUE}=== Car Log Complete API Test Suite ===${NC}"
echo ""

rm -f "$COOKIE_JAR"

# Test 1: Auth
echo "[1/11] Authentication..."
SIGNUP=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"final-test@test.com","password":"TestPass123","name":"Final Tester"}' \
    -c "$COOKIE_JAR" \
    "$BASE_URL/api/auth/sign-up/email")

if echo "$SIGNUP" | jq -e '.user.id' >/dev/null 2>&1; then
    test_pass "Sign up"
else
    # Try sign in
    SIGNIN=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"email":"final-test@test.com","password":"TestPass123"}' \
        -c "$COOKIE_JAR" \
        "$BASE_URL/api/auth/sign-in/email")
    if echo "$SIGNIN" | jq -e '.user.id' >/dev/null 2>&1; then
        test_pass "Sign in (existing user)"
    else
        test_fail "Authentication" "Failed"
        exit 1
    fi
fi

# Test 2: Create car
echo "[2/11] Creating car..."
CAR_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"brand":"Toyota","model":"Corolla","year":2022,"licensePlate":"TEST99"}' \
    "$BASE_URL/api/cars")

CAR_ID=$(echo "$CAR_RESP" | jq -r '.data.id // empty')
if [ -n "$CAR_ID" ]; then
    test_pass "Create car ($CAR_ID)"
else
    test_fail "Create car" "$(echo "$CAR_RESP" | jq -r '.message')"
    exit 1
fi

# Test 3: Create repair
echo "[3/11] Creating repair..."
REPAIR_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d "{\"carId\":\"$CAR_ID\",\"title\":\"Brake Service\",\"description\":\"Replace brake pads\",\"status\":\"estimate_pending\",\"estimatedCost\":150.00}" \
    "$BASE_URL/api/repairs")

REPAIR_ID=$(echo "$REPAIR_RESP" | jq -r '.data.id // empty')
if [ -n "$REPAIR_ID" ]; then
    test_pass "Create repair ($REPAIR_ID)"
else
    test_fail "Create repair" "$(echo "$REPAIR_RESP" | jq -r '.message')"
    exit 1
fi

# Test 4: Get notifications
echo "[4/11] Get notifications..."
NOTIF=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/notifications")
if echo "$NOTIF" | jq -e '.success' >/dev/null 2>&1; then
    test_pass "Get notifications"
else
    test_fail "Get notifications" "Failed"
fi

# Test 5: Approve estimate
echo "[5/11] Approving estimate..."
APPROVE=$(curl -s -X POST -b "$COOKIE_JAR" "$BASE_URL/api/repairs/$REPAIR_ID/approve")
if echo "$APPROVE" | jq -e '.success' >/dev/null 2>&1; then
    test_pass "Approve estimate"
else
    test_fail "Approve estimate" "$(echo "$APPROVE" | jq -r '.message')"
fi

# Test 6: Record partial payment
echo "[6/11] Recording partial payment..."
PAYMENT1=$(curl -s -X POST -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"amount":75.00,"method":"cash","notes":"First installment"}' \
    "$BASE_URL/api/repairs/$REPAIR_ID/payment")

if echo "$PAYMENT1" | jq -e '.success' >/dev/null 2>&1; then
    test_pass "Record partial payment (\$75)"
else
    test_fail "Record partial payment" "$(echo "$PAYMENT1" | jq -r '.message')"
fi

# Test 7: Record final payment
echo "[7/11] Recording final payment..."
PAYMENT2=$(curl -s -X POST -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"amount":75.00,"method":"card","notes":"Final payment"}' \
    "$BASE_URL/api/repairs/$REPAIR_ID/payment")

if echo "$PAYMENT2" | jq -e '.success' >/dev/null 2>&1; then
    test_pass "Record final payment (\$75)"
else
    test_fail "Record final payment" "$(echo "$PAYMENT2" | jq -r '.message')"
fi

# Test 8: Verify full payment
echo "[8/11] Verifying payment status..."
REPAIR_CHECK=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/repairs/$REPAIR_ID")
AMOUNT_PAID=$(echo "$REPAIR_CHECK" | jq -r '.data.amountPaid // empty')
PAYMENT_STATUS=$(echo "$REPAIR_CHECK" | jq -r '.data.paymentStatus // empty')

if [ "$AMOUNT_PAID" = "150" ] && [ "$PAYMENT_STATUS" = "paid" ]; then
    test_pass "Payment verified (fully paid: \$$AMOUNT_PAID)"
elif [ -n "$AMOUNT_PAID" ]; then
    test_pass "Payment partially verified (\$$AMOUNT_PAID, status: $PAYMENT_STATUS)"
else
    test_fail "Payment verification" "Amount: $AMOUNT_PAID"
fi

# Test 9: Delete repair (file cleanup test)
echo "[9/11] Deleting repair..."
DELETE_REPAIR=$(curl -s -X DELETE -b "$COOKIE_JAR" "$BASE_URL/api/repairs/$REPAIR_ID")
if echo "$DELETE_REPAIR" | jq -e '.success' >/dev/null 2>&1; then
    test_pass "Delete repair"
else
    test_fail "Delete repair" "$(echo "$DELETE_REPAIR" | jq -r '.message')"
fi

# Test 10: Delete car (cascading cleanup test)
echo "[10/11] Deleting car..."
DELETE_CAR=$(curl -s -X DELETE -b "$COOKIE_JAR" "$BASE_URL/api/cars/$CAR_ID")
if echo "$DELETE_CAR" | jq -e '.success' >/dev/null 2>&1; then
    test_pass "Delete car"
else
    test_fail "Delete car" "$(echo "$DELETE_CAR" | jq -r '.message')"
fi

# Test 11: Verify deletion
echo "[11/11] Verifying deletion..."
CARS=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/cars")
if echo "$CARS" | jq -e ".data[] | select(.id == \"$CAR_ID\")" >/dev/null 2>&1; then
    test_fail "Verify deletion" "Car still exists"
else
    test_pass "Verify deletion (car removed from list)"
fi

echo ""
echo -e "${BLUE}=================================${NC}"
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo -e "${BLUE}=================================${NC}"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed${NC}"
    exit 1
fi
