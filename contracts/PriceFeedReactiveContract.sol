// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IReactive, REACTIVE_IGNORE} from './IReactive.sol';
import {ISubscriptionService, SUBSCRIPTION_SERVICE} from './ISubscriptionService.sol';

/**
 * @title PriceFeedReactiveContract
 * @notice Reactive Contract that monitors Chainlink price feed updates on origin chain
 * and relays them to destination chain via cross-chain messages
 */
contract PriceFeedReactiveContract is IReactive {
    uint256 private constant SEPOLIA_CHAIN_ID = 11155111;
    
    // Chainlink AggregatorV3 event signatures
    bytes32 private constant ANSWER_UPDATED_TOPIC = keccak256('AnswerUpdated(int256,uint256,uint256)');
    
    // Origin chain configuration
    uint256 public originChainId;
    address public chainlinkAggregator;
    
    // Destination chain configuration
    uint256 public destinationChainId;
    address public destinationFeedProxy;
    
    // Subscription tracking
    address public owner;
    
    // Feed metadata
    uint8 public decimals;
    string public description;
    
    event FeedUpdateRelayed(
        uint80 indexed roundId,
        int256 answer,
        uint256 updatedAt,
        uint256 destinationChain
    );
    
    constructor(
        address _chainlinkAggregator,
        uint256 _originChainId,
        uint256 _destinationChainId,
        address _destinationFeedProxy,
        uint8 _decimals,
        string memory _description
    ) {
        chainlinkAggregator = _chainlinkAggregator;
        originChainId = _originChainId;
        destinationChainId = _destinationChainId;
        destinationFeedProxy = _destinationFeedProxy;
        decimals = _decimals;
        description = _description;
        owner = msg.sender;
    }
    
    /**
     * @notice Callback function triggered when AnswerUpdated event is detected
     * @param chain_id Origin chain ID
     * @param _contract Address of the Chainlink aggregator
     * @param topic_0 Event signature
     * @param topic_1 Indexed parameter (current answer)
     * @param topic_2 Indexed parameter (round ID)
     * @param topic_3 Indexed parameter (updated timestamp)
     * @param data Event data
     * @param block_number Block number of the event
     * @param op_code Operation code
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
    ) external override vmOnly {
        require(chain_id == originChainId, "Invalid origin chain");
        require(_contract == chainlinkAggregator, "Invalid aggregator");
        require(topic_0 == uint256(ANSWER_UPDATED_TOPIC), "Invalid event");
        
        // Decode AnswerUpdated event
        // Event: AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt)
        int256 answer = int256(topic_1);
        uint80 roundId = uint80(topic_2);
        uint256 updatedAt = topic_3;
        
        // Send cross-chain message to destination FeedProxy
        bytes memory payload = abi.encodeWithSignature(
            "updateAnswer(uint80,int256,uint256,uint256,uint8,string)",
            roundId,
            answer,
            updatedAt,
            block_number,
            decimals,
            description
        );
        
        emit FeedUpdateRelayed(roundId, answer, updatedAt, destinationChainId);
        
        // Send to destination chain
        this.sendMessage(
            destinationChainId,
            destinationFeedProxy,
            payload
        );
    }

    function setupSubscription() external onlyOwner {
        ISubscriptionService(SUBSCRIPTION_SERVICE).subscribe(
            originChainId,
            chainlinkAggregator,
            uint256(ANSWER_UPDATED_TOPIC),
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }
    
    /**
     * @notice Send cross-chain message (internal helper)
     */
    function sendMessage(
        uint256 chain_id,
        address destination,
        bytes memory payload
    ) external payable {
        // This will be handled by ReactVM
        emit Callback(chain_id, destination, 0, payload);
    }
    
    // VM-only modifier
    modifier vmOnly() {
        require(msg.sender == address(0), "VM only");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    receive() external payable {}
}
