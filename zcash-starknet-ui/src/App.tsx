import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
  Activity,
  CheckCircle,
  Clock,
  ArrowLeftRight,
  Search,
  User, // <--- NEW ICON
} from "lucide-react";
import starknet from "../assets/starknet.png";
import zcash from "../assets/zcash.png";
import TransactionModal from "./TransactionModal";

const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "https://zkstarvion.onrender.com";

// ----------------------
// TYPES
// ----------------------
interface HistoryItem {
  amount: number;
  status: string;
  zcashTxId: string;
  starknetTxId?: string | null;
  recipient?: string; // <--- Added recipient to history type
}

type BridgeResponse = {
  success: boolean;
  message?: string;
};

function App() {
  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>(""); // <--- NEW STATE
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState(null);

  // New State to hold the Token Address from the backend
  const [tokenAddress, setTokenAddress] = useState<string>("");

  useEffect(() => {
    // Fetch Token Address once on load
    axios
      .get(`${API_URL}/status`)
      .then((res) => {
        if (res.data.tokenAddr) setTokenAddress(res.data.tokenAddr);
      })
      .catch(() => null);

    const interval = setInterval(fetchHistory, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get<HistoryItem[]>(`${API_URL}/history`);
      setHistory(res.data.reverse());
    } catch (err) {
      console.error("Backend offline?", err);
    }
  };

  const viewZcashTx = async (txid: any) => {
    try {
      const res = await axios.get(`${API_URL}/zcash-tx/${txid}`);
      setSelectedTx(res.data);
    } catch (e) {
      alert("Could not fetch details. Node might be syncing.");
    }
  };

  // ----------------------
  // HANDLE BRIDGE
  // ----------------------
  const handleBridge = async (): Promise<void> => {
    if (!amount || !recipient) {
      setError("Please enter both amount and recipient address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Updated Payload to include recipient
      const response = await axios.post<BridgeResponse>(`${API_URL}/bridge`, {
        amount: Number(amount),
        recipient: recipient, // <--- Sending Recipient
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Bridge failed");
      }

      setAmount("");
      // Optional: Don't clear recipient so they can send again easily
      fetchHistory();
    } catch (error: unknown) {
      const axiosErr = error as AxiosError;
      setError(
        axiosErr.response?.data
          ? "Failed to broadcast. Server responded with an error."
          : "Failed to broadcast. Check server console."
      );
    } finally {
      setTimeout(() => setIsLoading(false), 1500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 font-sans bg-zinc-950 text-zinc-200">
      {/* HEADER */}
      <div className="w-full max-w-6xl mb-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <ArrowLeftRight className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              ZKStarvion
            </h1>
            <p className="text-zinc-500 text-sm font-medium">
              A Zcash &lt;-&gt; Starknet Cross Chain Messaging Layer
            </p>
          </div>
        </div>

        <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            System Operational
          </span>
        </div>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: BRIDGE FORM */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group"
        >
          {/* Ambient Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50"></div>

          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <img
                src={zcash}
                alt="zcash"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Zcash Shielded</h2>
              <p className="text-zinc-500 text-xs uppercase tracking-wide">
                Origin Chain (Regtest)
              </p>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            {/* INPUT 1: RECIPIENT */}
            <div className="bg-black/40 p-4 rounded-2xl border border-zinc-800 focus-within:border-yellow-500/50 transition-colors">
              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 flex items-center gap-2">
                <User className="w-3 h-3" /> Recipient Address (L2)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="bg-transparent text-sm font-mono text-white placeholder-zinc-700 outline-none w-full"
              />
            </div>

            {/* INPUT 2: AMOUNT */}
            <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800 focus-within:border-yellow-500/50 transition-colors">
              <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-wider">
                Amount to Bridge
              </label>

              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setAmount(e.target.value)
                  }
                  placeholder="0.00"
                  className="bg-transparent text-5xl font-bold text-white placeholder-zinc-800 outline-none w-full font-mono"
                />
                <span className="text-xl font-bold text-yellow-500/50">
                  ZEC
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/20">
                {error}
              </div>
            )}

            <button
              onClick={handleBridge}
              disabled={isLoading || !amount || !recipient}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                isLoading
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black shadow-lg shadow-yellow-900/20"
              }`}
            >
              {isLoading ? (
                <>
                  Processing <Activity className="w-5 h-5 animate-spin" />
                </>
              ) : (
                <>
                  Initiate Bridge <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* RIGHT: HISTORY */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>

          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <img
                src={starknet}
                alt="starknet"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Starknet Sepolia</h2>
              <p className="text-zinc-500 text-xs uppercase tracking-wide">
                Destination Chain (L2)
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
            <AnimatePresence>
              {history.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                    <Activity className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-600 font-medium">
                    No activity detected
                  </p>
                </motion.div>
              )}

              {history.map((tx, idx) => (
                <motion.div
                  key={tx.zcashTxId || idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-black/20 rounded-xl p-4 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3 border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-full ${
                          tx.status.includes("Bridged")
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400 animate-pulse"
                        }`}
                      >
                        {tx.status.includes("Bridged") ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-white text-md">
                          {`Mint ${tx.amount} Tokens`}
                        </div>
                        <div
                          className={`text-xs font-medium ${
                            tx.status.includes("Bridged")
                              ? "text-green-500"
                              : "text-blue-500"
                          }`}
                        >
                          {tx.status}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                      <button
                        onClick={() => viewZcashTx(tx.zcashTxId)}
                        className="font-mono text-zinc-400 truncate w-32 md:w-48 hover:text-yellow-500 transition-colors text-left flex items-center gap-2 group/zlink"
                        title="View Receipt"
                      >
                        {tx.zcashTxId}
                        <Search className="w-3 h-3 opacity-0 group-hover/zlink:opacity-100 transition-opacity" />
                      </button>
                      <span className="text-zinc-600 text-[10px]">Origin</span>
                    </div>

                    {tx.starknetTxId ? (
                      <a
                        href={`https://sepolia.voyager.online/tx/${tx.starknetTxId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-xs bg-blue-900/10 p-2 rounded border border-blue-500/20 hover:bg-blue-900/20 transition-colors group/link"
                      >
                        <span className="font-mono text-blue-200 truncate w-48 flex items-center gap-2">
                          {tx.starknetTxId}
                        </span>
                        <ExternalLink className="w-3 h-3 text-blue-500" />
                      </a>
                    ) : (
                      <div className="text-xs bg-zinc-900/30 p-2 rounded border border-zinc-800/30 opacity-50">
                        <span className="text-zinc-600">Pending L2...</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Token Address Card for easy copying */}
            {tokenAddress && (
              <div className="mt-6 bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">
                    BZEC Token Address
                  </p>
                  <p className="text-zinc-400 text-xs font-mono mt-1 truncate w-48">
                    {tokenAddress}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tokenAddress);
                    alert("Copied!");
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-lg font-bold transition-colors"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedTx && (
          <TransactionModal
            tx={selectedTx}
            onClose={() => setSelectedTx(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
