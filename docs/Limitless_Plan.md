To design a stable and scalable server-side architecture for your business
logic, we need to address two primary areas: data integrity (preserving prices
at the time of order) and state management (the order lifecycle for pickup vs.
drop-off).

Below is a comprehensive database design plan, structured to resolve your
confusion about employee tracking statuses, followed by a few clarifying design
considerations.

Phase 1: The Unified Order Lifecycle State Machine

To clear up the confusion around the employee roles and tracking, we need to
split the order status flow based on the deliveryMethod.

Here is a recommended set of statuses:

- PENDING: Created by customer, waiting for Admin quote.
- QUOTED: Admin has sent the proposal.
- ACCEPTED: Customer accepted the proposal.
- ASSIGNED (Pickup only): Staff has been assigned by Admin.
- ON_THE_WAY (Pickup only): Staff is traveling to the location.
- ARRIVED (Pickup only): Staff has reached the customer.
- PROCESSING (Drop-off / Pickup): The items are being verified/weighed
  on-site.
- COMPLETED: Cash has been exchanged and the transaction is closed.
- CANCELLED: The order was cancelled.

Flow Diagram

[ PENDING ] ---> [ QUOTED ] ---> [ QUOTE_REJECTED ] (End)
|
v
[ QUOTE_ACCEPTED ]
|
+------------+------------+
| (PICKUP) | (DROP-OFF)
v v
[ ASSIGNED ] [ PROCESSING ]
| |
v |
[ ON_THE_WAY ] |
| |
v |
[ ARRIVED ] |
| |
v v
[ PROCESSING ] ---------> [ COMPLETED ]

Phase 2: Schema Refinement

1. User Model

No changes to your base properties, but we explicitly define enums for
consistency.

{
\_id: ObjectId,
name: { type: String, required: true },
email: { type: String, unique: true, required: true },
phoneNumber: { type: String, required: true },
role: { type: String, enum: ['CUSTOMER', 'STAFF', 'ADMIN', 'SUPERADMIN'], required: true },
status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'UNVERIFIED'], default: 'UNVERIFIED' },
isOtpVerified: { type: Boolean, default: false },
isProfileComplete: { type: Boolean, default: false },
profileImage: { type: String },
address: {
street: String,
city: String,
state: String,
zipCode: String
},
createdAt: Date,
updatedAt: Date
}

2. Metal Model

Stores the live/current pricing.

{
\_id: ObjectId,
name: { type: String, required: true },
slug: { type: String, unique: true, required: true },
perKgPrice: { type: Number, required: true },
perUnitPrice: { type: Number, required: true },
previousKgPrice: { type: Number, default: 0 },
previousUnitPrice: { type: Number, default: 0 },
createdAt: Date,
updatedAt: Date
}

3. Order Model (Polymorphic Design)

To support both "vehicle" and "metals" cleanly, we can use conditional fields.

Important Data Integrity Rule: When an order is quoted, the metal prices must be
copied into the order document. If you only reference the Metal model, future
price changes on your dashboard will retroactively alter old, completed orders.

