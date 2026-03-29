import { createFileRoute } from "@tanstack/react-router";

import { Page } from "@/components/Commons";

export const Route = createFileRoute("/field/user/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Page>Hello "/field/user/"!</Page>;
}
