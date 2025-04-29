import React, { useEffect, useState } from "react";
import { generateSessionId, createCustomScheme } from "../utils/nfcHelpers";
import ScanButton from "./ScanButton";
import ScanResult from "./ScanResult";
import BarcodeScanner from "./barode-scanner/BarcodeScanner";
import Stepper from "./Stepper";
import { Modal } from "antd";

const NFCScanner: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [tagData, setTagData] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "scanning" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [barcodeActive, setBarcodeActive] = useState<boolean>(false);
  const [barcodeData, setBarcodeData] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [oldSessionId, setOldSessionId] = useState<string | null>(null);


  useEffect(() => {
    setSessionId(localStorage.getItem("sessionId") || "");
    setOldSessionId(localStorage.getItem("sessionId") || "");
  }, [sessionId, oldSessionId]);

  useEffect(() => {
    const oldSessionId = localStorage.getItem("sessionId");
    console.log(localStorage.getItem("sessionId"));
    if (oldSessionId) {
      setSessionId(oldSessionId);
    } else {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      localStorage.setItem("sessionId", newSessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    const checkUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const scannedSessionId = params.get("session_id");
      const scannedTagData = params.get("tag_data");

      if (scannedSessionId && scannedTagData) {
        if (scannedSessionId === sessionId) {
          setTagData(decodeURIComponent(scannedTagData));
          setStatus("success");
          setCurrentStep(1);
        } else {
          setStatus("error");
          setErrorMessage("Invalid session ID. Please try scanning again.");
        }
      }
    };

    checkUrlParams();

    window.addEventListener("popstate", checkUrlParams);
    return () => window.removeEventListener("popstate", checkUrlParams);
  }, [sessionId]);

  const handleScan = () => {
    if (!sessionId) return;

    setStatus("scanning");
    const customScheme = createCustomScheme(sessionId);
    window.location.href = customScheme;
  };

  const handleBarcode = (results: any) => {
    if (results && currentStep === 1) {
      setBarcodeData(results);
      setCurrentStep(2);
      setStatus("success");
      setTimeout(() => {
        Modal.success({
          title: "Validation Successful",
        });
        setCurrentStep(4);
      }, 2000);
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setTagData(null);
    setErrorMessage("");
    const newSessionId = generateSessionId();
    localStorage.getItem("sessionId") && localStorage.removeItem("sessionId");
    localStorage.setItem("sessionId", newSessionId);
    setSessionId(newSessionId);

    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 transition-all duration-300 transform hover:shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">NFC Scanner</h2>
        <p className="text-gray-600">
          Scan an NFC tag to retrieve its data securely.
        </p>
      </div>

      {status === "success" && tagData && (
        <ScanResult tagData={tagData} onReset={handleReset} />
      )}

      {barcodeActive && (
        <BarcodeScanner
          scannerActive={barcodeActive}
          onBarcodeDetected={(r) => handleBarcode(r)}
          setScannerActive={setBarcodeActive}
        />
      )}

      {status === "error" && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{errorMessage}</p>
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      <Stepper currentStep={currentStep} />

      {(status === "idle" || status === "scanning") && (
        <ScanButton onClick={handleScan} isScanning={status === "scanning"} />
      )}

      <button
        className="mt-4 w-full py-2 px-4 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-all duration-300"
        onClick={() => setBarcodeActive(!barcodeActive)}
      >
        Scan Barcode
      </button>

      {sessionId && (
        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>Session ID: {sessionId.substring(0, 8)}...</p>
          <p>OldSessionID: {oldSessionId?.substring(0,8)}</p>
        </div>
      )}
    </div>
  );
};

export default NFCScanner;
