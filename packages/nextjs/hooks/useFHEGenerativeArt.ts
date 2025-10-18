"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import {
  FhevmInstance,
  buildParamsFromAbi,
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import { useReadContract } from "wagmi";
import type { Contract } from "~~/utils/helper/contract";
import { bigIntToString, stringToBigInt } from "~~/utils/helper/encoding";
import type { AllowedChainIds } from "~~/utils/helper/networks";

export const useFHEGenerativeArt = ({
  instance,
  initialMockChains,
}: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: fheGenerativeArt } = useDeployedContractInfo({
    contractName: "FHEGenerativeArt",
    chainId: allowedChainId,
  });

  type FHEGenerativeArtInfo = Contract<"FHEGenerativeArt"> & { chainId?: number };

  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const hasContract = Boolean(fheGenerativeArt?.address && fheGenerativeArt?.abi);
  const hasSigner = Boolean(ethersSigner);
  const hasProvider = Boolean(ethersReadonlyProvider);

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(
      fheGenerativeArt!.address,
      (fheGenerativeArt as FHEGenerativeArtInfo).abi,
      providerOrSigner,
    );
  };

  const { data: myArt, refetch: refreshMyArtHandle } = useReadContract({
    address: hasContract ? (fheGenerativeArt!.address as `0x${string}`) : undefined,
    abi: hasContract ? ((fheGenerativeArt as FHEGenerativeArtInfo).abi as any) : undefined,
    functionName: "getMyArt",
    args: [accounts?.[0] ?? ""],
    query: {
      enabled: !!(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });
  
  const artHandle = useMemo(() => myArt as string | undefined, [myArt]);
  
  const hasCreatedArt = useMemo(() => {
    return Boolean(
      artHandle &&
      artHandle !== ethers.ZeroHash &&
      artHandle !== "0x" &&
      artHandle !== "0x0"
    );
  }, [artHandle]);
  
  const requests = useMemo(() => {
    if (!hasContract || !artHandle) return undefined;
    return [
      {
        handle: artHandle,
        contractAddress: fheGenerativeArt!.address,
      },
    ] as const;
  }, [hasContract, fheGenerativeArt?.address, artHandle]);
  
  const {
    decrypt,
    canDecrypt,
    isDecrypting,
    results,
    message: decMsg,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests,
  });

  const [decryptedString, setDecryptedString] = useState<string>("");

  useEffect(() => {
    if (!results || Object.keys(results).length === 0) return;
    const handle = Object.keys(results)[0];
    const decryptedBigInt = results[handle];
    if (typeof decryptedBigInt === "bigint") {
      const text = bigIntToString(decryptedBigInt);
      setDecryptedString(text);
    }
  }, [results]);

  useEffect(() => {
    if (decMsg) setMessage(decMsg);
  }, [decMsg]);

  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: fheGenerativeArt?.address,
  });

  const getEncryptionMethodFor = (functionName: "createArt") => {
    const functionAbi = fheGenerativeArt?.abi.find(item => item.type === "function" && item.name === functionName);
    if (!functionAbi) {
      return { method: undefined as string | undefined, error: `Function ABI not found for ${functionName}` };
    }
    if (!functionAbi.inputs || functionAbi.inputs.length === 0) {
      return { method: undefined as string | undefined, error: `No inputs found for ${functionName}` };
    }
    const firstInput = functionAbi.inputs[0]!;
    return { method: getEncryptionMethod(firstInput.internalType), error: undefined };
  };

  const createArt = useCallback(
    async (text: string) => {
      if (!text || text.length > 10 || isProcessing) return;
      setIsProcessing(true);
      setMessage(`Starting creation for "${text}"...`);
      try {
        const { method, error } = getEncryptionMethodFor("createArt");
        if (!method) return setMessage(error ?? "Encryption method not found");
        setMessage(`Encrypting with ${method}...`);
        const codes = stringToBigInt(text);
        const enc = await encryptWith(builder => (builder as any)[method](codes));
        if (!enc) return setMessage("Encryption failed");
        const writeContract = getContract("write");
        if (!writeContract) return setMessage("Contract not available");
        const params = buildParamsFromAbi(enc, [...fheGenerativeArt!.abi] as any[], "createArt");
        setMessage("Waiting for transaction...");
        const tx = await writeContract.createArt(...params, { gasLimit: 400_000 });
        await tx.wait();
        await refreshMyArtHandle();
        setMessage("✅ Art created successfully!");
      } catch (err) {
        setMessage(`❌ ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [encryptWith, getContract, fheGenerativeArt?.abi, isProcessing],
  );

  return {
    createArt,
    decrypt,
    hasCreatedArt,
    canDecrypt,
    isDecrypting,
    message,
    isProcessing,
    decryptedString,
    artHandle,
    hasContract,
    hasSigner,
    chainId,
    accounts,
    isConnected,
  };
};
