import { parseWorkbookForUser } from "../lib/parseWorkbook";

export async function getServerSideProps({ req, res }) {
  // Don't cache
  res.setHeader("Cache-Control", "no-store");

  const authCookie = req.cookies?.auth || null;
  if (!authCookie) {
    return { redirect: { destination: "/", permanent: false } };
  }

  let ion_username = null;
  try {
    const parsedCookie = JSON.parse(decodeURIComponent(authCookie));
    ion_username = parsedCookie.ion_username;
  } catch {
    return { redirect: { destination: "/", permanent: false } };
  }

  if (!ion_username) {
    return { redirect: { destination: "/", permanent: false } };
  }

  // ✅ Await the async call
  let parsed = [];
  try {
    parsed = await parseWorkbookForUser(ion_username);
  } catch {
    parsed = [];
  }

  // Ensure serializable props (defensive)
  const safeParsed = JSON.parse(JSON.stringify(parsed));

  return { props: { parsed: safeParsed, ion_username } };
}

export default function Dashboard({ parsed, ion_username }) {
  return (
    <html>
    <head>
        <meta charset="utf-8" />
        <title>TJ VMT Score Lookup</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    </head>
    <main>
      <h1>TJ VMT Score Lookup</h1>
      <small>Created by Tiger Deng</small>

      <p>
        <a href="/api/logout">
          <button type="button">Log out</button>
        </a>
      </p>

      <h1>Score distributions for {ion_username}</h1>
      <p>
        If you think something is wrong, please use the{" "}
        <a
          href="https://forms.gle/VJmjSWczLyepqqj67"
          target="_blank"
          rel="noopener noreferrer"
        >
          TST Protest Form
        </a>{" "}
        to submit a protest.
      </p>
      <p>
        Problems and Solutions can be found in{" "}
        <a
          href="https://drive.google.com/drive/folders/172J6msYiVCfyp90GfWD9sc29MN_p9B8Y?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
        >
          the TSTs folder
        </a>{" "}
        in our 2025-26 public drive.
      </p>

      {parsed.map((block, i) => (
        <section key={i}>
          <h2>{block.sheetName}</h2>
          {block.missing ? (
            <p>Missing sheet</p>
          ) : block.data.length === 0 ? (
            <p>No rows matching Ion ID</p>
          ) : (
            <table border="1" cellPadding="4">
              <thead>
                <tr>{block.headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {block.data.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {block.headers.map((h) => <td key={h}>{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </main>
    </html>
  );
}
