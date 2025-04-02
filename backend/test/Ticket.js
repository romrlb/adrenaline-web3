const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Ticket Contract", function () {
  async function deployTicketFixture() {
    const [owner, userAccount1, userAccount2, userAccount3] = await ethers.getSigners();
    const Ticket = await ethers.getContractFactory("Ticket");
    const ticket = await Ticket.deploy();
    
    return { ticket, owner, userAccount1, userAccount2, userAccount3 };
  }

  describe("Deployment", function () {
    it("Should set the deployer as admin role holder", async function () {
      const { ticket, owner } = await loadFixture(deployTicketFixture);
      const ADMIN_ROLE = await ticket.ADMIN_ROLE();
      const DEFAULT_ADMIN_ROLE = await ticket.DEFAULT_ADMIN_ROLE();
      
      expect(await ticket.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await ticket.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Ticket Creation and Management", function () {
    it("Should only allow admin to create tickets", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.connect(userAccount1).createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "NotAuthorized");
      
      await expect(
        ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"))
      ).not.to.be.reverted;
    });

    it("Should lock a ticket correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1", 0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(1); // LOCKED
      expect(ticketData.centerCode).to.equal("CENTER1");
    });

    it("Should unlock a ticket correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1", 0);
      await ticket.unlockTicket(0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(0); // AVAILABLE
      expect(ticketData.centerCode).to.equal("000000"); // Default code
    });

    it("Should use a ticket correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1", 0);
      await ticket.useTicket(0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(3); // COLLECTOR (index 3 dans l'énumération NFTStatus actuelle)
    });

    it("Should reject creating ticket with zero address", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(ethers.ZeroAddress, "PRODUCT1", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "ZeroAddress");
    });

    it("Should reject creating ticket with empty product code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(userAccount1.address, "", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject unlocking a non-LOCKED ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      await expect(
        ticket.unlockTicket(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should reject using a non-LOCKED ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      await expect(
        ticket.useTicket(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should successfully lock a ticket in AVAILABLE state", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Essayer de verrouiller un ticket en état AVAILABLE (devrait réussir)
      await expect(
        ticket.lockTicket(0, "CENTER2", 0)
      ).not.to.be.reverted;
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(1); // LOCKED
      expect(ticketData.centerCode).to.equal("CENTER2");
    });

    it("Should reject operations on expired tickets", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      const now = Math.floor(Date.now() / 1000);
      const limitDate = now + 100;
      await ticket.setLimitDate(0, limitDate);
      await time.increaseTo(limitDate + 10);
      
      await ticket.checkExpiration(0);
      
      await expect(
        ticket.lockTicket(0, "CENTER1", 0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
      
      await expect(
        ticket.unlockTicket(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
      
      await expect(
        ticket.useTicket(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should prevent marking an already expired ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.setExpired(0);
      
      await expect(
        ticket.setExpired(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should reject locking a non-AVAILABLE ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      // Créer un ticket
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Verrouiller le ticket (passe de AVAILABLE à LOCKED)
      await ticket.lockTicket(0, "CENTER1", 0);
      
      // Vérifier que le ticket est bien en état LOCKED
      let ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(1); // LOCKED
      
      // Essayer de verrouiller à nouveau le ticket qui est déjà verrouillé (devrait échouer)
      await expect(
        ticket.lockTicket(0, "CENTER2", 0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState")
       .withArgs(0, 1); // TokenId 0, status LOCKED (1)
    });
  });

  describe("Expiration and Date Management", function () {
    it("Should auto-expire a ticket when limit date is reached", async function() {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Set a closer limit date for testing (current time + 10 seconds)
      const now = await time.latest();
      const newLimitDate = now + 10;
      await ticket.setLimitDate(0, newLimitDate);
      
      // Advance time past the limit date
      await time.increaseTo(newLimitDate + 5);
      
      expect(await ticket.isExpired(0)).to.be.true;
      await ticket.checkExpiration(0);
      
      const ticketInfo = await ticket.getTicketInfo(0);
      expect(ticketInfo.status).to.equal(4); // EXPIRED status (index 4 dans l'énumération NFTStatus actuelle)
    });

    it("Should reject setting reservation date after limitDate + 1 day", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1", 0);
      
      // Set limit date to current time + 1 day
      const now = await time.latest();
      const limitDate = now + 24 * 60 * 60;
      await ticket.setLimitDate(0, limitDate);
      
      // Try to set reservation date to limit + 1 day + 1 second
      const afterLimitPlusOneDay = limitDate + 24 * 60 * 60 + 1;
      await expect(
        ticket.setReservationDate(0, afterLimitPlusOneDay)
      ).to.be.revertedWithCustomError(ticket, "DateError")
       .withArgs(afterLimitPlusOneDay, "After limit+1day");
      
      // Test with valid date
      const validDate = limitDate + 24 * 60 * 60 - 1;
      await expect(
        ticket.setReservationDate(0, validDate)
      ).not.to.be.reverted;
    });
  });

  describe("State Validation and Error Cases", function () {
    it("Should accept valid center code after rejecting default code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Try with default code (should fail)
      await expect(
        ticket.lockTicket(0, "000000", 0)
      ).to.be.revertedWithCustomError(ticket, "InvalidInput")
      .withArgs("Center should not be default");
      
      // Try with valid code (should succeed)
      await expect(
        ticket.lockTicket(0, "CENTER1", 0)
      ).not.to.be.reverted;
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.centerCode).to.equal("CENTER1");
    });

    
    it("Should reject locking a non-AVAILABLE ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      // Créer un ticket
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Verrouiller le ticket (passe de AVAILABLE à LOCKED)
      await ticket.lockTicket(0, "CENTER1", 0);
      
      // Vérifier que le ticket est bien en état LOCKED
      let ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(1); // LOCKED
      
      // Essayer de verrouiller à nouveau le ticket qui est déjà verrouillé (devrait échouer)
      await expect(
        ticket.lockTicket(0, "CENTER2", 0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState")
       .withArgs(0, 1); // TokenId 0, status LOCKED (1)
    });

    it("Should reject empty center code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Try with empty code (should fail)
      await expect(
        ticket.lockTicket(0, "", 0)
      ).to.be.revertedWithCustomError(ticket, "InvalidInput")
       .withArgs("Center missing");
    });

    it("Should respect reservation date with various values", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      const now = await time.latest();
      const future = now + 3600; // 1 hour in future
      
      // Test with specific future reservation date (should succeed)
      await expect(
        ticket.lockTicket(0, "CENTER1", future)
      ).not.to.be.reverted;
      
      let ticketData = await ticket.tickets(0);
      expect(ticketData.reservationDate).to.equal(future);
      
      // Unlock for next test
      await ticket.unlockTicket(0);
      
      // Test with zero reservation date (should use current time)
      await expect(
        ticket.lockTicket(0, "CENTER1", 0)
      ).not.to.be.reverted;
      
      ticketData = await ticket.tickets(0);
      const currentTime = await time.latest();
      expect(ticketData.reservationDate).to.be.closeTo(currentTime, 5); // Allow small time difference due to block mining
    });

    it("Should enforce reservation date to be before limitDate + 1 day", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      // Create a ticket
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Get the current limit date
      let ticketData = await ticket.tickets(0);
      const limitDate = Number(ticketData.limitDate);
      
      // Test with a reservation date exactly at limitDate + 1 day (should fail)
      const exactlyDayAfterLimit = limitDate + 24 * 60 * 60; // +1 day in seconds
      await expect(
        ticket.lockTicket(0, "CENTER1", exactlyDayAfterLimit)
      ).to.be.revertedWithCustomError(ticket, "DateError")
       .withArgs(exactlyDayAfterLimit, "After limit+1day");
      
      // Test with a reservation date just before limitDate + 1 day (should succeed)
      const justBeforeDayAfterLimit = limitDate + 24 * 60 * 60 - 1; // +1 day in seconds - 1 second
      await expect(
        ticket.lockTicket(0, "CENTER1", justBeforeDayAfterLimit)
      ).not.to.be.reverted;
      
      ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(1); // LOCKED
      expect(ticketData.reservationDate).to.equal(justBeforeDayAfterLimit);
    });

    it("Should cover limit date before reservation date case", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1", 0);
      
      const now = Math.floor(Date.now() / 1000);
      const farFuture = now + 30 * 24 * 60 * 60;
      await ticket.setLimitDate(0, farFuture);
      
      const reservationDate = now + 10 * 24 * 60 * 60;
      await ticket.setReservationDate(0, reservationDate);
      
      const beforeReservation = reservationDate - 100;
      await expect(
        ticket.setLimitDate(0, beforeReservation)
      ).to.be.revertedWithCustomError(ticket, "DateError");
    });

    it("Should cover setReservationDate with different ticket states", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      const future = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        ticket.setReservationDate(0, future)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
      
      await ticket.lockTicket(0, "CENTER1", 0);
      
      await expect(
        ticket.setReservationDate(0, future)
      ).not.to.be.reverted;
    });

    it("Should test non-existent token and edge cases", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(ticket.getTicketInfo(99)).to.be.reverted;
      await expect(ticket.isExpired(99)).to.be.reverted;
      await expect(ticket.checkExpiration(99)).to.be.reverted;
      await expect(ticket.lockTicket(99, "ANY_CENTER", 0)).to.be.reverted;
      await expect(ticket.setExpired(99)).to.be.reverted;
      await expect(
        ticket.setLimitDate(99, Math.floor(Date.now() / 1000) + 3600)
      ).to.be.reverted;
    });

    it("Should cover setting limit date in the past", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      const past = Math.floor(Date.now() / 1000) - 100;
      await expect(
        ticket.setLimitDate(0, past)
      ).to.be.revertedWithCustomError(ticket, "DateError")
       .withArgs(past, "In past");
    });

    it("Should test ERC721 functionalities", async function () {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      await ticket.connect(userAccount1).transferFrom(userAccount1.address, userAccount2.address, 0);
      expect(await ticket.ownerOf(0)).to.equal(userAccount2.address);
      
      const uri = await ticket.tokenURI(0);
      expect(uri).to.be.a('string');
      
      expect(await ticket.supportsInterface("0x80ac58cd")).to.be.true; // ERC721
      expect(await ticket.supportsInterface("0x00000000")).to.be.false; // Invalid interface
    });

    it("Should test all branches in isExpired", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.createTicket(userAccount1.address, "PRODUCT2", ethers.parseEther("0.1"));
      
      // Case 1: Not expired ticket
      expect(await ticket.isExpired(0)).to.be.false;
      
      // Case 2: Marked as EXPIRED
      await ticket.setExpired(0);
      expect(await ticket.isExpired(0)).to.be.true;
      
      // Case 3: Limit date reached
      const now = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      await ticket.setLimitDate(1, now + 2);
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");
      expect(await ticket.isExpired(1)).to.be.true;
    });
  });

  describe("TotalSupply Functionality", function () {
    it("Should initialize totalSupply to 0", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      
      // Verify initial total supply is 0
      expect(await ticket.totalSupply()).to.equal(0);
    });
  });
  
  describe("Zero Address Checks", function () {
    it("Should reject zero address in addAdmin", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.addAdmin(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(ticket, "ZeroAddress");
    });
    
    it("Should reject zero address in removeAdmin", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.removeAdmin(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(ticket, "ZeroAddress");
    });
  });

  describe("Role Management", function () { 
    it("Should allow DEFAULT_ADMIN to remove an admin", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const ADMIN_ROLE = await ticket.ADMIN_ROLE();
      
      await ticket.addAdmin(userAccount1.address);
      expect(await ticket.hasRole(ADMIN_ROLE, userAccount1.address)).to.be.true;
      
      await ticket.removeAdmin(userAccount1.address);
      expect(await ticket.hasRole(ADMIN_ROLE, userAccount1.address)).to.be.false;
    });
    
    it("Should reject non-DEFAULT_ADMIN from managing admin roles", async function () {
      const { ticket, owner, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      // Give userAccount1 ADMIN_ROLE but not DEFAULT_ADMIN_ROLE
      await ticket.addAdmin(userAccount1.address);
      
      await expect(
        ticket.connect(userAccount1).addAdmin(userAccount2.address)
      ).to.be.revertedWithCustomError(ticket, "NotAuthorized");
      
      await expect(
        ticket.connect(userAccount1).removeAdmin(owner.address)
      ).to.be.revertedWithCustomError(ticket, "NotAuthorized");
    });
  });

  describe("Metadata and Image Management", function () {
    it("Should allow setting URI for a product code", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const productCode = "PRODUCT1";
      const ipfsURI = "ipfs://QmTest123456/image.jpg";
      
      // Vérifier que l'URI n'est pas défini par défaut
      expect(await ticket.getProductCodeURI(productCode)).to.equal("");
      
      // Définir l'URI pour le productCode
      await expect(ticket.setProductCodeURI(productCode, ipfsURI))
        .to.emit(ticket, "ProductCodeURISet")
        .withArgs(productCode, ipfsURI);
      
      // Vérifier que l'URI a été correctement défini
      expect(await ticket.getProductCodeURI(productCode)).to.equal(ipfsURI);
    });
    
    it("Should reject setting URI for empty product code", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      const ipfsURI = "ipfs://QmTest123456/image.jpg";
      
      // Tentative de définir l'URI avec un productCode vide
      await expect(ticket.setProductCodeURI("", ipfsURI))
        .to.be.revertedWithCustomError(ticket, "InvalidInput");
    });
    
    it("Should allow only admin to set product code URI", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const productCode = "PRODUCT1";
      const ipfsURI = "ipfs://QmTest123456/image.jpg";
      
      // Tentative de définir l'URI avec un compte non-admin
      await expect(ticket.connect(userAccount1).setProductCodeURI(productCode, ipfsURI))
        .to.be.revertedWithCustomError(ticket, "NotAuthorized");
        
      // L'admin peut définir l'URI
      await expect(ticket.setProductCodeURI(productCode, ipfsURI)).not.to.be.reverted;
    });
    
    it("Should set and get specific token URI correctly", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const productCode = "PRODUCT1";
      const productURI = "ipfs://QmProduct123/metadata.json";
      const specificURI = "ipfs://QmSpecific456/vip_metadata.json";
      
      // Create a ticket
      await ticket.createTicket(userAccount1.address, productCode, ethers.parseEther("0.1"));
      const tokenId = 0;
      
      // Set product code URI
      await ticket.setProductCodeURI(productCode, productURI);
      
      // Verify token uses product URI initially
      expect(await ticket.tokenURI(tokenId)).to.equal(productURI);
      
      // Set specific token URI
      await ticket.setTokenURI(tokenId, specificURI);
      
      // Verify getTokenURI returns the specific URI
      expect(await ticket.getTokenURI(tokenId)).to.equal(specificURI);
      
      // Verify tokenURI now returns the specific URI
      expect(await ticket.tokenURI(tokenId)).to.equal(specificURI);
    });
    
    it("Should reject setting token URI for non-existent token", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      const specificURI = "ipfs://QmSpecific456/vip_metadata.json";
      
      // Try to set URI for non-existent token
      await expect(ticket.setTokenURI(99, specificURI)).to.be.reverted;
    });
    
    it("Should reject setting token URI by non-admin", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      const productCode = "PRODUCT1";
      const specificURI = "ipfs://QmSpecific456/vip_metadata.json";
      
      // Create a ticket
      await ticket.createTicket(userAccount1.address, productCode, ethers.parseEther("0.1"));
      
      // Try to set token URI with non-admin account
      await expect(ticket.connect(userAccount1).setTokenURI(0, specificURI))
        .to.be.revertedWithCustomError(ticket, "NotAuthorized");
    });

    it("Should set and get global metadata URI correctly", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      const globalURI = "ipfs://QmGlobalMetadata123/collection.json";
      
      // Set global metadata URI
      await expect(ticket.setGlobalMetadataURI(globalURI))
        .to.emit(ticket, "GlobalMetadataURISet")
        .withArgs(globalURI);
      
      // Get global metadata URI
      expect(await ticket.getGlobalMetadataURI()).to.equal(globalURI);
    });
    
    it("Should use global metadata URI when product code has no URI", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      const globalURI = "ipfs://QmGlobalMetadata123/collection.json";
      const productCode = "PRODUCT1";
      
      // Set global metadata URI
      await ticket.setGlobalMetadataURI(globalURI);
      
      // Create a ticket without setting product code URI
      await ticket.createTicket(userAccount1.address, productCode, ethers.parseEther("0.1"));
      
      // Token URI should fall back to global metadata URI
      expect(await ticket.tokenURI(0)).to.equal(globalURI);
    });
  });
});
