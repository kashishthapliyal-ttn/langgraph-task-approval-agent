const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type AgentOkData =
  | { kind: "final"; final: unknown }
  | {
      kind: "needs_clarify";
      interrupt: {
        threadId: string;
        fields: { key: string; label: string }[];
        prompt: string;
      };
    }
  | {
      kind: "needs_approval";
      interrupt: {
        threadId: string;
        steps: string[];
        prompt: string;
      };
    };

export async function startAgent(input: string) {
  const res = await fetch(`${BASE}/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) throw new Error(`Start agent failed: ${res.status}`);

  return res.json() as Promise<{
    status: "ok" | "error";
    data?: AgentOkData;
    error?: string;
  }>;
}

export async function resumeAgent(
  threadId: string,
  payload: { approve: boolean } | { answers: Record<string, string> },
) {
  const body =
    "approve" in payload
      ? { threadId, approve: payload.approve }
      : { threadId, answers: payload.answers };

  const res = await fetch(`${BASE}/agent/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Resume agent failed: ${res.status}`);

  return res.json() as Promise<{
    status: "ok" | "error";
    data?: AgentOkData;
    error?: string;
  }>;
}
