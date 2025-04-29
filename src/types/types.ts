export interface BarcodeScannerProps {
  scannerActive: boolean;
  setScannerActive: (active: boolean) => void;
  onBarcodeDetected?: (result: any) => void;
}
