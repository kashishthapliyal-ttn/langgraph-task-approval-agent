"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import SchemaRoundedIcon from "@mui/icons-material/SchemaRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import QueryRunProgress, {
  PIPELINE_STEP_COUNT,
  type PipelineFailure,
} from "@/components/sql-agent/QueryRunProgress";
import {
  type QuerySuccessData,
  type SchemaTable,
  executeSqlAgentQuery,
  fetchSchema,
  generateSqlAgentQuery,
} from "@/lib/sqlAgentApi";

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columnNullLabel(nullable: boolean | undefined): string {
  if (nullable === false) return "NO";
  if (nullable === true) return "YES";
  return "—";
}

function resultSummaryLine(r: QuerySuccessData): string {
  if (r.rowCount === 0) return "No data rows";
  const plural = r.rowCount === 1 ? "" : "s";
  return `About ${r.rowCount} result${plural}`;
}

type ProgressPhase = "idle" | "running" | "success" | "error";

function queryRunBarPhase(
  progressPhase: ProgressPhase,
): "running" | "success" | "error" {
  if (progressPhase === "success") return "success";
  if (progressPhase === "error") return "error";
  return "running";
}

export default function SqlAgentPage() {
  const [tables, setTables] = useState<SchemaTable[] | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuerySuccessData | null>(null);
  const [pipelineFailure, setPipelineFailure] =
    useState<PipelineFailure | null>(null);
  const [generatedSqlPreview, setGeneratedSqlPreview] = useState<{
    sql: string;
    rationale?: string;
  } | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPhase, setProgressPhase] = useState<ProgressPhase>("idle");
  const abortRunRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSchema()
      .then((t) => {
        if (!cancelled) {
          setTables(t);
          setSchemaError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSchemaError("Could not load schema from the API.");
          setTables(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCancelRun = useCallback(() => {
    abortRunRef.current?.abort();
  }, []);

  const handleRun = useCallback(async () => {
    const q = question.trim();
    if (!q) return;

    abortRunRef.current?.abort();
    const controller = new AbortController();
    abortRunRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setPipelineFailure(null);
    setResult(null);
    setGeneratedSqlPreview(null);
    setProgressPhase("running");
    setProgressStep(0);

    let reachedExecuteStep = false;

    try {
      setProgressStep(1);

      const gen = await generateSqlAgentQuery(q, { signal });

      if (signal.aborted) {
        setProgressPhase("idle");
        setProgressStep(0);
        setGeneratedSqlPreview(null);
        return;
      }

      if (gen.status !== "ok") {
        setPipelineFailure({
          stepIndex: 1,
          message: gen.error,
          generatedSql: gen.generatedSql,
        });
        setProgressPhase("error");
        setProgressStep(1);
        return;
      }

      setGeneratedSqlPreview({
        sql: gen.data.sql,
        rationale: gen.data.rationale,
      });
      setProgressStep(2);
      reachedExecuteStep = true;

      const ex = await executeSqlAgentQuery(gen.data.sql, { signal });

      if (signal.aborted) {
        setProgressPhase("idle");
        setProgressStep(0);
        setGeneratedSqlPreview(null);
        return;
      }

      if (ex.status !== "ok") {
        setPipelineFailure({
          stepIndex: 2,
          message: ex.error,
          generatedSql: ex.generatedSql,
        });
        setProgressPhase("error");
        setProgressStep(2);
        return;
      }

      setResult({
        ...ex.data,
        rationale: gen.data.rationale,
      });
      setProgressStep(PIPELINE_STEP_COUNT);
      setProgressPhase("success");
    } catch (e) {
      const aborted =
        signal.aborted ||
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        setProgressPhase("idle");
        setProgressStep(0);
        setGeneratedSqlPreview(null);
        return;
      }
      setPipelineFailure({
        stepIndex: reachedExecuteStep ? 2 : 1,
        message: e instanceof Error ? e.message : "Request failed",
      });
      setProgressPhase("error");
      setProgressStep(reachedExecuteStep ? 2 : 1);
    } finally {
      setLoading(false);
      if (abortRunRef.current === controller) {
        abortRunRef.current = null;
      }
    }
  }, [question]);

  const showProgressOverlay =
    progressPhase === "running" ||
    progressPhase === "success" ||
    progressPhase === "error";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage: (t) =>
          `radial-gradient(ellipse 120% 80% at 50% -30%, ${alpha(t.palette.primary.main, 0.14)}, transparent 50%)`,
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: (t) => alpha(t.palette.background.paper, 0.72),
          backdropFilter: "blur(14px)",
        }}
      >
        <Toolbar sx={{ gap: 2, py: 1.5 }}>
          <PsychologyRoundedIcon color="primary" sx={{ fontSize: 36 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" fontWeight={700}>
              Intelligent SQL Agent
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Natural language to PostgreSQL — read-only, schema-aware
            </Typography>
          </Box>
          <Chip
            label="Live"
            size="small"
            sx={{
              fontWeight: 700,
              letterSpacing: "0.06em",
              bgcolor: (t) => alpha(t.palette.success.main, 0.15),
              color: "success.light",
              border: 1,
              borderColor: (t) => alpha(t.palette.success.main, 0.35),
            }}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderColor: "divider",
              background: (t) =>
                `linear-gradient(145deg, ${t.palette.background.paper} 0%, ${alpha(t.palette.primary.main, 0.06)} 100%)`,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <SchemaRoundedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Database schema
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Expand a table to see columns and types. The model uses the same
              definitions when generating SQL.
            </Typography>
            {schemaError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {schemaError}
              </Alert>
            )}
            {!tables && !schemaError && (
              <Stack alignItems="center" py={2}>
                <CircularProgress size={28} />
              </Stack>
            )}
            {tables?.map((table) => (
              <Accordion
                key={table.name}
                disableGutters
                elevation={0}
                sx={{
                  mb: 1,
                  bgcolor: "action.hover",
                  "&:before": { display: "none" },
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon sx={{ color: "text.secondary" }} />
                  }
                  sx={{
                    minHeight: 56,
                    "& .MuiAccordionSummary-content": {
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 2,
                      width: "100%",
                      my: 1,
                      overflow: "hidden",
                    },
                  }}
                >
                  <Typography
                    component="span"
                    variant="body2"
                    title={table.name}
                    sx={{
                      width: "13.5rem",
                      minWidth: "13.5rem",
                      maxWidth: "13.5rem",
                      flexShrink: 0,
                      fontWeight: 600,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      fontSize: "0.8125rem",
                      lineHeight: 1.5,
                      letterSpacing: "0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "text.primary",
                    }}
                  >
                    {table.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {table.description}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {table.relationships && table.relationships.length > 0 && (
                    <Stack spacing={0.75} sx={{ mb: 2, px: 0.5 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                      >
                        Relationships
                      </Typography>
                      {table.relationships.map((r, idx) => (
                        <Typography
                          key={idx}
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            pl: 1,
                            borderLeft: 2,
                            borderColor: "primary.dark",
                          }}
                        >
                          {r}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Column</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Null</TableCell>
                          <TableCell>FK</TableCell>
                          <TableCell>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {table.columns.map((c) => (
                          <TableRow key={c.name}>
                            <TableCell>
                              <Typography
                                variant="body2"
                                component="code"
                                sx={{ fontFamily: "monospace" }}
                              >
                                {c.name}
                              </Typography>
                            </TableCell>
                            <TableCell>{c.type}</TableCell>
                            <TableCell>{columnNullLabel(c.nullable)}</TableCell>
                            <TableCell>
                              {c.references ? (
                                <Typography
                                  variant="body2"
                                  color="primary.light"
                                  component="span"
                                >
                                  {c.references}
                                </Typography>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell sx={{ maxWidth: 360 }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {c.description ?? "—"}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderColor: "divider",
              boxShadow: (t) =>
                showProgressOverlay
                  ? `0 0 0 1px ${alpha(t.palette.primary.main, 0.2)}, 0 20px 50px -28px ${alpha(t.palette.primary.main, 0.35)}`
                  : "none",
              transition: "box-shadow 0.45s ease",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }} fontWeight={700}>
              Your question
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Example: “List 10 employees in the Software industry with their
              manager email.”
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              placeholder="Describe what you want to query in plain English…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontSize: "1rem",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                },
              }}
            />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mt: 2 }}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={
                  loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    <PlayArrowRoundedIcon />
                  )
                }
                onClick={() => void handleRun()}
                disabled={loading || !question.trim()}
                sx={{
                  minWidth: 168,
                  py: 1.25,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                {loading ? "Running…" : "Run query"}
              </Button>
              {loading && (
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  startIcon={<CloseRoundedIcon />}
                  onClick={handleCancelRun}
                  sx={{
                    minWidth: 132,
                    py: 1.25,
                    fontWeight: 600,
                    borderColor: "divider",
                  }}
                >
                  Cancel
                </Button>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flex: 1, alignSelf: "center" }}
              >
                {loading
                  ? "You can cancel while the request is in flight."
                  : "Read-only SELECT queries only. Row cap applies automatically."}
              </Typography>
            </Stack>
          </Paper>

          <Box
            sx={{
              width: "100%",
              minWidth: 0,
              borderRadius: "28px",
              overflow: "hidden",
              border: (t) => `1px solid ${alpha(t.palette.common.white, 0.08)}`,
              bgcolor: (t) => alpha(t.palette.background.paper, 0.55),
              backdropFilter: "blur(20px)",
              boxShadow: (t) =>
                `0 1px 2px ${alpha("#000", 0.28)}, 0 2px 8px 2px ${alpha("#000", 0.22)}`,
            }}
          >
            <Box
              sx={{
                px: { xs: 2.5, sm: 3 },
                py: 2.25,
                borderBottom: (t) =>
                  `1px solid ${alpha(t.palette.divider, 0.9)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                    color: "primary.main",
                  }}
                >
                  <TableChartRoundedIcon />
                </Box>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: "text.secondary",
                      letterSpacing: "0.14em",
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    Response
                  </Typography>
                  <Typography
                    component="h2"
                    sx={{
                      fontWeight: 500,
                      fontSize: { xs: "1.25rem", sm: "1.5rem" },
                      letterSpacing: "-0.02em",
                      lineHeight: 1.25,
                      mt: 0.25,
                    }}
                  >
                    Query output
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Box
              sx={{
                px: { xs: 2.5, sm: 3 },
                py: 2.5,
                width: "100%",
                minWidth: 0,
              }}
            >
              {showProgressOverlay && (
                <Box sx={{ pb: 0.5, width: "100%", minWidth: 0 }}>
                  <QueryRunProgress
                    activeIndex={progressStep}
                    phase={queryRunBarPhase(progressPhase)}
                    failure={progressPhase === "error" ? pipelineFailure : null}
                    generatedSql={
                      generatedSqlPreview?.sql ?? result?.sql ?? null
                    }
                    generatedRationale={
                      generatedSqlPreview?.rationale ?? result?.rationale
                    }
                  />
                </Box>
              )}

              {progressPhase === "success" && result && (
                <Box sx={{ mt: 1.5, width: "100%", minWidth: 0 }}>
                  <Accordion
                    defaultExpanded={false}
                    disableGutters
                    elevation={0}
                    sx={{
                      width: "100%",
                      borderRadius: 2,
                      border: (t) =>
                        `1px solid ${alpha(t.palette.divider, 0.85)}`,
                      bgcolor: (t) => alpha(t.palette.background.paper, 0.45),
                      "&:before": { display: "none" },
                      overflow: "hidden",
                    }}
                  >
                    <AccordionSummary
                      expandIcon={
                        <ExpandMoreIcon sx={{ color: "text.secondary" }} />
                      }
                      sx={{
                        minHeight: 48,
                        px: { xs: 1.5, sm: 2 },
                        "& .MuiAccordionSummary-content": {
                          my: 1,
                          alignItems: "center",
                          gap: 1.5,
                          flexWrap: "wrap",
                        },
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                      >
                        Results
                      </Typography>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={resultSummaryLine(result)}
                        sx={{
                          height: 26,
                          fontWeight: 600,
                          borderColor: "divider",
                          color: "text.secondary",
                        }}
                      />
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{
                        px: { xs: 1.5, sm: 2 },
                        pb: 2.5,
                        pt: 0,
                        borderTop: (t) =>
                          `1px solid ${alpha(t.palette.divider, 0.75)}`,
                      }}
                    >
                      <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0 }}>
                        <Box sx={{ width: "100%", minWidth: 0 }}>
                          <Typography
                            variant="overline"
                            sx={{
                              color: "text.secondary",
                              letterSpacing: "0.12em",
                              fontWeight: 700,
                              display: "block",
                              mb: 1,
                            }}
                          >
                            Generated SQL
                          </Typography>
                          <Box
                            component="pre"
                            tabIndex={0}
                            sx={{
                              m: 0,
                              p: 2,
                              borderRadius: "12px",
                              width: "100%",
                              boxSizing: "border-box",
                              bgcolor: (t) =>
                                alpha(t.palette.common.black, 0.35),
                              border: (t) =>
                                `1px solid ${alpha(t.palette.common.white, 0.06)}`,
                              fontFamily:
                                '"Google Sans Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                              fontSize: "0.8125rem",
                              lineHeight: 1.65,
                              overflow: "auto",
                              maxHeight: 280,
                              color: "grey.100",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {result.sql}
                          </Box>
                          {result.rationale ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mt: 1.5,
                                lineHeight: 1.6,
                                maxWidth: "100%",
                              }}
                            >
                              {result.rationale}
                            </Typography>
                          ) : null}
                        </Box>

                        <Divider sx={{ opacity: 0.5 }} />

                        <Box sx={{ width: "100%", minWidth: 0 }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            flexWrap="wrap"
                            gap={1}
                            sx={{ mb: 1.5 }}
                          >
                            <Typography
                              variant="overline"
                              sx={{
                                color: "text.secondary",
                                letterSpacing: "0.12em",
                                fontWeight: 700,
                              }}
                            >
                              Data preview
                            </Typography>
                            <Chip
                              size="small"
                              label={`${result.rowCount} rows · max ${result.maxRows}`}
                              sx={{
                                height: 28,
                                fontWeight: 600,
                                bgcolor: (t) =>
                                  alpha(t.palette.common.white, 0.06),
                                border: (t) =>
                                  `1px solid ${alpha(t.palette.common.white, 0.08)}`,
                                color: "text.secondary",
                              }}
                            />
                          </Stack>
                          {result.columns.length === 0 ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ py: 1 }}
                            >
                              No rows returned.
                            </Typography>
                          ) : (
                            <TableContainer
                              sx={{
                                width: "100%",
                                maxWidth: "100%",
                                maxHeight: {
                                  xs: "min(52vh, 420px)",
                                  sm: "min(56vh, 560px)",
                                },
                                borderRadius: "12px",
                                border: (t) =>
                                  `1px solid ${alpha(t.palette.common.white, 0.07)}`,
                                bgcolor: (t) =>
                                  alpha(t.palette.common.black, 0.2),
                              }}
                            >
                              <Table
                                stickyHeader
                                size="medium"
                                sx={{
                                  width: "100%",
                                  minWidth: "100%",
                                  tableLayout: "auto",
                                }}
                              >
                                <TableHead>
                                  <TableRow>
                                    {result.columns.map((col) => (
                                      <TableCell
                                        key={col}
                                        sx={{
                                          bgcolor: (t) =>
                                            alpha(
                                              t.palette.background.paper,
                                              0.97,
                                            ),
                                          borderBottom: (t) =>
                                            `1px solid ${alpha(t.palette.divider, 0.8)}`,
                                          fontWeight: 600,
                                          fontSize: "0.7rem",
                                          letterSpacing: "0.06em",
                                          textTransform: "uppercase",
                                          color: "text.secondary",
                                          py: 1.5,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {col}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {result.rows.map((row, idx) => (
                                    <TableRow
                                      key={`result-row-${idx}`}
                                      hover
                                      sx={{
                                        "&:nth-of-type(even)": {
                                          bgcolor: (t) =>
                                            alpha(t.palette.common.white, 0.02),
                                        },
                                        "&:last-of-type td": {
                                          borderBottom: 0,
                                        },
                                      }}
                                    >
                                      {result.columns.map((col) => (
                                        <TableCell
                                          key={col}
                                          sx={{
                                            borderColor: (t) =>
                                              alpha(t.palette.divider, 0.35),
                                            fontSize: "0.8125rem",
                                            py: 1.35,
                                            color: "text.primary",
                                            verticalAlign: "top",
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {formatCell(row[col])}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}
                        </Box>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}

              {!showProgressOverlay && !result && !pipelineFailure && (
                <Stack
                  alignItems="center"
                  spacing={1.5}
                  sx={{
                    py: 5,
                    px: 2,
                    textAlign: "center",
                    color: "text.secondary",
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      bgcolor: (t) => alpha(t.palette.action.hover, 0.5),
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <TableChartRoundedIcon
                      sx={{ opacity: 0.5, fontSize: 28 }}
                    />
                  </Box>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 500, maxWidth: 360 }}
                  >
                    Run a query to see SQL and results here
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.85, maxWidth: 420 }}
                  >
                    Answers appear in a clean layout with the generated
                    statement and a scrollable table—similar to how you’d scan
                    output in a workspace.
                  </Typography>
                </Stack>
              )}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
