"use client";

import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { keyframes } from "@emotion/react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  LinearProgress,
  Stack,
  Typography,
  alpha,
} from "@mui/material";

const dotCycle = keyframes`
  0%, 100% { opacity: 0.28; transform: scale(0.88); }
  50% { opacity: 1; transform: scale(1); }
`;

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

const GOOGLE_BLUE = "#1a73e8";

const BRAND = ["#1a73e8", "#ea4335", "#fbbc04", "#34a853"] as const;

export type PipelineStepDef = {
  id: string;
  title: string;
  detail: string;
};

export const PIPELINE_STEPS: PipelineStepDef[] = [
  {
    id: "read",
    title: "Reading your question",
    detail: "Figuring out what to look up in your data.",
  },
  {
    id: "sql",
    title: "Creating SQL",
    detail: "Drafting a read-only query that matches your schema.",
  },
  {
    id: "run",
    title: "Running the query",
    detail: "Executing on the database with safety checks.",
  },
  {
    id: "finish",
    title: "Finishing up",
    detail: "Preparing the statement and table for this page.",
  },
];

export const PIPELINE_STEP_COUNT = PIPELINE_STEPS.length;

export type PipelineFailure = {
  stepIndex: number;
  message: string;
  generatedSql?: string;
};

type Phase = "idle" | "running" | "success" | "error";

const ERROR_RED = "#d93025";

function doneStepIconBox() {
  return {
    width: 22,
    height: 22,
    borderRadius: "50%",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    bgcolor: GOOGLE_BLUE,
    color: "#fff",
  } as const;
}

function SqlCreatedAccordion({
  step,
  sql,
  rationale,
}: Readonly<{
  step: PipelineStepDef;
  sql: string;
  rationale?: string;
}>) {
  return (
    <Box
      component="li"
      sx={{
        listStyle: "none",
        width: "100%",
        py: 0,
        px: 0,
        borderRadius: 1.5,
        borderLeft: "3px solid",
        borderLeftColor: alpha(GOOGLE_BLUE, 0.35),
        bgcolor: "transparent",
      }}
    >
      <Accordion
        defaultExpanded
        disableGutters
        elevation={0}
        sx={{
          width: "100%",
          m: 0,
          bgcolor: "transparent",
          "&:before": { display: "none" },
          boxShadow: "none",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary" }} />}
          sx={{
            minHeight: 52,
            px: { xs: 1.5, sm: 2 },
            py: 0.5,
            width: "100%",
            "& .MuiAccordionSummary-content": {
              my: 1,
              alignItems: "flex-start",
              flex: 1,
              minWidth: 0,
              width: "100%",
            },
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ width: "100%", alignItems: "flex-start" }}
          >
            <Box sx={doneStepIconBox()}>
              <CheckRoundedIcon sx={{ fontSize: 14, color: "#fff" }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1, pt: 0.1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: GOOGLE_BLUE,
                  lineHeight: 1.4,
                }}
              >
                {step.title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.25,
                  lineHeight: 1.45,
                  color: GOOGLE_BLUE,
                }}
              >
                {step.detail}
              </Typography>
            </Box>
          </Stack>
        </AccordionSummary>
        <AccordionDetails
          sx={{
            px: { xs: 1.5, sm: 2 },
            pb: 2,
            pt: 0,
            borderTop: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
          }}
        >
          <Stack spacing={1.5} sx={{ width: "100%", maxWidth: "100%" }}>
            <Box sx={{ width: "100%", minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ display: "block", mb: 0.5, mt: 1 }}
              >
                Generated SQL
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: (t) => alpha(t.palette.common.black, 0.35),
                  border: (t) =>
                    `1px solid ${alpha(t.palette.common.white, 0.06)}`,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                  fontSize: "0.75rem",
                  lineHeight: 1.55,
                  overflow: "auto",
                  maxHeight: { xs: "min(42vh, 280px)", sm: "min(45vh, 360px)" },
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "grey.200",
                }}
              >
                {sql}
              </Box>
            </Box>
            {rationale ? (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ display: "block", mb: 0.5 }}
                >
                  Rationale
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.55 }}
                >
                  {rationale}
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

