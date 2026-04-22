// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title QuestToken
 * @dev ERC-20 utility token for CreatureQuest economy
 * Used for breeding fees, marketplace trades, and rewards
 */
contract QuestToken is ERC20, Ownable {
    // Total supply: 100 million tokens
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10**decimals();
    
    // Mint cooldown for players (1 per day)
    uint256 public mintCooldown = 1 days;
    mapping(address => uint256) public lastMintTime;
    
    // Daily mint limit per player
    uint256 public dailyMintAmount = 100 * 10**decimals();
    
    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event CooldownUpdated(uint256 newCooldown);
    event DailyLimitUpdated(uint256 newLimit);

    constructor() ERC20("QuestToken", "QTK") {
        _mint(msg.sender, TOTAL_SUPPLY); // Mint all to contract creator initially
    }

    /**
     * @dev Allow players to claim daily free tokens
     */
    function claimDailyReward() external {
        require(lastMintTime[msg.sender] + mintCooldown <= block.timestamp, "Cooldown active");
        
        lastMintTime[msg.sender] = block.timestamp;
        _mint(msg.sender, dailyMintAmount);
        
        emit TokensMinted(msg.sender, dailyMintAmount);
    }

    /**
     * @dev Update daily mint limit (owner only)
     */
    function setDailyMintAmount(uint256 newAmount) external onlyOwner {
        dailyMintAmount = newAmount;
        emit DailyLimitUpdated(newAmount);
    }

    /**
     * @dev Update cooldown period (owner only)
     */
    function setMintCooldown(uint256 newCooldown) external onlyOwner {
        mintCooldown = newCooldown;
        emit CooldownUpdated(newCooldown);
    }

    /**
     * @dev Mint tokens to specific address (owner only - for rewards/events)
     */
    function mintTo(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burn tokens from specific address
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Check if address can claim today
     */
    function canClaim() external view returns (bool) {
        return lastMintTime[msg.sender] + mintCooldown <= block.timestamp;
    }

    /**
     * @dev Get time until next claim
     */
    function timeUntilClaim() external view returns (uint256) {
        uint256 lastClaim = lastMintTime[msg.sender];
        if (lastClaim == 0) return 0; // Never claimed
        
        uint256 nextClaim = lastClaim + mintCooldown;
        return nextClaim > block.timestamp ? nextClaim - block.timestamp : 0;
    }
}
