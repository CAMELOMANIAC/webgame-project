import { type Item } from "@webgame/types";
import { motion } from "motion/react";
import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { requestExtraction } from "../utils/requestExtraction";

interface ExtractionScreenProps {
  acquiredItems: Item[];
  onExtractionComplete: (success: boolean) => void;
}

export const ExtractionScreen: React.FC<ExtractionScreenProps> = ({ acquiredItems, onExtractionComplete }) => {
  const [extractionStatus, setExtractionStatus] = useState<"pending" | "success" | "failure">("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const performExtraction = async () => {
      try {
        // Simulate server call for extraction
        const result = await requestExtraction(acquiredItems);
        if (result.success) {
          setExtractionStatus("success");
        } else {
          setExtractionStatus("failure");
          setErrorMessage(result.message || "Unknown error during extraction.");
        }
      } catch (error) {
        console.error("Extraction failed:", error);
        setExtractionStatus("failure");
        setErrorMessage("Network error or server unavailable.");
      }
    };

    performExtraction();
  }, [acquiredItems]);

  const getStatusMessage = () => {
    switch (extractionStatus) {
      case "pending":
        return "Attempting extraction...";
      case "success":
        return "Extraction successful!";
      case "failure":
        return `Extraction failed: ${errorMessage || "Please try again."}`;
      default:
        return "";
    }
  };

  return (
    <ExtractionOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ExtractionPanel
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 15, stiffness: 200 }}
      >
        <StatusTitle $status={extractionStatus}>{getStatusMessage()}</StatusTitle>

        {acquiredItems.length > 0 && extractionStatus !== "pending" && (
          <AcquiredItemsSummary>
            <strong>Acquired:</strong> {acquiredItems.map((item) => item.name).join(", ")}
          </AcquiredItemsSummary>
        )}

        {extractionStatus !== "pending" && (
          <ReturnButton onClick={() => onExtractionComplete(extractionStatus === "success")}>
            RETURN TO LOBBY
          </ReturnButton>
        )}
      </ExtractionPanel>
    </ExtractionOverlay>
  );
};

const ExtractionOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
`;

const ExtractionPanel = styled(motion.div)`
  background: radial-gradient(circle at top right, #1a232a 0%, #0f141a 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 3rem;
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7);
`;

const StatusTitle = styled.h3<{ $status: "pending" | "success" | "failure" }>`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${(props) => {
    switch (props.$status) {
      case "pending":
        return "#f1c40f";
      case "success":
        return "#2ecc71";
      case "failure":
        return "#e74c3c";
      default:
        return "#ecf0f1";
    }
  }};
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0;
  text-align: center;
  text-shadow: 0 0 20px
    ${(props) => (props.$status === "pending" ? "#f1c40f" : props.$status === "success" ? "#2ecc71" : "#e74c3c")}40;
`;

const AcquiredItemsSummary = styled.p`
  font-size: 1rem;
  color: #bdc3c7;
  text-align: center;
  line-height: 1.5;
`;

const ReturnButton = styled.button`
  padding: 1rem 3rem;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border-radius: 50px;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 2px;
  border: none;
  box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;

  &:hover {
    transform: scale(1.05) translateY(-3px);
    box-shadow: 0 15px 30px rgba(52, 152, 219, 0.4);
    filter: brightness(1.1);
  }

  &:active {
    transform: scale(0.98);
  }
`;
