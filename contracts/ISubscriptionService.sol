// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ISubscriptionService
 * @notice Interface for Reactive Network's subscription service
 * @dev Used to subscribe to events from origin chains
 */
interface ISubscriptionService {
    /**
     * @notice Subscribe to events from a specific contract on an origin chain
     * @param chain_id The chain ID of the origin chain
     * @param _contract The address of the contract to monitor
     * @param topic_0 The event signature (keccak256 of event signature)
     * @param topic_1 First indexed parameter filter (use REACTIVE_IGNORE for wildcard)
     * @param topic_2 Second indexed parameter filter (use REACTIVE_IGNORE for wildcard)
     * @param topic_3 Third indexed parameter filter (use REACTIVE_IGNORE for wildcard)
     * @return subscription_id The ID of the created subscription
     */
    function subscribe(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external returns (uint64 subscription_id);
    
    /**
     * @notice Unsubscribe from a previously created subscription
     * @param subscription_id The ID of the subscription to cancel
     */
    function unsubscribe(uint64 subscription_id) external;
}

address constant SUBSCRIPTION_SERVICE = 0x0000000000000000000000000000000000fffFfF;
