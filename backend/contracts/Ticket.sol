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
    // Custom errors
    error InvalidId(uint256 tokenId);
    error InvalidState(uint256 tokenId, uint8 status);
    error InvalidInput(string reason);
    error DateError(uint256 date, string reason);

    enum NFTStatus {
        AVAILABLE,
        LOCKED,
        ON_SALE, 
        COLLECTOR,
        EXPIRED 
    }

    struct TicketData {
        NFTStatus status;
        address wallet;
        string productCode;
        string centerCode;
        string activite;
        uint40 limitDate;
        uint40 reservationDate; 
    }

    mapping(uint256 => TicketData) public tickets;
    
    uint256 private _tokenIdCounter;
    
    string private constant DEFAULT_CENTER_CODE = "000000";
    
    event TicketCreated(uint256 indexed tokenId, address indexed wallet, string productCode);
    event TicketLocked(uint256 indexed tokenId, string centerCode);
    event TicketUnlocked(uint256 indexed tokenId);
    event TicketUsed(uint256 indexed tokenId);
    event TicketForSale(uint256 indexed tokenId);
    event TicketSold(uint256 indexed tokenId, address indexed newOwner);
    event TicketExpired(uint256 indexed tokenId);

    /**
     * @notice Modifier to check if a ticket exists
     * @param tokenId ID of the ticket to check
     */
    modifier ticketExists(uint256 tokenId) {
        if (_ownerOf(tokenId) == address(0)) revert InvalidId(tokenId);
        _;
    }

    constructor() ERC721("Adrenaline Ticket", "SKY") Ownable(msg.sender) {}

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
        if (to == address(0)) revert InvalidInput("Invalid address");
        if (bytes(productCode).length == 0) revert InvalidInput("Product missing");
        if (bytes(activite).length == 0) revert InvalidInput("Activity missing");
        
        uint256 tokenId = _tokenIdCounter++;
        uint40 limitDate = uint40(block.timestamp + 18 * 30 days);
        
        tickets[tokenId] = TicketData({
            status: NFTStatus.AVAILABLE,
            wallet: to,
            productCode: productCode,
            centerCode: DEFAULT_CENTER_CODE,
            activite: activite,
            limitDate: limitDate,
            reservationDate: 0
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
     * @notice Checks if a ticket is expired based on its limit date
     * @param tokenId ID of the ticket to check
     * @return bool True if the ticket is expired, false otherwise
     */
    function isExpired(uint256 tokenId) public view ticketExists(tokenId) returns (bool) {
        TicketData storage ticket = tickets[tokenId];
        return (NFTStatus.EXPIRED == ticket.status || 
               (ticket.limitDate > 0 && block.timestamp > ticket.limitDate));
    }
    
    /**
     * @notice Automatically checks and updates the status of a ticket if it's expired
     * @param tokenId ID of the ticket to check
     * @return bool True if the ticket was updated to expired, false otherwise
     */
    function checkAndUpdateExpiration(uint256 tokenId) public onlyOwner nonReentrant ticketExists(tokenId) returns (bool) {
        TicketData storage ticket = tickets[tokenId];
        
        if (NFTStatus.EXPIRED == ticket.status) {
            return false;
        }
        
        if (ticket.limitDate > 0 && block.timestamp > ticket.limitDate) {
            ticket.status = NFTStatus.EXPIRED;
            emit TicketExpired(tokenId);
            return true;
        }
        
        return false;
    }

    /**
     * @notice Locks a ticket (reservation by a center)
     * @param tokenId ID of the ticket to lock
     * @param centerCode Code of the center making the reservation
     */
    function lockTicket(uint256 tokenId, string calldata centerCode) external onlyOwner nonReentrant ticketExists(tokenId) {
        if (isExpired(tokenId)) revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.AVAILABLE != ticket.status) 
            revert InvalidState(tokenId, uint8(ticket.status));
            
        if (bytes(centerCode).length == 0) revert InvalidInput("Center missing");
        
        ticket.status = NFTStatus.LOCKED;
        ticket.centerCode = centerCode;
        ticket.reservationDate = uint40(block.timestamp);
        
        emit TicketLocked(tokenId, centerCode);
    }
    
    /**
     * @notice Unlocks a ticket (reservation cancellation)
     * @param tokenId ID of the ticket to unlock
     * @param centerCode Code of the center requesting the unlock
     */
    function unlockTicket(uint256 tokenId, string calldata centerCode) external onlyOwner nonReentrant ticketExists(tokenId) {
        if (isExpired(tokenId)) revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.LOCKED != ticket.status) 
            revert InvalidState(tokenId, uint8(ticket.status));
            
        if (bytes(centerCode).length == 0) revert InvalidInput("Center missing");
        
        if (keccak256(bytes(ticket.centerCode)) != keccak256(bytes(centerCode)))
            revert InvalidInput("Center not matching");
        
        ticket.status = NFTStatus.AVAILABLE;
        ticket.centerCode = DEFAULT_CENTER_CODE;
        
        emit TicketUnlocked(tokenId);
    }
    
    /**
     * @notice Marks a ticket as used (becomes a collector)
     * @param tokenId ID of the ticket to use
     */
    function useTicket(uint256 tokenId) external onlyOwner nonReentrant ticketExists(tokenId) {
        if (isExpired(tokenId)) revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.LOCKED != ticket.status) 
            revert InvalidState(tokenId, uint8(ticket.status));
        
        ticket.status = NFTStatus.COLLECTOR;
        
        emit TicketUsed(tokenId);
    }
    
    /**
     * @notice Puts a ticket for sale on the marketplace
     * @param tokenId ID of the ticket to put for sale
     */
    function putForSale(uint256 tokenId) external nonReentrant ticketExists(tokenId) {
        if (isExpired(tokenId)) revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        if (!_isApprovedOrOwner(msg.sender, tokenId)) revert InvalidInput("Not authorized");
        
        TicketData storage ticket = tickets[tokenId];
        
        if (ticket.status != NFTStatus.AVAILABLE && ticket.status != NFTStatus.COLLECTOR)
            revert InvalidState(tokenId, uint8(ticket.status));
        
        ticket.status = NFTStatus.ON_SALE;
        
        emit TicketForSale(tokenId);
    }
    
    /**
     * @notice Allows buying a ticket from the marketplace
     * @param tokenId ID of the ticket to buy
     */
    function buyTicket(uint256 tokenId) external nonReentrant ticketExists(tokenId) {
        if (isExpired(tokenId)) revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.ON_SALE != ticket.status) 
            revert InvalidState(tokenId, uint8(ticket.status));
            
        if (msg.sender == ownerOf(tokenId)) revert InvalidInput("Self purchase");
        
        address previousOwner = ownerOf(tokenId);
        
        ticket.status = NFTStatus.AVAILABLE;
        ticket.wallet = msg.sender;
        ticket.centerCode = DEFAULT_CENTER_CODE;
        
        _transfer(previousOwner, msg.sender, tokenId);
        
        emit TicketSold(tokenId, msg.sender);
    }
    
    /**
     * @notice Retrieves ticket information
     * @param tokenId ID of the ticket
     * @return The TicketData structure containing all ticket information
     */
    function getTicketInfo(uint256 tokenId) external view ticketExists(tokenId) returns (TicketData memory) {
        return tickets[tokenId];
    }

    /**
     * @notice Updates the reservation date of a ticket
     * @param tokenId ID of the ticket
     * @param newReservationDate New reservation date (unix timestamp)
     */
    function setReservationDate(uint256 tokenId, uint256 newReservationDate) external onlyOwner nonReentrant ticketExists(tokenId) {
        TicketData storage ticket = tickets[tokenId];
        
        if (NFTStatus.LOCKED != ticket.status) 
            revert InvalidState(tokenId, uint8(ticket.status));
            
        if (newReservationDate <= block.timestamp) 
            revert DateError(newReservationDate, "In past");
            
        if (newReservationDate >= ticket.limitDate) 
            revert DateError(newReservationDate, "After limit");
        
        ticket.reservationDate = uint40(newReservationDate);
    }
    
    /**
     * @notice Updates the limit date of a ticket
     * @param tokenId ID of the ticket
     * @param newLimitDate New limit date (unix timestamp)
     */
    function setLimitDate(uint256 tokenId, uint256 newLimitDate) external onlyOwner nonReentrant ticketExists(tokenId) {
        if (newLimitDate <= block.timestamp) 
            revert DateError(newLimitDate, "In past");
        
        TicketData storage ticket = tickets[tokenId];
        if (ticket.reservationDate > 0 && newLimitDate <= ticket.reservationDate) 
            revert DateError(newLimitDate, "Before reservation");
        
        ticket.limitDate = uint40(newLimitDate);
    }

    /**
     * @notice Marks a ticket as expired
     * @param tokenId ID of the ticket to mark as expired
     */
    function setExpired(uint256 tokenId) external onlyOwner nonReentrant ticketExists(tokenId) {
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.EXPIRED == ticket.status) 
            revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        ticket.status = NFTStatus.EXPIRED;
        
        emit TicketExpired(tokenId);
    }
}
