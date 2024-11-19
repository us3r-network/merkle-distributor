// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.5.0;

// Allows anyone to claim a token if they exist in a merkle root.
interface IMerkleDistributor {

    function setTokenMerkleRoot(address token_, bytes32 merkleRoot_) external;

    function isClaimed(address token_, uint256 index) external view returns (bool);

    function claim(address token_, uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external;

    event Claimed(address token_, uint256 index, address account, uint256 amount);
}
