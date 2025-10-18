"use client";

import { useMemo, useState, useEffect } from "react";
import { lorelei } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { useFhevm } from "@fhevm-sdk";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHEGenerativeArt } from "~~/hooks/useFHEGenerativeArt";

export const FHEGenerativeArt = () => {
  const { isConnected, chain, address } = useAccount();
  const chainId = chain?.id;

  const provider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);
  const initialMockChains = {
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  };

  const { instance: fhevmInstance } = useFhevm({ provider, chainId, initialMockChains, enabled: true });
  const fheArt = useFHEGenerativeArt({ instance: fhevmInstance, initialMockChains });

  const [input, setInput] = useState("");
  const [avatarSvg, setAvatarSvg] = useState<string | null>(null);

  async function handleCreate() {
    await fheArt.createArt(input);
    const svg = createAvatar(lorelei, { seed: input }).toString();
    setAvatarSvg(svg);
    setInput('')
  }

  useEffect(() => {
    if (fheArt.decryptedString) {
      const svg = createAvatar(lorelei, { seed: fheArt.decryptedString }).toString();
      setAvatarSvg(svg);
    }
  }, [fheArt.decryptedString]);

  if (!isConnected) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center text-center"
        style={{ height: "calc(100vh - 60px)" }}
      >
        <h2 className="text-2xl font-bold mb-4">Connect your wallet to create art 🎨</h2>
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-gray-900">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🎨 FHE Generative Art Studio</h1>
        <p className="text-gray-600">
          Unleash your creativity and generate a unique private artwork on-chain that only you can decrypt and view!
        </p>
      </div>

      <div className="bg-[#f4f4f4] p-6 rounded-[10px] shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">🎭 Create Your Art</h3>

        <input
          type="text"
          maxLength={4}
          value={input}
          onChange={e => setInput(e.target.value)}
          className="w-full border-1 border-gray-300 rounded-md p-3 mb-4 focus:border-[#FFD206] focus:ring focus:ring-yellow-400/30 focus:outline-none transition-colors"
          placeholder="e.g., 'sunrise'"
        />

        <button
          onClick={handleCreate}
          disabled={fheArt.isProcessing || fheArt.hasCreatedArt || !input}
          className="w-full px-6 py-3 rounded-md font-semibold shadow-md bg-[#FFD206] text-gray-900 hover:brightness-110 disabled:opacity-50"
        >
          {fheArt.isProcessing ? "⏳ Creating..." : "✨ Create My Art"}
        </button>
      </div>

      <div className="bg-[#f4f4f4] p-6 rounded-[10px] shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">🔐 My Encrypted Art</h3>

        {avatarSvg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            dangerouslySetInnerHTML={{ __html: avatarSvg }}
            className="mb-4 h-[490px] [&>svg]:h-full [&>svg]:w-auto [&>svg]:mx-auto [&>svg]:block"
          />
        )}

        {printProperty("Has Created", fheArt.hasCreatedArt ? true : false)}
        {printProperty("Decrypted Value", fheArt.decryptedString || "Not decrypted")}

        <button
          disabled={!fheArt.hasCreatedArt || fheArt.isProcessing}
          onClick={fheArt.decrypt}
          className={`w-full px-6 py-3 rounded-md font-semibold shadow-md disabled:opacity-50
            ${fheArt.canDecrypt ? "bg-[#FFD206] text-gray-900 hover:brightness-110" : "bg-gray-400 text-white cursor-not-allowed"} mt-4`}
        >
          {fheArt.canDecrypt ? "🔓 Decrypt My Art" : fheArt.isDecrypting ? "⏳ Decrypting..." : "❌ Nothing to decrypt"}
        </button>
      </div>
    </div>
  );
};

function printProperty(name: string, value: unknown) {
  let val =
    typeof value === "boolean"
      ? value
        ? "✓ true"
        : "✗ false"
      : typeof value === "string" || typeof value === "number"
        ? String(value)
        : JSON.stringify(value ?? "undefined");

  return (
    <div className="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 rounded-md mb-2">
      <span className="font-medium text-gray-800">{name}</span>
      <span
        className={`font-mono text-sm px-2 py-1 rounded ${val.includes("true")
            ? "text-green-800 bg-green-100"
            : val.includes("false")
              ? "text-red-800 bg-red-100"
              : "text-gray-900 bg-gray-100"
          }`}
      >
        {val}
      </span>
    </div>
  );
}
