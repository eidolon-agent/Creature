// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CreatureNFT
 * @dev ERC-721 token for CreatureQuest monsters
 * Each creature has genetic traits passed to offspring
 */
contract CreatureNFT is ERC721, ERC721URIStorage {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Creature traits
    struct CreatureTraits {
        uint8 level;
        uint8 strength;
        uint8 intelligence;
        uint8 dexterity;
        uint8 vitality;
        uint8 luck;
        uint8[] elementalModifiers; // 6 elements
        bool isMutant;
    }
    
    mapping(uint256 => CreatureTraits) public creatures;
    mapping(uint256 => address) public creatureOwners;
    
    // Breed cooldown (7 days)
    uint256 public constant BREED_COOLDOWN = 7 days;
    mapping(uint256 => uint256) public lastBreedTime;
    
    // Maximum breeds per creature
    uint8 public constant MAX_BREEDS = 5;
    mapping(uint256 => uint8) public breedCount;
    
    // Events
    event CreatureMinted(address indexed owner, uint256 indexed tokenId, CreatureTraits traits);
    event CreatureBred(uint256 indexed parent1, uint256 indexed parent2, uint256 indexed offspring);
    event TraitMutated(uint256 indexed tokenId, string mutationType);

    constructor() ERC721("CreatureQuest Creature", "CQC") {}

    /**
     * @dev Mint a new creature with random traits
     * @param baseURI Token URI
     * @param initialTraits Starting creature stats
     */
    function mintCreature(string memory baseURI, CreatureTraits memory initialTraits) 
        external 
        returns (uint256) 
    {
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, baseURI);
        
        creatures[tokenId] = initialTraits;
        creatureOwners[tokenId] = msg.sender;
        _tokenIdCounter.increment();
        
        emit CreatureMinted(msg.sender, tokenId, initialTraits);
        return tokenId;
    }

    /**
     * @dev Get creature traits
     */
    function getCreatureTraits(uint256 tokenId) external view returns (CreatureTraits memory) {
        require(_exists(tokenId), "Creature doesn't exist");
        return creatures[tokenId];
    }

    /**
     * @dev Check if creature can breed
     */
    function canBreed(uint256 tokenId) public view returns (bool) {
        require(_exists(tokenId), "Creature doesn't exist");
        require(breedCount[tokenId] < MAX_BREEDS, "Max breeds reached");
        
        uint256 lastBreeding = lastBreedTime[tokenId];
        if (lastBreeding == 0) return true; // Never bred
        
        return block.timestamp >= lastBreeding + BREED_COOLDOWN;
    }

    /**
     * @dev Record a breeding event
     */
    function _recordBreeding(uint256 tokenId) internal {
        lastBreedTime[tokenId] = block.timestamp;
        breedCount[tokenId]++;
    }

    /**
     * @dev Breed two creatures to create offspring with genetic inheritance
     * @param parent1 First parent tokenId
     * @param parent2 Second parent tokenId
     * @param offspringURI Metadata URI for the new creature
     */
    function breed(uint256 parent1, uint256 parent2, string memory offspringURI) 
        external 
        returns (uint256 offspringId) 
    {
        require(_exists(parent1), "Parent 1 doesn't exist");
        require(_exists(parent2), "Parent 2 doesn't exist");
        require(canBreed(parent1), "Parent 1 on cooldown");
        require(canBreed(parent2), "Parent 2 on cooldown");
        require(msg.sender == ownerOf(parent1) || msg.sender == ownerOf(parent2), "Not owner");

        CreatureTraits memory parent1Traits = creatures[parent1];
        CreatureTraits memory parent2Traits = creatures[parent2];
        
        // Genetic inheritance algorithm
        CreatureTraits memory offspringTraits = _calculateOffspringTraits(parent1Traits, parent2Traits);
        
        // Check for mutation (5% chance)
        if (block.timestamp % 20 == 0) { // Simplified random
            offspringTraits.isMutant = true;
            emit TraitMutated(parent1, "random_boost");
        }

        offspringId = _tokenIdCounter.current();
        _safeMint(msg.sender, offspringId);
        _setTokenURI(offspringId, offspringURI);
        
        creatures[offspringId] = offspringTraits;
        creatureOwners[offspringId] = msg.sender;
        
        // Record breeding for both parents
        _recordBreeding(parent1);
        _recordBreeding(parent2);
        
        _tokenIdCounter.increment();
        
        emit CreatureBred(parent1, parent2, offspringId);
        return offspringId;
    }

    /**
     * @dev Calculate offspring traits using genetic algorithms
     */
    function _calculateOffspringTraits(CreatureTraits memory p1, CreatureTraits memory p2) 
        internal 
        pure 
        returns (CreatureTraits memory) 
    {
        CreatureTraits memory offspring;
        
        // Average traits with slight variation (±2)
        offspring.level = uint8((p1.level + p2.level) / 2);
        offspring.strength = _inheritWithMutation(p1.strength, p2.strength);
        offspring.intelligence = _inheritWithMutation(p1.intelligence, p2.intelligence);
        offspring.dexterity = _inheritWithMutation(p1.dexterity, p2.dexterity);
        offspring.vitality = _inheritWithMutation(p1.vitality, p2.vitality);
        offspring.luck = _inheritWithMutation(p1.luck, p2.luck);
        
        // Elemental modifiers: blend parents
        for (uint8 i = 0; i < 6; i++) {
            offspring.elementalModifiers[i] = uint8((p1.elementalModifiers[i] + p2.elementalModifiers[i]) / 2);
        }
        
        return offspring;
    }

    function _inheritWithMutation(uint8 trait1, uint8 trait2) internal pure returns (uint8) {
        // 70% chance of average, 30% chance of taking one parent's value
        uint8 avg = (trait1 + trait2) / 2;
        
        // Add small random mutation
        uint8 mutation = uint8((block.timestamp % 5) - 2); // -2 to +2
        return avg + mutation;
    }

    /**
     * @dev Update token URI
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override 
        returns (address) 
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Increase balance
     */
    function _increaseBalance(address account, uint128 balanceDelta) 
        internal 
        override 
        returns (address) 
    {
        return super._increaseBalance(account, balanceDelta);
    }

    /**
     * @dev Override approve/setApprovalForAll to prevent conflicts
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721URIStorage) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
