import { createFileRoute } from "@tanstack/react-router";
import styled from "styled-components";

import { FieldWidget, Page } from "@/components/Commons";

export const Route = createFileRoute("/field/quest/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Page>
      <StatusSection>
        <Row>
          <FieldWidget>Field</FieldWidget>
        </Row>
        <Row>
          <FieldWidget>Field</FieldWidget>
          <FieldWidget>Field</FieldWidget>
        </Row>
      </StatusSection>
    </Page>
  );
}

const StatusSection = styled.section`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 120px;
  gap: 16px;
  padding: 0 24px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  width: 100%;
  height: 120px;
  gap: 8px;
`;
