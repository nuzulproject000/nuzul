import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ErrorState } from "@/components/common";

/** Top-level error boundary for render errors and failed lazy chunks. */
export function RouteError() {
  const err = useRouteError();
  const message = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : "Unexpected error";
  return <div className="container-page py-24"><ErrorState error={new Error(message)} onRetry={() => window.location.reload()} /></div>;
}
