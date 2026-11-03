import { useCallback, useEffect, useState } from "react";
import { deleteRecord, fetchHistory } from "../api.js";

const fmt = (d) => new Date(d).toLocaleString();

export default function History() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchHistory(page));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteRecord(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <div className="row between">
        <h1>Email history</h1>
        <span className="muted">{data.total} total</span>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && !error && data.items.length === 0 && <p className="muted">No emails sent yet.</p>}

      {data.items.map((m) => (
        <div className="history-item" key={m._id}>
          <div className="row between">
            <div>
              <div className="subject">{m.subject}</div>
              <div className="muted small">
                {fmt(m.createdAt)} · {m.recipients.length} recipient{m.recipients.length === 1 ? "" : "s"} ·{" "}
                {m.sentCount} sent, {m.failedCount} failed
              </div>
            </div>
            <span className={`badge ${m.status}`}>{m.status}</span>
          </div>

          <div className="row gap">
            <button className="btn ghost small" onClick={() => setOpenId(openId === m._id ? null : m._id)}>
              {openId === m._id ? "Hide details" : "Details"}
            </button>
            <button className="btn ghost small danger" onClick={() => remove(m._id)}>
              Delete
            </button>
          </div>

          {openId === m._id && (
            <div className="details">
              <pre>{m.body}</pre>
              <table>
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Status</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {m.recipients.map((r) => (
                    <tr key={r.email}>
                      <td>{r.email}</td>
                      <td>
                        <span className={`badge ${r.status}`}>{r.status}</span>
                      </td>
                      <td className="muted small">{r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {data.pages > 1 && (
        <div className="row gap center">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Prev
          </button>
          <span className="muted">
            Page {data.page} of {data.pages}
          </span>
          <button className="btn ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
