import { State } from "../types";

function getMessage(state: any, results: any[], steps: any[]): string {
  if (state.message) return state.message;

  if (results.length) {
    return `Completed ${results.length} steps`;
  }

  if (steps.length) {
    return "Plan is approved. No execution notes were generated";
  }

  return "Finished";
}

export async function finalizeNode(state: State): Promise<Partial<State>> {
  const approved = state.approved ?? false;
  const results = state.results ?? [];
  const steps = state.steps ?? [];
  const currentStatus = state.status;

  let status: State["status"];

  if (currentStatus === "cancelled" || approved === false) {
    status = "cancelled";
  } else {
    status = "done";
  }

  let message: string;
  if (status === "cancelled") {
    message =
      state.message ??
      (steps.length
        ? "User rejected the plan. Nothing executed"
        : "Cancelled before starting");
  } else {
    message = getMessage(state, results, steps);
  }

  return {
    status,
    message,
    steps,
    results,
  };
}
