// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Ticket For Adrenaline Platform
 * @dev Implementation of the Ticket contract
 * @notice This contract manages the lifecycle of ticket NFTs with different states
 */
contract Ticket is ERC721, ERC721URIStorage, AccessControl {
    using Strings for uint256;

    error InvalidId(uint256 tokenId);
    error InvalidState(uint256 tokenId, uint8 status);
    error InvalidInput(string reason);
    error DateError(uint256 date, string reason);
    error NotAuthorized();
    error ZeroAddress();

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

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
        uint256 price;
        uint256 limitDate;
        uint256 reservationDate; 
    }

    mapping(uint256 => TicketData) public tickets;
    
    // Mapping from productCode to its IPFS URI
    mapping(string => string) private _productCodeURIs;
    
    // Global metadata URI for the collection
    string private _globalMetadataURI;
    
    uint256 private _tokenIdCounter;
    uint256 private _totalSupply;
    
    string private constant DEFAULT_CENTER_CODE = "000000";
    
    event TicketCreated(uint256 indexed tokenId, address indexed wallet, string productCode);
    event TicketLocked(uint256 indexed tokenId, string centerCode);
    event TicketUnlocked(uint256 indexed tokenId);
    event TicketUsed(uint256 indexed tokenId);
    event TicketForSale(uint256 indexed tokenId);
    event TicketSold(uint256 indexed tokenId, address indexed newOwner);
    event TicketExpired(uint256 indexed tokenId);
    event ProductCodeURISet(string productCode, string uri);
    event TokenURISet(uint256 indexed tokenId, string uri);
    event GlobalMetadataURISet(string uri);

    /**
     * @notice Modifier to check if a ticket exists
     * @param tokenId ID of the ticket to check
     */
    modifier ticketExists(uint256 tokenId) {
        if (_ownerOf(tokenId) == address(0)) revert InvalidId(tokenId);
        _;
    }

    /**
     * @notice Modifier to restrict function access to admins only
     */
    modifier onlyAdmin() {
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert NotAuthorized();
        _;
    }

    constructor() ERC721("Adrenaline Ticket", "SKY") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Creates a new ticket in AVAILABLE state
     * @param to Address of the recipient wallet
     * @param productCode Product code (familyCode + activityCode)
     * @return tokenId ID of the created ticket
     */
    function createTicket(
        address to, 
        string calldata productCode,
        uint256 price
    ) external onlyAdmin returns (uint256) {
        if (to == address(0)) revert ZeroAddress();
        if (bytes(productCode).length == 0) revert InvalidInput("Product missing");
        
        uint256 tokenId = _tokenIdCounter++;
        uint256 limitDate = block.timestamp + 18 * 30 days;
        
        tickets[tokenId] = TicketData({
            status: NFTStatus.AVAILABLE,
            wallet: to,
            productCode: productCode,
            centerCode: DEFAULT_CENTER_CODE,
            price: price,
            limitDate: limitDate,
            reservationDate: 0
        });
        
        _safeMint(to, tokenId);
        _totalSupply++;
        
        emit TicketCreated(tokenId, to, productCode);
        return tokenId;
    }
    
    /**
     * @notice Returns the total number of tokens in existence
     * @return uint256 representing the total supply of tokens
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
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
     * @notice Checks if a ticket is expired and updates its status if needed
     * @param tokenId ID of the ticket to check
     * @return bool True if the ticket is expired, false otherwise
     */
    function checkExpiration(uint256 tokenId) public ticketExists(tokenId) returns (bool) {
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.EXPIRED == ticket.status) {
            return true;
        }
        
        bool isExpiredByDate = ticket.limitDate > 0 && block.timestamp > ticket.limitDate;
        
        if (isExpiredByDate && hasRole(ADMIN_ROLE, msg.sender)) {
            ticket.status = NFTStatus.EXPIRED;
            emit TicketExpired(tokenId);
        }
        
        return isExpiredByDate;
    }

    /**
     * @notice Locks a ticket (reservation by a center)
     * @param tokenId ID of the ticket to lock
     * @param centerCode Code of the center making the reservation
     */
    function lockTicket(uint256 tokenId, string calldata centerCode) external onlyAdmin ticketExists(tokenId) {
        if (checkExpiration(tokenId)) revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.AVAILABLE != ticket.status) 
            revert InvalidState(tokenId, uint8(ticket.status));
            
        if (bytes(centerCode).length == 0) revert InvalidInput("Center missing");
        
        ticket.status = NFTStatus.LOCKED;
        ticket.centerCode = centerCode;
        ticket.reservationDate = block.timestamp;
        
        emit TicketLocked(tokenId, centerCode);
    }
    
    /**
     * @notice Unlocks a ticket (reservation cancellation)
     * @param tokenId ID of the ticket to unlock
     * @param centerCode Code of the center requesting the unlock
     */
    function unlockTicket(uint256 tokenId, string calldata centerCode) external onlyAdmin ticketExists(tokenId) {
        if (checkExpiration(tokenId)) revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
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
    function useTicket(uint256 tokenId) external onlyAdmin ticketExists(tokenId) {
        if (checkExpiration(tokenId)) revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.LOCKED != ticket.status) 
            revert InvalidState(tokenId, uint8(ticket.status));
        
        ticket.status = NFTStatus.COLLECTOR;
        
        emit TicketUsed(tokenId);
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
    function setReservationDate(uint256 tokenId, uint256 newReservationDate) external onlyAdmin ticketExists(tokenId) {
        TicketData storage ticket = tickets[tokenId];
        
        if (NFTStatus.LOCKED != ticket.status) 
            revert InvalidState(tokenId, uint8(ticket.status));
            
        if (newReservationDate <= block.timestamp) 
            revert DateError(newReservationDate, "In past");
            
        if (newReservationDate >= ticket.limitDate) 
            revert DateError(newReservationDate, "After limit");
        
        ticket.reservationDate = newReservationDate;
    }
    
    /**
     * @notice Updates the limit date of a ticket
     * @param tokenId ID of the ticket
     * @param newLimitDate New limit date (unix timestamp)
     */
    function setLimitDate(uint256 tokenId, uint256 newLimitDate) external onlyAdmin ticketExists(tokenId) {
        if (newLimitDate <= block.timestamp) 
            revert DateError(newLimitDate, "In past");
        
        TicketData storage ticket = tickets[tokenId];
        if (ticket.reservationDate > 0 && newLimitDate <= ticket.reservationDate) 
            revert DateError(newLimitDate, "Before reservation");
        
        ticket.limitDate = newLimitDate;
    }

    /**
     * @notice Marks a ticket as expired
     * @param tokenId ID of the ticket to mark as expired
     */
    function setExpired(uint256 tokenId) external onlyAdmin ticketExists(tokenId) {
        TicketData storage ticket = tickets[tokenId];
        if (NFTStatus.EXPIRED == ticket.status) 
            revert InvalidState(tokenId, uint8(NFTStatus.EXPIRED));
        
        ticket.status = NFTStatus.EXPIRED;
        
        emit TicketExpired(tokenId);
    }

    /**
     * @notice Updates wallet address when token is transferred
     * @dev Internal function to keep ticket.wallet field updated on transfers
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        if (to == address(0)) revert ZeroAddress();
        
        address from = super._update(to, tokenId, auth);
        
        // Skip if it's a mint (from == 0)
        if (from != address(0)) {
            TicketData storage ticket = tickets[tokenId];
            ticket.wallet = to;
        }
        
        return from;
    }
    
    /**
     * @dev Override the supportsInterface function to include the ERC165 interface for AccessControl and ERC721URIStorage
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Add an admin to the contract
     * @param account Address to grant admin role
     */
    function addAdmin(address account) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotAuthorized();
        if (account == address(0)) revert ZeroAddress();
        _grantRole(ADMIN_ROLE, account);
    }
    
    /**
     * @notice Remove an admin from the contract
     * @param account Address to revoke admin role
     */
    function removeAdmin(address account) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotAuthorized();
        if (account == address(0)) revert ZeroAddress();
        _revokeRole(ADMIN_ROLE, account);
    }

    /**
     * @notice Sets the global metadata URI for the collection
     * @param uri IPFS URI for the global metadata JSON
     */
    function setGlobalMetadataURI(string calldata uri) external onlyAdmin {
        _globalMetadataURI = uri;
        emit GlobalMetadataURISet(uri);
    }

    /**
     * @notice Gets the global metadata URI for the collection
     * @return The global metadata URI
     */
    function getGlobalMetadataURI() external view returns (string memory) {
        return _globalMetadataURI;
    }

    /**
     * @notice Sets the URI for a specific product code
     * @param productCode Product code
     * @param uri IPFS URI for the product image/metadata
     */
    function setProductCodeURI(string calldata productCode, string calldata uri) external onlyAdmin {
        if (bytes(productCode).length == 0) revert InvalidInput("Product missing");
        _productCodeURIs[productCode] = uri;
        emit ProductCodeURISet(productCode, uri);
    }

    /**
     * @notice Gets the URI associated with a product code
     * @param productCode Product code
     * @return The URI associated with the product code
     */
    function getProductCodeURI(string calldata productCode) external view returns (string memory) {
        return _productCodeURIs[productCode];
    }

    /**
     * @notice Sets a specific URI for a token (overrides product code URI)
     * @param tokenId ID of the token
     * @param uri New URI for the token
     */
    function setTokenURI(uint256 tokenId, string calldata uri) external onlyAdmin ticketExists(tokenId) {
        _setTokenURI(tokenId, uri);
        emit TokenURISet(tokenId, uri);
    }

    /**
     * @notice Gets the specific URI for a token if it exists
     * @param tokenId Token ID
     * @return The specific URI for the token, or empty string if not set
     */
    function getTokenURI(uint256 tokenId) external view ticketExists(tokenId) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Gets the metadata URI for a specific token
     * @param tokenId Token ID
     * @return The metadata URI
     */
    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);
        
        // Check if there's a specific URI for this token
        string memory specificUri = super.tokenURI(tokenId);
        if (bytes(specificUri).length > 0) {
            return specificUri;
        }
        
        // If no specific URI, fall back to product code URI
        TicketData storage ticket = tickets[tokenId];
        string memory productCode = ticket.productCode;
        
        // Get the URI associated with the productCode
        string memory uri = _productCodeURIs[productCode];
        
        // If no URI is defined for this productCode, use the global metadata URI if available
        if (bytes(uri).length == 0 && bytes(_globalMetadataURI).length > 0) {
            return _globalMetadataURI;
        }
        return uri;
    }
}
