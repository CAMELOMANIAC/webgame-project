import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/base/quarters")({
  component: QuartersRedirect,
});

function QuartersRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/base/stash", replace: true });
  }, [navigate]);

  return null;
}
