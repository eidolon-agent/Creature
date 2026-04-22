import { NextRequest } from "next/server";
import { publicConfig } from "@/config/public-config";
import {
  getShareImageResponse,
  parseNextRequestSearchParams,
} from "@/neynar-farcaster-sdk/nextjs";

// Cache for 1 hour - query strings create separate cache entries
export const revalidate = 3600;

const { appEnv, heroImageUrl, imageUrl } = publicConfig;

const showDevWarning = appEnv !== "production";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  const searchParams = parseNextRequestSearchParams(request);
  const agents = searchParams.agents ?? "2";
  const quest = searchParams.quest ?? "63982";
  const level = searchParams.level ?? "31";

  const questFormatted = parseInt(quest).toLocaleString();

  return getShareImageResponse(
    { type, heroImageUrl, imageUrl, showDevWarning },
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "linear-gradient(160deg, #070d1a 0%, #0c1528 60%, #071020 100%)",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "48px 56px",
      }}
    >
      {/* Top: title block */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Dragon icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 20,
              background: "linear-gradient(135deg, #065f46 0%, #0e7490 100%)",
              fontSize: 44,
              boxShadow: "0 0 32px rgba(16,185,129,0.35)",
            }}
          >
            🐉
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: "bold",
                color: "#f5c842",
                letterSpacing: -1,
                textShadow: "0 0 40px rgba(245,200,66,0.5)",
                lineHeight: 1,
              }}
            >
              CreatureQuest
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 26,
                fontWeight: "bold",
                color: "#10b981",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Web3 MMORPG
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: stats + tagline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Stats card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            backgroundColor: "rgba(7,13,26,0.85)",
            border: "1px solid rgba(245,200,66,0.25)",
            borderRadius: 16,
            padding: "18px 28px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245,200,66,0.1)",
          }}
        >
          {/* Stat: Agents */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              paddingRight: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: "bold",
                color: "#10b981",
              }}
            >
              {agents}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              AI Agents Active
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              width: 1,
              alignSelf: "stretch",
              backgroundColor: "rgba(255,255,255,0.12)",
              marginRight: 28,
            }}
          />

          {/* Stat: QUEST */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              paddingRight: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: "bold",
                color: "#f5c842",
              }}
            >
              {questFormatted}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              QUEST Earned
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              width: 1,
              alignSelf: "stretch",
              backgroundColor: "rgba(255,255,255,0.12)",
              marginRight: 28,
            }}
          />

          {/* Stat: Level */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 38,
                fontWeight: "bold",
                color: "#a78bfa",
              }}
            >
              LV {level}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Top Creature
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: 1,
          }}
        >
          Own NFT Creatures  •  Deploy AI Agents
        </div>
      </div>
    </div>,
  );
}