function failedStepIconBox() {
  return {
    width: 22,
    height: 22,
    borderRadius: "50%",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    bgcolor: ERROR_RED,
    color: "#fff",
  } as const;
}

function FailedStepAccordion({
  step,
  failure,
}: Readonly<{
  step: PipelineStepDef;
  failure: PipelineFailure;
}>) {
  return (
    <Box
      component="li"
      sx={{
        listStyle: "none",
        width: "100%",
        py: 0,
        px: 0,
        borderRadius: 1.5,
        borderLeft: "3px solid",
        borderLeftColor: alpha(ERROR_RED, 0.85),
        bgcolor: (t) => alpha(t.palette.error.main, 0.06),
      }}
    >
      <Accordion
        defaultExpanded
        disableGutters
        elevation={0}
        sx={{
          width: "100%",
          m: 0,
          bgcolor: "transparent",
          "&:before": { display: "none" },
          boxShadow: "none",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary" }} />}
          sx={{
            minHeight: 52,
            px: { xs: 1.5, sm: 2 },
            py: 0.5,
            width: "100%",
            "& .MuiAccordionSummary-content": {
              my: 1,
              alignItems: "flex-start",
              flex: 1,
              minWidth: 0,
              width: "100%",
            },
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ width: "100%", alignItems: "flex-start" }}
          >
            <Box sx={failedStepIconBox()}>
              <CloseRoundedIcon sx={{ fontSize: 14, color: "#fff" }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1, pt: 0.1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: ERROR_RED,
                  lineHeight: 1.4,
                }}
              >
                {step.title}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.25,
                  lineHeight: 1.45,
                  color: (t) => alpha(t.palette.error.main, 0.95),
                }}
              >
                {step.detail}
              </Typography>
            </Box>
          </Stack>
        </AccordionSummary>
        <AccordionDetails
          sx={{
            px: { xs: 1.5, sm: 2 },
            pb: 2,
            pt: 0,
            borderTop: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
          }}
        >
          <Stack spacing={1.5} sx={{ width: "100%", minWidth: 0 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.55 }}
            >
              {failure.message}
            </Typography>
            {failure.generatedSql ? (
              <Box sx={{ width: "100%", minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ display: "block", mb: 0.5 }}
                >
                  Generated SQL (if any)
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: (t) => alpha(t.palette.common.black, 0.35),
                    border: (t) =>
                      `1px solid ${alpha(t.palette.common.white, 0.06)}`,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                    fontSize: "0.75rem",
                    lineHeight: 1.55,
                    overflow: "auto",
                    maxHeight: {
                      xs: "min(36vh, 240px)",
                      sm: "min(40vh, 320px)",
                    },
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "grey.200",
                  }}
                >
                  {failure.generatedSql}
                </Box>
              </Box>
            ) : null}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export default function QueryRunProgress({
  activeIndex,
  phase,
  failure,
  generatedSql,
  generatedRationale,
}: Readonly<{
  activeIndex: number;
  phase: Phase;
  failure?: PipelineFailure | null;
  generatedSql?: string | null;
  generatedRationale?: string | null;
}>) {
  const show = phase === "running" || phase === "success" || phase === "error";
  if (!show) return null;

  const failedAt =
    phase === "error" && failure != null
      ? Math.min(Math.max(0, failure.stepIndex), PIPELINE_STEPS.length - 1)
      : -1;

  let statusHeadline = "Working…";
  if (phase === "success") statusHeadline = "Finished";
  else if (phase === "error") statusHeadline = "Failed";

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        alignSelf: "stretch",
        borderRadius: 2,
        px: { xs: 2, sm: 2.5 },
        py: { xs: 2.25, sm: 2.75 },
        mb: 2,
        border: (t) => `1px solid ${alpha(t.palette.divider, 0.9)}`,
        bgcolor: (t) => alpha(t.palette.background.paper, 0.5),
        boxShadow: (t) =>
          `0 1px 0 ${alpha(t.palette.common.white, 0.06)} inset, 0 8px 32px ${alpha("#000", 0.12)}`,
        overflow: "hidden",
      }}
    >
      <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0 }}>
        <Stack spacing={1} alignItems="center" sx={{ width: "100%" }}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              textAlign: "center",
              letterSpacing: "0.01em",
            }}
          >
            {statusHeadline}
          </Typography>

          {phase === "running" ? (
            <>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                aria-hidden
              >
                {BRAND.map((color, i) => (
                  <Box
                    key={color}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: color,
                      opacity: 0.9,
                      animation: `${dotCycle} 1.2s ${EASE} infinite`,
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                ))}
              </Stack>

              <Box sx={{ width: "100%", maxWidth: "100%" }}>
                <LinearProgress
                  variant="indeterminate"
                  sx={{
                    height: 3,
                    borderRadius: 1,
                    bgcolor: (t) => alpha(t.palette.common.white, 0.06),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 1,
                      bgcolor: (t) => alpha(t.palette.text.primary, 0.35),
                    },
                  }}
                />
              </Box>
            </>
          ) : null}
        </Stack>

        <Stack
          component="ol"
          spacing={2}
          sx={{
            m: 0,
            p: 0,
            listStyle: "none",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
          }}
        >
          {PIPELINE_STEPS.flatMap((step, i) => {
            const sqlDone =
              Boolean(generatedSql) &&
              activeIndex > 1 &&
              !(phase === "error" && failedAt === 1);

            if (phase === "error" && failure && i === failedAt) {
              return [
                <FailedStepAccordion
                  key={step.id}
                  step={step}
                  failure={failure}
                />,
              ];
            }

            const done =
              phase === "error" && failedAt >= 0
                ? i < failedAt
                : i < activeIndex;
            const current =
              phase === "error" && failedAt >= 0 ? false : i === activeIndex;
            const pending =
              phase === "error" && failedAt >= 0
                ? i > failedAt
                : i > activeIndex;

            let leftBorder: string = "transparent";
            if (current) leftBorder = GOOGLE_BLUE;
            else if (done) leftBorder = alpha(GOOGLE_BLUE, 0.35);

            let titleColor: string = "text.disabled";
            if (done || current) titleColor = GOOGLE_BLUE;

            let detailColor: string = "text.secondary";
            if (done) detailColor = GOOGLE_BLUE;
            else if (current) detailColor = alpha(GOOGLE_BLUE, 0.88);

            if (step.id === "sql" && sqlDone && generatedSql) {
              return [
                <SqlCreatedAccordion
                  key={step.id}
                  step={step}
                  sql={generatedSql}
                  rationale={generatedRationale ?? undefined}
                />,
              ];
            }

            const row = (
              <Box
                component="li"
                key={step.id}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  width: "100%",
                  minWidth: 0,
                  py: 1.25,
                  px: { xs: 1.25, sm: 1.5 },
                  borderRadius: 1,
                  transition: `background-color 200ms ${EASE}, border-color 200ms ${EASE}`,
                  bgcolor: current ? alpha(GOOGLE_BLUE, 0.1) : "transparent",
                  borderLeft: "3px solid",
                  borderLeftColor: leftBorder,
                }}
              >
                <Box
                  sx={(t) => {
                    if (done) {
                      return {
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: GOOGLE_BLUE,
                        color: "#fff",
                      };
                    }
                    if (current) {
                      return {
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: GOOGLE_BLUE,
                        color: "#fff",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      };
                    }
                    return {
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      border: `1px solid ${alpha(t.palette.divider, 0.9)}`,
                      color: "text.disabled",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                    };
                  }}
                >
                  {done ? (
                    <CheckRoundedIcon sx={{ fontSize: 14, color: "#fff" }} />
                  ) : (
                    <Typography component="span" variant="caption">
                      {i + 1}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1, pt: 0.1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: current ? 600 : 500,
                      color: titleColor,
                      lineHeight: 1.4,
                    }}
                  >
                    {step.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 0.25,
                      lineHeight: 1.45,
                      color: detailColor,
                      opacity: pending ? 0.45 : 1,
                    }}
                  >
                    {step.detail}
                  </Typography>
                </Box>
              </Box>
            );

            return [row];
          })}
        </Stack>
      </Stack>
    </Box>
  );
}
