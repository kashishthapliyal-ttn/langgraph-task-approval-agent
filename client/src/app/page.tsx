"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useRef, useState } from "react";
import QueryRunProgress, {
  PIPELINE_STEP_COUNT,
  type PipelineFailure,
} from "@/components/sql-agent/QueryRunProgress";
import SchemaExplorer, {
  SchemaExplorerHeader,
} from "@/components/sql-agent/SchemaExplorer";
import {
  type SchemaTable,
  generateSqlAgentQuery,
  parseSqlSchema,
} from "@/lib/sqlAgentApi";

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
  const [schemaId, setSchemaId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [pipelineFailure, setPipelineFailure] =
    useState<PipelineFailure | null>(null);
  const [generatedSql, setGeneratedSql] = useState<{
    sql: string;
    rationale?: string;
  } | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPhase, setProgressPhase] = useState<ProgressPhase>("idle");
  const abortRunRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSqlFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".sql")) {
      setUploadError("Please upload a .sql file.");
      return;
    }

    setUploadLoading(true);
    setUploadError(null);
    setTables(null);
    setSchemaId(null);
    setUploadedFileName(null);
    setGeneratedSql(null);
    setProgressPhase("idle");
    setPipelineFailure(null);

    try {
      const sql = await file.text();
      const result = await parseSqlSchema(sql);
      if (result.status !== "ok") {
        setUploadError(result.error);
        return;
      }
      setTables(result.data.tables);
      setSchemaId(result.data.schemaId);
      setUploadedFileName(file.name);
    } catch {
      setUploadError("Failed to read or parse the SQL file.");
    } finally {
      setUploadLoading(false);
    }
  }, []);

  const handleCancelRun = useCallback(() => {
    abortRunRef.current?.abort();
  }, []);

  const handleGenerate = useCallback(async () => {
    const q = question.trim();
    if (!q || !schemaId) return;

    abortRunRef.current?.abort();
    const controller = new AbortController();
    abortRunRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setPipelineFailure(null);
    setGeneratedSql(null);
    setProgressPhase("running");
    setProgressStep(0);

    try {
      setProgressStep(1);

      const gen = await generateSqlAgentQuery(q, schemaId, { signal });

      if (signal.aborted) {
        setProgressPhase("idle");
        setProgressStep(0);
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

      setGeneratedSql({
        sql: gen.data.sql,
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
        return;
      }
      setPipelineFailure({
        stepIndex: 1,
        message: e instanceof Error ? e.message : "Request failed",
      });
      setProgressPhase("error");
      setProgressStep(1);
    } finally {
      setLoading(false);
      if (abortRunRef.current === controller) {
        abortRunRef.current = null;
      }
    }
  }, [question, schemaId]);

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
            <Typography variant="h6" fontWeight={700}>
              Intelligent SQL Agent
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload schema SQL — generate read-only queries (no execution)
            </Typography>
          </Box>
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
              <UploadFileRoundedIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Upload schema (.sql)
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a PostgreSQL DDL file with CREATE TABLE statements. Tables,
              columns, and foreign keys are parsed to build the schema UI below.
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql,text/plain"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleSqlFile(file);
                e.target.value = "";
              }}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="contained"
                startIcon={
                  uploadLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <UploadFileRoundedIcon />
                  )
                }
                disabled={uploadLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadLoading ? "Parsing…" : "Choose .sql file"}
              </Button>
              {uploadedFileName && (
                <Chip
                  label={uploadedFileName}
                  variant="outlined"
                  sx={{ alignSelf: "center", maxWidth: "100%" }}
                />
              )}
            </Stack>
            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            )}
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderColor: "divider",
              background: (t) =>
                `linear-gradient(145deg, ${t.palette.background.paper} 0%, ${alpha(t.palette.primary.main, 0.06)} 100%)`,
            }}
          >
            <SchemaExplorerHeader />
            <SchemaExplorer tables={tables} loading={uploadLoading} />
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
              Describe the query you want in plain English. The agent generates
              a read-only SELECT using only your uploaded schema.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              placeholder="Describe what you want to query in plain English…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading || !tables}
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
                onClick={() => void handleGenerate()}
                disabled={loading || !question.trim() || !schemaId}
                sx={{
                  minWidth: 168,
                  py: 1.25,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                {loading ? "Generating…" : "Generate SQL"}
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
                {!schemaId
                  ? "Upload a schema file before generating SQL."
                  : loading
                    ? "You can cancel while the request is in flight."
                    : "Queries are generated only — nothing is executed against a database."}
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
                    Generated query
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
                  />
                </Box>
              )}

              {progressPhase === "success" && generatedSql && (
                <Box sx={{ mt: 1.5, width: "100%", minWidth: 0 }}>
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
                      bgcolor: (t) => alpha(t.palette.common.black, 0.35),
                      border: (t) =>
                        `1px solid ${alpha(t.palette.common.white, 0.06)}`,
                      fontFamily:
                        '"Google Sans Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: "0.8125rem",
                      lineHeight: 1.65,
                      overflow: "auto",
                      maxHeight: 360,
                      color: "grey.100",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {generatedSql.sql}
                  </Box>
                  {generatedSql.rationale ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1.5, lineHeight: 1.6 }}
                    >
                      {generatedSql.rationale}
                    </Typography>
                  ) : null}
                </Box>
              )}

              {!showProgressOverlay && !generatedSql && !pipelineFailure && (
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
                    Generate SQL to see the statement here
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ opacity: 0.85, maxWidth: 420 }}
                  >
                    Upload your schema, ask a question, and get a read-only
                    SELECT — no database connection required.
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
