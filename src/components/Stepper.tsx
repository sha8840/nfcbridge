// Stepper.tsx
import { Steps } from "antd";
import React from "react";

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const descriptions = [
    "Scan the box barcode.",
    "Scan the NFC tag with your device.",
    "Validating the barcode and NFC tag data.",
    "Process complete.",
  ];

  const items = [
    { title: "Scan Barcode", description: descriptions[0] },
    { title: "Scan NFC", description: descriptions[1] },
    {
      title: currentStep === 2 ? "Validating..." : "Validation",
      description: descriptions[2],
    },
    { title: "Done", description: descriptions[3] },
  ];

  return (
    <Steps
      className="mb-6"
      direction="vertical"
      size="small"
      current={currentStep}
      items={items}
    />
  );
};

export default Stepper;
