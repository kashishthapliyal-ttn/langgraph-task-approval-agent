import { interrupt } from "@langchain/langgraph";
import { State } from "../types";

export async function clarifyAskNode(state: State): Promise<Partial<State>> {
  if (state.status === "cancelled") return {};

  const fields = state.clarifyFields ?? [];
  if (fields.length === 0) {
    return {};
  }

  const answers = interrupt({
    type: "clarify" as const,
    fields,
  }) as Record<string, string>;

  const safe: Record<string, string> = {};
  for (const f of fields) {
    const v = answers?.[f.key];
    if (typeof v === "string" && v.trim()) {
      safe[f.key] = v.trim();
    }
  }

  return {
    userAnswers: safe,
    clarifyFields: [],
  };
}
