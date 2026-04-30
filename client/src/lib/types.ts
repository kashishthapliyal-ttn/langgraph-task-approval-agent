export type ClarifyField = { key: string; label: string };

export type InterruptView =
  | {
      kind: "needs_clarify";
      threadId: string;
      fields: ClarifyField[];
      prompt: string;
    }
  | {
      kind: "needs_approval";
      threadId: string;
      steps: string[];
      prompt: string;
    };

export type FinalView = {
  status: "planned" | "done" | "cancelled";
  message?: string;
  steps?: string[];
  results?: { step: string; note: string }[];
};
