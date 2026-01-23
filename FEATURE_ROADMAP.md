# Must-Have Features Analysis for Car Repair Shop App

## 🎯 Current State Assessment

**What We Have:**
- ✅ User authentication
- ✅ Car management (CRUD)
- ✅ Repair tracking with parts and photos
- ✅ Cost calculations
- ✅ Analytics by brand/model
- ✅ Calendar view

**Critical Gap:** No distinction between repair shops and car owners - everyone is just a "user"

---

## 🚀 Must-Have Features (Priority Order)

### **TIER 1: CRITICAL (Implement First)**

#### 1. **Multi-Role System** ⭐⭐⭐⭐⭐
**Problem:** Currently, users create their own repairs. In reality, repair shops create repairs for customer cars.

**Solution:**
```typescript
// Add user roles
enum UserRole {
  CUSTOMER = 'customer',      // Car owners
  SHOP_OWNER = 'shop_owner',  // Repair shop owners
  MECHANIC = 'mechanic',      // Shop employees
  ADMIN = 'admin'             // System admin
}

// Database schema additions:
- users.role (customer | shop_owner | mechanic | admin)
- users.shopId (nullable, links mechanics to shops)
```

**User Stories:**
- As a **customer**, I want to add my cars and view repairs done by shops
- As a **shop owner**, I want to create repairs for customer cars
- As a **mechanic**, I want to update repair status and add parts/photos

---

#### 2. **Repair Shop Profiles** ⭐⭐⭐⭐⭐
**Problem:** No concept of a "shop" entity

**Solution:**
```typescript
interface RepairShop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  businessHours: string;
  specialties: string[];      // "Brakes", "Engine", "Electrical"
  logo?: string;
  rating: number;             // Average rating
  totalReviews: number;
  ownerId: string;            // User who owns the shop
  createdAt: Date;
}

// Shop team members
interface ShopMember {
  userId: string;
  shopId: string;
  role: 'owner' | 'mechanic';
  joinedAt: Date;
}
```

**Features:**
- Shop registration workflow
- Shop profile page (visible to customers)
- Team management (add/remove mechanics)
- Business hours and contact info

---

#### 3. **Customer-Shop Relationship** ⭐⭐⭐⭐⭐
**Problem:** No way to link customers to shops or track which shop is working on which car

**Solution:**
```typescript
// Add to repairs table
interface Repair {
  // ... existing fields
  shopId: string;             // Shop performing the repair
  assignedMechanicId?: string; // Specific mechanic
  customerNotified: boolean;   // Has customer been notified
  customerApproved: boolean;   // Has customer approved estimate
}

// Customer-shop relationship
interface CustomerShop {
  customerId: string;
  shopId: string;
  firstVisit: Date;
  totalVisits: number;
  totalSpent: number;
}
```

**Workflows:**
1. **Shop creates repair for customer car:**
   - Shop selects customer
   - Shop selects customer's car
   - Creates repair with estimate
   - Customer gets notification

2. **Customer views repairs:**
   - Sees repairs from all shops they've visited
   - Can filter by shop
   - Can see repair status

---

#### 4. **Estimates & Approval Workflow** ⭐⭐⭐⭐⭐
**Problem:** No way to provide estimates before starting work (legal requirement in many places)

**Solution:**
```typescript
enum RepairStatus {
  ESTIMATE_PENDING = 'estimate_pending',     // Shop created, waiting for approval
  ESTIMATE_APPROVED = 'estimate_approved',   // Customer approved
  ESTIMATE_REJECTED = 'estimate_rejected',   // Customer declined
  IN_PROGRESS = 'in_progress',               // Work started
  COMPLETED = 'completed',                    // Work done
  PAID = 'paid',                             // Payment received
  PICKED_UP = 'picked_up'                    // Customer picked up car
}

interface Repair {
  // ... existing fields
  estimatedCost: number;      // Initial estimate
  estimatedHours: number;     // Estimated time
  actualCost: number;         // Final cost (may differ)
  actualHours: number;        // Actual time spent
  estimateNotes: string;      // Why this price
  approvedAt?: Date;
  approvedBy?: string;        // Customer user ID
}
```

**Customer Workflow:**
1. Shop creates estimate
2. Customer receives notification
3. Customer reviews estimate
4. Customer approves or requests changes
5. Shop begins work after approval

---

#### 5. **Notifications System** ⭐⭐⭐⭐
**Problem:** No way to notify customers of status changes

