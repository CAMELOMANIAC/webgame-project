import { createFileRoute } from "@tanstack/react-router";

import { Page } from "../../components/Commons";

export const Route = createFileRoute("/testpage/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Page></Page>;
}
