// Generic error reporting — no longer depends on Lovable's runtime events.
// Drop-in replacement: reports to console (extend to Sentry / Datadog as needed).

type ErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportLovableError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: ErrorOptions = {}
) {
  const severity = options.severity ?? "error";
  const payload = {
    error,
    context: {
      source: "react_error_boundary",
      route: typeof window !== "undefined" ? window.location.pathname : "unknown",
      ...context,
    },
    options: {
      mechanism: options.mechanism ?? "react_error_boundary",
      handled: options.handled ?? false,
      severity,
    },
  };

  if (severity === "error") {
    console.error("[ErrorReporting]", payload);
  } else if (severity === "warning") {
    console.warn("[ErrorReporting]", payload);
  } else {
    console.info("[ErrorReporting]", payload);
  }
}