**Solution:**
```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'repair_estimate' | 'repair_status' | 'repair_complete' | 'payment_due';
  title: string;
  message: string;
  repairId?: string;
  shopId?: string;
  read: boolean;
  createdAt: Date;
}

// Notification triggers:
- Repair estimate created → notify customer
- Repair status changed → notify customer
- Repair completed → notify customer
- Additional work needed → notify customer
- Payment reminder → notify customer
```

**Implementation:**
- In-app notifications (bell icon)
- Email notifications (optional, requires email service)
- SMS notifications (optional, requires Twilio/similar)

---

### **TIER 2: IMPORTANT (Implement Next)**

#### 6. **Payment Tracking** ⭐⭐⭐⭐
```typescript
interface Payment {
  id: string;
  repairId: string;
  amount: number;
  method: 'cash' | 'card' | 'check' | 'insurance';
  status: 'pending' | 'paid' | 'refunded';
  paidAt?: Date;
  notes?: string;
}

// Add to Repair
interface Repair {
  // ... existing
  totalCost: number;
  amountPaid: number;
  amountDue: number;  // Calculated: totalCost - amountPaid
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}
```

---

#### 7. **Communication/Messaging** ⭐⭐⭐⭐
```typescript
interface Message {
  id: string;
  repairId: string;
  senderId: string;
  recipientId: string;
  message: string;
  attachments?: string[];  // Photo URLs
  read: boolean;
  createdAt: Date;
}
```

**Features:**
- Chat between customer and shop about specific repair
- Attach photos/documents
- Read receipts
- Notification when new message

---

#### 8. **Appointment Scheduling** ⭐⭐⭐⭐
```typescript
interface Appointment {
  id: string;
  customerId: string;
  shopId: string;
  carId: string;
  scheduledDate: Date;
  duration: number;  // minutes
  serviceType: string;  // "Oil Change", "Inspection"
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}
```

**Features:**
- Calendar view for shops to manage appointments
- Customers can request appointments
- Shops confirm/reject appointments
- Reminders 24 hours before

---

#### 9. **Service History** ⭐⭐⭐⭐
**What:** Complete repair history for a car across ALL shops

**Current:** Cars only show repairs from one user
**Needed:** Global service history tied to VIN

```typescript
// When a customer adds a car that already exists (by VIN),
// link to existing service history
interface Car {
  // ... existing
  vin: string;  // Make required, unique
  serviceHistoryId?: string;  // Links to global history
}
```

---

#### 10. **Reviews & Ratings** ⭐⭐⭐
```typescript
interface Review {
  id: string;
  shopId: string;
  customerId: string;
  repairId: string;
  rating: number;  // 1-5
  comment: string;
  response?: string;  // Shop response
  createdAt: Date;
}
```

---

### **TIER 3: NICE TO HAVE (Future)**

#### 11. **Invoicing & Receipts**
- Generate PDF invoices
- Email invoices to customers
- Receipt printing

#### 12. **Inventory Management** (for shops)
- Track parts inventory
- Reorder alerts
- Supplier management

#### 13. **Multi-location Support**
- Chain shops with multiple locations
- Location-specific inventory and staff

#### 14. **Analytics Dashboard** (enhanced)
- For shops: Revenue trends, popular services, customer retention
- For customers: Maintenance costs over time, service reminders

#### 15. **Integration with Parts Suppliers**
- Order parts directly from app
- Real-time pricing
- Delivery tracking

#### 16. **Service Reminders**
- Based on mileage or time
- "Oil change due in 500 miles"
- Automatic reminders to customers

#### 17. **Insurance Integration**
- Submit claims
- Track insurance payments
- Collision repair workflow

---

## 📊 Database Schema Changes Required

### New Tables:
```sql
-- Shops
CREATE TABLE shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  business_hours JSON,
  specialties JSON,
  rating REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop members (team)
CREATE TABLE shop_members (
  user_id TEXT REFERENCES users(id),
  shop_id TEXT REFERENCES shops(id),
  role TEXT NOT NULL,  -- 'owner' | 'mechanic'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, shop_id)
);

-- Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  repair_id TEXT REFERENCES repairs(id),
  shop_id TEXT REFERENCES shops(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL REFERENCES repairs(id),
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  repair_id TEXT NOT NULL REFERENCES repairs(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id),
  shop_id TEXT NOT NULL REFERENCES shops(id),
  car_id TEXT NOT NULL REFERENCES cars(id),
  scheduled_date TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  service_type TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id),
  customer_id TEXT NOT NULL REFERENCES users(id),
  repair_id TEXT NOT NULL REFERENCES repairs(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  shop_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modified Tables:
```sql
-- Add to users
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';
ALTER TABLE users ADD COLUMN shop_id TEXT REFERENCES shops(id);

