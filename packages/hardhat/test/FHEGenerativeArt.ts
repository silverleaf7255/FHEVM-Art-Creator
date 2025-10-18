import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEGenerativeArt, FHEGenerativeArt__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { hexlify, toUtf8Bytes } from "ethers";

// --- helper conversion ---
function stringToBigInt(str: string): bigint {
  const bytes = toUtf8Bytes(str);
  const hex = hexlify(bytes).substring(2);
  return BigInt("0x" + hex);
}

function bigIntToString(bn: bigint): string {
  let hex = bn.toString(16);
  if (hex.length % 2 !== 0) hex = "0" + hex;
  return Buffer.from(hex, "hex").toString("utf8");
}

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEGenerativeArt")) as FHEGenerativeArt__factory;
  const artContract = (await factory.deploy()) as FHEGenerativeArt;
  const artContractAddress = await artContract.getAddress();
  return { artContract, artContractAddress };
}

describe("FHEGenerativeArt", function () {
  let signers: Signers;
  let artContract: FHEGenerativeArt;
  let artContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ artContract, artContractAddress } = await deployFixture());
  });

  // ===== Basic Tests =====
  it("should indicate that users haven't created art initially", async function () {
    expect(await artContract.hasCreated(signers.alice.address)).to.eq(false);
    expect(await artContract.hasCreated(signers.bob.address)).to.eq(false);
  });

  it("should allow a user to create an art entry and prevent double creation", async function () {
    const aliceArt = "Alic";
    const aliceArtBigInt = stringToBigInt(aliceArt);

    const encryptedAliceArt = await fhevm
      .createEncryptedInput(artContractAddress, signers.alice.address)
      .add32(aliceArtBigInt)
      .encrypt();

    // Create art
    await (
      await artContract.connect(signers.alice).createArt(encryptedAliceArt.handles[0], encryptedAliceArt.inputProof)
    ).wait();

    // Check hasCreated flag
    expect(await artContract.hasCreated(signers.alice.address)).to.eq(true);

    // Decrypt art
    const decryptedAliceBigInt = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await artContract.getMyArt(signers.alice.address),
      artContractAddress,
      signers.alice
    );
    const decryptedAliceArt = bigIntToString(decryptedAliceBigInt);
    expect(decryptedAliceArt).to.eq(aliceArt);

    // Attempt to create again should revert
    const encryptedAliceArt2 = await fhevm
      .createEncryptedInput(artContractAddress, signers.alice.address)
      .add32(stringToBigInt("Alay"))
      .encrypt();

    await expect(
      artContract.connect(signers.alice).createArt(encryptedAliceArt2.handles[0], encryptedAliceArt2.inputProof)
    ).to.be.revertedWith("Already created");
  });

  it("should allow multiple users to create art independently", async function () {
    const aliceArt = "Al01";
    const bobArt = "Bo02";

    const encryptedAliceArt = await fhevm
      .createEncryptedInput(artContractAddress, signers.alice.address)
      .add32(stringToBigInt(aliceArt))
      .encrypt();

    const encryptedBobArt = await fhevm
      .createEncryptedInput(artContractAddress, signers.bob.address)
      .add32(stringToBigInt(bobArt))
      .encrypt();

    // Alice creates art
    await (await artContract.connect(signers.alice).createArt(encryptedAliceArt.handles[0], encryptedAliceArt.inputProof)).wait();
    // Bob creates art
    await (await artContract.connect(signers.bob).createArt(encryptedBobArt.handles[0], encryptedBobArt.inputProof)).wait();

    // Decrypt
    const decryptedAliceArt = bigIntToString(await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await artContract.getMyArt(signers.alice.address),
      artContractAddress,
      signers.alice
    ));
    const decryptedBobArt = bigIntToString(await fhevm.userDecryptEuint(
      FhevmType.euint32,
      await artContract.getMyArt(signers.bob.address),
      artContractAddress,
      signers.bob
    ));

    expect(decryptedAliceArt).to.eq(aliceArt);
    expect(decryptedBobArt).to.eq(bobArt);

    // Flags
    expect(await artContract.hasCreated(signers.alice.address)).to.eq(true);
    expect(await artContract.hasCreated(signers.bob.address)).to.eq(true);
  });

  // ===== Extended Tests =====
  it("should return uninitialized art for users who haven't created", async function () {
    const encryptedArt = await artContract.getMyArt(signers.bob.address);
    expect(encryptedArt).to.eq(ethers.ZeroHash);
  });

  it("should correctly track hasCreated flags for multiple users", async function () {
    const aliceArt = "A_01";
    const bobArt = "B_02";

    const encryptedAliceArt = await fhevm
      .createEncryptedInput(artContractAddress, signers.alice.address)
      .add32(stringToBigInt(aliceArt))
      .encrypt();

    const encryptedBobArt = await fhevm
      .createEncryptedInput(artContractAddress, signers.bob.address)
      .add32(stringToBigInt(bobArt))
      .encrypt();

    await (await artContract.connect(signers.alice).createArt(encryptedAliceArt.handles[0], encryptedAliceArt.inputProof)).wait();

    expect(await artContract.hasCreated(signers.alice.address)).to.eq(true);
    expect(await artContract.hasCreated(signers.bob.address)).to.eq(false);

    await (await artContract.connect(signers.bob).createArt(encryptedBobArt.handles[0], encryptedBobArt.inputProof)).wait();

    expect(await artContract.hasCreated(signers.alice.address)).to.eq(true);
    expect(await artContract.hasCreated(signers.bob.address)).to.eq(true);
  });

  it("should allow multiple users to create art consecutively without conflict", async function () {
    const users = [signers.deployer, signers.alice, signers.bob];
    const arts = ["U001", "U002", "U003"];

    for (let i = 0; i < users.length; i++) {
      const encryptedArt = await fhevm
        .createEncryptedInput(artContractAddress, users[i].address)
        .add32(stringToBigInt(arts[i]))
        .encrypt();
      await (await artContract.connect(users[i]).createArt(encryptedArt.handles[0], encryptedArt.inputProof)).wait();
    }

    for (let i = 0; i < users.length; i++) {
      expect(await artContract.hasCreated(users[i].address)).to.eq(true);
      const decryptedArt = bigIntToString(await fhevm.userDecryptEuint(
        FhevmType.euint32,
        await artContract.getMyArt(users[i].address),
        artContractAddress,
        users[i]
      ));
      expect(decryptedArt).to.eq(arts[i]);
    }
  });

  it("should revert when multiple users attempt to double create", async function () {
    const encryptedAliceArt = await fhevm
      .createEncryptedInput(artContractAddress, signers.alice.address)
      .add32(stringToBigInt("D001"))
      .encrypt();

    await (await artContract.connect(signers.alice).createArt(encryptedAliceArt.handles[0], encryptedAliceArt.inputProof)).wait();

    const encryptedAliceArt2 = await fhevm
      .createEncryptedInput(artContractAddress, signers.alice.address)
      .add32(stringToBigInt("D002"))
      .encrypt();

    await expect(
      artContract.connect(signers.alice).createArt(encryptedAliceArt2.handles[0], encryptedAliceArt2.inputProof)
    ).to.be.revertedWith("Already created");
  });
});
