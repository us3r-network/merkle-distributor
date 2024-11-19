require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
require("@nomiclabs/hardhat-etherscan")
const { ethers } = require('hardhat')

async function main() {
  // 1. Deploy contract
  console.log('Deploying contract...')
  const MerkleDistributor = await ethers.getContractFactory('MerkleDistributor')
  const merkleDistributor = await MerkleDistributor.deploy()
  await merkleDistributor.deployed()
  console.log(`Contract deployed to: ${merkleDistributor.address}`)

  // 2. Wait for block confirmations
  console.log('Waiting for block confirmations...')
  await merkleDistributor.deployTransaction.wait(5)

  // 3. Verify contract
  console.log('Starting contract verification...')
  try {
    await hre.run("verify:verify", {
      address: merkleDistributor.address,
      constructorArguments: [],
    })
    console.log('Contract verified successfully!')
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('Contract was already verified')
    } else {
      console.error('Verification failed:', error)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
