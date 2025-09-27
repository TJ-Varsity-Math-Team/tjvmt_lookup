export default function handler(req, res) {
  const BASE_URL = process.env.BASE_URL; // e.g. http://localhost:3000 or https://your-app.vercel.app
  if (!BASE_URL) return res.status(500).send("Missing BASE_URL env");

  const path = (req.query.path || "/").toString();
  const state = encodeURIComponent(JSON.stringify({ origin: path }));
  const redirect_uri = `${BASE_URL}/api/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.OAUTH_CLIENT_ID,
    redirect_uri,
    scope: "read",   // only request read scope
    state
  });

  const reqURL = `${process.env.OAUTH_AUTHORIZATION_URL}?${params.toString()}`;

  return res
    .setHeader("Access-Control-Allow-Origin", BASE_URL)
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    .redirect(302, reqURL);
}
