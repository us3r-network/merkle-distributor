// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.17;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IMerkleDistributor} from "./interfaces/IMerkleDistributor.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

error AlreadyClaimed();
error InvalidProof();

contract MerkleDistributor is IMerkleDistributor, Ownable {
    using SafeERC20 for IERC20;

    mapping(address => bytes32) public tokenMerkleRootMap;

    mapping(address => mapping(uint256 => uint256)) private claimedBitMap;

    function setTokenMerkleRoot(address token_, bytes32 merkleRoot_) external onlyOwner {
        tokenMerkleRootMap[token_] = merkleRoot_;
    }

    function isClaimed(address token_, uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[token_][claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(address token_, uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[token_][claimedWordIndex] = claimedBitMap[token_][claimedWordIndex] | (1 << claimedBitIndex);
    }

    function claim(
        address token_,
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external virtual override {
        if (isClaimed(token_, index)) revert AlreadyClaimed();

        bytes32 merkleRoot = tokenMerkleRootMap[token_];
        
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) revert InvalidProof();

        _setClaimed(token_, index);
        IERC20(token_).safeTransfer(account, amount);

        emit Claimed(token_, index, account, amount);
    }
}
