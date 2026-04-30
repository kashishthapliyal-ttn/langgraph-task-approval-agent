import { describe, it, expect, vi, beforeEach } from "vitest";
import { startAgentRun, resumeAgentRun } from "./graph";
import * as model from "../utils/model";

vi.mock("../utils/model", () => ({
  getChatModel: vi.fn(),
}));

const LONG_STEPS = [
  "First concrete step for the user goal task here",
  "Second concrete step continues the work nicely",
  "Third concrete step wraps up the planned work okay",
];

describe("HITL graph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pauses for approval when no clarification fields are needed", async () => {
    let n = 0;
    vi.mocked(model.getChatModel).mockImplementation(
      () =>
        ({
          withStructuredOutput: () => ({
            invoke: vi.fn(async () => {
              n += 1;
              if (n === 1) return { fields: [] };
              return { steps: LONG_STEPS };
            }),
          }),
        }) as unknown as ReturnType<typeof model.getChatModel>,
    );

    const r = await startAgentRun(
      "Plan a simple three-day walking routine for a beginner",
    );
    expect("interrupt" in r).toBe(true);
    if ("interrupt" in r && r.interrupt.kind === "needs_approval") {
      expect(r.interrupt.steps.length).toBeGreaterThan(0);
    }
  });

  it("pauses for clarify then approval and can finish after approve", async () => {
    let n = 0;
    vi.mocked(model.getChatModel).mockImplementation(
      () =>
        ({
          withStructuredOutput: () => ({
            invoke: vi.fn(async () => {
              n += 1;
              if (n === 1) {
                return {
                  fields: [{ key: "age", label: "Your age (years)" }],
                };
              }
              if (n === 2) {
                return { steps: LONG_STEPS };
              }
              return {
                notes: [
                  "Execution note one for the first planned step in list",
                  "Execution note two for the second planned step in list",
                  "Execution note three for the third planned step in list",
                ],
              };
            }),
          }),
        }) as unknown as ReturnType<typeof model.getChatModel>,
    );

    const first = await startAgentRun(
      "Suggest a 7 day workout plan but first ask my age and height",
    );
    expect("interrupt" in first).toBe(true);
    if (!("interrupt" in first)) return;

    expect(first.interrupt.kind).toBe("needs_clarify");
    const tid = first.interrupt.threadId;

    const afterAnswers = await resumeAgentRun({
      threadId: tid,
      resume: { age: "30" },
    });
    expect("interrupt" in afterAnswers).toBe(true);
    if (!("interrupt" in afterAnswers)) return;
    expect(afterAnswers.interrupt.kind).toBe("needs_approval");

    const done = await resumeAgentRun({
      threadId: tid,
      resume: { approve: true },
    });
    expect("final" in done).toBe(true);
    if ("final" in done) {
      expect(done.final.status).toBe("done");
      expect(done.final.results?.length).toBeGreaterThan(0);
    }
  });
});
