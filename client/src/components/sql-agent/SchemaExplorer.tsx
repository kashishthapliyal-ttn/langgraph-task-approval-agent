"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import SchemaRoundedIcon from "@mui/icons-material/SchemaRounded";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";
import { useState } from "react";
import type { SchemaColumn, SchemaTable } from "@/lib/sqlAgentApi";

export type SchemaLink = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
};

function columnForeignKey(references: string | undefined): string | null {
  if (typeof references !== "string") return null;
  const trimmed = references.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildSchemaLinks(tables: SchemaTable[]): SchemaLink[] {
  const links: SchemaLink[] = [];
  for (const table of tables) {
    for (const col of table.columns) {
      const fk = columnForeignKey(col.references);
      if (!fk) continue;
      const dot = fk.indexOf(".");
      if (dot < 0) continue;
      links.push({
        fromTable: table.name,
        fromColumn: col.name,
        toTable: fk.slice(0, dot),
        toColumn: fk.slice(dot + 1),
      });
    }
  }
  return links;
}

function schemaStats(tables: SchemaTable[]) {
  let columns = 0;
  let foreignKeys = 0;
  let primaryKeys = 0;
  for (const t of tables) {
    columns += t.columns.length;
    for (const c of t.columns) {
      if (c.primaryKey) primaryKeys += 1;
      if (columnForeignKey(c.references)) foreignKeys += 1;
    }
  }
  return { tables: tables.length, columns, foreignKeys, primaryKeys };
}

function nullLabel(nullable: boolean | undefined): string {
  if (nullable === false) return "Required";
  if (nullable === true) return "Optional";
  return "Unknown";
}

function ColumnRow({ column }: Readonly<{ column: SchemaColumn }>) {
  const fk = columnForeignKey(column.references);
  const isPk = Boolean(column.primaryKey);
  const isRequired = column.nullable === false;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "minmax(0, 1.4fr) minmax(0, 1fr) auto",
        },
        gap: { xs: 0.75, sm: 1.5 },
        alignItems: { xs: "flex-start", sm: "center" },
        py: 1.1,
        px: 1.5,
        borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.55)}`,
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ minWidth: 0 }}
      >
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {isPk ? (
            <VpnKeyOutlinedIcon
              sx={{ fontSize: 16, color: "warning.main" }}
              aria-label="Primary key"
            />
          ) : fk ? (
            <LinkOutlinedIcon
              sx={{ fontSize: 16, color: "primary.main" }}
              aria-label="Foreign key"
            />
          ) : (
            <Box sx={{ width: 16 }} />
          )}
        </Stack>
        <Typography
          variant="body2"
          component="code"
          sx={{
            fontFamily: "ui-monospace, Menlo, Consolas, monospace",
            fontWeight: isPk ? 600 : 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {column.name}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {isPk && (
            <Chip label="PK" size="small" color="warning" variant="outlined" />
          )}
          {fk && (
            <Chip label="FK" size="small" color="primary" variant="outlined" />
          )}
          {isRequired && !isPk && (
            <Chip
              label="NN"
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: "0.65rem" }}
            />
          )}
        </Stack>
      </Stack>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          fontFamily: "ui-monospace, Menlo, Consolas, monospace",
          fontSize: "0.8125rem",
          pl: { xs: 3.5, sm: 0 },
        }}
      >
        {column.type}
      </Typography>

      <Box sx={{ pl: { xs: 3.5, sm: 0 }, textAlign: { sm: "right" } }}>
        {fk ? (
          <Typography
            variant="body2"
            sx={{
              color: "primary.light",
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: "0.8125rem",
            }}
          >
            → {fk}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.disabled">
            {nullLabel(column.nullable)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function RelationshipOverview({ links }: Readonly<{ links: SchemaLink[] }>) {
  if (links.length === 0) return null;

  const byTarget = new Map<string, SchemaLink[]>();
  for (const link of links) {
    const key = link.toTable;
    const list = byTarget.get(key) ?? [];
    list.push(link);
    byTarget.set(key, list);
  }

  const hubTable =
    [...byTarget.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ??
    null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2.5,
        borderColor: (t) => alpha(t.palette.primary.main, 0.25),
        bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        How tables connect
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {hubTable
          ? `${hubTable} is referenced by several tables — useful when writing JOINs.`
          : "Foreign keys show which columns link tables together."}
      </Typography>
      <Stack spacing={0.75}>
        {links.map((link) => (
          <Typography
            key={`${link.fromTable}.${link.fromColumn}-${link.toTable}.${link.toColumn}`}
            variant="body2"
            sx={{
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: "0.8125rem",
              py: 0.35,
              px: 1,
              borderRadius: 1,
              bgcolor: (t) => alpha(t.palette.background.paper, 0.6),
              border: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
            }}
          >
            <Box
              component="span"
              sx={{ color: "text.primary", fontWeight: 600 }}
            >
              {link.fromTable}.{link.fromColumn}
            </Box>
            <Box component="span" sx={{ color: "text.secondary", mx: 0.75 }}>
              →
            </Box>
            <Box component="span" sx={{ color: "primary.light" }}>
              {link.toTable}.{link.toColumn}
            </Box>
          </Typography>
        ))}
      </Stack>
    </Paper>
  );
}

function SchemaLegend() {
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      gap={1.5}
      sx={{ mb: 2 }}
      aria-label="Schema legend"
    >
      <Stack direction="row" spacing={0.75} alignItems="center">
        <VpnKeyOutlinedIcon sx={{ fontSize: 16, color: "warning.main" }} />
        <Typography variant="caption" color="text.secondary">
          PK — primary key
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <LinkOutlinedIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography variant="caption" color="text.secondary">
          FK — foreign key
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Chip label="NN" size="small" variant="outlined" sx={{ height: 20 }} />
        <Typography variant="caption" color="text.secondary">
          Required (NOT NULL)
        </Typography>
      </Stack>
    </Stack>
  );
}

function tableCardHeaderSx(expanded: boolean) {
  const gradient = (t: Theme, emphasis: number) =>
    `linear-gradient(145deg, ${t.palette.background.paper} 0%, ${alpha(t.palette.primary.main, emphasis)} 100%)`;

  return {
    minHeight: 52,
    background: (t: Theme) => gradient(t, expanded ? 0.14 : 0.08),
    transition: "background 0.2s ease",
    "&:hover": {
      background: (t: Theme) => gradient(t, 0.12),
    },
    "& .MuiAccordionSummary-content": {
      my: 1,
      alignItems: "center",
      gap: 1.5,
    },
  };
}

function TableCard({ table }: Readonly<{ table: SchemaTable }>) {
  const [expanded, setExpanded] = useState(false);
  const fkCount = table.columns.filter((c) =>
    columnForeignKey(c.references),
  ).length;
  const pkCount = table.columns.filter((c) => c.primaryKey).length;

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={(_, next) => setExpanded(next)}
      sx={{
        bgcolor: "background.paper",
        border: (t) => `1px solid ${alpha(t.palette.divider, 0.9)}`,
        borderRadius: "12px !important",
        overflow: "hidden",
        alignSelf: "start",
        width: "100%",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}
        sx={tableCardHeaderSx(expanded)}
      >
        <Typography
          variant="subtitle2"
          component="span"
          sx={{
            fontFamily: "ui-monospace, Menlo, Consolas, monospace",
            fontWeight: 700,
            color: "text.primary",
          }}
        >
          {table.name}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ ml: "auto", flexShrink: 0 }}
        >
          <Chip
            size="small"
            label={`${table.columns.length} cols`}
            variant="outlined"
            sx={{ height: 24 }}
          />
          {pkCount > 0 && (
            <Chip
              size="small"
              label="PK"
              color="warning"
              variant="outlined"
              sx={{ height: 24 }}
            />
          )}
          {fkCount > 0 && (
            <Chip
              size="small"
              label={`${fkCount} FK`}
              color="primary"
              variant="outlined"
              sx={{ height: 24 }}
            />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Box
          sx={{
            display: { xs: "none", sm: "grid" },
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) auto",
            gap: 1.5,
            px: 1.5,
            py: 1,
            bgcolor: (t) => alpha(t.palette.background.default, 0.45),
            borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.55)}`,
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Column
          </Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Type
          </Typography>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ textAlign: "right" }}
          >
            Links / null
          </Typography>
        </Box>
        {table.columns.map((col) => (
          <ColumnRow key={`${table.name}.${col.name}`} column={col} />
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

export default function SchemaExplorer({
  tables,
  loading,
}: Readonly<{
  tables: SchemaTable[] | null;
  loading: boolean;
}>) {
  if (loading) {
    return (
      <Stack alignItems="center" py={4}>
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Parsing schema…
        </Typography>
      </Stack>
    );
  }

  if (!tables?.length) {
    return (
      <Alert severity="info">
        Upload a .sql file above to explore tables, columns, and relationships.
      </Alert>
    );
  }

  const links = buildSchemaLinks(tables);
  const stats = schemaStats(tables);

  return (
    <Box>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }} useFlexGap>
        <Chip
          size="small"
          label={`${stats.tables} tables`}
          color="primary"
          variant="outlined"
        />
        <Chip
          size="small"
          label={`${stats.columns} columns`}
          variant="outlined"
        />
        <Chip
          size="small"
          label={`${stats.foreignKeys} foreign keys`}
          variant="outlined"
        />
      </Stack>

      <SchemaLegend />
      <RelationshipOverview links={links} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          alignItems: "start",
          gap: 1.5,
        }}
      >
        {tables.map((table) => (
          <TableCard key={table.name} table={table} />
        ))}
      </Box>
    </Box>
  );
}

export function SchemaExplorerHeader() {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      <SchemaRoundedIcon color="primary" />
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Database schema
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ER-style view of tables, keys, and relationships from your SQL file
        </Typography>
      </Box>
    </Stack>
  );
}
