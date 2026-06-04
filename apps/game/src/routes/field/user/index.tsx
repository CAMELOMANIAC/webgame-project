import { createFileRoute } from "@tanstack/react-router";

import { Page } from "@/components/Commons";
import MapGraphCanvas from "@/components/MapGraphCanvas";

export const Route = createFileRoute("/field/user/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Page style={{ overflow: "hidden" }}>
      <MapGraphCanvas />
    </Page>
  );
}

