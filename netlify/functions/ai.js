// ─────────────────────────────────────────────────────────────────
// FILE LOCATION: netlify/functions/ai.js
//
// YOUR ANTHROPIC (MANDI/AI) KEY goes in Netlify Dashboard:
//   Site Settings → Environment Variables → Add variable
//   Name:  ANTHROPIC_API_KEY
//   Value: 579b464db66ec23bdd00000120812bb4a7db42e4715ba6dd179c3975
//
// DO NOT paste the key directly in this file — keep it in env vars.
// ─────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const body = JSON.parse(event.body);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};