// NFCVerificationDemo - Clear toasts, logs, and abort previous NFC scans on reset

import React, { useEffect, useState, useRef } from "react";
import { message } from "antd";
import ScanResult from "./ScanResult";
import BarcodeScanner from "./barode-scanner/BarcodeScanner";
import Stepper from "./Stepper";
import { generateSessionId, createCustomScheme } from "../utils/nfcHelpers";

const NFCScanner: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [barcodeData, setBarcodeData] = useState<string | null>(null);
  const [tagData, setTagData] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [barcodeActive, setBarcodeActive] = useState<boolean>(false);
  const [nfcGesture, setNfcGesture] = useState<boolean>(false);

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'nfc' as PermissionName })
        .then((status) => {
          setNfcGesture(status.state === 'granted');
          status.onchange = () => setNfcGesture(status.state === 'granted');
        })
        .catch(() => {
          setNfcGesture(false);
        });
    }
  }, []);
  const barcodeRef = useRef<string>("");
  const scanAbortController = useRef<AbortController | null>(null);

  const supportWebNfc = () => typeof (window as any).NDEFReader === "function";
  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const resetLogsAndToasts = () => {
    message.destroy();
    setLogs([]);
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

    // initialize session
    const existingSession = localStorage.getItem("sessionId");
    const newSession = existingSession || generateSessionId();
    setSessionId(newSession);
    localStorage.setItem("sessionId", newSession);

    // set demo pairs
    const demoPairs = {
      "8901435003005": "5faf2ecb9e581b",
      "4987176270337": "5fd1f9aae1578b"
    };
    localStorage.setItem("pairs", JSON.stringify(demoPairs));

    // start fresh
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
  };

  const startNfcScan = async (barcode: string) => {
    addLog("🔍 Starting NFC scan…");
    setStatus("scanning");

    // abort any previous
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
      if (err.name !== 'AbortError') {
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
      setStatus("error");
    }

    setCurrentStep(3);
    setTimeout(() => handleReset(), 5000);
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
    const freshSession = generateSessionId();
    setSessionId(freshSession);
    localStorage.setItem("sessionId", freshSession);
    startBarcodeScan();
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

  // Handle iOS callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const td = params.get("tag_data");

    if (sid === sessionId && td) {
      resetLogsAndToasts();
      addLog("📥 Received callback from app");
      const tag = decodeURIComponent(td);
      setTagData(tag);
      setCurrentStep(2);
      validatePair(barcodeRef.current, tag);
    }
  }, [sessionId]);

  return (
    !nfcGesture && supportWebNfc() ? (
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
        {barcodeActive && (
          <BarcodeScanner
            scannerActive={barcodeActive}
            onBarcodeDetected={handleBarcode}
            setScannerActive={setBarcodeActive}
          />
        )}
        {status === "success" && tagData && (
          <ScanResult tagData={tagData} onReset={handleReset} />
        )}
        {status === "error" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{errorMessage}</p>
          </div>
        )}
        <div style={{ marginTop: 20, maxHeight: 160, overflowY: "auto", background: "rgba(0,0,0,0.8)", color: "#0f0", fontFamily: "monospace", fontSize: 12 }}>
          {logs.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>
    )
  );
};

export default NFCScanner;