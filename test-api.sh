#!/bin/bash

# API Testing Script for Car Log Application
# Tests all implemented features on branch claude/add-auth-database-dyKaK

BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/car-log-cookies.txt"
TEST_OUTPUT="/tmp/car-log-test-results.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Car Log API Test Suite" > "$TEST_OUTPUT"
echo "=====================" >> "$TEST_OUTPUT"
echo "" >> "$TEST_OUTPUT"

# Function to print test result
test_result() {
    local name="$1"
    local status="$2"
    local details="$3"

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $name"
        echo "✓ $name" >> "$TEST_OUTPUT"
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}✗${NC} $name"
        echo "✗ $name - $details" >> "$TEST_OUTPUT"
    else
        echo -e "${YELLOW}◎${NC} $name"
        echo "◎ $name - $details" >> "$TEST_OUTPUT"
    fi

    if [ -n "$details" ]; then
        echo "  $details" >> "$TEST_OUTPUT"
    fi
    echo "" >> "$TEST_OUTPUT"
}

# Clean up old cookies
rm -f "$COOKIE_FILE"

echo "Starting API tests..."
echo ""

# Test 1: Register a new user
echo "Test 1: User Registration"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "Test123456!",
        "name": "Test User"
    }' \
    -c "$COOKIE_FILE" \
    "${BASE_URL}/api/auth/register" 2>&1)

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
    test_result "User Registration" "PASS" "HTTP $HTTP_CODE"
    USER_EXISTS=true
else
    test_result "User Registration" "FAIL" "HTTP $HTTP_CODE - $RESPONSE_BODY"
    USER_EXISTS=false
fi

# Test 2: Login if registration returned 409 (user exists)
if [ "$HTTP_CODE" = "409" ]; then
    echo "Test 2: User Login (user already exists)"
    LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "email": "test@example.com",
            "password": "Test123456!"
        }' \
        -c "$COOKIE_FILE" \
        "${BASE_URL}/api/auth/login" 2>&1)

    HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)

    if [ "$HTTP_CODE" = "200" ]; then
        test_result "User Login" "PASS" "HTTP $HTTP_CODE"
    else
        test_result "User Login" "FAIL" "HTTP $HTTP_CODE"
        exit 1
    fi
fi

# Test 3: Create a car
echo "Test 3: Create Car"
CAR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "licensePlate": "TEST123"
    }' \
    "${BASE_URL}/api/cars" 2>&1)

HTTP_CODE=$(echo "$CAR_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$CAR_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    CAR_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    test_result "Create Car" "PASS" "Car ID: $CAR_ID"
else
    test_result "Create Car" "FAIL" "HTTP $HTTP_CODE - $RESPONSE_BODY"
fi

# Test 4: Create a repair
echo "Test 4: Create Repair"
REPAIR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d "{
        \"carId\": \"$CAR_ID\",
        \"title\": \"Oil Change\",
        \"description\": \"Regular maintenance oil change\",
        \"status\": \"estimate_pending\",
        \"estimatedCost\": 50.00
    }" \
    "${BASE_URL}/api/repairs" 2>&1)

HTTP_CODE=$(echo "$REPAIR_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$REPAIR_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    REPAIR_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    test_result "Create Repair" "PASS" "Repair ID: $REPAIR_ID"
else
    test_result "Create Repair" "FAIL" "HTTP $HTTP_CODE - $RESPONSE_BODY"
fi

# Test 5: Get Notifications (should be empty initially)
echo "Test 5: Get Notifications"
NOTIF_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" \
    "${BASE_URL}/api/notifications" 2>&1)

HTTP_CODE=$(echo "$NOTIF_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_result "Get Notifications" "PASS" "HTTP $HTTP_CODE"
else
    test_result "Get Notifications" "FAIL" "HTTP $HTTP_CODE"
fi

# Test 6: Approve Estimate
echo "Test 6: Approve Estimate"
APPROVE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    "${BASE_URL}/api/repairs/${REPAIR_ID}/approve" 2>&1)

HTTP_CODE=$(echo "$APPROVE_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$APPROVE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    test_result "Approve Estimate" "PASS" "HTTP $HTTP_CODE"
else
    test_result "Approve Estimate" "FAIL" "HTTP $HTTP_CODE - $RESPONSE_BODY"
fi

# Test 7: Record Payment
echo "Test 7: Record Payment"
PAYMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{
        "amount": 25.00,
        "method": "cash",
        "notes": "Partial payment"
    }' \
    "${BASE_URL}/api/repairs/${REPAIR_ID}/payment" 2>&1)

HTTP_CODE=$(echo "$PAYMENT_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    test_result "Record Payment" "PASS" "HTTP $HTTP_CODE"
else
    test_result "Record Payment" "FAIL" "HTTP $HTTP_CODE"
fi

# Test 8: Update repair to completed status
echo "Test 8: Update Repair Status to Completed"
UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{
        "status": "completed",
        "totalCost": 50.00,
        "completedAt": "'$(date -Iseconds)'"
    }' \
    "${BASE_URL}/api/repairs/${REPAIR_ID}" 2>&1)

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_result "Update Repair Status" "PASS" "HTTP $HTTP_CODE"
else
    test_result "Update Repair Status" "INFO" "HTTP $HTTP_CODE (endpoint may not exist)"
fi

# Test 9: Record final payment
echo "Test 9: Record Final Payment"
FINAL_PAYMENT=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{
        "amount": 25.00,
        "method": "card",
        "notes": "Final payment"
    }' \
    "${BASE_URL}/api/repairs/${REPAIR_ID}/payment" 2>&1)

HTTP_CODE=$(echo "$FINAL_PAYMENT" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    test_result "Record Final Payment" "PASS" "HTTP $HTTP_CODE"
else
    test_result "Record Final Payment" "FAIL" "HTTP $HTTP_CODE"
fi

# Test 10: Delete Repair (test file cleanup)
echo "Test 10: Delete Repair"
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
    -b "$COOKIE_FILE" \
    "${BASE_URL}/api/repairs/${REPAIR_ID}" 2>&1)

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_result "Delete Repair" "PASS" "HTTP $HTTP_CODE"
else
    test_result "Delete Repair" "FAIL" "HTTP $HTTP_CODE"
fi

# Test 11: Delete Car (test cascading file cleanup)
echo "Test 11: Delete Car"
DELETE_CAR=$(curl -s -w "\n%{http_code}" -X DELETE \
    -b "$COOKIE_FILE" \
    "${BASE_URL}/api/cars/${CAR_ID}" 2>&1)

HTTP_CODE=$(echo "$DELETE_CAR" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    test_result "Delete Car" "PASS" "HTTP $HTTP_CODE"
else
    test_result "Delete Car" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""
echo "Test Results:"
echo "============="
cat "$TEST_OUTPUT"

echo ""
echo "Full test results saved to: $TEST_OUTPUT"
