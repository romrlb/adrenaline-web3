// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Ticket For Adrenaline Platform
 * @dev Implementation of the Ticket contract
 * @notice This contract manages the lifecycle of ticket NFTs with different states
 */
contract Ticket is ERC721, Ownable, ReentrancyGuard {

    enum NFTStatus {
        AVAILABLE,
        LOCKED,
        ON_SALE, 
        COLLECTOR,
        EXPIRED 
    }

    struct TicketData {
        uint256 tokenId;
        NFTStatus status;
        address wallet;      // Current owner
        string productCode;  // Concatenation of familyCode + activityCode
        string centerCode;   // Associated center code ("000000" if none)
        string activite;     // Activity description
    }

    struct CenterData {
        bool isActive;
        string[] productCodes;
    }

    mapping(uint256 => TicketData) public tickets;
    
    mapping(string => CenterData) public centers;
    
    uint256 private _tokenIdCounter;
    
    string private constant DEFAULT_CENTER_CODE = "000000";
    string private constant DEFAULT_PRODUCT_CODE = "000000";
    
    event TicketCreated(uint256 indexed tokenId, address indexed wallet, string productCode);
    event TicketLocked(uint256 indexed tokenId, string centerCode);
    event TicketUnlocked(uint256 indexed tokenId);
    event TicketUsed(uint256 indexed tokenId);
    event TicketForSale(uint256 indexed tokenId);
    event TicketSold(uint256 indexed tokenId, address indexed newOwner);
    event TicketExpired(uint256 indexed tokenId);
    event ContractUnpaused(address indexed initiator);
    event CenterRegistered(string centerCode);
    event CenterProductCodeAdded(string centerCode, string productCode);
    event CenterProductCodeRemoved(string centerCode, string productCode);


    /**
     * @notice Modifier to check if a ticket exists
     * @param tokenId ID of the ticket to check
     */
    modifier ticketExists(uint256 tokenId) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        _;
    }

    constructor() ERC721("Adrenaline Ticket", "") Ownable(msg.sender) {
    }

    /**
     * @notice Registers a new center with its productCodes
     * @param centerCode Unique code of the center
     * @param productCodes List of product codes managed by the center
     */
    function registerCenter(string calldata centerCode, string[] calldata productCodes) external onlyOwner {
        require(bytes(centerCode).length > 0, "Center code cannot be empty");
        require(!centers[centerCode].isActive, "Center already registered");
        
        centers[centerCode].isActive = true;
        
        for (uint i = 0; i < productCodes.length; i++) {
            centers[centerCode].productCodes.push(productCodes[i]);
            emit CenterProductCodeAdded(centerCode, productCodes[i]);
        }
        
        emit CenterRegistered(centerCode);
    }
    
    /**
     * @notice Checks if a center is authorized to manage a ticket with a given productCode
     * @param centerCode Code of the center
     * @param productCode Product code of the ticket
     * @return bool True if the center is authorized, false otherwise
     */
    function isCenterAuthorized(string memory centerCode, string memory productCode) public view returns (bool) {
        if (!centers[centerCode].isActive) {
            return false;
        }
        if (keccak256(bytes(productCode)) == keccak256(bytes(DEFAULT_PRODUCT_CODE))) {
            return true;
        }

        for (uint i = 0; i < centers[centerCode].productCodes.length; i++) {
            if (keccak256(bytes(centers[centerCode].productCodes[i])) == keccak256(bytes(productCode))) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * @notice Creates a new ticket in AVAILABLE state
     * @param to Address of the recipient wallet
     * @param productCode Product code (familyCode + activityCode)
     * @param activite Activity description
     * @return tokenId ID of the created ticket
     */
    function createTicket(
        address to, 
        string calldata productCode, 
        string calldata activite
    ) external onlyOwner nonReentrant returns (uint256) {

        require(to != address(0), "Invalid recipient address");
        require(bytes(productCode).length > 0, "Product code cannot be empty");
        require(bytes(activite).length > 0, "Activity description cannot be empty");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        tickets[tokenId] = TicketData({
            tokenId: tokenId,
            status: NFTStatus.AVAILABLE,
            wallet: to,
            productCode: productCode,
            centerCode: DEFAULT_CENTER_CODE,
            activite: activite
        });
        
        _safeMint(to, tokenId);
        
        emit TicketCreated(tokenId, to, productCode);
        return tokenId;
    }
    
    /**
     * @notice Checks if the address is owner or approved for the token
     * @param spender Address to check
     * @param tokenId ID of the token
     * @return bool True if the address is approved or owner
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = _ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }
    
    /**
     * @notice Locks a ticket (reservation by a center)
     * @param tokenId ID of the ticket to lock
     * @param centerCode Code of the center making the reservation
     */
    function lockTicket(uint256 tokenId, string calldata centerCode) external onlyOwner nonReentrant ticketExists(tokenId) {
        require(tickets[tokenId].status == NFTStatus.AVAILABLE, "Ticket must be in AVAILABLE state");
        require(bytes(centerCode).length > 0, "Center code cannot be empty");
        require(centers[centerCode].isActive, "Center not registered");
        
        // Checks if the center is authorized for this productCode
        require(
            isCenterAuthorized(centerCode, tickets[tokenId].productCode),
            "Center not authorized for this product code"
        );
        
        tickets[tokenId].status = NFTStatus.LOCKED;
        tickets[tokenId].centerCode = centerCode;
        
        emit TicketLocked(tokenId, centerCode);
    }
    
    /**
     * @notice Unlocks a ticket (reservation cancellation)
     * @param tokenId ID of the ticket to unlock
     * @param centerCode Code of the center requesting the unlock
     */
    function unlockTicket(uint256 tokenId, string calldata centerCode) external onlyOwner nonReentrant ticketExists(tokenId) {
        require(tickets[tokenId].status == NFTStatus.LOCKED, "Ticket must be in LOCKED state");
        require(bytes(centerCode).length > 0, "Center code cannot be empty");
        require(centers[centerCode].isActive, "Center not registered");
        require(
            keccak256(bytes(tickets[tokenId].centerCode)) == keccak256(bytes(centerCode)),
            "Only the locking center can unlock this ticket"
        );
        
        tickets[tokenId].status = NFTStatus.AVAILABLE;
        tickets[tokenId].centerCode = DEFAULT_CENTER_CODE;
        
        emit TicketUnlocked(tokenId);
    }
    
    /**
     * @notice Marks a ticket as used (becomes a collector)
     * @param tokenId ID of the ticket to use
     */
    function useTicket(uint256 tokenId) external onlyOwner nonReentrant ticketExists(tokenId) {
        require(tickets[tokenId].status == NFTStatus.LOCKED, "Ticket must be in LOCKED state");
        
        tickets[tokenId].status = NFTStatus.COLLECTOR;
        
        emit TicketUsed(tokenId);
    }
    
    /**
     * @notice Puts a ticket for sale on the marketplace
     * @param tokenId ID of the ticket to put for sale
     */
    function putForSale(uint256 tokenId) external nonReentrant ticketExists(tokenId) {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Caller is not owner nor approved");
        require(
            tickets[tokenId].status == NFTStatus.AVAILABLE || 
            tickets[tokenId].status == NFTStatus.COLLECTOR, 
            "Ticket must be in AVAILABLE or COLLECTOR state"
        );
        
        tickets[tokenId].status = NFTStatus.ON_SALE;
        
        emit TicketForSale(tokenId);
    }
    
    /**
     * @notice Allows buying a ticket from the marketplace
     * @param tokenId ID of the ticket to buy
     */
    function buyTicket(uint256 tokenId) external nonReentrant ticketExists(tokenId) {
        require(tickets[tokenId].status == NFTStatus.ON_SALE, "Ticket must be for sale");
        require(msg.sender != ownerOf(tokenId), "Cannot buy your own ticket");
        
        address previousOwner = ownerOf(tokenId);
        
        tickets[tokenId].status = NFTStatus.AVAILABLE;
        tickets[tokenId].wallet = msg.sender;
        tickets[tokenId].centerCode = DEFAULT_CENTER_CODE;
        
        _transfer(previousOwner, msg.sender, tokenId);
        
        emit TicketSold(tokenId, msg.sender);
    }
    
    /**
     * @notice Marks a ticket as expired
     * @param tokenId ID of the ticket to mark as expired
     */
    function setExpired(uint256 tokenId) external onlyOwner nonReentrant ticketExists(tokenId) {
        require(tickets[tokenId].status != NFTStatus.EXPIRED, "Ticket is already expired");
        
        tickets[tokenId].status = NFTStatus.EXPIRED;
        
        emit TicketExpired(tokenId);
    }
    
    /**
     * @notice Retrieves ticket information
     * @param tokenId ID of the ticket
     * @return The TicketData structure containing all ticket information
     */
    function getTicketInfo(uint256 tokenId) external view ticketExists(tokenId) returns (TicketData memory) {
        return tickets[tokenId];
    }
}
