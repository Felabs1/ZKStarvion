// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStarknetCore {
    // Sends a message to L2 (Auto-executed by Sequencer)
    function sendMessageToL2(
        uint256 toAddress,
        uint256 selector,
        uint256[] calldata payload
    ) external payable returns (bytes32, uint256);

    // Consumes a message from L2 (Manual execution)
    function consumeMessageFromL2(
        uint256 fromAddress,
        uint256[] calldata payload
    ) external;
}

contract L1Messenger {
    IStarknetCore public starknetCore;
    uint256 public l2ContractAddress; // The address of your Cairo contract

    event MessageSentToL2(uint256 indexed nonce, uint256 value);
    event MessageReceivedFromL2(uint256 value);

    // Sepolia Core Contract: 0xE2Bb56ee936fd6433DC0F6e7e3b8365C906AA057
    constructor(address _starknetCore) {
        starknetCore = IStarknetCore(_starknetCore);
    }

    function setL2ContractAddress(uint256 _l2Address) external {
        l2ContractAddress = _l2Address;
    }

    // 1. Send "Ping" to L2
    function sendPing(uint256 valueToSend) external payable {
        // We need to pay the L2 fee on L1 (msg.value)
        require(msg.value > 0, "Must pay L2 fees");

        uint256[] memory payload = new uint256[](1);
        payload[0] = valueToSend;

        // Selector for "handle_ping" on L2 (computed via hash or tools)
        // For simplicity, we usually calculate this off-chain, but here is a placeholder
        uint256 selector = 123456789; // REPLACE with actual selector

        (bytes32 msgHash, uint256 nonce) = starknetCore.sendMessageToL2{value: msg.value}(
            l2ContractAddress,
            selector,
            payload
        );

        emit MessageSentToL2(nonce, valueToSend);
    }

    // 3. Consume "Pong" from L2
    function consumePong(uint256 valueReceived) external {
        uint256[] memory payload = new uint256[](1);
        payload[0] = valueReceived;

        // This will REVERT if the message hasn't been sent from L2 yet
        starknetCore.consumeMessageFromL2(l2ContractAddress, payload);

        emit MessageReceivedFromL2(valueReceived);
    }
}