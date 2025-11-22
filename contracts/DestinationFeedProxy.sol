// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DestinationFeedProxy
 * @notice Receives cross-chain price feed updates and exposes them via AggregatorV3Interface
 * @dev Compatible with Chainlink's AggregatorV3Interface for seamless integration
 */
contract DestinationFeedProxy {
    // Price feed data structure
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }
    
    // Feed metadata
    uint8 public decimals;
    string public description;
    uint256 public version = 1;
    
    // Latest round data
    RoundData public latestRound;
    
    // Historical round data
    mapping(uint80 => RoundData) public rounds;
    
    // Access control
    address public reactiveContract;
    address public owner;
    
    // Events
    event AnswerUpdated(
        int256 indexed current,
        uint256 indexed roundId,
        uint256 updatedAt
    );
    
    event NewRound(
        uint256 indexed roundId,
        address indexed startedBy,
        uint256 startedAt
    );
    
    event ReactiveContractUpdated(
        address indexed oldContract,
        address indexed newContract
    );
    
    modifier onlyReactive() {
        require(msg.sender == reactiveContract, "Only reactive contract");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(
        address _reactiveContract,
        uint8 _decimals,
        string memory _description
    ) {
        reactiveContract = _reactiveContract;
        decimals = _decimals;
        description = _description;
        owner = msg.sender;
    }
    
    /**
     * @notice Update price feed data (called by Reactive Contract via callback)
     * @param roundId Round identifier
     * @param answer Price answer
     * @param updatedAt Timestamp of update
     * @param startedAt Timestamp when round started
     * @param _decimals Decimals for the answer
     * @param _description Feed description
     */
    function updateAnswer(
        uint80 roundId,
        int256 answer,
        uint256 updatedAt,
        uint256 startedAt,
        uint8 _decimals,
        string memory _description
    ) external onlyReactive {
        require(roundId > latestRound.roundId, "Round ID must increase");
        require(answer > 0, "Invalid answer");
        
        // Update metadata if provided
        if (_decimals > 0 && decimals != _decimals) {
            decimals = _decimals;
        }
        
        if (bytes(_description).length > 0 && 
            keccak256(bytes(description)) != keccak256(bytes(_description))) {
            description = _description;
        }
        
        // Create round data
        RoundData memory newRound = RoundData({
            roundId: roundId,
            answer: answer,
            startedAt: startedAt,
            updatedAt: updatedAt,
            answeredInRound: roundId
        });
        
        // Store round data
        rounds[roundId] = newRound;
        latestRound = newRound;
        
        emit NewRound(roundId, msg.sender, startedAt);
        emit AnswerUpdated(answer, roundId, updatedAt);
    }
    
    /**
     * @notice Get data about the latest round
     * @return roundId Round identifier
     * @return answer Price answer
     * @return startedAt Timestamp when round started
     * @return updatedAt Timestamp of last update
     * @return answeredInRound Round ID in which answer was computed
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(latestRound.updatedAt > 0, "No data available");
        
        return (
            latestRound.roundId,
            latestRound.answer,
            latestRound.startedAt,
            latestRound.updatedAt,
            latestRound.answeredInRound
        );
    }
    
    /**
     * @notice Get data about a specific round
     * @param _roundId Round identifier
     * @return roundId Round identifier
     * @return answer Price answer
     * @return startedAt Timestamp when round started
     * @return updatedAt Timestamp of last update
     * @return answeredInRound Round ID in which answer was computed
     */
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        RoundData memory round = rounds[_roundId];
        require(round.updatedAt > 0, "No data for round");
        
        return (
            round.roundId,
            round.answer,
            round.startedAt,
            round.updatedAt,
            round.answeredInRound
        );
    }
    
    /**
     * @notice Update the authorized reactive contract address
     * @param _newReactiveContract New reactive contract address
     */
    function updateReactiveContract(address _newReactiveContract) 
        external 
        onlyOwner 
    {
        require(_newReactiveContract != address(0), "Invalid address");
        address oldContract = reactiveContract;
        reactiveContract = _newReactiveContract;
        emit ReactiveContractUpdated(oldContract, _newReactiveContract);
    }
    
    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /**
     * @notice Get the latest answer
     * @return Latest price answer
     */
    function latestAnswer() external view returns (int256) {
        require(latestRound.updatedAt > 0, "No data available");
        return latestRound.answer;
    }
    
    /**
     * @notice Get the latest timestamp
     * @return Latest update timestamp
     */
    function latestTimestamp() external view returns (uint256) {
        require(latestRound.updatedAt > 0, "No data available");
        return latestRound.updatedAt;
    }
    
    /**
     * @notice Get the latest round ID
     * @return Latest round identifier
     */
    function latestRoundId() external view returns (uint256) {
        return latestRound.roundId;
    }
    
    /**
     * @notice Get answer for a specific round
     * @param roundId Round identifier
     * @return Price answer for the round
     */
    function getAnswer(uint256 roundId) external view returns (int256) {
        RoundData memory round = rounds[uint80(roundId)];
        require(round.updatedAt > 0, "No data for round");
        return round.answer;
    }
    
    /**
     * @notice Get timestamp for a specific round
     * @param roundId Round identifier
     * @return Timestamp for the round
     */
    function getTimestamp(uint256 roundId) external view returns (uint256) {
        RoundData memory round = rounds[uint80(roundId)];
        require(round.updatedAt > 0, "No data for round");
        return round.updatedAt;
    }
}