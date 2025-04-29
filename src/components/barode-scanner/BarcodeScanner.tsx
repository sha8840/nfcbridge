import React, { useRef, useEffect, useState } from "react";
import { useBarcodeReader } from "../../hooks/useBarcodeReader";
import "./styles.scss";

// Define the props interface
export interface BarcodeScannerProps {
  scannerActive: boolean;
  setScannerActive: (active: boolean) => void;
  onBarcodeDetected?: (data: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  scannerActive,
  setScannerActive,
  onBarcodeDetected,
}) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if the device is iOS
    const checkIsIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    };
    setIsIOS(checkIsIOS());
  }, []);
  
  const {
    // scannedBarcode,
    error: scannerError,
    loading: scannerLoading,
  } = useBarcodeReader(
    scannerActive, 
    scannerRef, 
    (detections) => {
      if (detections && detections.length > 0 && detections[0].data) {
        if (onBarcodeDetected) {
          onBarcodeDetected(detections[0].data);
        }
      }
    },
    setScannerActive
  );

  const handleCancel = () => {
    setScannerActive(false);
  };

  // Add a restart button specifically for iOS devices
  const handleRestart = () => {
    setScannerActive(false);
    setTimeout(() => {
      setScannerActive(true);
    }, 500);
  };

  return (
    <div className="barcode-scanner">
      <div className="scanner-container">
        {scannerActive && (
          <div id="scanner" ref={scannerRef} className={`scanner ${isIOS ? 'ios-scanner' : ''}`}>
            {/* Scanner elements will be injected here */}
            <div className="scanner-overlay">
              {!scannerLoading ? (
                <div className="scanner-overlay-inner"></div>
              ) : null}
            </div>
          </div>
        )}

        <div className="controls">
          {scannerLoading && scannerActive && (
            <div className="loading-message">
              <p>Initializing scanner...</p>
            </div>
          )}

          {scannerError && (
            <div className="error-message">
              <p>Scanner error: {scannerError}</p>
              {isIOS && (
                <p className="ios-help-text">
                  iOS sometimes requires specific permissions. Try refreshing the page or check camera permissions.
                </p>
              )}
            </div>
          )}

          {scannerActive && (
            <div className="button-group">
              <button className="cancel-button" onClick={handleCancel}>
                Cancel
              </button>
              
              {/* Add restart button for iOS devices */}
              {isIOS && (
                <button className="restart-button" onClick={handleRestart}>
                  Restart Scanner
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;