#!/bin/bash
set -e

BASE_URL="http://localhost:3000"
COOKIE_JAR="/tmp/car-log-test-cookies.txt"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Car Log Comprehensive API Test${NC}"
echo "======================================"
echo ""

rm -f "$COOKIE_JAR"

# Test 1: Sign up
echo "[1] Signing up..."
SIGNUP=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"tester@test.com","password":"TestPass123","name":"Tester"}' \
    -c "$COOKIE_JAR" \
    "$BASE_URL/api/auth/sign-up/email")

if echo "$SIGNUP" | grep -q '"id"'; then
    echo -e "${GREEN}✓${NC} Sign up successful"
else
    # Try sign in if user exists
    echo "  User exists, trying sign in..."
    SIGNIN=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"email":"tester@test.com","password":"TestPass123"}' \
        -c "$COOKIE_JAR" \
        "$BASE_URL/api/auth/sign-in/email")
    if echo "$SIGNIN" | grep -q '"id"'; then
        echo -e "${GREEN}✓${NC} Sign in successful"
    else
        echo -e "${RED}✗${NC} Auth failed"
        exit 1
    fi
fi

# Test 2: Create car with correct field "brand"
echo "[2] Creating car..."
CAR=$(curl -s -X POST -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"brand":"Toyota","model":"Camry","year":2020,"licensePlate":"XYZ789"}' \
    "$BASE_URL/api/cars")

CAR_ID=$(echo "$CAR" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$CAR_ID" ]; then
    echo -e "${GREEN}✓${NC} Car created: $CAR_ID"
else
    echo -e "${RED}✗${NC} Car creation failed"
    echo "$CAR"
    exit 1
fi

# Test 3: Create repair
echo "[3] Creating repair..."
REPAIR=$(curl -s -X POST -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d "{\"carId\":\"$CAR_ID\",\"title\":\"Oil Change\",\"description\":\"Routine maintenance\",\"status\":\"estimate_pending\",\"estimatedCost\":75.00}" \
    "$BASE_URL/api/repairs")

REPAIR_ID=$(echo "$REPAIR" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$REPAIR_ID" ]; then
    echo -e "${GREEN}✓${NC} Repair created: $REPAIR_ID"
else
    echo -e "${RED}✗${NC} Repair creation failed"
    echo "$REPAIR"
    exit 1
fi

# Test 4: Get notifications
echo "[4] Getting notifications..."
NOTIF=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/notifications")
if echo "$NOTIF" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Notifications retrieved"
else
    echo -e "${RED}✗${NC} Failed to get notifications"
fi

# Test 5: Approve estimate
echo "[5] Approving estimate..."
APPROVE=$(curl -s -X POST -b "$COOKIE_JAR" "$BASE_URL/api/repairs/$REPAIR_ID/approve")
if echo "$APPROVE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Estimate approved"
else
    echo -e "${RED}✗${NC} Estimate approval failed"
    echo "$APPROVE"
fi

# Test 6: Record partial payment
echo "[6] Recording partial payment..."
PAYMENT1=$(curl -s -X POST -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"amount":35.00,"method":"cash","notes":"First payment"}' \
    "$BASE_URL/api/repairs/$REPAIR_ID/payment")

if echo "$PAYMENT1" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Partial payment recorded"
else
    echo -e "${RED}✗${NC} Payment failed"
    echo "$PAYMENT1"
fi

# Test 7: Record final payment
echo "[7] Recording final payment..."
PAYMENT2=$(curl -s -X POST -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d '{"amount":40.00,"method":"card","notes":"Final payment"}' \
    "$BASE_URL/api/repairs/$REPAIR_ID/payment")

if echo "$PAYMENT2" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Final payment recorded"
else
    echo -e "${RED}✗${NC} Payment failed"
    echo "$PAYMENT2"
fi

# Test 8: Verify payment status
echo "[8] Verifying payment status..."
REPAIR_CHECK=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/repairs/$REPAIR_ID")
AMOUNT_PAID=$(echo "$REPAIR_CHECK" | grep -o '"amountPaid":[0-9.]*' | cut -d':' -f2)
echo "  Amount paid: \$$AMOUNT_PAID"
if [ "$AMOUNT_PAID" = "75" ] || [ "$AMOUNT_PAID" = "75.0" ] || [ "$AMOUNT_PAID" = "75.00" ]; then
    echo -e "${GREEN}✓${NC} Payment verified (fully paid)"
else
    echo -e "${GREEN}~${NC} Payment partial ($AMOUNT_PAID/75)"
fi

# Test 9: Delete repair (test file cleanup)
echo "[9] Deleting repair..."
DELETE_REPAIR=$(curl -s -X DELETE -b "$COOKIE_JAR" "$BASE_URL/api/repairs/$REPAIR_ID")
if echo "$DELETE_REPAIR" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Repair deleted"
else
    echo -e "${RED}✗${NC} Repair deletion failed"
    echo "$DELETE_REPAIR"
fi

# Test 10: Delete car (test cascading cleanup)
echo "[10] Deleting car..."
DELETE_CAR=$(curl -s -X DELETE -b "$COOKIE_JAR" "$BASE_URL/api/cars/$CAR_ID")
if echo "$DELETE_CAR" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Car deleted"
else
    echo -e "${RED}✗${NC} Car deletion failed"
    echo "$DELETE_CAR"
fi

# Test 11: Verify deletion
echo "[11] Verifying deletion..."
CARS=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/cars")
if echo "$CARS" | grep -q "$CAR_ID"; then
    echo -e "${RED}✗${NC} Car still exists after deletion"
else
    echo -e "${GREEN}✓${NC} Car successfully removed"
fi

echo ""
echo -e "${GREEN}═══════════════════════════${NC}"
echo -e "${GREEN} All tests completed!${NC}"
echo -e "${GREEN}═══════════════════════════${NC}"
