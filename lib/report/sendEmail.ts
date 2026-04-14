export type SendEmailResult = {
  id?: string | null;
};

export type SendEmailInput = {
  subject: string;
  html: string;
  recipients?: string[];
};

function getEnv(key: string) {
  return process.env[key];
}

function parseRecipients(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateEmailEnv() {
  const apiKey = getEnv("RESEND_API_KEY");
  const from = getEnv("REPORT_FROM");
  const recipients = parseRecipients(getEnv("REPORT_RECIPIENTS"));

  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing REPORT_FROM");
  if (!recipients.length) throw new Error("Missing REPORT_RECIPIENTS");

  return { apiKey, from, recipients };
}

const EMAIL_MAX_RETRIES = 2;
const EMAIL_RETRY_DELAY_MS = 1000;

export async function sendReportEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const { apiKey, from, recipients } = validateEmailEnv();
  const to = input.recipients?.length ? input.recipients : recipients;
  const body = JSON.stringify({
    from,
    to,
    subject: input.subject,
    html: input.html,
  });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  for (let attempt = 0; attempt <= EMAIL_MAX_RETRIES; attempt++) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body,
    });

    if (response.ok) {
      const data = (await response.json()) as { id?: string };
      return { id: data.id ?? null };
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === EMAIL_MAX_RETRIES) {
      const detail = await response.text();
      throw new Error(`Resend failed: ${response.status} ${detail}`);
    }

    const delay = EMAIL_RETRY_DELAY_MS * Math.pow(2, attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("Resend failed after retries");
}
