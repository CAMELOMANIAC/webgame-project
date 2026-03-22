import { type Item } from "@webgame/types";

interface ExtractionResult {
  success: boolean;
  message?: string;
}

/**
 * Mocks a server call to request extraction for acquired items.
 * In a real application, this would send data to the backend.
 *
 * @param acquiredItems The items the player chose to acquire.
 * @returns A promise resolving to an ExtractionResult indicating success or failure.
 */
export async function requestExtraction(acquiredItems: Item[]): Promise<ExtractionResult> {
  console.log("Requesting extraction for items:", acquiredItems);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simulate success or failure
  const isSuccess = Math.random() > 0.3; // 70% chance of success

  if (isSuccess) {
    console.log("Extraction successful!");
    return { success: true, message: "All items secured!" };
  } else {
    console.warn("Extraction failed!");
    return { success: false, message: "You were ambushed! Some items might be lost." };
  }
}
