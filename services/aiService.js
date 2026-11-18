/**
 * Urbino assistant.
 *  - OPENAI_API_KEY ho to AI (baatcheet + user ki bookings ka context)
 *  - Key na ho / AI fail ho to built-in FAQ se jawab (app kabhi "chup" nahi hota)
 * Har jawab ke saath "talk to a person" ka option frontend dikhata hai.
 */
const OpenAI = require("openai");

const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15000, maxRetries: 1 }) : null;

const SYSTEM = `You are "Urbino Assistant", the help assistant of Urbino, an Indian marketplace for home and personal services
(cleaning, AC/appliance repair, electrician, plumbing, beauty at home, tutors, pest control, packers & movers, elder care and more).

How Urbino works (only state these facts):
- Customers book a service, choose a provider and a free time slot. Price is fixed at booking, no hidden charges.
- The provider confirms and assigns a verified professional. The customer gets a 4-digit start code in the app;
  the professional must enter it on arrival to start work. Never ask the customer to share the code on a call.
- Customers can cancel or reschedule while the booking is pending or confirmed. Paid bookings are refunded automatically on cancel
  (online refunds take 5-7 working days).
- Pay online (UPI, cards, wallets via Razorpay) or in cash after the service.
- Providers are verified with Aadhaar; verified providers show a badge.
- Customers can rate the professional after completion.

Rules:
- Reply in the user's language (Hindi, Hinglish or English). Be short, warm and practical: at most 5 sentences or a short list.
- Never invent prices, policies, phone numbers or booking details. Use only the booking data given in context.
- For complaints about damage, safety, payment disputes, refunds not received, or anything you cannot solve,
  say a support agent will help and set the flag by ending your reply with the token [HANDOFF].
- Never ask for passwords, OTPs, card numbers or Aadhaar numbers.`;

const FAQ = [
    { k: ["cancel", "radd", "cancell"], a: "You can cancel from My Bookings while the booking is pending or confirmed. If you already paid online, the refund starts automatically and reaches you in 5-7 working days." },
    { k: ["reschedul", "time change", "date change", "time badal", "date badal"], a: "Open My Bookings and tap Reschedule. You can pick a new free slot while the booking is pending or confirmed." },
    { k: ["refund", "paisa wapas", "money back"], a: "Refunds for cancelled paid bookings start automatically. Online refunds take 5-7 working days to reach your bank. If it has been longer, tap 'Talk to a person' and we'll check it." , handoff: true },
    { k: ["otp", "start code", "code"], a: "When your professional is confirmed, a 4-digit start code appears on your booking. Share it only after they reach your home. They need it to start work." },
    { k: ["pay", "payment", "upi", "cash", "card"], a: "You can pay online (UPI, cards, wallets) from your booking, or choose cash and pay the professional after the service." },
    { k: ["late", "not came", "nahi aaya", "where is", "kahan", "delay"], a: "You can see live progress on your booking (confirmed, on the way, started). If your professional is late, tap 'Talk to a person' and we'll call them right away.", handoff: true },
    { k: ["price", "cost", "charge", "kitna", "rate"], a: "The price shown when you book is the price you pay. There are no hidden charges. Each provider's price is shown before you confirm." },
    { k: ["provider", "join", "partner", "register as"], a: "To offer services, sign up with 'I offer services', complete your profile, add services and working hours, and upload your Aadhaar for verification." },
    { k: ["damage", "broke", "toot", "safety", "unsafe", "complaint", "shikayat"], a: "Sorry about this. A support agent will look into it personally. Tap 'Talk to a person' and share what happened.", handoff: true },
    { k: ["book", "service", "kaise"], a: "Go to Services, choose what you need, pick a provider and a free time slot, add your address and confirm. You'll get updates at every step." },
];

function faqAnswer(text) {
    const t = String(text || "").toLowerCase();
    const hit = FAQ.find((f) => f.k.some((k) => t.includes(k)));
    if (hit) return { reply: hit.a, handoff: !!hit.handoff };
    return {
        reply: "I can help with booking, rescheduling, cancelling, payments, refunds and your start code. Tell me a bit more, or tap 'Talk to a person' to reach our support team.",
        handoff: false,
    };
}

/**
 * @param {Array<{role:'user'|'assistant', content:string}>} history  latest last
 * @param {string} context  user ki bookings ka chhota summary (ya "")
 */
async function generateAIResponse(history, context = "") {
    const last = history[history.length - 1]?.content || "";
    if (!client) return { ...faqAnswer(last), source: "faq" };

    try {
        const input = [
            { role: "system", content: SYSTEM + (context ? `\n\nContext about this user:\n${context}` : "\n\nThe user is not logged in.") },
            ...history.slice(-10).map((m) => ({ role: m.role, content: String(m.content).slice(0, 1000) })),
        ];
        const r = await client.responses.create({ model: MODEL, input, max_output_tokens: 400 });
        let reply = String(r.output_text || "").trim();
        const handoff = reply.includes("[HANDOFF]");
        reply = reply.replace("[HANDOFF]", "").trim();
        if (!reply) return { ...faqAnswer(last), source: "faq" };
        return { reply, handoff, source: "ai" };
    } catch (err) {
        console.error("[ai] falling back to FAQ:", err.message);
        return { ...faqAnswer(last), source: "faq" };
    }
}

module.exports = { generateAIResponse, faqAnswer, aiEnabled: () => !!client };
