import { parseWorkbookForUser } from "../lib/parseWorkbook";

export async function getServerSideProps({ req }) {
  const authCookie = req.cookies?.auth || null;
  if (!authCookie) {
    return { redirect: { destination: "/", permanent: false } };
  }

  // Your cookie now stores JSON: { access_token, ion_username }
  let ion_username = null;
  try {
    const parsed = JSON.parse(decodeURIComponent(authCookie));
    ion_username = parsed.ion_username;
  } catch {
    return { redirect: { destination: "/", permanent: false } };
  }

  if (!ion_username) {
    return { redirect: { destination: "/", permanent: false } };
  }

  // ✅ Filter happens entirely on the server; only filtered rows are returned
  const parsed = parseWorkbookForUser(ion_username);

  return { props: { parsed, ion_username } };
}

export default function Dashboard({ parsed, ion_username }) {
  return (
    <main>
      <h1>TJ VMT Score Lookup</h1>
      <small>Created by Tiger Deng</small>
      <h1>Score distributions for {ion_username}</h1>
      <p>If you think something is wrong, please use the <a href="https://forms.gle/VJmjSWczLyepqqj67" target="_blank" rel="noopener noreferrer" >TST Protest Form</a> to submit a protest.</p>
      <p>Problems and Solutions can be found in <a href="https://drive.google.com/drive/folders/172J6msYiVCfyp90GfWD9sc29MN_p9B8Y?usp=sharing" target="_blank" rel="noopener noreferrer" >the TSTs folder</a> in our 2025-26 public drive.</p>
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
  );
}
