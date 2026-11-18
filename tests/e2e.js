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
    // ---------- team invites ----------
    r = await call("POST", "/api/provider/agents", pT, { email: "nobody@e2e.test" });
    check("invite unknown email -> 404", r.status === 404, r.data);
    r = await call("POST", "/api/provider/agents", pT, { email: `customer${ts}@e2e.test` });
    check("cannot invite a customer", r.status === 400, r.data);
    r = await call("POST", "/api/provider/agents", pT, { email: agent.email });
    check("provider invites agent by email", r.status === 201, r.data);
    r = await call("POST", "/api/provider/agents", pT, { email: agent.email });
    check("duplicate pending invite blocked", r.status === 409, r.data);
    r = await call("GET", "/api/provider-agents", pT);
    check("invited agent not in team yet", !(r.data.agents || []).some((a) => a.agent_id === agent.id) && r.data.invites?.length === 1, r.data);
    r = await call("GET", "/api/agent/invites", aT);
    const inviteId = r.data.invites?.[0]?.id;
    check("agent sees invite", r.status === 200 && r.data.invites?.[0]?.provider_name === "E2E Provider", r.data);
    r = await call("PUT", `/api/agent/invites/${inviteId}/accept`, aT);
    check("agent accepts invite", r.status === 200, r.data);
    r = await call("PUT", `/api/agent/invites/${inviteId}/accept`, aT);
    check("invite cannot be answered twice", r.status === 404, r.data);
    r = await call("GET", "/api/provider-agents", pT);
    check("agent now in provider team", r.status === 200 && (r.data.agents || []).some((a) => a.agent_id === agent.id), r.data);
    r = await call("POST", "/api/auth/register", null, { name: "E2E Pro Signup", email: `pro${ts}@e2e.test`, password: "password123", phone: "9000000005", role: "agent" });
    check("professional can sign up as agent", r.status === 201 && r.data.user.role === "agent", r.data);

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
    // ---------- agent job flow (OTP start + tracking) ----------
    r = await call("GET", "/api/agent/summary", aT);
    check("agent summary counts new job", r.status === 200 && r.data.summary.new >= 1, r.data);
    r = await call("GET", "/api/agent/jobs?group=new", aT);
    check("agent new jobs list", r.status === 200 && r.data.jobs.some((j) => j.id === bookingId), r.data);
    r = await call("PUT", `/api/agent/start/${bookingId}`, aT, { otp: "0000" });
    check("cannot start before accepting", r.status === 409, r.data);
    r = await call("PUT", `/api/agent/accept/${bookingId}`, aT);
    check("agent accept", r.status === 200 && r.data.job.status === "agent_accepted", r.data);
    r = await call("PUT", `/api/agent/accept/${bookingId}`, aT);
    check("double accept rejected", r.status === 409, r.data);
    r = await call("GET", "/api/booking/my-bookings", cT);
    const otp = r.data.bookings?.find((b) => b.id === bookingId)?.start_otp;
    check("customer sees 4-digit start code", /^\d{4}$/.test(otp || ""), r.data.bookings?.[0]);
    r = await call("GET", `/api/agent/jobs/${bookingId}`, aT);
    check("agent never sees the start code", r.status === 200 && !("start_otp" in r.data.job), r.data);
    r = await call("PUT", `/api/agent/on-the-way/${bookingId}`, aT);
    check("agent on-the-way", r.status === 200, r.data);
    r = await call("GET", "/api/provider/my-bookings", pT);
    const tracked = r.data.bookings?.find((b) => b.id === bookingId);
    check("provider tracks agent (name + on-the-way time)", tracked?.agent_name === "E2E agent" && !!tracked?.on_the_way_at, tracked);
    r = await call("GET", "/api/notifications", pT);
    check("provider notified of agent progress", JSON.stringify(r.data).includes("Agent left"), r.data);
    const wrongOtp = otp === "1111" ? "2222" : "1111";
    r = await call("PUT", `/api/agent/start/${bookingId}`, aT, { otp: wrongOtp });
    check("wrong start code rejected", r.status === 400, r.data);
    r = await call("PUT", `/api/agent/start/${bookingId}`, aT, { otp });
    check("agent starts with customer's code", r.status === 200 && r.data.job.status === "in_progress", r.data);
    r = await call("GET", "/api/booking/my-bookings", cT);
    check("start code hidden after start", !r.data.bookings?.find((b) => b.id === bookingId)?.start_otp, r.data.bookings?.[0]);
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

    // ---------- provider earnings + payouts ----------
    // Online payment refund ho chuka; cash 777 provider ke paas -> provider Urbino ko 15% commission dega
    r = await call("GET", "/api/payment/provider/earnings", pT);
    const owed = Math.round(777 * 15) / 100;
    check("provider earnings summary", r.status === 200 && r.data.summary.paid_jobs === 1 && r.data.summary.cash_collected === 777 && r.data.summary.commission === owed, r.data.summary);
    check("provider owes commission on cash job", r.data.balance?.balance === -owed, r.data.balance);
    check("earnings list has the cash job", r.data.payments?.[0]?.booking_id === cashBooking, r.data.payments?.[0]);
    r = await call("GET", "/api/payment/provider/earnings", cT);
    check("customer cannot read provider earnings", r.status === 403, r.data);
    r = await call("GET", "/api/payment/admin/payouts", adT);
    check("admin sees provider balance", r.status === 200 && r.data.providers.some((p) => p.provider_id === providerId && p.balance === -owed), r.data.totals);
    r = await call("GET", "/api/payment/admin/payouts", pT);
    check("provider cannot read all balances", r.status === 403, r.data);
    r = await call("POST", "/api/payment/admin/payouts", adT, { provider_id: providerId, direction: "to_provider", amount: 10 });
    check("cannot pay out when provider owes", r.status === 409, r.data);
    r = await call("POST", "/api/payment/admin/payouts", adT, { provider_id: providerId, direction: "from_provider", amount: owed + 50 });
    check("cannot settle more than due", r.status === 400, r.data);
    r = await call("POST", "/api/payment/admin/payouts", adT, { provider_id: providerId, direction: "from_provider", amount: -5 });
    check("negative amount rejected", r.status === 400, r.data);
    const [s1, s2] = await Promise.all([
      call("POST", "/api/payment/admin/payouts", adT, { provider_id: providerId, direction: "from_provider", amount: owed, reference: "UPI123" }),
      call("POST", "/api/payment/admin/payouts", adT, { provider_id: providerId, direction: "from_provider", amount: owed, reference: "UPI123" }),
    ]);
    check("parallel settlements: exactly one recorded", [s1.status, s2.status].sort().join() === "201,409", [s1.data, s2.data]);
    r = await call("GET", "/api/payment/provider/earnings", pT);
    check("balance settled to zero + payout listed", r.data.balance?.balance === 0 && r.data.payouts?.[0]?.reference === "UPI123", r.data.balance);

    // review
    r = await call("POST", "/api/reviews", cT, { booking_id: bookingId, rating: 5, review: "great" });
    check("review submitted", r.status === 201 || r.status === 200, r.data);

    // ---------- service guarantee ----------
    r = await call("GET", "/api/booking/my-bookings", cT);
    check("completed booking can claim rework", r.data.bookings?.find((b) => b.id === bookingId)?.can_claim === true, r.data.bookings?.[0]);
    r = await call("POST", "/api/claims", cT, { booking_id: bookingId, reason: "short" });
    check("claim needs a real reason", r.status === 400, r.data);
    r = await call("POST", "/api/claims", cT, { booking_id: bookingId, reason: "AC still leaking water after service", preferred_date: tomorrow, preferred_time: "10:00" });
    check("customer requests free rework", r.status === 201, r.data);
    const claimId = r.data.claim?.id;
    r = await call("POST", "/api/claims", cT, { booking_id: bookingId, reason: "AC still leaking water after service" });
    check("only one claim per booking", r.status === 409, r.data);
    r = await call("GET", "/api/claims/provider", pT);
    check("provider sees claim", r.data.claims?.some((c) => c.id === claimId && c.status === "requested"), r.data);
    r = await call("PUT", `/api/claims/${claimId}/accept`, cT, { booking_date: tomorrow, booking_time: "10:00" });
    check("customer cannot accept claim", r.status === 403, r.data);
    r = await call("PUT", `/api/claims/${claimId}/accept`, pT, { booking_date: tomorrow, booking_time: "10:00", note: "Will fix pipe" });
    check("provider schedules free rework", r.status === 200 && !!r.data.rework_booking_id, r.data);
    const reworkId = r.data.rework_booking_id;
    r = await call("GET", "/api/booking/my-bookings", cT);
    const rw = r.data.bookings?.find((b) => b.id === reworkId);
    check("free rework booking visible, price 0", rw && Number(rw.price) === 0 && rw.rework_of === bookingId, rw);
    r = await call("POST", "/api/payment/order", cT, { booking_id: reworkId, method: "ONLINE" });
    check("no payment for free rework", r.status === 400, r.data);
    r = await call("POST", "/api/claims", cT, { booking_id: reworkId, reason: "Asking rework of a rework booking" });
    check("rework booking itself cannot be claimed (not completed)", r.status === 400, r.data);
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

    // agent declines -> back to provider
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "Decline Lane", booking_date: tomorrow, booking_time: "17:00", provider_id: providerId });
    const dBooking = r.data.booking.id;
    await call("PUT", `/api/provider-bookings/accept/${dBooking}`, pT);
    await call("PUT", `/api/provider/assign-agent/${dBooking}`, pT, { agent_id: agent.id });
    r = await call("PUT", `/api/agent/decline/${dBooking}`, aT, { reason: "" });
    check("decline needs a reason", r.status === 400, r.data);
    r = await call("PUT", `/api/agent/decline/${dBooking}`, aT, { reason: "Too far from my area" });
    check("agent declines job", r.status === 200, r.data);
    r = await call("GET", "/api/provider/my-bookings", pT);
    const declined = r.data.bookings?.find((b) => b.id === dBooking);
    check("declined job back with provider, reason shown", declined?.status === "provider_accepted" && declined?.agent_declined_reason === "Too far from my area", declined);
    const { rows: [outsider] } = await pool.query(
      "INSERT INTO users (name,email,password,phone,role) VALUES ('Outsider','outsider' || $1 || '@e2e.test',$2,'9000000006','agent') RETURNING id",
      [String(ts), hash]);
    r = await call("PUT", `/api/provider/assign-agent/${dBooking}`, pT, { agent_id: outsider.id });
    check("cannot assign an agent outside the team", r.status !== 200, r.data);

    // ---------- provider onboarding (Step 3) ----------
    r = await call("PUT", "/api/provider-profile/profile", pT, { service_area: "Kota", experience_years: 99 });
    check("profile rejects bad experience", r.status === 400, r.data);
    r = await call("PUT", "/api/provider-profile/profile", pT, { service_area: "Kota, Jaipur", experience_years: 4, hourly_rate: 350, bio: "Updated" });
    check("profile upsert", r.status === 200 && r.data.profile.experience_years === 4, r.data);
    r = await call("GET", "/api/provider-profile/onboarding", pT);
    check("onboarding checklist", r.status === 200 && r.data.steps.find((s) => s.key === "services")?.done === true, r.data);

    r = await call("PUT", `/api/provider-services/${service.id}`, pT, { price: -5 });
    check("service price validated", r.status === 400, r.data);
    r = await call("PUT", `/api/provider-services/${service.id}`, pT, { price: 888 });
    check("service price updated", r.status === 200 && Number(r.data.service.price) === 888, r.data);
    r = await call("PUT", `/api/provider-services/${service.id}`, pT, { is_active: false });
    r = await call("GET", `/api/service-discovery/providers?service_id=${service.id}`);
    check("paused service hidden from discovery", !r.data.providers.some((p) => p.provider_id === providerId), r.data);
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "Paused", booking_date: tomorrow, booking_time: "12:00", provider_id: providerId });
    check("cannot book paused service", r.status === 400, r.data);
    await call("PUT", `/api/provider-services/${service.id}`, pT, { is_active: true });

    const day = new Date(`${tomorrow}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    r = await call("PUT", "/api/provider-availability", pT, { schedule: [{ day_of_week: day, start_time: "12:00", end_time: "15:00" }, { day_of_week: day, start_time: "14:00", end_time: "16:00" }] });
    check("overlapping hours rejected", r.status === 400, r.data);
    r = await call("PUT", "/api/provider-availability", pT, { schedule: [{ day_of_week: day, start_time: "12:00", end_time: "15:00" }] });
    check("weekly schedule saved", r.status === 200 && r.data.availability.length === 1, r.data);
    r = await call("GET", `/api/provider-availability/slots?provider_id=${providerId}&date=${tomorrow}`);
    check("public slots", r.status === 200 && JSON.stringify(r.data.slots) === JSON.stringify(["12:00", "13:00", "14:00"]), r.data);
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "Late", booking_date: tomorrow, booking_time: "18:00", provider_id: providerId });
    check("booking outside working hours rejected", r.status === 409, r.data);
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "Slot", booking_date: tomorrow, booking_time: "13:00", provider_id: providerId });
    check("booking inside slot works with new price", r.status === 201 && Number(r.data.booking.price) === 888, r.data);
    r = await call("GET", `/api/provider-availability/slots?provider_id=${providerId}&date=${tomorrow}`);
    check("booked slot no longer offered", !r.data.slots.includes("13:00"), r.data);
    r = await call("POST", "/api/booking/create", cT, { service_id: service.id, address: "Double", booking_date: tomorrow, booking_time: "13:00", provider_id: providerId });
    check("same slot cannot be double-booked", r.status === 409, r.data);

    // documents (multipart upload)
    const upload = async (token, fields, file) => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.append(k, v);
      if (file) fd.append("document", new Blob([file.body], { type: file.type }), file.name);
      const res = await fetch(B + "/api/provider-verification", { method: "POST", headers: { Authorization: `Bearer ${token}`, Origin: "http://localhost:3100" }, body: fd });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    };
    const png = { body: Buffer.from("89504e470d0a1a0a", "hex"), type: "image/png", name: "aadhaar.png" };
    r = await upload(pT, { document_type: "PAN", document_number: "ABCDE1234F" }, png);
    check("PAN before Aadhaar rejected", r.status === 400, r.data);
    r = await upload(pT, { document_type: "Aadhaar", document_number: "1234" }, png);
    check("bad Aadhaar number rejected", r.status === 400, r.data);
    r = await upload(pT, { document_type: "Aadhaar", document_number: "1234 5678 9012" }, { body: "x", type: "text/plain", name: "a.txt" });
    check("non-image file rejected", r.status === 400, r.data);
    r = await upload(pT, { document_type: "Aadhaar", document_number: "1234 5678 9012" }, png);
    check("Aadhaar uploaded, number masked", r.status === 201 && r.data.verification.document_number.endsWith("9012") && !r.data.verification.document_number.includes("1234"), r.data);
    const docId = r.data.verification?.id;
    r = await upload(pT, { document_type: "Aadhaar", document_number: "1234 5678 9012" }, png);
    check("duplicate Aadhaar while pending rejected", r.status === 409, r.data);
    const fileRes = await fetch(`${B}/api/provider-verification/${docId}/file`, { headers: { Authorization: `Bearer ${pT}` } });
    check("provider can view own file", fileRes.status === 200 && fileRes.headers.get("content-type") === "image/png");
    const custFile = await fetch(`${B}/api/provider-verification/${docId}/file`, { headers: { Authorization: `Bearer ${cT}` } });
    check("customer cannot view provider file", custFile.status === 403);
    const adminFile = await fetch(`${B}/api/provider-verification/${docId}/file`, { headers: { Authorization: `Bearer ${adT}` } });
    check("admin can view provider file", adminFile.status === 200);
    // ---------- admin verification (Step 4) ----------
    r = await call("GET", `/api/admin/provider-verifications?status=pending&search=provider${ts}`, adT);
    const queued = r.data.providers?.find((p) => p.provider_id === providerId);
    check("admin queue lists provider with masked doc", r.status === 200 && queued?.documents?.[0]?.document_number?.endsWith("9012") && !queued.documents[0].document_number.includes("5678"), r.data);
    r = await call("GET", "/api/admin/provider-verifications", cT);
    check("customer cannot open admin queue", r.status === 403, r.data);
    r = await call("PATCH", `/api/admin/verification/${docId}/reject`, adT, { rejection_reason: "bad" });
    check("reject needs a real reason", r.status === 400, r.data);
    r = await call("PATCH", `/api/admin/verification/${docId}/approve`, adT);
    check("approve Aadhaar verifies provider", r.status === 200 && r.data.provider_verified === true, r.data);
    r = await call("PATCH", `/api/admin/verification/${docId}/approve`, adT);
    check("cannot approve twice", r.status === 409, r.data);
    r = await call("GET", `/api/provider-profile/${providerId}`);
    check("public profile shows verified", r.data.profile?.is_verified === true, r.data);
    r = await call("PATCH", `/api/admin/verification/${docId}/reject`, adT, { rejection_reason: "Photo is blurry or unreadable" });
    check("revoke removes verified badge", r.status === 200 && r.data.provider_verified === false, r.data);
    r = await call("GET", "/api/notifications", pT);
    check("provider notified about rejection", JSON.stringify(r.data).includes("blurry"), r.data);
    const { rows: [oldDoc] } = await pool.query("SELECT document_url FROM provider_verifications WHERE id = $1", [docId]);
    r = await upload(pT, { document_type: "Aadhaar", document_number: "1234 5678 9012" }, png);
    check("re-upload allowed after rejection", r.status === 201 && r.data.verification.status === "pending", r.data);
    check("old rejected file removed from disk", !require("fs").existsSync(require("path").join(__dirname, "..", "private_uploads", oldDoc.document_url)));

    const { rows: [doc] } = await pool.query("SELECT document_url FROM provider_verifications WHERE id = $1", [docId]);
    require("fs").rmSync(require("path").join(__dirname, "..", "private_uploads", doc.document_url), { force: true });

    // ---------- help chat + human support ----------
    r = await call("POST", "/api/chatbot/message", null, { message: "How do I cancel my booking?" });
    check("chatbot answers guests", r.status === 200 && r.data.reply?.length > 10, r.data);
    r = await call("POST", "/api/chatbot/message", cT, { message: "my refund not received", history: [{ role: "assistant", content: "Hi" }] });
    check("chatbot suggests a person for refunds", r.status === 200 && r.data.handoff === true, r.data);
    r = await call("POST", "/api/support/tickets", null, { message: "Need help with my booking" });
    check("guest ticket needs phone", r.status === 400, r.data);
    r = await call("POST", "/api/support/tickets", cT, { message: "Refund for booking not received", category: "refund", booking_id: bookingId, transcript: [{ role: "user", content: "refund?" }] });
    check("customer creates support ticket", r.status === 201 && !!r.data.ticket?.id, r.data);
    const ticketId = r.data.ticket?.id;
    r = await call("GET", "/api/support/tickets?status=open", cT);
    check("customer cannot list all tickets", r.status === 403, r.data);
    r = await call("GET", "/api/support/tickets?status=open", adT);
    check("admin sees ticket with booking", r.status === 200 && r.data.tickets.some((t) => t.id === ticketId && t.booking_id === bookingId), r.data);
    r = await call("PATCH", `/api/support/tickets/${ticketId}`, adT, { status: "resolved", admin_note: "Refund processed today" });
    check("admin resolves ticket", r.status === 200 && r.data.ticket.status === "resolved", r.data);
    r = await call("GET", "/api/support/my-tickets", cT);
    check("customer sees resolved ticket with note", r.data.tickets?.[0]?.admin_note === "Refund processed today", r.data);
    await pool.query("DELETE FROM support_tickets WHERE id = $1", [ticketId]);

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
