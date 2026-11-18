const pool = require("../config/db");

/**
 * Provider ka hisaab (ledger).
 *  - Online payment: Urbino ke paas paisa -> provider ko provider_earning dena hai.
 *  - Cash payment:   provider ke paas paisa -> provider ko platform_fee Urbino ko dena hai.
 *  balance > 0  => Urbino provider ko dega
 *  balance < 0  => provider Urbino ko dega
 */
const BALANCE_SQL = `
    SELECT u.id AS provider_id,
           COALESCE(pay.online_earning, 0)::float AS online_earning,
           COALESCE(pay.cash_fee, 0)::float AS cash_fee,
           COALESCE(po.paid_out, 0)::float AS paid_out,
           COALESCE(po.received, 0)::float AS received,
           ROUND((COALESCE(pay.online_earning, 0) - COALESCE(pay.cash_fee, 0)
                  - COALESCE(po.paid_out, 0) + COALESCE(po.received, 0))::numeric, 2)::float AS balance
    FROM users u
    LEFT JOIN LATERAL (
        SELECT SUM(p.provider_earning) FILTER (WHERE upper(p.payment_method) <> 'CASH') AS online_earning,
               SUM(p.platform_fee) FILTER (WHERE upper(p.payment_method) = 'CASH') AS cash_fee
        FROM payments p JOIN bookings b ON b.id = p.booking_id
        WHERE b.provider_id = u.id AND p.payment_status = 'successful'
    ) pay ON TRUE
    LEFT JOIN LATERAL (
        SELECT SUM(amount) FILTER (WHERE direction = 'to_provider') AS paid_out,
               SUM(amount) FILTER (WHERE direction = 'from_provider') AS received
        FROM provider_payouts WHERE provider_id = u.id
    ) po ON TRUE
`;

async function getBalance(providerId, db = pool) {
    const r = await db.query(`${BALANCE_SQL} WHERE u.id = $1`, [providerId]);
    return r.rows[0] || null;
}

/** Provider ki kamai: summary (aaj / 7 din / 30 din / total), har payment, payouts. */
async function providerEarnings(providerId) {
    const [summary, payments, payouts, balance] = await Promise.all([
        pool.query(
            `
            SELECT
                COUNT(*)::int AS paid_jobs,
                COALESCE(SUM(p.amount), 0)::float AS gross,
                COALESCE(SUM(p.platform_fee), 0)::float AS commission,
                COALESCE(SUM(p.provider_earning), 0)::float AS net,
                COALESCE(SUM(p.provider_earning) FILTER (WHERE p.paid_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'), 0)::float AS net_today,
                COALESCE(SUM(p.provider_earning) FILTER (WHERE p.paid_at >= now() - interval '7 days'), 0)::float AS net_7d,
                COALESCE(SUM(p.provider_earning) FILTER (WHERE p.paid_at >= now() - interval '30 days'), 0)::float AS net_30d,
                COALESCE(SUM(p.amount) FILTER (WHERE upper(p.payment_method) = 'CASH'), 0)::float AS cash_collected,
                COALESCE(SUM(p.amount) FILTER (WHERE upper(p.payment_method) <> 'CASH'), 0)::float AS online_collected
            FROM payments p JOIN bookings b ON b.id = p.booking_id
            WHERE b.provider_id = $1 AND p.payment_status = 'successful'
            `,
            [providerId]
        ),
        pool.query(
            `
            SELECT p.id, p.booking_id, b.service_name, c.name AS customer_name, a.name AS agent_name,
                   upper(p.payment_method) AS payment_method, p.amount::float AS amount,
                   p.platform_fee::float AS platform_fee, p.provider_earning::float AS provider_earning, p.paid_at
            FROM payments p
            JOIN bookings b ON b.id = p.booking_id
            LEFT JOIN users c ON c.id = b.customer_id
            LEFT JOIN users a ON a.id = b.agent_id
            WHERE b.provider_id = $1 AND p.payment_status = 'successful'
            ORDER BY p.paid_at DESC NULLS LAST, p.id DESC
            LIMIT 100
            `,
            [providerId]
        ),
        pool.query(
            `SELECT id, direction, amount::float AS amount, reference, note, created_at
             FROM provider_payouts WHERE provider_id = $1 ORDER BY created_at DESC, id DESC LIMIT 50`,
            [providerId]
        ),
        getBalance(providerId),
    ]);
    return { summary: summary.rows[0], payments: payments.rows, payouts: payouts.rows, balance };
}

/** Admin: har provider ka balance (jinka koi hisaab hai). */
async function listBalances() {
    const r = await pool.query(
        `
        SELECT x.*, u.name AS provider_name, u.email AS provider_email, u.phone AS provider_phone,
               (SELECT MAX(created_at) FROM provider_payouts WHERE provider_id = u.id) AS last_payout_at
        FROM (${BALANCE_SQL} WHERE u.role = 'provider') x
        JOIN users u ON u.id = x.provider_id
        WHERE x.online_earning <> 0 OR x.cash_fee <> 0 OR x.paid_out <> 0 OR x.received <> 0
        ORDER BY abs(x.balance) DESC, u.name
        `
    );
    const rows = r.rows;
    const totals = rows.reduce(
        (t, row) => {
            if (row.balance > 0) t.to_pay += row.balance;
            else t.to_receive += -row.balance;
            return t;
        },
        { to_pay: 0, to_receive: 0 }
    );
    totals.to_pay = Math.round(totals.to_pay * 100) / 100;
    totals.to_receive = Math.round(totals.to_receive * 100) / 100;
    return { providers: rows, totals };
}

/**
 * Settlement record karo. Advisory lock: ek provider ke do payouts ek saath na ho
 * (double payout se bachav). Amount balance se zyada nahi ho sakta.
 */
async function recordPayout({ providerId, direction, amount, reference, note, adminId }) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(7007, $1)", [providerId]);
        const bal = await getBalance(providerId, client);
        if (!bal) {
            await client.query("ROLLBACK");
            return { error: [404, "Provider not found"] };
        }
        const due = direction === "to_provider" ? bal.balance : -bal.balance;
        if (due <= 0) {
            await client.query("ROLLBACK");
            return {
                error: [409, direction === "to_provider" ? "Nothing is due to this provider" : "This provider owes nothing"],
            };
        }
        if (amount > due + 0.001) {
            await client.query("ROLLBACK");
            return { error: [400, `Amount is more than the due balance (₹${due.toFixed(2)})`] };
        }
        const ins = await client.query(
            `INSERT INTO provider_payouts (provider_id, direction, amount, reference, note, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, provider_id, direction, amount::float AS amount, reference, note, created_at`,
            [providerId, direction, amount, reference || null, note || null, adminId]
        );
        const after = await getBalance(providerId, client);
        await client.query("COMMIT");
        return { payout: ins.rows[0], balance: after };
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { getBalance, providerEarnings, listBalances, recordPayout };
