import { useMemo, useState } from "react";
import { sendMail } from "../api.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function parseRecipients(text) {
  return [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export default function Compose() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientText, setRecipientText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'error'|'warning', message, email }
  const [touched, setTouched] = useState(false);

  const recipients = useMemo(() => parseRecipients(recipientText), [recipientText]);
  const invalid = recipients.filter((e) => !EMAIL_RE.test(e));
  const valid = recipients.length - invalid.length;

  const errors = {};
  if (!subject.trim()) errors.subject = "Subject is required";
  if (!body.trim()) errors.body = "Email body is required";
  if (recipients.length === 0) errors.recipients = "Add at least one recipient";
  else if (invalid.length) errors.recipients = `Invalid: ${invalid.join(", ")}`;

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setResult(null);
    if (Object.keys(errors).length) return;

    setSending(true);
    try {
      const data = await sendMail({ subject, body, recipients });
      setResult({
        type: data.email.status === "sent" ? "success" : "warning",
        message: data.message,
        email: data.email,
      });
      if (data.email.status === "sent") {
        setSubject("");
        setBody("");
        setRecipientText("");
        setTouched(false);
      }
    } catch (err) {
      setResult({ type: "error", message: err.message, email: err.data?.email });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card">
      <h1>Compose bulk email</h1>
      <form onSubmit={submit} noValidate>
        <label>
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Weekly newsletter" />
          {touched && errors.subject && <span className="field-error">{errors.subject}</span>}
        </label>

        <label>
          Recipients
          <textarea
            rows={4}
            value={recipientText}
            onChange={(e) => setRecipientText(e.target.value)}
            placeholder="alice@example.com, bob@example.com&#10;or one per line"
          />
          <span className="hint">
            Separate with commas, spaces or new lines. {recipients.length > 0 && `${valid} valid`}
            {invalid.length > 0 && `, ${invalid.length} invalid`}
          </span>
          {touched && errors.recipients && <span className="field-error">{errors.recipients}</span>}
        </label>

        {recipients.length > 0 && (
          <div className="chips">
            {recipients.map((r) => (
              <span key={r} className={`chip ${EMAIL_RE.test(r) ? "" : "bad"}`}>
                {r}
              </span>
            ))}
          </div>
        )}

        <label>
          Message
          <textarea rows={9} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your email…" />
          {touched && errors.body && <span className="field-error">{errors.body}</span>}
        </label>

        <button className="btn primary" disabled={sending}>
          {sending ? `Sending to ${recipients.length}…` : `Send to ${valid || ""} recipient${valid === 1 ? "" : "s"}`}
        </button>
      </form>

      {result && (
        <div className={`alert ${result.type}`}>
          <strong>{result.message}</strong>
          {result.email?.previewUrl && (
            <div>
              Test inbox preview:{" "}
              <a href={result.email.previewUrl} target="_blank" rel="noreferrer">
                open
              </a>
            </div>
          )}
          {result.email?.failedCount > 0 && (
            <ul>
              {result.email.recipients
                .filter((r) => r.status === "failed")
                .map((r) => (
                  <li key={r.email}>
                    {r.email}: {r.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
