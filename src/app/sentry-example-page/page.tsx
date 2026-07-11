"use client";

import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

export default function SentryExamplePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerError = () => {
    try {
      throw new Error("Test error from Sentry Example Page");
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const triggerUndefinedFunction = () => {
    // @ts-ignore
    myUndefinedFunction();
  };

  const triggerAsyncError = async () => {
    throw new Error("Test async error");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Sentry Example Page
          </h1>
          <p className="text-slate-600 mb-8">
            Click a button below to trigger a test error and verify Sentry is
            capturing errors properly.
          </p>

          <div className="space-y-4">
            <div>
              <Button
                onClick={triggerError}
                variant="primary"
                className="w-full"
              >
                Trigger Exception (Caught)
              </Button>
              <p className="text-sm text-slate-500 mt-2">
                Throws and catches an error, then sends to Sentry
              </p>
            </div>

            <div>
              <Button
                onClick={triggerUndefinedFunction}
                variant="primary"
                className="w-full"
              >
                Trigger Undefined Function
              </Button>
              <p className="text-sm text-slate-500 mt-2">
                Calls a function that doesn't exist (ReferenceError)
              </p>
            </div>

            <div>
              <Button
                onClick={triggerAsyncError}
                variant="primary"
                className="w-full"
              >
                Trigger Async Error
              </Button>
              <p className="text-sm text-slate-500 mt-2">
                Throws an error in an async handler
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              ℹ️ After triggering an error, check the{" "}
              <a
                href="https://de.sentry.io/organizations/hex-org/issues/?project=hex-diva"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-700 underline hover:text-blue-900"
              >
                Sentry Dashboard
              </a>{" "}
              to see it appear in the Issues list.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
