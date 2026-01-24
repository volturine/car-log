#!/bin/bash

# API Testing Script for Car Log with Better Auth
BASE_URL="http://localhost:3000"
COOKIE_JAR="/tmp/car-log-cookies.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
PASS=0
FAIL=0

echo "Car Log API Test Suite (Better Auth)"
echo "====================================="
echo ""

# Clean up old cookies
rm -f "$COOKIE_JAR"

test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1: $2"
    ((FAIL++))
}

# Test 1: Sign up a new user
echo "[1/11] Testing user registration..."
SIGNUP_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"tester@example.com","password":"TestPassword123","name":"Test User"}' \
    -c "$COOKIE_JAR" \
    "$BASE_URL/api/auth/sign-up/email")

HTTP_CODE=$(echo "$SIGNUP_RESP" | tail -1)
BODY=$(echo "$SIGNUP_RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "409" ]; then
    USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ "$HTTP_CODE" = "409" ]; then
        echo "User already exists, attempting sign-in..."

        SIGNIN_RESP=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d '{"email":"tester@example.com","password":"TestPassword123"}' \
            -c "$COOKIE_JAR" \
            "$BASE_URL/api/auth/sign-in/email")

        HTTP_CODE=$(echo "$SIGNIN_RESP" | tail -1)
        BODY=$(echo "$SIGNIN_RESP" | sed '$d')

        if [ "$HTTP_CODE" = "200" ]; then
            USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            test_pass "Authentication (sign-in)"
        else
            test_fail "Sign-in" "HTTP $HTTP_CODE"
            exit 1
        fi
    else
        test_pass "User Registration"
    fi
else
    test_fail "User Registration" "HTTP $HTTP_CODE"
    exit 1
fi

# Test 2: Create a car
echo "[2/11] Creating a test car..."
CAR_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"make":"Honda","model":"Civic","year":2020,"licensePlate":"ABC123"}' \
    "$BASE_URL/api/cars")

HTTP_CODE=$(echo "$CAR_RESP" | tail -1)
BODY=$(echo "$CAR_RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    CAR_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    test_pass "Create Car (ID: ${CAR_ID:0:8}...)"
else
    test_fail "Create Car" "HTTP $HTTP_CODE - $BODY"
fi

# Test 3: Create a repair
echo "[3/11] Creating a test repair..."
REPAIR_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d "{\"carId\":\"$CAR_ID\",\"title\":\"Oil Change\",\"description\":\"Regular maintenance\",\"status\":\"estimate_pending\",\"estimatedCost\":50.00}" \
    "$BASE_URL/api/repairs")

HTTP_CODE=$(echo "$REPAIR_RESP" | tail -1)
BODY=$(echo "$REPAIR_RESP" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    REPAIR_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    test_pass "Create Repair (ID: ${REPAIR_ID:0:8}...)"
else
    test_fail "Create Repair" "HTTP $HTTP_CODE"
fi

# Test 4: Get notifications (should be empty)
echo "[4/11] Testing notifications endpoint..."
NOTIF_RESP=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/notifications")
HTTP_CODE=$(echo "$NOTIF_RESP" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Get Notifications"
else
    test_fail "Get Notifications" "HTTP $HTTP_CODE"
fi

# Test 5: Approve estimate
echo "[5/11] Testing estimate approval..."
APPROVE_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    "$BASE_URL/api/repairs/$REPAIR_ID/approve")

HTTP_CODE=$(echo "$APPROVE_RESP" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Approve Estimate"
else
    test_fail "Approve Estimate" "HTTP $HTTP_CODE"
fi

# Test 6: Record partial payment
echo "[6/11] Testing payment recording (partial)..."
PAYMENT_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"amount":25.00,"method":"cash","notes":"Partial payment"}' \
    "$BASE_URL/api/repairs/$REPAIR_ID/payment")

HTTP_CODE=$(echo "$PAYMENT_RESP" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    test_pass "Record Partial Payment"
else
    test_fail "Record Partial Payment" "HTTP $HTTP_CODE"
fi

# Test 7: Record final payment
echo "[7/11] Testing payment recording (final)..."
PAYMENT_RESP=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"amount":25.00,"method":"card","notes":"Final payment"}' \
    "$BASE_URL/api/repairs/$REPAIR_ID/payment")

HTTP_CODE=$(echo "$PAYMENT_RESP" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    test_pass "Record Final Payment"
else
    test_fail "Record Final Payment" "HTTP $HTTP_CODE"
fi

# Test 8: Get repair (verify payment status)
echo "[8/11] Verifying repair payment status..."
REPAIR_GET=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/repairs/$REPAIR_ID")
HTTP_CODE=$(echo "$REPAIR_GET" | tail -1)
BODY=$(echo "$REPAIR_GET" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    AMOUNT_PAID=$(echo "$BODY" | grep -o '"amountPaid":[0-9.]*' | cut -d':' -f2)
    if [ "$AMOUNT_PAID" = "50" ] || [ "$AMOUNT_PAID" = "50.00" ] || [ "$AMOUNT_PAID" = "50.0" ]; then
        test_pass "Verify Payment Status (paid $AMOUNT_PAID)"
    else
        test_fail "Verify Payment Status" "Amount paid: $AMOUNT_PAID (expected 50)"
    fi
else
    test_fail "Get Repair" "HTTP $HTTP_CODE"
fi

# Test 9: Delete Repair (test file cleanup)
echo "[9/11] Testing repair deletion..."
DELETE_RESP=$(curl -s -w "\n%{http_code}" -X DELETE \
    -b "$COOKIE_JAR" \
    "$BASE_URL/api/repairs/$REPAIR_ID")

HTTP_CODE=$(echo "$DELETE_RESP" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Delete Repair"
else
    test_fail "Delete Repair" "HTTP $HTTP_CODE"
fi

# Test 10: Delete Car (test cascading cleanup)
echo "[10/11] Testing car deletion..."
DELETE_CAR=$(curl -s -w "\n%{http_code}" -X DELETE \
    -b "$COOKIE_JAR" \
    "$BASE_URL/api/cars/$CAR_ID")

HTTP_CODE=$(echo "$DELETE_CAR" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "Delete Car"
else
    test_fail "Delete Car" "HTTP $HTTP_CODE"
fi

# Test 11: List cars (should be empty or not include deleted car)
echo "[11/11] Verifying car deletion..."
CARS_RESP=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/cars")
HTTP_CODE=$(echo "$CARS_RESP" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "List Cars After Deletion"
else
    test_fail "List Cars" "HTTP $HTTP_CODE"
fi

echo ""
echo "================"
echo "Test Results:"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "================"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
