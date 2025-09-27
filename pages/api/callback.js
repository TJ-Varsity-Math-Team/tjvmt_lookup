// pages/api/callback.js
export default async function handler(req, res) {
  const BASE_URL = process.env.BASE_URL;
  if (!BASE_URL) {
    res.status(500).json({ error: "missing_base_url_env" });
    return;
  }

  const code = req.query.code?.toString();
  if (!code) {
    res.status(400).json({ error: "missing_code" });
    return;
  }

  const redirect_uri = `${BASE_URL}/api/callback`;

  // --- Exchange code -> token (Authorization Code) ---
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.OAUTH_CLIENT_ID,
    client_secret: process.env.OAUTH_CLIENT_SECRET,
    redirect_uri
  });

  const tokenRes = await fetch(process.env.OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const ct = tokenRes.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await tokenRes.text();
    res.status(tokenRes.status || 400).json({
      error: "non_json_token_response",
      status: tokenRes.status,
      bodySnippet: text.slice(0, 500)
    });
    return;
  }

  const tokenBody = await tokenRes.json();
  if (!tokenRes.ok || tokenBody.error) {
    res.status(tokenRes.status || 400).json({
      error: tokenBody.error || "token_exchange_failed",
      error_description:
        tokenBody.error_description || JSON.stringify(tokenBody)
    });
    return;
  }

  // --- Fetch ION profile to get ion_username ---
  let ion_username = null;
  try {
    const profileRes = await fetch("https://ion.tjhsst.edu/api/profile", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` }
    });
    const profileBody = await profileRes.json();
    ion_username = profileBody?.ion_username || null;
  } catch {
    // If profile fails, we still set the token, but dashboard may redirect out
  }

  // --- Set session cookie (HttpOnly) ---
  const fallbackSecs = Number(process.env.SESSION_MAX_AGE_SECONDS || 3600);
  const maxAge = Number.isFinite(Number(tokenBody.expires_in))
    ? Number(tokenBody.expires_in)
    : fallbackSecs;

  // Store minimal info needed by server-side filtering
  const sessionPayload = encodeURIComponent(
    JSON.stringify({
      access_token: tokenBody.access_token,
      ion_username
    })
  );

  const cookie = [
    `auth=${sessionPayload}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    process.env.NODE_ENV === "production" ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader("Set-Cookie", cookie);

  // --- Redirect to dashboard (no 'return' needed) ---
  res.redirect(302, `${BASE_URL}/dashboard`);
}
