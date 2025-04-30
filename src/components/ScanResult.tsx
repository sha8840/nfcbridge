import React, { useState } from 'react';
import { CheckCircle, Copy, RefreshCw } from 'lucide-react';

interface ScanResultProps {
  tagData: string;
  onReset: () => void;
}

const ScanResult: React.FC<ScanResultProps> = ({ tagData, onReset }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tagData).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mb-6 animate-fadeIn">
      <div className="flex items-center justify-center mb-4">
        <CheckCircle className="text-green-500 h-12 w-12" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-800 mb-2 text-center">
        Tag Scanned Successfully
      </h3>
      
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {tagData}
        </pre>
        
        <button 
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-gray-700 bg-white rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
      
      {/* <div className="mt-6 flex justify-center"> */}
        {/* <button 
          onClick={onReset}
          className="flex items-center px-4 py-2 text-blue-600 font-medium hover:text-blue-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Scan Another Tag
        </button> */}
      {/* </div> */}
    </div>
  );
};

export default ScanResult;