-- Add to repairs
ALTER TABLE repairs ADD COLUMN shop_id TEXT REFERENCES shops(id);
ALTER TABLE repairs ADD COLUMN assigned_mechanic_id TEXT REFERENCES users(id);
ALTER TABLE repairs ADD COLUMN estimated_cost REAL;
ALTER TABLE repairs ADD COLUMN estimated_hours REAL;
ALTER TABLE repairs ADD COLUMN actual_cost REAL;
ALTER TABLE repairs ADD COLUMN actual_hours REAL;
ALTER TABLE repairs ADD COLUMN estimate_notes TEXT;
ALTER TABLE repairs ADD COLUMN customer_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE repairs ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE repairs ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE repairs ADD COLUMN amount_paid REAL DEFAULT 0;
```

---

## 🎨 UI Changes Required

### New Pages/Components:

1. **Shop Dashboard** (for shop owners/mechanics)
   - Pending estimates
   - Active repairs
   - Today's appointments
   - Recent reviews

2. **Customer Dashboard** (for car owners)
   - My cars
   - Active repairs (across all shops)
   - Past repairs
   - Upcoming appointments
   - Notifications

3. **Shop Registration** page
4. **Estimate Approval** modal (for customers)
5. **Messaging** interface
6. **Appointment Booking** interface
7. **Reviews** page
8. **Shop Profile** page (public view)

### Modified Components:

- **Repair Form:** Add estimate fields, shop selection
- **Repair Card:** Show shop info, approval status
- **Cars List:** Show service history from all shops
- **Sidebar:** Different navigation for shops vs customers

---

## 🔄 Implementation Priority

### Phase 1: Core Multi-Role (2-3 weeks)
1. Add user roles
2. Create shops table and basic CRUD
3. Modify repairs to include shopId
4. Update UI to show different views based on role
5. Shop creates repair for customer workflow

### Phase 2: Estimates & Approval (1 week)
6. Add estimate fields to repairs
7. Approval workflow UI
8. Status transitions

### Phase 3: Notifications (1 week)
9. Notifications table and API
10. In-app notification center
11. Email notifications (optional)

### Phase 4: Communication (1 week)
12. Messages table and API
13. Chat interface
14. Real-time updates (WebSockets or polling)

### Phase 5: Scheduling (1 week)
15. Appointments table and API
16. Calendar interface for shops
17. Booking interface for customers

### Phase 6: Enhancements (ongoing)
18. Payment tracking
19. Reviews & ratings
20. Analytics improvements
21. Service history enhancements

---

## 🔍 Example User Flows

### **Flow 1: Customer visits shop**
1. Customer drives car to shop
2. Shop employee finds customer in system (or creates account)
3. Shop creates new repair with estimate
4. Customer receives notification
5. Customer reviews estimate in app
6. Customer approves estimate
7. Shop begins work
8. Shop updates status as work progresses
9. Customer gets notified when complete
10. Customer picks up car and pays
11. Customer leaves review

### **Flow 2: Customer books appointment**
1. Customer searches for shops nearby
2. Customer views shop profile and reviews
3. Customer requests appointment
4. Shop confirms appointment
5. Customer receives reminder 24h before
6. Customer brings car to shop
7. (Continue with Flow 1 from step 3)

---

## 💡 Recommendations

**Start with Phase 1** - Multi-role system is the foundation for everything else.

**Quick Win:** Implement roles + basic shop profiles + shop creates repairs for customers. This alone makes the app 10x more useful.

**Don't implement:** Inventory management, insurance integration, multi-location (too complex for MVP)

**Consider:** Using a real-time solution like Supabase realtime or Socket.io for notifications and messages

---

## 📝 Current vs Future Architecture

**Current:**
```
User → Creates own cars → Creates own repairs
```

**Future:**
```
Customer → Owns cars → Views repairs from shops
                     → Books appointments with shops
                     → Approves estimates
                     → Pays for repairs
                     → Leaves reviews

Shop → Has team members → Creates repairs for customers
                       → Manages appointments
                       → Updates repair status
                       → Communicates with customers
```

This transforms the app from a **personal repair log** into a **full car service management platform**.
