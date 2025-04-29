import NFCScanner from "./components/NFCScanner";
import Header from "./components/Header";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <NFCScanner />
      </main>
      <footer className="py-4 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} NFC Web Bridge</p>
      </footer>
    </div>
  );
}

export default App;
