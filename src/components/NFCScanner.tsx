// NFCVerificationDemo - Added NFC scan abort logic to avoid stale sessions

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
  const barcodeRef = useRef<string>("");
  const nfcControllerRef = useRef<AbortController | null>(null);

  const supportWebNfc = () => typeof (window as any).NDEFReader === "function";
  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    if (!window.isSecureContext) {
      setStatus("error");
      setErrorMessage("This feature requires HTTPS");
      return;
    }
    const existingSession = localStorage.getItem("sessionId");
    const newSession = existingSession || generateSessionId();
    setSessionId(newSession);
    localStorage.setItem("sessionId", newSession);

    const demoPairs = {
      "8901435003005": "5faf2ecb9e581b",
      "4987176270337": "5fd1f9aae1578b",
    };
    localStorage.setItem("pairs", JSON.stringify(demoPairs));

    resetLogsAndToasts();
    startBarcodeScan();
    // abort any ongoing NFC on unmount
    return () => {
      if (nfcControllerRef.current) {
        nfcControllerRef.current.abort();
      }
    };
  }, []);

  const resetLogsAndToasts = () => {
    message.destroy();
    setLogs([]);
  };

  const startBarcodeScan = () => {
    resetLogsAndToasts();
    addLog("🔄 Starting barcode scan");
    setStatus("scanning");
    setCurrentStep(0);
    setBarcodeActive(true);
  };

  const [barcodeActive, setBarcodeActive] = useState<boolean>(false);

  const handleBarcode = (result: string) => {
    message.destroy();
    addLog(`📦 Barcode scanned: ${result}`);
    barcodeRef.current = result;
    setBarcodeData(result);
    setCurrentStep(1);
    message.success(`Barcode scanned: ${result}. Now scanning NFC.`);
    setBarcodeActive(false);
    startNfcScan(result);
  };

  const startNfcScan = async (barcode: string) => {
    // abort previous scan if any
    if (nfcControllerRef.current) {
      nfcControllerRef.current.abort();
    }
    const controller = new AbortController();
    nfcControllerRef.current = controller;

    setStatus("scanning");
    addLog("🔍 Starting NFC scan…");

    if (!supportWebNfc()) {
      message.destroy();
      addLog("⚠️ Web NFC not supported, redirecting to app…");
      window.location.href = createCustomScheme(sessionId);
      return;
    }

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan({ signal: controller.signal });

      ndef.onreadingerror = () => handleError("Couldn’t read NFC tag. Please try again.");

      ndef.onreading = (event: any) => {
        const uidHex = event.serialNumber.replace(/:/g, "");
        addLog(`📥 NFC tag UID: ${uidHex}`);
        setTagData(uidHex);
        setCurrentStep(2);
        validatePair(barcode, uidHex);
      };
    } catch (err: any) {
      // if aborted, ignore
      if (err.name === 'AbortError') return;
      handleError(err.message || "Failed to start NFC scan");
    }
  };

  const validatePair = (barcode: string, tag: string) => {
    message.destroy();
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
    setTimeout(() => {
      resetLogsAndToasts();
      handleReset();
    }, 5000);
  };

  const handleError = (msg: string) => {
    message.destroy();
    addLog(`❌ Error: ${msg}`);
    setStatus("error");
    setErrorMessage(msg);
    message.error(msg);
    setTimeout(() => {
      resetLogsAndToasts();
      handleReset();
    }, 5000);
  };

  const handleReset = () => {
    setStatus("idle");
    setBarcodeData(null);
    setTagData(null);
    setErrorMessage("");
    setCurrentStep(0);
    barcodeRef.current = "";

    if (nfcControllerRef.current) {
      nfcControllerRef.current.abort();
      nfcControllerRef.current = null;
    }

    const freshSession = generateSessionId();
    setSessionId(freshSession);
    localStorage.setItem("sessionId", freshSession);
    startBarcodeScan();
  };

  // Handle iOS callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const td = params.get("tag_data");

    if (sid === sessionId && td) {
      message.destroy();
      addLog("📥 Received callback from app");
      const tag = decodeURIComponent(td);
      setTagData(tag);
      setCurrentStep(2);
      validatePair(barcodeRef.current, tag);
    }
  }, [sessionId]);
  
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 transition-all duration-300 transform hover:shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">NFC Scanner</h2>
        <p className="text-gray-600">
          Scan a box barcode and its NFC tag to verify pairing.
        </p>
      </div>

      {status === "error" && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{errorMessage}</p>
        </div>
      )}

      <Stepper currentStep={currentStep} />

      {barcodeActive && (
        <BarcodeScanner
          scannerActive={barcodeActive}
          onBarcodeDetected={handleBarcode}
          setScannerActive={setBarcodeActive}
        />
      )}

      {status === "success" && tagData && barcodeData && (
        <ScanResult tagData={tagData} onReset={handleReset} />
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
