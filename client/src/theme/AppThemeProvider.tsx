"use client";

import "@fontsource-variable/inter/wght.css";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { useMemo } from "react";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#38bdf8" },
    secondary: { main: "#c084fc" },
    background: {
      default: "#070b12",
      paper: "#0f1419",
    },
    divider: "rgba(148, 163, 184, 0.12)",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter Variable", "Inter", "Segoe UI", system-ui, sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});

export default function AppThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = useMemo(() => darkTheme, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
