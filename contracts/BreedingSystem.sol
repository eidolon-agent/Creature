// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CreatureNFT.sol";
import "./QuestToken.sol";

/**
 * @title BreedingSystem
 * @dev Manages creature breeding with token fees and genetic algorithms
 */
contract BreedingSystem {
    CreatureNFT public immutable creatureNFT;
    QuestToken public immutable questToken;
    
    // Breeding fees
    uint256 public breedingFee = 50 * 10**18; // 50 QTK
    
    // Success rates by creature rarity
    mapping(uint8 => uint256) public breedSuccessRates; // rarity -> success%
    
    // Breeding statistics
    uint256 public totalBreeds;
    mapping(address => uint256) public userBreeds;
    
    // Events
    event BreedingStarted(address indexed breeder, uint256 parent1, uint256 parent2);
    event OffspringCreated(address indexed owner, uint256 offspringId, uint256 fee);
    event FeeUpdated(uint256 newFee);
    event SuccessRateUpdated(uint8 rarity, uint256 rate);

    constructor(address _creatureNFT, address _questToken) {
        creatureNFT = CreatureNFT(_creatureNFT);
        questToken = QuestToken(_questToken);
        
        // Default success rates
        breedSuccessRates[1] = 95; // Common
        breedSuccessRates[2] = 85; // Uncommon  
        breedSuccessRates[3] = 75; // Rare
        breedSuccessRates[4] = 60; // Epic
        breedSuccessRates[5] = 50; // Legendary
    }

    /**
     * @dev Initiate breeding transaction
     * @param parent1 First parent NFT tokenId
     * @param parent2 Second parent NFT tokenId
     * @param offspringURI Metadata URI for new creature
     */
    function startBreeding(uint256 parent1, uint256 parent2, string memory offspringURI) 
        external 
        returns (uint256 offspringId) 
    {
        require(
            creatureNFT.ownerOf(parent1) == msg.sender || 
            creatureNFT.ownerOf(parent2) == msg.sender,
            "Not owner"
        );
        
        // Check cooldowns on parents
        require(creatureNFT.canBreed(parent1), "Parent 1 on cooldown");
        require(creatureNFT.canBreed(parent2), "Parent 2 on cooldown");
        
        // Process breeding fee
        _processFee();
        
        // Success chance based on creature rarity
        CreatureNFT.CreatureTraits memory p1Traits = creatureNFT.getCreatureTraits(parent1);
        CreatureNFT.CreatureTraits memory p2Traits = creatureNFT.getCreatureTraits(parent2);
        
        uint8 rarity = _calculateRarity(p1Traits, p2Traits);
        uint256 successChance = breedSuccessRates[rarity];
        
        // Simulate random check (simplified)
        bool success = (block.timestamp % 100) < successChance;
        require(success, "Breeding failed - genetic incompatibility");
        
        // Call breeding function
        offspringId = creatureNFT.breed(parent1, parent2, offspringURI);
        
        // Update stats
        totalBreeds++;
        userBreeds[msg.sender]++;
        
        emit BreedingStarted(msg.sender, parent1, parent2);
        emit OffspringCreated(msg.sender, offspringId, breedingFee);
        
        return offspringId;
    }

    /**
     * @dev Calculate creature rarity based on traits
     */
    function _calculateRarity(
        CreatureNFT.CreatureTraits memory p1,
        CreatureNFT.CreatureTraits memory p2
    ) internal pure returns (uint8) {
        uint256 totalStats = p1.strength + p1.intelligence + p1.dexterity + 
                            p1.vitality + p1.luck + p2.strength + p2.intelligence + 
                            p2.dexterity + p2.vitality + p2.luck;
        
        if (totalStats > 200) return 5; // Legendary
        if (totalStats > 150) return 4; // Epic
        if (totalStats > 100) return 3; // Rare
        if (totalStats > 70) return 2;  // Uncommon
        return 1; // Common
    }

    /**
     * @dev Transfer breeding fee to contract
     */
    function _processFee() internal {
        require(
            questToken.transferFrom(msg.sender, address(this), breedingFee),
            "Fee transfer failed"
        );
    }

    /**
     * @dev Update breeding fee (owner callable)
     */
    function setBreedingFee(uint256 newFee) external {
        require(msg.sender == owner(), "Not owner");
        breedingFee = newFee;
        emit FeeUpdated(newFee);
    }

    /**
     * @dev Update success rate for rarity tier
     */
    function setSuccessRate(uint8 rarity, uint256 rate) external {
        require(msg.sender == owner(), "Not owner");
        require(rate <= 100, "Invalid rate");
        breedSuccessRates[rarity] = rate;
        emit SuccessRateUpdated(rarity, rate);
    }

    /**
     * @dev Get total breeds for user
     */
    function getUserBreeds(address user) external view returns (uint256) {
        return userBreeds[user];
    }

    /**
     * @dev Check if user can afford breeding
     */
    function canAffordBreeding() external view returns (bool) {
        return questToken.balanceOf(msg.sender) >= breedingFee;
    }

    /**
     * @dev Withdraw fees to owner (emergency function)
     */
    function withdrawFees() external {
        require(msg.sender == owner(), "Not owner");
        uint256 balance = questToken.balanceOf(address(this));
        questToken.transfer(owner(), balance);
    }
}
