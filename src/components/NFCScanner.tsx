import React, { useEffect, useState } from "react";
import { generateSessionId, createCustomScheme } from "../utils/nfcHelpers";
import BarcodeScanner from "./barode-scanner/BarcodeScanner";
import Stepper from "./Stepper";
import { message } from "antd";

const NFCScanner: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string>("");
  const [barcodeData, setBarcodeData] = useState<string | null>(null);
  const [tagData, setTagData] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "scanning-barcode" | "scanning-nfc" | "validating" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [barcodeActive, setBarcodeActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const supportWebNfc = () => typeof (window as any).NDEFReader === "function";

  // ── Helpers ────────────────────────────────────────────────────────────
  const addLog = (msg: string) =>
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

  const scheduleReset = () => {
    message.info("🔄 Restarting process in 5 seconds...");
    setTimeout(() => {
      handleReset();
      startBarcodeScan();
    }, 5000);
  };

  const validatePair = (scannedTag: string) => {
    setStatus("validating");
    const pairs: Record<string, string> = JSON.parse(
      localStorage.getItem("pairs") || "{}"
    );
    if (barcodeData && pairs[barcodeData] === scannedTag) {
      message.success("✅ Box and NFC tag match!");
      addLog("Pair validation: SUCCESS");
    } else {
      message.error("❌ Box and NFC tag do NOT match.");
      addLog("Pair validation: FAILURE");
    }
    scheduleReset();
  };

  // ── Seeding demo DB ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem("pairs")) {
      const seedPairs: Record<string, string> = {
        "4056489268116": "5faf2ecb9e581b",
        "8906073782091": "5f16666cbd211f",
      };
      localStorage.setItem("pairs", JSON.stringify(seedPairs));
      console.log("🔧 Seeded pairs:", seedPairs);
    }
  }, []);

  // ── Session ID + feature checks ─────────────────────────────────────────
  useEffect(() => {
    if (!window.isSecureContext) {
      setStatus("error");
      setErrorMessage(
        "This feature requires HTTPS. Please reload under a secure context."
      );
      return;
    }
    if (!supportWebNfc()) {
      setStatus("error");
      setErrorMessage("Web NFC not supported on this device.");
      return;
    }
    const existing = localStorage.getItem("sessionId");
    const id = existing || generateSessionId();
    setSessionId(id);
    localStorage.setItem("sessionId", id);
  }, []);

  // ── Auto-start barcode scan on mount ────────────────────────────────────
  useEffect(() => {
    if (sessionId) {
      startBarcodeScan();
    }
  }, [sessionId]);

  const startBarcodeScan = () => {
    addLog("📷 Starting barcode scan...");
    setStatus("scanning-barcode");
    setCurrentStep(1);
    setBarcodeActive(true);
  };

  // ── Handle barcode result ──────────────────────────────────────────────
  const handleBarcode = (result: string) => {
    addLog(`✅ Barcode scanned: ${result}`);
    setBarcodeData(result);
    setBarcodeActive(false);
    message.success("Barcode scanned! Now starting NFC scan…");
    setCurrentStep(2);
    startNfcScan();
  };

  // ── Trigger NFC scan ───────────────────────────────────────────────────
  const startNfcScan = async () => {
    if (!supportWebNfc()) {
      addLog("⚠️ No WebNFC → falling back to app…");
      window.location.href = createCustomScheme(sessionId);
      return;
    }

    try {
      setStatus("scanning-nfc");
      addLog("🔍 Calling NDEFReader.scan()");
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.onreadingerror = () => {
        setStatus("error");
        message.error("Couldn’t read NFC tag. Restarting shortly…");
        scheduleReset();
      };

      ndef.onreading = (evt: any) => {
        // decode text records only
        const texts: string[] = [];
        for (const rec of evt.message.records) {
          if (rec.recordType === "text") {
            const dec = new TextDecoder(rec.encoding || "utf-8");
            texts.push(dec.decode(rec.data));
          }
        }
        const combined = texts.join("\n");
        setTagData(combined);
        addLog(`🆔 NFC tag scanned: ${combined}`);
        validatePair(combined);
      };
    } catch (err: any) {
      setStatus("error");
      message.error(`NFC scan failed: ${err.message}. Restarting…`);
      addLog(`🚨 NFC scan error: ${err}`);
      scheduleReset();
    }
  };

  // ── Reset everything ───────────────────────────────────────────────────
  const handleReset = () => {
    setStatus("idle");
    setBarcodeData(null);
    setTagData(null);
    setErrorMessage("");
    setCurrentStep(0);
    const newId = generateSessionId();
    localStorage.setItem("sessionId", newId);
    setSessionId(newId);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Box ↔️ NFC Pair Validator</h2>

      {status === "error" && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600">{errorMessage}</p>
        </div>
      )}

      <Stepper currentStep={currentStep} />

      {/* Barcode Scanner (auto-shown) */}
      {barcodeActive && (
        <BarcodeScanner
          setScannerActive={setBarcodeActive}
          scannerActive={barcodeActive}
          onBarcodeDetected={handleBarcode}
        />
      )}

      <div className="mt-4 text-xs text-gray-500">
        Session ID: {sessionId.slice(0, 8)}…
      </div>
    </div>
  );
};

export default NFCScanner;
