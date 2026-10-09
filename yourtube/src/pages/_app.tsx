import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "../lib/ThemeContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <ThemeProvider>
        <LanguageProvider>
          <Head>
            <title>YourTube</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </Head>
          <div className="min-h-screen bg-background text-foreground">
            <Header />
            <Toaster />
            <div className="flex">
              <Sidebar />
              <ErrorBoundary>
                <Component {...pageProps} />
              </ErrorBoundary>
            </div>
          </div>
        </LanguageProvider>
      </ThemeProvider>
    </UserProvider>
  );
}