{
\_id: ObjectId,
orderNumber: { type: String, unique: true }, // For easy reference by staff and customers
customer: { type: ObjectId, ref: 'User', required: true },
assignedTo: { type: ObjectId, ref: 'User', default: null }, // Staff Member
orderType: { type: String, enum: ['VEHICLE', 'METALS'], required: true },
deliveryMethod: { type: String, enum: ['DROP_OFF', 'PICKUP'], required: true },

// Status Tracking
status: {
type: String,
enum: [
'PENDING', 'QUOTED', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED',
'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'PROCESSING',
'COMPLETED', 'CANCELLED'
],
default: 'PENDING'
},

orderRequestAt: { type: Date, default: Date.now },
preferredDate: { type: Date, required: true },
additionalNotes: { type: String },
attachments: [{ type: String }], // URLs to images/documents

// Location details (Required if deliveryMethod === 'PICKUP')
pickupDetails: {
address: { type: String },
location: {
type: { type: String, enum: ['Point'], default: 'Point' },
coordinates: { type: [Number] } // [longitude, latitude]
}
},

// Conditional Fields: Vehicle Order
vehicleDetails: {
vinNumber: { type: String },
model: { type: String },
year: { type: Number },
weightLbs: { type: Number },
aluminumWeightLbs: { type: Number },
wheelWeightLbs: { type: Number },
batteryWeightLbs: { type: Number },
breakageWeightLbs: { type: Number }
},

// Conditional Fields: Metals Order
metalsDetails: {
approximateWeight: { type: Number },
vehicleType: { type: String }, // e.g., SUV, Sedan, Truck to calculate pickup fee
items: [{
metalId: { type: ObjectId, ref: 'Metal' },
nameAtOrder: { type: String }, // Snapshots metal name
unitType: { type: String, enum: ['KG', 'UNIT'] },
quantity: { type: Number },
priceAtQuote: { type: Number } // Snapshots metal price when quoted
}]
},

// Financial Breakdown
pricing: {
subTotal: { type: Number, default: 0 },
pickupFee: { type: Number, default: 0 },
proposedPrice: { type: Number, default: 0 }, // Initial calculations
finalPrice: { type: Number, default: 0 } // Confirmed payout
},

createdAt: Date,
updatedAt: Date
}

4. Order Status History Model (Highly Recommended)

Because tracking is critical for staff operations, a separate tracking history
collection helps build timeline views on both customer and employee dashboards.

{
\_id: ObjectId,
orderId: { type: ObjectId, ref: 'Order', required: true },
status: { type: String, required: true },
changedBy: { type: ObjectId, ref: 'User', required: true }, // Customer, Admin, or Staff
note: { type: String }, // e.g., "Driver began route", "Cash handed over"
timestamp: { type: Date, default: Date.now }
}

Phase 3: Step-by-Step Server Flow & Status Transitions

1. Order Creation (Customer)

- Action: Customer submits order.
- Backend Logic: Create Order record with status PENDING. Save location and
  details.

2. Price Proposal & Quoting (Admin)

- Action: Admin reviews order details. For vehicles, Admin calls the internal
  vehicle pricing API.
- Backend Logic:
  1.  Calculate potential pricing.
  2.  Update pricing.proposedPrice and pricing.pickupFee (if Pickup).
  3.  Update status to QUOTED.
  4.  Set metalsDetails.items[].priceAtQuote to lock in current market prices.

3. Quote Choice (Customer)

- Action: Customer accepts or rejects quote.
- Backend Logic:
  - If rejected: Set status to QUOTE_REJECTED.
  - If accepted: Set status to QUOTE_ACCEPTED.
    - If DROP_OFF: Await customer drop off.
    - If PICKUP: Set status to QUOTE_ACCEPTED and wait for Admin
      assignment.

4. Staff Assignment & Dispatch (Admin & Staff)

- Action: Admin assigns an employee (assignedTo) to a PICKUP order.
- Backend Logic:
  1.  Set order status to ASSIGNED.
  2.  Notify employee via app.
- Staff Workflow:
  - When leaving depot: Staff updates status to ON_THE_WAY (triggers
    notifications).
  - When reaching coordinates: Staff updates status to ARRIVED.

5. Verification, Cash Exchange, & Completion (Staff / Drop-off Admin)

- Action: Staff (for pickup) or Admin (for drop-off) verifies the physical
  items.
- Backend Logic:
  1.  Set status to PROCESSING.
  2.  If weight/quantity differs from original estimate, update
      pricing.finalPrice.
  3.  Hand over/receive cash.
  4.  Update status to COMPLETED. Create a record in OrderStatusHistory
      confirming cash transaction success.

Clarifying Questions for Further Optimization

To make this server design as robust as possible, you may want to consider:

1.  Cash Flow Direction: Does "receiving cash" mean your staff is paying the
    customer for their metal/vehicle (scrap buyout), or is the customer paying
    you for a disposal/haul-away service? (The schemas above support both, but
    payment logging can be refined if it goes both ways).
2.  Vehicle API: Does the internal vehicle pricing API need to store its raw API
    response payload in your database for audit purposes, or is it sufficient to
    just save the final calculated dollar amount?
