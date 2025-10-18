// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHEGenerativeArt
 * @notice Each user can create one unique encrypted generative art entry.
 *         Art data is stored privately using Fully Homomorphic Encryption (FHE).
 */
contract FHEGenerativeArt is SepoliaConfig {
    /// @notice Stores encrypted art choice for each user.
    mapping(address => euint32) private _userChoice;

    /// @notice Tracks whether a user has already created an art entry.
    mapping(address => bool) private _hasCreated;

    /**
     * @notice Creates a new encrypted art record for the sender.
     * @param choiceEncrypted The encrypted art choice (FHE-encrypted uint32).
     * @param proof The zero-knowledge proof corresponding to the encrypted value.
     * @dev
     * - Each user can only create once.
     * - Grants decrypt permission to both the user and the contract.
     */
    function createArt(externalEuint32 choiceEncrypted, bytes calldata proof) external {
        require(!_hasCreated[msg.sender], "Already created");

        euint32 value = FHE.fromExternal(choiceEncrypted, proof);
        _userChoice[msg.sender] = value;

        // Allow both the user and the contract to decrypt this value
        FHE.allow(value, msg.sender);
        FHE.allowThis(value);

        _hasCreated[msg.sender] = true;
    }

    /**
     * @notice Checks if a user has already created an art record.
     * @param user Address to check.
     * @return True if the user has already created art.
     */
    function hasCreated(address user) external view returns (bool) {
        return _hasCreated[user];
    }

    /**
     * @notice Returns the encrypted art data of a user.
     * @param user Address whose art data to retrieve.
     * @return The encrypted art value (`euint32`).
     * @dev Only the user or the contract can decrypt the value.
     */
    function getMyArt(address user) external view returns (euint32) {
        return _userChoice[user];
    }
}
