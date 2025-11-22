// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IReactive
 * @notice Interface for Reactive Network contracts
 * @dev Contracts that want to react to events must implement this interface
 */
interface IReactive {
    /**
     * @notice Callback function triggered when a subscribed event is detected
     * @dev This function is called by the ReactVM when an event matching the subscription occurs
     * @param chain_id The chain ID where the event originated
     * @param _contract The address of the contract that emitted the event
     * @param topic_0 The event signature (first topic)
     * @param topic_1 First indexed parameter (or 0 if not indexed)
     * @param topic_2 Second indexed parameter (or 0 if not indexed)
     * @param topic_3 Third indexed parameter (or 0 if not indexed)
     * @param data The non-indexed event data (ABI-encoded)
     * @param block_number The block number where the event was emitted
     * @param op_code Operation code (reserved for future use)
     */
    function react(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3,
        bytes calldata data,
        uint256 block_number,
        uint256 op_code
    ) external;
    
    /**
     * @notice Event emitted to trigger a callback on a destination chain
     * @dev The ReactVM listens for this event and executes the callback
     * @param chain_id The destination chain ID
     * @param _contract The destination contract address
     * @param gas_limit Gas limit for the callback (0 for default)
     * @param payload The encoded function call to execute on destination
     */
    event Callback(
        uint256 indexed chain_id,
        address indexed _contract,
        uint256 gas_limit,
        bytes payload
    );
}

uint256 constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;
