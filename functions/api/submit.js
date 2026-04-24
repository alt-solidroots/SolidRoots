export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();
        const { type, email, phone, answers } = data;

        // Insert into D1 database
        // The binding name should be 'DB' in wrangler.jsonc
        await env.DB.prepare(
            "INSERT INTO inquiries (type, email, phone, answers) VALUES (?, ?, ?, ?)"
        )
        .bind(type, email, phone, JSON.stringify(answers))
        .run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
