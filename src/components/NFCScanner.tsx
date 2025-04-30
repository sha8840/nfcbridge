import React, { useEffect, useState, useRef } from "react";
import { message } from "antd";
import ScanResult from "./ScanResult";
import BarcodeScanner from "./barode-scanner/BarcodeScanner";
import Stepper from "./Stepper";
import { generateSessionId, createCustomScheme } from "../utils/nfcHelpers";
import { RefreshCw, XCircle } from "lucide-react";

const NFCScanner: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [barcodeData, setBarcodeData] = useState<string | null>(null);
  const [tagData, setTagData] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "scanning" | "success" | "error" | "invalid"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [barcodeActive, setBarcodeActive] = useState<boolean>(false);
  const [nfcGesture, setNfcGesture] = useState<boolean>(false);
  const [isCallback, setCallBack] = useState<boolean>(false);

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "nfc" as PermissionName })
        .then((status) => {
          setNfcGesture(status.state === "granted");
          status.onchange = () => setNfcGesture(status.state === "granted");
        })
        .catch(() => {
          setNfcGesture(false);
        });
    }
  }, []);
  const barcodeRef = useRef<string>("");
  const scanAbortController = useRef<AbortController | null>(null);

  const supportWebNfc = () => typeof (window as any).NDEFReader === "function";
  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const resetLogsAndToasts = () => {
    message.destroy();
  };

  const abortNfcScan = () => {
    if (scanAbortController.current) {
      scanAbortController.current.abort();
      scanAbortController.current = null;
      addLog("🛑 Aborted previous NFC scan");
    }
  };

  useEffect(() => {
    if (!window.isSecureContext) {
      setStatus("error");
      setErrorMessage("This feature requires HTTPS");
      return;
    }

    const existingSession = localStorage.getItem("sessionId") || null;
    if (existingSession) {
      setSessionId(existingSession);
    } else {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      localStorage.setItem("sessionId", newSessionId);
    }

    const demoPairs = {
      "8901435003005": "5faf2ecb9e581b",
      "4987176270337": "5fd1f9aae1578b",
    };
    localStorage.setItem("pairs", JSON.stringify(demoPairs));
    handleReset();
  }, []);

  const startBarcodeScan = () => {
    resetLogsAndToasts();
    abortNfcScan();
    addLog("🔄 Starting barcode scan");
    setStatus("scanning");
    setCurrentStep(0);
    setTimeout(() => setBarcodeActive(true), 100);
  };

  const handleBarcode = (result: string) => {
    resetLogsAndToasts();
    abortNfcScan();
    addLog(`📦 Barcode scanned: ${result}`);
    barcodeRef.current = result;
    setBarcodeData(result);
    setCurrentStep(1);
    message.success(`Barcode scanned: ${result}. Now scanning NFC.`);
    setBarcodeActive(false);
    startNfcScan(result);
    if (!supportWebNfc()) {
      localStorage.setItem("barcode", result);
    }
  };

  const startNfcScan = async (barcode: string) => {
    addLog("🔍 Starting NFC scan…");
    setStatus("scanning");

    abortNfcScan();
    const controller = new AbortController();
    scanAbortController.current = controller;

    if (!supportWebNfc()) {
      resetLogsAndToasts();
      addLog("⚠️ Web NFC not supported, redirecting to app…");
      window.location.href = createCustomScheme(sessionId);
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan({ signal: controller.signal });

      ndef.onreadingerror = () => {
        handleError("Couldn’t read NFC tag. Please try again.");
      };

      ndef.onreading = (event: any) => {
        const uidHex = event.serialNumber.replace(/:/g, "");
        addLog(`📥 NFC tag UID: ${uidHex}`);
        setTagData(uidHex);
        setCurrentStep(2);
        validatePair(barcode, uidHex);
      };
    } catch (err: any) {
      if (err.name !== "AbortError") {
        handleError(err.message || "Failed to start NFC scan");
      }
    }
  };

  const validatePair = (barcode: string, tag: string) => {
    resetLogsAndToasts();
    const pairs = JSON.parse(localStorage.getItem("pairs") || "{}");
    setCurrentStep(2);

    if (pairs[barcode] === tag) {
      message.success("Validation successful!");
      setStatus("success");
    } else {
      message.error("Validation failed: Tag does not match barcode");
      setErrorMessage("Validation failed: Tag does not match barcode");
      setStatus("invalid");
    }

    setCurrentStep(3);
    setTimeout(() => handleReset(), 5000);
    if (supportWebNfc()) {
      localStorage.removeItem("barcode");
    }
  };

  const handleError = (msg: string) => {
    resetLogsAndToasts();
    addLog(`❌ Error: ${msg}`);
    setStatus("error");
    setErrorMessage(msg);
    message.error(msg);
    setTimeout(() => handleReset(), 5000);
  };

  const handleReset = () => {
    setStatus("idle");
    setBarcodeData(null);
    setTagData(null);
    setErrorMessage("");
    setCurrentStep(0);
    barcodeRef.current = "";
    abortNfcScan();
    startBarcodeScan();
    setCallBack(false);
  };

  const takeNFC = async () => {
    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      setNfcGesture(true);
      addLog("👋 NFC permission granted");
    } catch (err) {
      addLog("❌ NFC permission denied or scan aborted");
      setNfcGesture(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const td = params.get("tag_data");

    if (sid === sessionId && td) {
      setCallBack(true);
      resetLogsAndToasts();
      addLog("📥 Received callback from app");
      const tag = decodeURIComponent(td);
      setTagData(tag);
      setCurrentStep(2);
      const barcode = localStorage.getItem("barcode") || null;
      if (barcode) {
        setBarcodeData(barcode);
        validatePair(barcode, tag);
      } else {
        setStatus("error");
        setErrorMessage("No barcode Data available");
      }
    }
  }, [sessionId]);

  return !nfcGesture && supportWebNfc() ? (
    <div className="mb-4 text-center">
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded"
        onClick={takeNFC}
      >
        Provide NFC Permission
      </button>
    </div>
  ) : (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 transition-all duration-300 transform hover:shadow-lg">
      <Stepper currentStep={currentStep} />
      {barcodeActive && !isCallback && (
        <BarcodeScanner
          scannerActive={barcodeActive}
          onBarcodeDetected={handleBarcode}
          setScannerActive={setBarcodeActive}
        />
      )}
      {status === "success" && tagData && (
        <ScanResult tagData={tagData} onReset={handleReset} />
      )}
      {status === "invalid" && (
        <>
          <div className="mb-6 animate-fadeIn">
            <div className="flex items-center justify-center mb-4">
              <XCircle className="text-red-700 h-12 w-12" />
            </div>

            <h3 className="text-lg font-medium text-gray-800 mb-2 text-center">
              Box & Tag Mismatch
            </h3>

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleReset}
                className="flex items-center px-4 py-2 text-blue-600 font-medium hover:text-blue-800 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Scan Another Tag
              </button>
            </div>
          </div>
        </>
      )}
      {status === "error" && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{errorMessage}</p>
        </div>
      )}
      {/* <div
        style={{
          marginTop: 20,
          maxHeight: 160,
          overflowY: "auto",
          background: "rgba(0,0,0,0.8)",
          color: "#0f0",
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div> */}
    </div>
  );
};

export default NFCScanner;
