"use client";

import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Zap } from "lucide-react";

export default function SentryExamplePage() {
  const [mounted, setMounted] = useState(false);
  const [triggered, setTriggered] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerError = () => {
    setTriggered("caught");
    try {
      throw new Error("Test error from Sentry Example Page");
    } catch (error) {
      Sentry.captureException(error);
    }
    setTimeout(() => setTriggered(null), 2000);
  };

  const triggerUndefinedFunction = () => {
    setTriggered("undefined");
    // @ts-ignore
    myUndefinedFunction();
  };

  const triggerAsyncError = async () => {
    setTriggered("async");
    throw new Error("Test async error");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/50 border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-white">✨ Hex-Diva</div>
            <div className="text-sm text-slate-400">Sentry Monitoring Test</div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header Section */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Monitoring Setup</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Error Monitoring Test
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Trigger sample errors below to verify Sentry is capturing and reporting issues in real-time.
          </p>
        </div>

        {/* Test Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Card 1: Caught Exception */}
          <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl p-6 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity" />
            <div className="relative">
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg w-fit">
                <AlertCircle className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Caught Exception</h3>
              <p className="text-sm text-slate-400 mb-6">
                Throw and catch an error, then explicitly send to Sentry.
              </p>
              <Button
                onClick={triggerError}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                {triggered === "caught" ? "✓ Triggered" : "Trigger"}
              </Button>
            </div>
          </div>

          {/* Card 2: Undefined Function */}
          <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl p-6 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity" />
            <div className="relative">
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg w-fit">
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Undefined Function</h3>
              <p className="text-sm text-slate-400 mb-6">
                Call a function that doesn't exist (ReferenceError).
              </p>
              <Button
                onClick={triggerUndefinedFunction}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                {triggered === "undefined" ? "✓ Triggered" : "Trigger"}
              </Button>
            </div>
          </div>

          {/* Card 3: Async Error */}
          <div className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl p-6 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity" />
            <div className="relative">
              <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg w-fit">
                <AlertCircle className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Async Error</h3>
              <p className="text-sm text-slate-400 mb-6">
                Throw an error in an async function handler.
              </p>
              <Button
                onClick={triggerAsyncError}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                {triggered === "async" ? "✓ Triggered" : "Trigger"}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Monitoring Enabled</h3>
          </div>
          <p className="text-slate-300 mb-6">
            After triggering an error, it should appear in the Sentry dashboard within seconds.
          </p>
          <a
            href="https://de.sentry.io/organizations/hex-org/issues/?project=hex-diva"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            View Sentry Dashboard →
          </a>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-400 text-sm">
          <p>Production monitoring with real-time error tracking and performance insights</p>
        </div>
      </div>
    </div>
  );
}
