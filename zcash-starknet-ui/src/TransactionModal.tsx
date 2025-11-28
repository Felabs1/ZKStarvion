import { X, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import zcash from "../assets/zcash.png";
import React from "react";

// ---- TYPES ----
export interface TxReceipt {
  txid: string;
  confirmations: number;
  blockhash?: string;
  fee?: number;
  time: number;
}

interface TransactionModalProps {
  tx: TxReceipt | null;
  onClose: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ tx, onClose }) => {
  if (!tx) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl relative"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
              <img src={zcash} alt="Zcash" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Zcash Transaction Receipt
              </h3>
              <p className="text-xs text-yellow-500 font-mono">
                Regtest Network (Local)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* Status + Confirmations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/30 p-4 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-1">
                Status
              </span>
              <span className="text-green-400 font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Confirmed
              </span>
            </div>

            <div className="bg-black/30 p-4 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-1">
                Confirmations
              </span>
              <span className="text-white font-mono text-lg">
                {tx.confirmations} Blocks
              </span>
            </div>
          </div>

          {/* Txid */}
          <div className="space-y-1">
            <label className="text-zinc-500 text-xs uppercase tracking-wider ml-1">
              Transaction ID
            </label>
            <div className="bg-black p-3 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 break-all select-all">
              {tx.txid}
            </div>
          </div>

          {/* Block Hash */}
          <div className="space-y-1">
            <label className="text-zinc-500 text-xs uppercase tracking-wider ml-1">
              Block Hash
            </label>
            <div className="bg-black p-3 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-500 break-all">
              {tx.blockhash || "Pending..."}
            </div>
          </div>

          {/* Fee */}
          <div className="bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/10 mt-4">
            <span className="text-yellow-600 text-xs font-bold uppercase tracking-wider block mb-1">
              Fee Paid
            </span>
            <span className="text-yellow-500 font-mono text-lg">
              {Math.abs(tx.fee ?? 0.0001)} ZEC
            </span>
          </div>

          {/* Timestamp */}
          <div className="pt-4">
            <div className="text-[10px] text-zinc-600 font-mono text-center">
              Timestamp: {new Date(tx.time * 1000).toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TransactionModal;
