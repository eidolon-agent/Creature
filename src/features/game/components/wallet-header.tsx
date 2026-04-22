"use client";

import { useAccount, useBalance, useReadContract } from "wagmi";
import { ShareButton } from "@/neynar-farcaster-sdk/mini";
import { formatUnits } from "viem";

// ─── QUEST Token config ────────────────────────────────────────────────────
// Replace QUEST_TOKEN_ADDRESS with the real deployed ERC-20 address on Base
// once your token contract is live. Set QUEST_DECIMALS to match the contract.
const QUEST_TOKEN_ADDRESS = null as `0x${string}` | null; // e.g. "0xABC..."
const QUEST_DECIMALS = 18;

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatBalance(raw: bigint, decimals: number, maxDecimals = 2): string {
  const value = parseFloat(formatUnits(raw, decimals));
  if (value === 0) return "0";
  if (value < 0.001) return "< 0.001";
  return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}

export function WalletHeader() {
  const { address, isConnected } = useAccount();

  // Live ETH balance on Base (always available as a Web3 signal)
  const { data: ethBalance } = useBalance({
    address,
    chainId: 8453, // Base
    query: { enabled: !!address },
  });

  // QUEST token balance — only fires when token contract is set
  const { data: questRaw } = useReadContract({
    address: QUEST_TOKEN_ADDRESS ?? undefined,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 8453,
    query: { enabled: !!address && !!QUEST_TOKEN_ADDRESS },
  });

  const questBalance =
    questRaw !== undefined
      ? formatBalance(questRaw, QUEST_DECIMALS, 0)
      : null;

  const ethDisplay =
    ethBalance
      ? `${formatBalance(ethBalance.value, 18, 4)} ETH`
      : null;

  // Dynamic share params
  const shareQuest = questBalance ?? "63982";
  const shareAgents = "2";
  const shareLevel = "31";

  return (
    <header className="shrink-0 px-4 pt-3 pb-2 border-b border-gray-800/60">
      <div className="flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-emerald-600 to-cyan-700 flex items-center justify-center text-base">
            🐉
          </div>
          <div className="min-w-0">
            <div className="text-white font-black text-base leading-none tracking-tight truncate">
              CreatureQuest
            </div>
            <div className="text-gray-500 text-xs">Web3 MMORPG</div>
          </div>
        </div>

        {/* Right side: wallet + share */}
        <div className="flex items-center gap-2 shrink-0">
          {isConnected && address ? (
            <div className="flex flex-col items-end">
              {/* QUEST balance (real contract) or ETH balance (live on-chain) */}
              <div className="flex items-center gap-1.5 bg-yellow-950/60 border border-yellow-800/40 rounded-xl px-2.5 py-1">
                <span className="text-sm">💰</span>
                <div className="text-right">
                  {questBalance !== null ? (
                    <>
                      <div className="text-yellow-400 font-bold text-sm leading-none">
                        {questBalance}
                      </div>
                      <div className="text-gray-500 text-xs leading-none">QUEST</div>
                    </>
                  ) : ethDisplay !== null ? (
                    <>
                      <div className="text-cyan-400 font-bold text-xs leading-none">
                        {ethDisplay}
                      </div>
                      <div className="text-gray-500 text-[10px] leading-none">Base</div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-500 font-bold text-sm leading-none animate-pulse">
                        …
                      </div>
                      <div className="text-gray-600 text-xs leading-none">QUEST</div>
                    </>
                  )}
                </div>
              </div>
              {/* Wallet address */}
              <div className="text-gray-500 text-[10px] mt-0.5 font-mono">
                {truncateAddress(address)}
              </div>
            </div>
          ) : (
            /* Not connected — show placeholder */
            <div className="flex items-center gap-1.5 bg-gray-900/60 border border-gray-700/40 rounded-xl px-2.5 py-1.5">
              <span className="text-sm">🔗</span>
              <div className="text-gray-400 text-xs">Connect wallet</div>
            </div>
          )}

          <ShareButton
            text="Forging my Web3 MMORPG squad on CreatureQuest — NFT creatures + AI agents. Come battle!"
            queryParams={{
              agents: shareAgents,
              quest: shareQuest,
              level: shareLevel,
            }}
            variant="outline"
            size="sm"
          >
            Share
          </ShareButton>
        </div>
      </div>
    </header>
  );
}
