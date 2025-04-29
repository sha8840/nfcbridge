import React from 'react';
import { Smartphone } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm py-4 px-6">
      <div className="max-w-5xl mx-auto flex items-center">
        <Smartphone className="text-blue-600 h-6 w-6 mr-2" />
        <h1 className="text-xl font-semibold text-gray-800">NFC Web Bridge</h1>
      </div>
    </header>
  );
};

export default Header;