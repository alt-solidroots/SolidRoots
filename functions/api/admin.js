// Admin API - protected by a secret key passed as a query parameter
// Usage: GET /api/admin?key=YOUR_ADMIN_SECRET
// Set ADMIN_SECRET in your Cloudflare Pages environment variables.

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    // Check secret key
    const adminSecret = env.ADMIN_SECRET || "solidroots-admin-2026";
    if (key !== adminSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }

    try {
        const page = parseInt(url.searchParams.get("page") || "1");
        const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
        const typeFilter = url.searchParams.get("type") || "all";
        const offset = (page - 1) * pageSize;

        // Build query with optional type filter
        let query = "SELECT * FROM inquiries";
        let countQuery = "SELECT COUNT(*) as total FROM inquiries";
        const bindings = [];
        const countBindings = [];

        if (typeFilter !== "all") {
            query += " WHERE type = ?";
            countQuery += " WHERE type = ?";
            bindings.push(typeFilter);
            countBindings.push(typeFilter);
        }

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        bindings.push(pageSize, offset);

        const [result, countResult] = await Promise.all([
            env.DB.prepare(query).bind(...bindings).all(),
            env.DB.prepare(countQuery).bind(...countBindings).first(),
        ]);

        return new Response(
            JSON.stringify({
                data: result.results,
                total: countResult.total,
                page,
                pageSize,
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }
}
