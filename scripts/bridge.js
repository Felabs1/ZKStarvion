const { RpcProvider, hash, Contract, constants } = require("starknet");
const { ethers } = require("ethers");

// CONFIG
const L1_CORE_ADDRESS = "0xE2Bb56ee936fd6433DC0F6e7e3b8365C906AA057"; // Sepolia
const L1_CONTRACT_ADDRESS = "YOUR_DEPLOYED_SOL_ADDR";
const L2_CONTRACT_ADDRESS = "YOUR_DEPLOYED_CAIRO_ADDR";
const L2_FUNCTION_NAME = "handle_ping";

async function main() {
  // 1. Calculate the L2 Selector (The function name hash)
  const l2Selector = hash.getSelectorFromName(L2_FUNCTION_NAME);
  console.log("L2 Selector:", l2Selector);

  // 2. Estimate L1 -> L2 Fee (using Starknet Provider)
  const l2Provider = new RpcProvider({
    nodeUrl: constants.NetworkName.SN_SEPOLIA,
  });

  console.log("Estimating Message Fee...");
  const messageFee = await l2Provider.estimateMessageFee({
    from_address: L1_CONTRACT_ADDRESS,
    to_address: L2_CONTRACT_ADDRESS,
    entry_point_selector: L2_FUNCTION_NAME,
    payload: ["100"], // We are sending the number 100
  });

  console.log("Estimated Fee (wei):", messageFee.overall_fee);

  // 3. Send Transaction on L1 (using Ethers)
  // You would use ethers.js here to call `sendPing` on your Solidity contract
  // passing `messageFee.overall_fee` as the `value` (msg.value).

  // ... (Standard Ethers.js transaction code) ...

  console.log("Message sent! Wait ~10-20 mins for L2 execution.");
}

main();
