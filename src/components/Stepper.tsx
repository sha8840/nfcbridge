import { Steps } from "antd";

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const description = [
    "Scan the NFC tag with your device.",
    "Now Scan the barcode attached to the device.",
    "Data validated successfully. You can now use the device.",
    "Validating the data from the NFC tag and the barcode.",
    "Validate the recieved data.",
  ];
  return (
    <Steps
      className="mb-6"
      direction="vertical"
      size="small"
      current={currentStep}
      items={[
        {
          title: "Scan NFC",
          description: description[0],
        },
        {
          title: "Scan Barcode",
          description: description[1],
        },
        {
          title: currentStep == 2 ? "Validating..." : "Validation",
          description: currentStep == 2 ? description[3] : description[4],
        },
        {
          title: "Device Ready",
          description: description[2],
        },
      ]}
    />
  );
};

export default Stepper;
