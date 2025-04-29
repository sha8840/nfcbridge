// useBarcodeReader.ts
import { useEffect, useState, useRef, RefObject } from "react";
import { 
  Html5Qrcode, 
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

export interface CodeDetection {
  data: string;
  symbology: string;
  points?: Array<{ x: number; y: number }>;
}

interface UseBarcodeReaderResult {
  scannedBarcode: CodeDetection[] | null;
  error: string;
  loading: boolean;
}

export const useBarcodeReader = (
  scannerActive: boolean,
  scannerRef: RefObject<HTMLDivElement | null>,
  onBarcodeDetected?: (detections: CodeDetection[]) => void,
  setScannerActive?: (active: boolean) => void
): UseBarcodeReaderResult => {
  const [scannedBarcode, setScannedBarcode] = useState<CodeDetection[] | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const scannerInstance = useRef<Html5Qrcode | null>(null);
  const isScannerRunning = useRef<boolean>(false);
  const isTransitioning = useRef<boolean>(false);

  const safelyStopScanner = async () => {
    if (isTransitioning.current) {
      console.debug("Already transitioning, skipping scanner stop");
      return;
    }

    if (scannerInstance.current && isScannerRunning.current) {
      try {
        isTransitioning.current = true;
        await scannerInstance.current.stop();
        isScannerRunning.current = false;
      } catch (err) {
        console.debug("Could not stop scanner:", err);
      } finally {
        isTransitioning.current = false;
      }
    }
  };

  // Device detection helpers
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const isIOS = () => {
    // Fix for TypeScript error - MSStream is used for IE detection but not typed in Window interface
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  };

  const cleanupScanner = () => {
    if (scannerInstance.current) {
      try {
        if (isScannerRunning.current) {
          scannerInstance.current.stop().catch(err => {
            console.debug("Error stopping scanner during cleanup:", err);
          });
        }
        
        if (scannerRef.current) {
          while (scannerRef.current.firstChild) {
            scannerRef.current.removeChild(scannerRef.current.firstChild);
          }
        }
        
        // Extra cleanup specifically for iOS devices
        if (isIOS()) {
          const videoElements = document.querySelectorAll('video');
          videoElements.forEach(video => {
            if (video.srcObject) {
              const tracks = (video.srcObject as MediaStream).getTracks();
              tracks.forEach(track => track.stop());
              video.srcObject = null;
            }
            video.remove();
          });
        }
        
        scannerInstance.current = null;
        isScannerRunning.current = false;
      } catch (err) {
        console.debug("Error during scanner cleanup:", err);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    let initTimer: NodeJS.Timeout | null = null;
    
    if (scannerActive && scannerRef?.current) {
      const initScanner = async () => {
        if (isTransitioning.current) {
          console.debug("Already in transition, skipping scanner init");
          return;
        }
        
        try {
          isTransitioning.current = true;
          
          cleanupScanner();
          
          const scannerId = `html5-qrcode-scanner-${Date.now()}`;
          
          const scannerElement = document.createElement('div');
          scannerElement.id = scannerId;
          scannerElement.style.width = '100%';
          scannerElement.style.height = '100%';
          
          if (scannerRef.current) {
            while (scannerRef.current.firstChild) {
              scannerRef.current.removeChild(scannerRef.current.firstChild);
            }
            scannerRef.current.appendChild(scannerElement);
          }
          
          const html5QrcodeScanner = new Html5Qrcode(scannerId);
          scannerInstance.current = html5QrcodeScanner;
          
          // Adjust qrbox size based on device type
          const isOnMobile = isMobile();
          const isOnIOS = isIOS();
          
          const getQrboxSize = () => {
            // Get parent element dimensions if available
            let parentWidth = 250;
            let parentHeight = 250;
            
            if (scannerRef.current) {
              parentWidth = scannerRef.current.clientWidth;
              parentHeight = scannerRef.current.clientHeight;
            }
            
            const minDimension = Math.min(parentWidth, parentHeight);
            
            // iOS-specific sizing
            if (isOnIOS) {
              // iOS needs a larger scanning area for better recognition
              return Math.max(200, Math.min(minDimension * 0.85, 300));
            } 
            // Other mobile devices
            else if (isOnMobile) {
              return Math.max(150, Math.min(minDimension * 0.75, 250));
            } 
            // Desktop
            else {
              return Math.min(minDimension * 0.8, 300);
            }
          };
          
          const boxSize = getQrboxSize();
          console.log("Using QR box size:", boxSize, "Mobile:", isOnMobile, "iOS:", isOnIOS);
          
          // Configure scanner with device-specific settings
          const config = {
            fps: isOnIOS ? 20 : 10, // Higher FPS can help on iOS
            qrbox: { width: boxSize, height: boxSize },
            aspectRatio: isOnMobile ? window.innerWidth / window.innerHeight : 1,
            disableFlip: false,
            // Add video constraints here for iOS
            ...(isOnIOS && {
              videoConstraints: {
                width: { min: 1280, ideal: 1920 },
                height: { min: 720, ideal: 1080 },
                facingMode: "environment"
              }
            }),
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: !isOnIOS // Sometimes better to disable this on iOS
            },
            formatsToSupport: [
              // Prioritize QR_CODE for iOS
              Html5QrcodeSupportedFormats.QR_CODE,
              
              // Then other formats
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.AZTEC,
              Html5QrcodeSupportedFormats.PDF_417,
              Html5QrcodeSupportedFormats.RSS_14,
              Html5QrcodeSupportedFormats.RSS_EXPANDED,
              Html5QrcodeSupportedFormats.MAXICODE
            ]
          };
          
          if (scannerActive && isMounted && !isScannerRunning.current) {
            try {
              // Simplified camera constraints - html5-qrcode expects only one key
              // The library only accepts one key in the cameraIdOrConfig object
              const cameraConstraints = {
                facingMode: "environment"
              };
              
              // We'll apply advanced constraints in the config object instead
              
              await html5QrcodeScanner.start(
                cameraConstraints,
                config,
                (decodedText, decodedResult) => {
                  if (!isMounted) return;
                  
                  let symbology = "UNKNOWN";
                  if (decodedResult.result.format) {
                    symbology = decodedResult.result.format.toString();
                  }
                  
                  console.log("Detected barcode format:", symbology);
                  console.log("Barcode data:", decodedText);
                  
                  const detection: CodeDetection = {
                    data: decodedText,
                    symbology: symbology
                  };
                  
                  try {
                    const result = decodedResult.result as any;
                    if (result && result.location) {
                      detection.points = [
                        { x: result.location.topLeftCorner.x, y: result.location.topLeftCorner.y },
                        { x: result.location.topRightCorner.x, y: result.location.topRightCorner.y },
                        { x: result.location.bottomRightCorner.x, y: result.location.bottomRightCorner.y },
                        { x: result.location.bottomLeftCorner.x, y: result.location.bottomLeftCorner.y }
                      ];
                    }
                  } catch (e) {
                    console.debug("Could not extract corner points from barcode");
                  }
                  
                  setScannedBarcode([detection]);
                  
                  if (onBarcodeDetected) {
                    onBarcodeDetected([detection]);
                  }
                  
                  safelyStopScanner().then(() => {
                    if (setScannerActive) {
                      setScannerActive(false);
                    }
                  });
                },
                (errorMessage) => {
                  // Filter normal scanning errors - these are expected during normal operation
                  if (!errorMessage.includes("No barcode or QR code detected") && 
                      !errorMessage.includes("No MultiFormat Readers were able to detect") &&
                      !errorMessage.includes("No barcode found")) {
                    console.debug("Barcode scanning error:", errorMessage);
                  }
                }
              );
              
              isScannerRunning.current = true;
              
              if (isMounted) {
                setLoading(false);
              }
            } catch (startErr) {
              console.error("Failed to start scanner:", startErr);
              if (isMounted) {
                setError(startErr instanceof Error ? startErr.message : String(startErr));
                setLoading(false);
              }
            }
          }
        } catch (err) {
          if (isMounted) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error("Failed to initialize barcode scanner:", errorMsg);
            setError(errorMsg);
            setLoading(false);
          }
        } finally {
          isTransitioning.current = false;
        }
      };

      // Use longer initialization delay for iOS
      const initDelay = isIOS() ? 800 : 500;
      initTimer = setTimeout(() => {
        initScanner();
      }, initDelay);
    } else if (!scannerActive) {
      safelyStopScanner();
      
      if (isMounted) {
        setLoading(true);
      }
    }

    return () => {
      isMounted = false;
      if (initTimer) clearTimeout(initTimer);
      
      cleanupScanner();
    };
  }, [scannerActive, scannerRef, onBarcodeDetected, setScannerActive]);

  return { scannedBarcode, error, loading };
};