import React from 'react';
import { Scan } from 'lucide-react';

interface ScanButtonProps {
  onClick: () => void;
  isScanning: boolean;
}

const ScanButton: React.FC<ScanButtonProps> = ({ onClick, isScanning }) => {
  return (
    <button
      onClick={onClick}
      disabled={isScanning}
      className={`
        w-full py-4 px-6 flex items-center justify-center
        text-white font-medium rounded-lg
        transition-all duration-300 transform
        ${isScanning 
          ? 'bg-blue-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 active:scale-95 hover:shadow-md'
        }
      `}
    >
      <Scan className="mr-2 h-5 w-5" />
      {isScanning ? 'Launching Scanner...' : 'Scan NFC Tag'}
    </button>
  );
};

export default ScanButton;