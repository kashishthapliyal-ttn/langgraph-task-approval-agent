import type { Metadata } from "next";
import AppThemeProvider from "@/theme/AppThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intelligent SQL Agent",
  description: "Natural language to PostgreSQL with a dark MUI interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
