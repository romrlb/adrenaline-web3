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

    // Custom errors pour réduire la taille du bytecode
    error TicketDoesNotExist(uint256 tokenId);
    error UnauthorizedAccess(address caller);
    error ZeroAddressNotAllowed();
    error AdminAlreadyRegistered(address admin);
    error AddressNotAdmin(address admin);
    error OwnerAdminRemovalForbidden();
    error CenterCodeMissing();
    error DuplicateCenterCode(string centerCode);
    error ProductCodeMissing();
    error ActivityDescriptionMissing();
    error TicketInWrongState(uint256 tokenId, NFTStatus requiredState);
    error UnregisteredCenter(string centerCode);
    error CenterLacksProductAuthorization(string centerCode, string productCode);
    error UnauthorizedCenterForUnlock(string centerCode, string actualCenter);
    error TicketAlreadyExpired(uint256 tokenId);
    error CallerNotAuthorizedForTicket(address spender, uint256 tokenId);
    error SelfPurchaseAttempt(address owner);
    error FutureDateRequired(uint256 providedDate, uint256 currentTime);
    error ReservationExceedsLimitDate(uint256 reservationDate, uint256 limitDate);
    error LimitDateBeforeReservation(uint256 limitDate, uint256 reservationDate);

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
        uint256 limitDate;
        uint256 reservationDate; 
    }

    struct CenterData {
        bool isActive;
        string[] productCodes;
    }

    // Mapping pour gérer les administrateurs approuvés
    mapping(address => bool) public admins;
    
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
    event CenterRegistered(string centerCode);
    event CenterProductCodeAdded(string centerCode, string productCode);
    event CenterProductCodeRemoved(string centerCode, string productCode);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    /**
     * @notice Modifier to check if a ticket exists
     * @param tokenId ID of the ticket to check
     */
    modifier ticketExists(uint256 tokenId) {
        if (_ownerOf(tokenId) == address(0)) revert TicketDoesNotExist(tokenId);
        _;
    }
    
    /**
     * @notice Modifier to check if the caller is an admin or the owner
     */
    modifier onlyAdmin() {
        if (!(owner() == msg.sender || admins[msg.sender])) revert UnauthorizedAccess(msg.sender);
        _;
    }

    constructor() ERC721("Adrenaline Ticket", "SKY") Ownable(msg.sender) {
        // Le propriétaire est automatiquement un admin
        admins[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }
    

    // ::::::::::::: ADMIN FUNCTIONS ::::::::::::: //

    /**
     * @notice Add a new admin
     * @param admin Address of the new admin
     */
    function addAdmin(address admin) external onlyOwner {
        if (admin == address(0)) revert ZeroAddressNotAllowed();
        if (admins[admin]) revert AdminAlreadyRegistered(admin);
        
        admins[admin] = true;
        emit AdminAdded(admin);
    }
    
    /**
     * @notice Remove an admin
     * @param admin Address of the admin to remove
     */
    function removeAdmin(address admin) external onlyOwner {
        if (admin == owner()) revert OwnerAdminRemovalForbidden();
        if (!admins[admin]) revert AddressNotAdmin(admin);
        
        admins[admin] = false;
        emit AdminRemoved(admin);
    }
    
    /**
     * @notice Check if an address is an admin
     * @param admin Address to check
     * @return True if the address is an admin, false otherwise
     */
    function isAdmin(address admin) public view returns (bool) {
        return admins[admin];
    }

    // ::::::::::::: CENTER FUNCTIONS ::::::::::::: //

    /**
     * @notice Registers a new center with its productCodes
     * @param centerCode Unique code of the center
     * @param productCodes List of product codes managed by the center
     */
    function registerCenter(string calldata centerCode, string[] calldata productCodes) external onlyAdmin {
        if (bytes(centerCode).length == 0) revert CenterCodeMissing();
        if (centers[centerCode].isActive) revert DuplicateCenterCode(centerCode);
        
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

        // Check if center supports multi-activity (code 000000)
        string[] memory codes = centers[centerCode].productCodes;
        for (uint i = 0; i < codes.length; i++) {
            if (keccak256(bytes(codes[i])) == keccak256(bytes(DEFAULT_PRODUCT_CODE))) {
                return true;  // Le centre accepte tous les codes produits
            }
        }

        // Check specific product code
        for (uint i = 0; i < codes.length; i++) {
            if (keccak256(bytes(codes[i])) == keccak256(bytes(productCode))) {
                return true;
            }
        }
        
        return false;
    }

    // ::::::::::::: TICKET FUNCTIONS ::::::::::::: //

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
    ) external onlyAdmin nonReentrant returns (uint256) {

        if (to == address(0)) revert ZeroAddressNotAllowed();
        if (bytes(productCode).length == 0) revert ProductCodeMissing();
        if (bytes(activite).length == 0) revert ActivityDescriptionMissing();
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Calcul de la date limite (18 mois = 18 * 30 * 24 * 60 * 60 secondes)
        uint256 monthsInSeconds = 18 * 30 days;
        uint256 limitDate = block.timestamp + monthsInSeconds;
        
        tickets[tokenId] = TicketData({
            tokenId: tokenId,
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
        // Si le ticket est déjà marqué comme expiré
        if (tickets[tokenId].status == NFTStatus.EXPIRED) {
            return true;
        }
        
        // Si la date limite est dépassée
        if (tickets[tokenId].limitDate > 0 && block.timestamp > tickets[tokenId].limitDate) {
            return true;
        }
        
        return false;
    }
    
    /**
     * @notice Automatically checks and updates the status of a ticket if it's expired
     * @param tokenId ID of the ticket to check
     * @return bool True if the ticket was updated to expired, false otherwise
     */
    function checkAndUpdateExpiration(uint256 tokenId) public onlyAdmin nonReentrant ticketExists(tokenId) returns (bool) {
        // Ne pas mettre à jour si déjà marqué comme expiré
        if (tickets[tokenId].status == NFTStatus.EXPIRED) {
            return false;
        }
        
        // Vérifier si la date limite est dépassée
        if (tickets[tokenId].limitDate > 0 && block.timestamp > tickets[tokenId].limitDate) {
            tickets[tokenId].status = NFTStatus.EXPIRED;
            emit TicketExpired(tokenId);
            return true;
        }
        
        return false;
    }
    
    /**
     * @notice Batch function to check and update expiration status of multiple tickets
     * @param tokenIds Array of ticket IDs to check
     * @return expiredTokens Array of ticket IDs that were updated to expired
     */
    function batchCheckExpiration(uint256[] calldata tokenIds) external onlyAdmin nonReentrant returns (uint256[] memory) {
        uint256[] memory expiredTokens = new uint256[](tokenIds.length);
        uint256 expiredCount = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_ownerOf(tokenIds[i]) != address(0)) {  // Vérifier l'existence
                if (checkAndUpdateExpiration(tokenIds[i])) {
                    expiredTokens[expiredCount] = tokenIds[i];
                    expiredCount++;
                }
            }
        }
        
        // Redimensionner le tableau des résultats
        uint256[] memory result = new uint256[](expiredCount);
        for (uint256 i = 0; i < expiredCount; i++) {
            result[i] = expiredTokens[i];
        }
        
        return result;
    }

    /**
     * @notice Locks a ticket (reservation by a center)
     * @param tokenId ID of the ticket to lock
     * @param centerCode Code of the center making the reservation
     */
    function lockTicket(uint256 tokenId, string calldata centerCode) external onlyAdmin nonReentrant ticketExists(tokenId) {
        // Vérifier l'expiration automatiquement
        if (isExpired(tokenId)) revert TicketAlreadyExpired(tokenId);
        
        if (tickets[tokenId].status != NFTStatus.AVAILABLE) revert TicketInWrongState(tokenId, NFTStatus.AVAILABLE);
        if (bytes(centerCode).length == 0) revert CenterCodeMissing();
        if (!centers[centerCode].isActive) revert UnregisteredCenter(centerCode);
        
        // Checks if the center is authorized for this productCode
        if (!isCenterAuthorized(centerCode, tickets[tokenId].productCode)) 
            revert CenterLacksProductAuthorization(centerCode, tickets[tokenId].productCode);
        
        tickets[tokenId].status = NFTStatus.LOCKED;
        tickets[tokenId].centerCode = centerCode;
        
        // Set reservation date to current time
        tickets[tokenId].reservationDate = block.timestamp;
        
        emit TicketLocked(tokenId, centerCode);
    }
    
    /**
     * @notice Unlocks a ticket (reservation cancellation)
     * @param tokenId ID of the ticket to unlock
     * @param centerCode Code of the center requesting the unlock
     */
    function unlockTicket(uint256 tokenId, string calldata centerCode) external onlyAdmin nonReentrant ticketExists(tokenId) {
        // Vérifier l'expiration automatiquement
        if (isExpired(tokenId)) revert TicketAlreadyExpired(tokenId);
        
        if (tickets[tokenId].status != NFTStatus.LOCKED) revert TicketInWrongState(tokenId, NFTStatus.LOCKED);
        if (bytes(centerCode).length == 0) revert CenterCodeMissing();
        if (!centers[centerCode].isActive) revert UnregisteredCenter(centerCode);
        if (keccak256(bytes(tickets[tokenId].centerCode)) != keccak256(bytes(centerCode)))
            revert UnauthorizedCenterForUnlock(centerCode, tickets[tokenId].centerCode);
        
        tickets[tokenId].status = NFTStatus.AVAILABLE;
        tickets[tokenId].centerCode = DEFAULT_CENTER_CODE;
        
        emit TicketUnlocked(tokenId);
    }
    
    /**
     * @notice Marks a ticket as used (becomes a collector)
     * @param tokenId ID of the ticket to use
     */
    function useTicket(uint256 tokenId) external onlyAdmin nonReentrant ticketExists(tokenId) {
        // Vérifier l'expiration automatiquement
        if (isExpired(tokenId)) revert TicketAlreadyExpired(tokenId);
        
        if (tickets[tokenId].status != NFTStatus.LOCKED) revert TicketInWrongState(tokenId, NFTStatus.LOCKED);
        
        tickets[tokenId].status = NFTStatus.COLLECTOR;
        
        emit TicketUsed(tokenId);
    }
    
    /**
     * @notice Puts a ticket for sale on the marketplace
     * @param tokenId ID of the ticket to put for sale
     */
    function putForSale(uint256 tokenId) external nonReentrant ticketExists(tokenId) {
        // Vérifier l'expiration automatiquement
        if (isExpired(tokenId)) revert TicketAlreadyExpired(tokenId);
        
        if (!_isApprovedOrOwner(msg.sender, tokenId)) revert CallerNotAuthorizedForTicket(msg.sender, tokenId);
        if (!(tickets[tokenId].status == NFTStatus.AVAILABLE || tickets[tokenId].status == NFTStatus.COLLECTOR))
            revert TicketInWrongState(tokenId, NFTStatus.AVAILABLE);
        
        tickets[tokenId].status = NFTStatus.ON_SALE;
        
        emit TicketForSale(tokenId);
    }
    
    /**
     * @notice Allows buying a ticket from the marketplace
     * @param tokenId ID of the ticket to buy
     */
    function buyTicket(uint256 tokenId) external nonReentrant ticketExists(tokenId) {
        // Vérifier l'expiration automatiquement
        if (isExpired(tokenId)) revert TicketAlreadyExpired(tokenId);
        
        if (tickets[tokenId].status != NFTStatus.ON_SALE) revert TicketInWrongState(tokenId, NFTStatus.ON_SALE);
        if (msg.sender == ownerOf(tokenId)) revert SelfPurchaseAttempt(msg.sender);
        
        address previousOwner = ownerOf(tokenId);
        
        tickets[tokenId].status = NFTStatus.AVAILABLE;
        tickets[tokenId].wallet = msg.sender;
        tickets[tokenId].centerCode = DEFAULT_CENTER_CODE;
        
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
    function setReservationDate(uint256 tokenId, uint256 newReservationDate) external onlyAdmin nonReentrant ticketExists(tokenId) {
        if (tickets[tokenId].status != NFTStatus.LOCKED) revert TicketInWrongState(tokenId, NFTStatus.LOCKED);
        if (newReservationDate <= block.timestamp) revert FutureDateRequired(newReservationDate, block.timestamp);
        if (newReservationDate >= tickets[tokenId].limitDate) revert ReservationExceedsLimitDate(newReservationDate, tickets[tokenId].limitDate);
        
        tickets[tokenId].reservationDate = newReservationDate;
    }
    
    /**
     * @notice Updates the limit date of a ticket
     * @param tokenId ID of the ticket
     * @param newLimitDate New limit date (unix timestamp)
     */
    function setLimitDate(uint256 tokenId, uint256 newLimitDate) external onlyAdmin nonReentrant ticketExists(tokenId) {
        if (newLimitDate <= block.timestamp) revert FutureDateRequired(newLimitDate, block.timestamp);
        
        if (tickets[tokenId].reservationDate > 0) {
            if (newLimitDate <= tickets[tokenId].reservationDate) 
                revert LimitDateBeforeReservation(newLimitDate, tickets[tokenId].reservationDate);
        }
        
        tickets[tokenId].limitDate = newLimitDate;
    }

    /**
     * @notice Marks a ticket as expired
     * @param tokenId ID of the ticket to mark as expired
     */
    function setExpired(uint256 tokenId) external onlyAdmin nonReentrant ticketExists(tokenId) {
        if (tickets[tokenId].status == NFTStatus.EXPIRED) revert TicketAlreadyExpired(tokenId);
        
        tickets[tokenId].status = NFTStatus.EXPIRED;
        
        emit TicketExpired(tokenId);
    }
}
