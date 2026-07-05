"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, XCircle, Undo2 } from "lucide-react";
import { markDealWon, markDealLost, reopenDeal } from "../actions";

interface Props {
  dealId: string;
  status: string;
}

export function DealActions({ dealId, status }: Props) {
  const router = useRouter();
  const [wonAnim, setWonAnim] = useState(false);
  const [lostAnim, setLostAnim] = useState(false);
  const [reason, setReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);

  const handleWon = async () => {
    await markDealWon(dealId);
    setWonAnim(true);
    setTimeout(() => {
      router.refresh();
    }, 1500);
  };

  const handleLost = async () => {
    if (!reason.trim()) return;
    await markDealLost(dealId, reason);
    setLostAnim(true);
    setTimeout(() => {
      router.refresh();
    }, 1500);
  };

  const handleReopen = async () => {
    await reopenDeal(dealId);
    setWonAnim(false);
    setLostAnim(false);
    router.refresh();
  };

  return (
    <>
      {status === "open" && (
        <div className="rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold">Actions</h2>

          <div className="flex gap-2">
            <button
              onClick={handleWon}
              className="inline-flex items-center justify-center rounded-md bg-green-600 text-white h-9 px-3 py-1.5 text-sm font-medium hover:bg-green-700 flex-1"
            >
              <Trophy className="h-4 w-4 mr-1.5" />
              Mark Won
            </button>
            <button
              onClick={() => setShowReasonInput(!showReasonInput)}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 px-3 py-1.5 text-sm font-medium hover:bg-muted flex-1"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Mark Lost
            </button>
          </div>

          {showReasonInput && (
            <div className="space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why was this deal lost?"
                rows={2}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleLost}
                disabled={!reason.trim()}
                className="inline-flex items-center justify-center rounded-md bg-red-600 text-white h-8 px-3 text-xs font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Lost
              </button>
            </div>
          )}
        </div>
      )}

      {(status === "won" || status === "lost") && (
        <div className="rounded-lg border p-6 space-y-3">
          <h2 className="font-semibold">Actions</h2>
          <button
            onClick={handleReopen}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Undo2 className="h-4 w-4 mr-1.5" />
            Reopen Deal
          </button>
        </div>
      )}

      {wonAnim && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="text-center animate-bounce-in">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-2xl font-bold text-green-600">Deal Won!</p>
            <div className="confetti-container">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    backgroundColor: ["#f59e0b", "#06b6d4", "#10b981", "#f43f5e", "#8b5cf6"][i % 5],
                  }}
                />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes confetti-fall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            .confetti-piece {
              position: absolute;
              width: 10px;
              height: 10px;
              border-radius: 2px;
              animation: confetti-fall 1.5s ease-in forwards;
            }
            @keyframes bounce-in {
              0% { transform: scale(0); }
              50% { transform: scale(1.2); }
              100% { transform: scale(1); }
            }
            .animate-bounce-in {
              animation: bounce-in 0.5s ease-out;
            }
          `}</style>
        </div>
      )}

      {lostAnim && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-background border rounded-lg shadow-2xl p-8 text-center transition-all duration-1000 opacity-100 scale-100 lost-fade">
            <p className="text-xl font-bold text-muted-foreground line-through mb-2">
              Deal Lost
            </p>
            <p className="text-sm text-muted-foreground">
              {reason}
            </p>
          </div>
          <style>{`
            .lost-fade {
              animation: lost-anim 1.5s ease-out forwards;
            }
            @keyframes lost-anim {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(0.95); }
              100% { opacity: 0; transform: scale(0.9); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
