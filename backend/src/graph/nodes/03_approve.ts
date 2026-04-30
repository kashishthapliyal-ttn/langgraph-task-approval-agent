import { interrupt } from "@langchain/langgraph";
import { State } from "../types";

export async function approveNode(state: State): Promise<Partial<State>> {
  if (state.status === "cancelled") return {};

  const steps = state.steps ?? [];

  if (steps.length === 0) {
    return {
      approved: true,
      message: "No steps to approve; procedding->",
    };
  }

  const decision = interrupt({ type: "approval_request", steps });

  let approved: boolean;

  if (
    decision &&
    typeof decision === "object" &&
    "approve" in (decision as object)
  ) {
    approved = !!(decision as { approve?: boolean }).approve;
  } else {
    approved = !!decision;
  }

  return {
    approved,
  };
}
