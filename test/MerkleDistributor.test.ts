import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
import { BigNumber, Contract } from 'ethers'
import { ethers } from 'hardhat'
import BalanceTree from '../src/balance-tree'

chai.use(solidity)

const overrides = { gasLimit: 9999999 }
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

describe('MerkleDistributor', () => {
  let token: Contract
  let token2: Contract
  let distributor: Contract
  let wallet0: SignerWithAddress
  let wallet1: SignerWithAddress
  let wallets: SignerWithAddress[]

  beforeEach(async () => {
    wallets = await ethers.getSigners()
    wallet0 = wallets[0]
    wallet1 = wallets[1]
    
    const tokenFactory = await ethers.getContractFactory('TestERC20', wallet0)
    token = await tokenFactory.deploy('Token', 'TKN', 0, overrides)
    token2 = await tokenFactory.deploy('Token2', 'TKN2', 0, overrides)
    
    const distributorFactory = await ethers.getContractFactory('MerkleDistributor', wallet0)
    distributor = await distributorFactory.deploy(overrides)
  })

  describe('#setTokenMerkleRoot', () => {
    it('only owner can set merkle root', async () => {
      const nonOwnerDistributor = distributor.connect(wallet1)
      await expect(
        nonOwnerDistributor.setTokenMerkleRoot(token.address, ZERO_BYTES32)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('can set merkle root for multiple tokens', async () => {
      const merkleRoot1 = ethers.utils.keccak256('0x1234')
      const merkleRoot2 = ethers.utils.keccak256('0x5678')
      
      await distributor.setTokenMerkleRoot(token.address, merkleRoot1)
      await distributor.setTokenMerkleRoot(token2.address, merkleRoot2)
      
      expect(await distributor.tokenMerkleRootMap(token.address)).to.eq(merkleRoot1)
      expect(await distributor.tokenMerkleRootMap(token2.address)).to.eq(merkleRoot2)
    })
  })

  describe('#claim', () => {
    let tree: BalanceTree

    beforeEach(async () => {
      tree = new BalanceTree([
        { account: wallet0.address, amount: BigNumber.from(100) },
        { account: wallet1.address, amount: BigNumber.from(101) },
      ])
      
      await distributor.setTokenMerkleRoot(token.address, tree.getHexRoot())
      await token.setBalance(distributor.address, 201)
    })

    it('fails for empty proof', async () => {
      await expect(
        distributor.claim(token.address, 0, wallet0.address, 10, [])
      ).to.be.revertedWith('InvalidProof()')
    })

    it('successful claim', async () => {
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      await expect(distributor.claim(token.address, 0, wallet0.address, 100, proof0))
        .to.emit(distributor, 'Claimed')
        .withArgs(token.address, 0, wallet0.address, 100)
    })

    it('sets claimed status for specific token', async () => {
      const proof0 = tree.getProof(0, wallet0.address, BigNumber.from(100))
      expect(await distributor.isClaimed(token.address, 0)).to.eq(false)
      await distributor.claim(token.address, 0, wallet0.address, 100, proof0)
      expect(await distributor.isClaimed(token.address, 0)).to.eq(true)
      expect(await distributor.isClaimed(token2.address, 0)).to.eq(false)
    })
  })
})
