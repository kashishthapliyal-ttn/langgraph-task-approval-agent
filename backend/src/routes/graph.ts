import { Router } from "express";
import { z } from "zod";
import { resumeAgentRun, startAgentRun } from "../graph/graph";

const router = Router();

const StartSchema = z.object({
  input: z.string().min(1, "Input is needed"),
});

const ResumeSchema = z.union([
  z.object({
    threadId: z.string().min(1, "threadId is required"),
    answers: z.record(z.string(), z.string()),
  }),
  z.object({
    threadId: z.string().min(1, "threadId is required"),
    approve: z.boolean(),
  }),
]);

function jsonResume(body: z.infer<typeof ResumeSchema>): unknown {
  if ("answers" in body) {
    return body.answers;
  }
  return { approve: body.approve };
}

router.post("/", async (req, res) => {
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Error while parsing input",
    });
  }

  try {
    const result = await startAgentRun(parsed.data.input);

    if ("final" in result) {
      return res.json({
        status: "ok",
        data: {
          kind: "final",
          final: result.final,
        },
      });
    }

    if ("interrupt" in result) {
      const i = result.interrupt;
      if (i.kind === "needs_clarify") {
        return res.json({
          status: "ok",
          data: {
            kind: "needs_clarify",
            interrupt: {
              threadId: i.threadId,
              fields: i.fields,
              prompt: i.prompt,
            },
          },
        });
      }
      return res.json({
        status: "ok",
        data: {
          kind: "needs_approval",
          interrupt: {
            threadId: i.threadId,
            steps: i.steps,
            prompt: i.prompt,
          },
        },
      });
    }

    return res.status(500).json({
      status: "error",
      error: "Some error occured",
    });
  } catch {
    return res.status(500).json({
      status: "error",
      error: "Some error occured",
    });
  }
});

router.post("/approve", async (req, res) => {
  const parsed = ResumeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      status: "error",
      error: "Error while parsing input",
    });
  }

  try {
    const result = await resumeAgentRun({
      threadId: parsed.data.threadId,
      resume: jsonResume(parsed.data),
    });

    if ("final" in result) {
      return res.json({
        status: "ok",
        data: { kind: "final", final: result.final },
      });
    }

    const i = result.interrupt;
    if (i.kind === "needs_clarify") {
      return res.json({
        status: "ok",
        data: {
          kind: "needs_clarify",
          interrupt: {
            threadId: i.threadId,
            fields: i.fields,
            prompt: i.prompt,
          },
        },
      });
    }

    return res.json({
      status: "ok",
      data: {
        kind: "needs_approval",
        interrupt: {
          threadId: i.threadId,
          steps: i.steps,
          prompt: i.prompt,
        },
      },
    });
  } catch {
    return res.status(500).json({
      status: "error",
      error: "Some error occured",
    });
  }
});

export default router;
