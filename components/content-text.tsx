export function ContentText({ text }: { text: string }) {
  return (
    <div className="content-text">
      {text
        .trim()
        .split(/\n\s*\n/)
        .map((block, index) => {
          if (/^#{1,3} /.test(block)) {
            const [heading, ...rest] = block.split("\n");
            return (
              <section key={index}>
                <h3>{heading.replace(/^#+ /, "")}</h3>
                {rest.length > 0 && <p>{rest.join("\n")}</p>}
              </section>
            );
          }
          if (block.startsWith("|")) {
            const rows = block
              .split("\n")
              .filter((line) => !/^\|[\s:|\-]+\|$/.test(line))
              .map((row) =>
                row
                  .split("|")
                  .slice(1, -1)
                  .map((cell) => cell.trim()),
              );
            return (
              <div className="document-table" key={index}>
                <table>
                  <thead>
                    <tr>
                      {rows[0]?.map((cell, i) => (
                        <th key={i}>{cell}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(1).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          if (block.startsWith("- "))
            return (
              <ul key={index}>
                {block.split("\n").map((line, i) => (
                  <li key={i}>{line.replace(/^- /, "")}</li>
                ))}
              </ul>
            );
          return <p key={index}>{block}</p>;
        })}
    </div>
  );
}
