/**
 * End-to-end API test: register -> booking -> provider -> agent -> payments -> review -> admin.
 *
 *   1. Backend chalao (dev mode, Razorpay keys ke bina = test gateway), webhook secret ke saath:
 *        RAZORPAY_WEBHOOK_SECRET=e2e_webhook_secret npm run dev
 *   2. Doosre terminal mein:  npm run test:e2e        (API_URL=http://localhost:5500 default)
 *
 * Test users ki email @e2e.test par khatam hoti hai; test ke end mein sab delete ho jaate hain.
 * Sirf local/dev database par chalao.
 */
require("dotenv").config({ quiet: true });
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const B = process.env.API_URL || `http://localhost:${process.env.PORT || 5500}`;
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run e2e tests with NODE_ENV=production");
  process.exit(1);
}
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, port: process.env.DB_PORT,
});
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ""); }
}
async function call(method, url, token, body) {
  const r = await fetch(B + url, {
    method,
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3100", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}
async function login(email) {
  const r = await call("POST", "/api/auth/login", null, { email, password: "password123" });
  return r.data.token;
}
const tomorrow = new Date(Date.now() + 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);

(async () => {
  const ts = Date.now();
  const hash = await bcrypt.hash("password123", 10);
  const mk = async (role) => (await pool.query(
    "INSERT INTO users (name,email,password,phone,role) VALUES ($1,$2,$3,'9000000000',$4) RETURNING id,email",
    [`E2E ${role}`, `${role}${ts}@e2e.test`, hash, role])).rows[0];
  const admin = await mk("admin");
  const agent = await mk("agent");

  try {
    // health + 404
    let r = await call("GET", "/health");
    check("health ok", r.status === 200 && r.data.db === "up", r.data);
    r = await call("GET", "/api/nope");
    check("json 404", r.status === 404 && r.data.success === false, r.data);
    r = await call("GET", "/api/services");
    check("public services list", r.status === 200 && r.data.services?.length > 0, r.data);
    const service = r.data.services[0];

    // register: provider role honoured, email lowercased
    r = await call("POST", "/api/auth/register", null, { name: "E2E Provider", email: `Provider${ts}@E2E.test`, password: "password123", phone: "9000000001", role: "provider" });
    check("register provider", r.status === 201 && r.data.user.role === "provider" && r.data.user.email === `provider${ts}@e2e.test`, r.data);
    r = await call("POST", "/api/auth/register", null, { name: "E2E Customer", email: `customer${ts}@e2e.test`, password: "password123", phone: "9000000002", role: "admin" });
    check("register cannot become admin", r.status === 201 && r.data.user.role === "customer", r.data);

    const pT = await login(`PROVIDER${ts}@e2e.test`);
    check("login case-insensitive", !!pT);
    const cT = await login(`customer${ts}@e2e.test`);
    const aT = await login(agent.email);
    const adT = await login(admin.email);
    const providerId = JSON.parse(Buffer.from(pT.split(".")[1], "base64url")).id;

    // provider setup
    r = await call("POST", "/api/provider-profile/profile", pT, { bio: "e2e", experience_years: 3, skills: "all", service_area: "Kota", hourly_rate: 200 });
    check("provider profile", r.status === 201 || r.status === 200, r.data);
    r = await call("POST", "/api/provider-services", pT, { service_id: service.id, price: 777 });
    check("provider adds service", r.status === 201 || r.status === 200, r.data);
    r = await call("POST", "/api/provider/agents", pT, { agent_id: agent.id });
    check("provider adds agent", r.status === 201 || r.status === 200, r.data);
    r = await call("GET", "/api/provider-agents", pT);
    check("legacy /api/provider-agents works", r.status === 200 && (r.data.agents || []).some((a) => a.agent_id === agent.id), r.data);

    // discovery is public
    r = await call("GET", `/api/service-discovery/providers?service_id=${service.id}`);
    check("discovery public", r.status === 200 && r.data.providers.some((p) => p.provider_id === providerId), r.data);

    // booking validation
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "x", booking_date: "2020-01-01", booking_time: "10:00", provider_id: providerId });
    check("past date rejected", r.status === 400, r.data);
    r = await call("POST", "/api/booking/create", pT, { service_id: service.id, address: "x", booking_date: tomorrow, booking_time: "10:00" });
    check("provider cannot create customer booking", r.status === 403, r.data);
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "12 Test Road, Kota", booking_date: tomorrow, booking_time: "10:00", provider_id: providerId });
    check("customer creates booking with price snapshot", r.status === 201 && Number(r.data.booking.price) === 777 && r.data.booking.service_id === service.id, r.data);
    const bookingId = r.data.booking.id;

    r = await call("GET", "/api/booking/my-bookings", cT);
    check("my bookings has provider name", r.status === 200 && r.data.bookings[0]?.provider_name === "E2E Provider", r.data);

    r = await call("PUT", `/api/provider-bookings/accept/${bookingId}`, cT);
    check("customer cannot accept as provider", r.status === 403, r.data);
    r = await call("GET", "/api/notifications", pT);
    check("provider notified of new booking", r.status === 200 && JSON.stringify(r.data).includes(`#`) || JSON.stringify(r.data).includes("New booking"), r.data);

    // full lifecycle
    r = await call("PUT", `/api/provider-bookings/accept/${bookingId}`, pT);
    check("provider accepts", r.status === 200, r.data);
    r = await call("PUT", `/api/provider/assign-agent/${bookingId}`, pT, { agent_id: agent.id });
    check("provider assigns agent", r.status === 200, r.data);
    r = await call("GET", "/api/agent/my-jobs", aT);
    check("agent sees job", r.status === 200 && (r.data.jobs || []).some((j) => j.id === bookingId), r.data);
    for (const step of ["accept", "on-the-way", "start"]) {
      r = await call("PUT", `/api/agent/${step}/${bookingId}`, aT);
      check(`agent ${step}`, r.status === 200, r.data);
    }
    r = await call("PUT", `/api/booking/cancel/${bookingId}`, cT);
    check("cannot cancel in-progress booking", r.status === 409, r.data);
    r = await call("PUT", `/api/agent/complete/${bookingId}`, aT);
    check("agent completes", r.status === 200, r.data);

    // ---------- payments (Step 2) ----------
    r = await call("GET", "/api/payment/config");
    check("payment config (mock in dev)", r.data.online === true && r.data.gateway === "mock", r.data);

    r = await call("POST", "/api/payment/order", cT, { booking_id: bookingId, method: "ONLINE" });
    check("online order created with amount in paise", r.status === 201 && r.data.order?.amount === 77700, r.data);
    const orderId = r.data.order?.id;
    const paymentId = r.data.payment?.id;

    r = await call("POST", "/api/payment/order", pT, { booking_id: bookingId, method: "ONLINE" });
    check("provider cannot create customer payment", r.status === 403, r.data);

    r = await call("POST", "/api/payment/verify", cT, { razorpay_order_id: orderId, razorpay_payment_id: "pay_fake", razorpay_signature: "bad" });
    check("forged signature rejected", r.status === 400, r.data);

    r = await call("POST", "/api/payment/order", cT, { booking_id: bookingId, method: "ONLINE" });
    const orderId2 = r.data.order?.id;
    check("retry after failure reuses same payment row", r.status === 201 && r.data.payment.id === paymentId && orderId2 !== orderId, r.data);

    r = await call("POST", "/api/payment/mock-checkout", cT, { order_id: orderId2 });
    check("mock checkout returns signed response", r.status === 200 && !!r.data.razorpay_signature, r.data);
    const signed = r.data;
    r = await call("POST", "/api/payment/verify", cT, signed);
    check("verified payment successful", r.status === 200 && r.data.payment.payment_status === "successful", r.data);
    r = await call("POST", "/api/payment/verify", cT, signed);
    check("verify is idempotent", r.status === 200, r.data);

    r = await call("POST", "/api/payment/order", cT, { booking_id: bookingId, method: "ONLINE" });
    check("cannot pay twice", r.status === 409, r.data);

    r = await call("GET", "/api/booking/my-bookings", cT);
    check("my bookings shows paid", r.data.bookings?.[0]?.payment_status === "successful", r.data.bookings?.[0]);

    r = await call("GET", `/api/payment/booking/${bookingId}`, pT);
    check("provider of booking can read payment", r.status === 200 && r.data.payment.amount === 777, r.data);
    r = await call("PUT", `/api/payment/${paymentId}/status`, cT, { payment_status: "successful" });
    check("customer cannot change payment status", r.status === 403, r.data);

    const { rows: [pRow] } = await pool.query("SELECT platform_fee, provider_earning FROM payments WHERE id = $1", [paymentId]);
    check("15% commission split recorded", Number(pRow.platform_fee) === 116.55 && Number(pRow.provider_earning) === 660.45, pRow);

    r = await call("GET", "/api/payment?status=successful", adT);
    check("admin payments list + summary", r.status === 200 && r.data.payments.some((p) => p.id === paymentId) && r.data.summary.collected > 0, r.data.summary);
    r = await call("GET", "/api/payment", cT);
    check("customer cannot list all payments", r.status === 403, r.data);

    r = await call("POST", `/api/payment/${paymentId}/refund`, adT, { reason: "e2e" });
    check("admin refund (mock) processed", r.status === 200 && r.data.payment.payment_status === "refunded", r.data);

    // webhook: signed event marks a pending online payment successful, duplicates ignored
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "Webhook Lane", booking_date: tomorrow, booking_time: "09:00", provider_id: providerId });
    const whBooking = r.data.booking.id;
    r = await call("POST", "/api/payment/order", cT, { booking_id: whBooking, method: "ONLINE" });
    const whOrder = r.data.order.id;
    const event = JSON.stringify({ event: "payment.captured", created_at: 1, payload: { payment: { entity: { id: `pay_wh_${ts}`, order_id: whOrder } } } });
    const sig = require("crypto").createHmac("sha256", "e2e_webhook_secret").update(event).digest("hex");
    const wh = async (s) => fetch(B + "/api/payment/webhook/razorpay", { method: "POST", headers: { "Content-Type": "application/json", "x-razorpay-signature": s, "x-razorpay-event-id": `evt_${ts}` }, body: event });
    check("webhook bad signature rejected", (await wh("nope")).status === 400);
    check("webhook accepted", (await wh(sig)).status === 200);
    const dup = await (await wh(sig)).json();
    check("duplicate webhook ignored", dup.duplicate === true, dup);
    r = await call("GET", `/api/payment/booking/${whBooking}`, cT);
    check("webhook marked payment successful", r.data.payment?.payment_status === "successful", r.data);
    r = await call("PUT", `/api/booking/cancel/${whBooking}`, cT);
    check("cancel paid booking auto-refunds", r.status === 200 && r.data.refund_status === "refunded", r.data);

    // cash flow
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "Cash Street", booking_date: tomorrow, booking_time: "16:00", provider_id: providerId });
    const cashBooking = r.data.booking.id;
    r = await call("POST", "/api/payment/order", cT, { booking_id: cashBooking, method: "CASH" });
    check("customer chooses cash", r.status === 201 && r.data.payment.payment_method === "CASH" && !r.data.order, r.data);
    r = await call("PUT", `/api/payment/booking/${cashBooking}/cash-collected`, pT);
    check("cash cannot be collected before work starts", r.status === 400, r.data);
    await pool.query("UPDATE bookings SET status = 'in_progress' WHERE id = $1", [cashBooking]);
    r = await call("PUT", `/api/payment/booking/${cashBooking}/cash-collected`, cT);
    check("customer cannot mark cash collected", r.status === 403, r.data);
    r = await call("PUT", `/api/payment/booking/${cashBooking}/cash-collected`, pT);
    check("provider records cash", r.status === 200 && r.data.payment.payment_status === "successful", r.data);
    r = await call("PUT", `/api/payment/booking/${cashBooking}/cash-collected`, pT);
    check("cash cannot be recorded twice", r.status === 409, r.data);

    // review
    r = await call("POST", "/api/reviews", cT, { booking_id: bookingId, rating: 5, review: "great" });
    check("review submitted", r.status === 201 || r.status === 200, r.data);
    r = await call("GET", "/api/booking/my-bookings", cT);
    const reviewed = r.data.bookings?.find((b) => b.id === bookingId);
    check("has_review true after review", reviewed?.has_review === true, reviewed);

    // cancel rules on a fresh booking
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "Kota", booking_date: tomorrow, booking_time: "11:30" });
    const b2 = r.data.booking?.id;
    check("open booking without provider uses base price", r.status === 201 && Number(r.data.booking.price) === Number(service.base_price), r.data);
    r = await call("PUT", `/api/booking/cancel/${b2}`, cT);
    check("cancel pending booking", r.status === 200, r.data);
    r = await call("PUT", `/api/booking/cancel/${b2}`, cT);
    check("cannot cancel twice", r.status === 409, r.data);

    // admin
    r = await call("GET", "/api/admin/dashboard", adT);
    check("admin dashboard", r.status === 200, r.data);
    r = await call("GET", "/api/admin/dashboard", cT);
    check("customer blocked from admin", r.status === 403, r.data);

    // deleted user cannot log in
    await pool.query("UPDATE users SET is_deleted = true WHERE id = $1", [agent.id]);
    check("deleted user login blocked", !(await login(agent.email)));
  } finally {
    await pool.query("DELETE FROM users WHERE email LIKE '%@e2e.test'");
    await pool.end();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(1); });
