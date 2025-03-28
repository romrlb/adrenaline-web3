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
      await ticket.lockTicket(0, "CENTER1");
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(1); // LOCKED
      expect(ticketData.centerCode).to.equal("CENTER1");
    });

    it("Should unlock a ticket correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1");
      await ticket.unlockTicket(0, "CENTER1");
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(0); // AVAILABLE
      expect(ticketData.centerCode).to.equal("000000"); // Default code
    });

    it("Should use a ticket correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1");
      await ticket.useTicket(0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(3); // COLLECTOR
    });

    it("Should reject creating ticket with zero address", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(ethers.ZeroAddress, "PRODUCT1", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject creating ticket with empty product code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(userAccount1.address, "", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });
  });

  describe("Expiration and Date Management", function () {
    it("Should prevent marking an already expired ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.setExpired(0);
      
      await expect(
        ticket.setExpired(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should auto-expire a ticket when limit date is reached", async function() {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      let ticketData = await ticket.tickets(0);
      const limitDate = Number(ticketData.limitDate);
      expect(limitDate).to.be.greaterThan(Math.floor(Date.now() / 1000));
      
      await time.increaseTo(limitDate + 10);
      
      expect(await ticket.isExpired(0)).to.be.true;
      await ticket.checkAndUpdateExpiration(0);
      
      const ticketInfo = await ticket.getTicketInfo(0);
      expect(ticketInfo.status).to.equal(4); // EXPIRED status
    });

    it("Should reject setting reservation date in the past", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1");
      
      const now = Math.floor(Date.now() / 1000);
      const pastDate = now - 3600; // -1 hour
      
      await expect(
        ticket.setReservationDate(0, pastDate)
      ).to.be.revertedWithCustomError(ticket, "DateError");
    });
  });

  describe("Marketplace Functionality", function () {
    it("Should handle token transfers correctly", async function() {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      await ticket.connect(userAccount1).transferFrom(userAccount1.address, userAccount2.address, 0);
      
      expect(await ticket.ownerOf(0)).to.equal(userAccount2.address);
    });
  });

  describe("State Validation and Error Cases", function () {
    it("Should reject locking with an empty center code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      await expect(
        ticket.lockTicket(0, "")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject locking a non-AVAILABLE ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.lockTicket(0, "CENTER1")
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should reject unlocking with an empty center code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.unlockTicket(0, "")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject unlocking with a different center", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.unlockTicket(0, "CENTER2")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Center not matching");
    });

    it("Should reject unlocking a non-LOCKED ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      await expect(
        ticket.unlockTicket(0, "CENTER1")
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should reject using a non-LOCKED ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      await expect(
        ticket.useTicket(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should reject operations on expired tickets", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      const now = Math.floor(Date.now() / 1000);
      const limitDate = now + 100;
      await ticket.setLimitDate(0, limitDate);
      await time.increaseTo(limitDate + 10);
      
      await ticket.checkAndUpdateExpiration(0);
      
      await expect(
        ticket.lockTicket(0, "CENTER1")
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
      
      await expect(
        ticket.unlockTicket(0, "CENTER1")
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
      
      await expect(
        ticket.useTicket(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });
  });

  describe("Additional Test Cases", function () {
    it("Should cover reservation date after limit date case", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1");
      
      const now = Math.floor(Date.now() / 1000);
      const limitDate = now + 3600;
      await ticket.setLimitDate(0, limitDate);
      
      const afterLimitDate = limitDate + 100;
      await expect(
        ticket.setReservationDate(0, afterLimitDate)
      ).to.be.revertedWithCustomError(ticket, "DateError");
    });

    it("Should cover limit date before reservation date case", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.lockTicket(0, "CENTER1");
      
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
      
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.setReservationDate(0, future)
      ).not.to.be.reverted;
    });

    it("Should test non-existent token and edge cases", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(ticket.getTicketInfo(99)).to.be.reverted;
      await expect(ticket.isExpired(99)).to.be.reverted;
      await expect(ticket.checkAndUpdateExpiration(99)).to.be.reverted;
      await expect(ticket.lockTicket(99, "ANY_CENTER")).to.be.reverted;
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

    it("Should cover checkAndUpdateExpiration branches", async function() {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.setExpired(0);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT2", ethers.parseEther("0.1"));
      
      const stateBefore = await ticket.tickets(0);
      expect(stateBefore.status).to.equal(4); // EXPIRED
      
      await expect(ticket.checkAndUpdateExpiration(0))
        .to.not.emit(ticket, "TicketExpired");
      
      let secondTicketData = await ticket.tickets(1);
      const limitDate = Number(secondTicketData.limitDate);
      await time.increaseTo(limitDate + 10);
      
      await expect(ticket.checkAndUpdateExpiration(1))
        .to.emit(ticket, "TicketExpired")
        .withArgs(1);
      
      secondTicketData = await ticket.tickets(1);
      expect(secondTicketData.status).to.equal(4); // EXPIRED
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

    it("Should test revert cases in createTicket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(ethers.ZeroAddress, "PRODUCT1", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Invalid address");
      
      await expect(
        ticket.createTicket(userAccount1.address, "", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Product missing");
    });

    it("Should verify the ticket token counter increments correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      await ticket.createTicket(userAccount1.address, "PRODUCT2", ethers.parseEther("0.1"));
      await ticket.createTicket(userAccount1.address, "PRODUCT3", ethers.parseEther("0.1"));
      
      expect(await ticket.ownerOf(0)).to.equal(userAccount1.address);
      expect(await ticket.ownerOf(1)).to.equal(userAccount1.address);
      expect(await ticket.ownerOf(2)).to.equal(userAccount1.address);
      
      const data1 = await ticket.getTicketInfo(0);
      const data2 = await ticket.getTicketInfo(1);
      const data3 = await ticket.getTicketInfo(2);
      
      expect(data1.productCode).to.equal("PRODUCT1");
      expect(data2.productCode).to.equal("PRODUCT2");
      expect(data3.productCode).to.equal("PRODUCT3");
    });

    it("Should verify events are emitted correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"))
      ).to.emit(ticket, "TicketCreated")
        .withArgs(0, userAccount1.address, "PRODUCT1");
      
      await expect(
        ticket.lockTicket(0, "CENTER1")
      ).to.emit(ticket, "TicketLocked")
        .withArgs(0, "CENTER1");
      
      await expect(
        ticket.unlockTicket(0, "CENTER1")
      ).to.emit(ticket, "TicketUnlocked")
        .withArgs(0);
      
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.useTicket(0)
      ).to.emit(ticket, "TicketUsed")
        .withArgs(0);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT2", ethers.parseEther("0.1"));
      
      await expect(
        ticket.setExpired(1)
      ).to.emit(ticket, "TicketExpired")
        .withArgs(1);
    });

    it("Should test all status branches in lockTicket function", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      // Create tickets for different tests
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1")); // tokenId 0
      await ticket.createTicket(userAccount1.address, "PRODUCT2", ethers.parseEther("0.1")); // tokenId 1
      await ticket.createTicket(userAccount1.address, "PRODUCT3", ethers.parseEther("0.1")); // tokenId 2
      await ticket.createTicket(userAccount1.address, "PRODUCT4", ethers.parseEther("0.1")); // tokenId 3
      
      // Test with LOCKED status (NFTStatus.LOCKED = 1)
      await ticket.lockTicket(0, "CENTER1");
      await expect(ticket.lockTicket(0, "CENTER1")).to.be.revertedWithCustomError(
        ticket,
        "InvalidState"
      ).withArgs(0, 1);
      
      // Test with COLLECTOR status (NFTStatus.COLLECTOR = 3)
      await ticket.lockTicket(1, "CENTER1");
      await ticket.useTicket(1);
      await expect(ticket.lockTicket(1, "CENTER1")).to.be.revertedWithCustomError(
        ticket,
        "InvalidState"
      ).withArgs(1, 3);
      
      // Test with EXPIRED status (NFTStatus.EXPIRED = 4)
      await ticket.setExpired(3);
      await expect(ticket.lockTicket(3, "CENTER1")).to.be.revertedWithCustomError(
        ticket,
        "InvalidState"
      ).withArgs(3, 4);
    });

    it("Should exhaustively test checkAndUpdateExpiration", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Case 1: Ticket not expired and limit date not reached - should return false
      const tx1 = await ticket.checkAndUpdateExpiration(0);
      const receipt1 = await tx1.wait();
      expect(receipt1.logs.length).to.equal(0);
      
      // Case 2: Ticket already expired - should return false
      await ticket.setExpired(0);
      const tx2 = await ticket.checkAndUpdateExpiration(0);
      const receipt2 = await tx2.wait();
      expect(receipt2.logs.length).to.equal(0);
      
      // Case 3: Ticket not expired but limit date reached - should return true
      await ticket.createTicket(userAccount1.address, "PRODUCT2", ethers.parseEther("0.1"));
      
      // Get current blockchain timestamp
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestampBefore = blockBefore.timestamp;
      
      // Set limit date close to current time
      await ticket.setLimitDate(1, timestampBefore + 100);
      
      // Advance time past the limit date
      await ethers.provider.send('evm_increaseTime', [200]);
      await ethers.provider.send('evm_mine');
      
      // Check and update expiration should now return true
      const tx3 = await ticket.checkAndUpdateExpiration(1);
      const receipt3 = await tx3.wait();
      
      // Verify event was emitted
      expect(receipt3.logs.length).to.be.greaterThan(0);
      
      // Verify ticket state was updated to EXPIRED
      const updatedTicketInfo = await ticket.getTicketInfo(1);
      expect(updatedTicketInfo.status).to.equal(4); // EXPIRED status
    });

    it("Should test safeTransferFrom functionality", async function () {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      await ticket.connect(userAccount1)["safeTransferFrom(address,address,uint256)"](
        userAccount1.address, 
        userAccount2.address, 
        0
      );
      
      expect(await ticket.ownerOf(0)).to.equal(userAccount2.address);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT2", ethers.parseEther("0.1"));
      
      await ticket.connect(userAccount1)["safeTransferFrom(address,address,uint256,bytes)"](
        userAccount1.address, 
        userAccount2.address, 
        1,
        "0x"
      );
      
      expect(await ticket.ownerOf(1)).to.equal(userAccount2.address);
    });

    it("Should test isApprovedOrOwner directly", async function () {
      const { ticket, owner, userAccount1, userAccount2, userAccount3 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Case 1: Owner
      expect(await ticket.isApprovedOrOwner(userAccount1.address, 0)).to.be.true;
      
      // Case 2: Specifically approved address
      await ticket.connect(userAccount1).approve(userAccount2.address, 0);
      expect(await ticket.isApprovedOrOwner(userAccount2.address, 0)).to.be.true;
      
      // Case 3: Address approved for all tokens
      await ticket.connect(userAccount1).setApprovalForAll(userAccount3.address, true);
      expect(await ticket.isApprovedOrOwner(userAccount3.address, 0)).to.be.true;
      
      // Case 4: Unauthorized address
      expect(await ticket.isApprovedOrOwner(owner.address, 0)).to.be.false;
      
      // Case 5: Zero address (to maximize branch coverage)
      await expect(ticket.isApprovedOrOwner(ethers.ZeroAddress, 0)).to.not.be.reverted;
      expect(await ticket.isApprovedOrOwner(ethers.ZeroAddress, 0)).to.be.false;
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

    it("Should test _update with mint and transfer cases", async function () {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      // Case 1: Mint - checks _update is called with from = address(0)
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      const ticketData = await ticket.getTicketInfo(0);
      expect(ticketData.wallet).to.equal(userAccount1.address);
      
      // Case 2: Transfer - checks _update is called with from != address(0)
      await ticket.connect(userAccount1).transferFrom(userAccount1.address, userAccount2.address, 0);
      
      const updatedTicketData = await ticket.getTicketInfo(0);
      expect(updatedTicketData.wallet).to.equal(userAccount2.address);
    });

    it("Should test modifier ticketExists with invalid token ID", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      
      await expect(ticket.isApprovedOrOwner(ethers.ZeroAddress, 999))
        .to.be.revertedWithCustomError(ticket, "InvalidId")
        .withArgs(999);
    });

    it("Should test modifier onlyAdmin with non-admin", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(ticket.connect(userAccount1).addAdmin(userAccount1.address))
        .to.be.revertedWithCustomError(ticket, "NotAuthorized");
    });
  });

  describe("Role Management", function () {
    it("Should allow DEFAULT_ADMIN to add new admin", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const ADMIN_ROLE = await ticket.ADMIN_ROLE();
      
      expect(await ticket.hasRole(ADMIN_ROLE, userAccount1.address)).to.be.false;
      
      await ticket.addAdmin(userAccount1.address);
      
      expect(await ticket.hasRole(ADMIN_ROLE, userAccount1.address)).to.be.true;
    });
    
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
    
    it("Should allow new admin to perform admin operations", async function () {
      const { ticket, owner, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.addAdmin(userAccount1.address);
      
      // Try creating a ticket with the new admin
      await expect(
        ticket.connect(userAccount1).createTicket(userAccount2.address, "PRODUCT1", ethers.parseEther("0.1"))
      ).not.to.be.reverted;
      
      // Verify the ticket was created
      expect(await ticket.ownerOf(0)).to.equal(userAccount2.address);
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
    
    it("Should return correct tokenURI based on product code", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const productCode = "PRODUCT1";
      const ipfsURI = "ipfs://QmTest123456/image.jpg";
      
      // Créer un ticket avec ce productCode
      await ticket.createTicket(userAccount1.address, productCode, ethers.parseEther("0.1"));
      const tokenId = 0; // Premier token créé
      
      // Définir l'URI pour le productCode
      await ticket.setProductCodeURI(productCode, ipfsURI);
      
      // Vérifier que le tokenURI renvoie l'URI du productCode
      expect(await ticket.tokenURI(tokenId)).to.equal(ipfsURI);
    });
    
    it("Should use default URI when product code has no URI set", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const productCode = "PRODUCT2";
      
      // Créer un ticket avec ce productCode
      await ticket.createTicket(userAccount1.address, productCode, ethers.parseEther("0.1"));
      const tokenId = 0; // Premier token créé
      
      // Vérifier que le tokenURI renvoie l'URI par défaut (baseURI + tokenId)
      // Note: Par défaut dans ERC721, c'est une chaîne vide
      expect(await ticket.tokenURI(tokenId)).to.equal("");
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
    
    it("Should prioritize specific token URI over product code URI", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const productCode = "PRODUCT1";
      const productURI = "ipfs://QmProduct123/metadata.json";
      const specificURI = "ipfs://QmSpecific456/vip_metadata.json";
      
      // Create two tickets with same product code
      await ticket.createTicket(userAccount1.address, productCode, ethers.parseEther("0.1"));
      await ticket.createTicket(userAccount1.address, productCode, ethers.parseEther("0.1"));
      
      // Set product code URI
      await ticket.setProductCodeURI(productCode, productURI);
      
      // Set specific URI only for first token
      await ticket.setTokenURI(0, specificURI);
      
      // Verify first token uses specific URI
      expect(await ticket.tokenURI(0)).to.equal(specificURI);
      
      // Verify second token still uses product URI
      expect(await ticket.tokenURI(1)).to.equal(productURI);
    });
    
    it("Should emit event when setting token URI", async function () {
      const { ticket, owner, userAccount1 } = await loadFixture(deployTicketFixture);
      const productCode = "PRODUCT1";
      const specificURI = "ipfs://QmSpecific456/vip_metadata.json";
      
      // Create a ticket
      await ticket.createTicket(userAccount1.address, productCode, ethers.parseEther("0.1"));
      
      // Set specific token URI and check event
      await expect(ticket.setTokenURI(0, specificURI))
        .to.emit(ticket, "TokenURISet")
        .withArgs(0, specificURI);
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
  });

  describe("Error Messages and Input Validation", function () {
    it("Should provide specific error messages", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(ethers.ZeroAddress, "PRODUCT1", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Invalid address");
      
      await expect(
        ticket.createTicket(userAccount1.address, "", ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Product missing");
    });
  });

  describe("Some other tests", function () {
    it("Should test all branches of supportsInterface", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      
      // ERC165 interface (all ERC-721 implement this)
      expect(await ticket.supportsInterface("0x01ffc9a7")).to.be.true;
      
      // ERC-721
      expect(await ticket.supportsInterface("0x80ac58cd")).to.be.true;
      
      // ERC-721 Metadata
      expect(await ticket.supportsInterface("0x5b5e139f")).to.be.true;
      
      // Random interface ID - should return false
      expect(await ticket.supportsInterface("0x12345678")).to.be.false;
    });
    
    it("Should test tokenURI with different URI scenarios", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      // Create a ticket
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // 1. Default case - check initial token URI
      const initialURI = await ticket.tokenURI(0);
      
      // 2. Set a specific URI for a token
      const specificURI = "ipfs://specificURI";
      await ticket.setTokenURI(0, specificURI);
      expect(await ticket.tokenURI(0)).to.equal(specificURI);
    });
    
    it("Should test all branches in isExpired", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", ethers.parseEther("0.1"));
      
      // Initial state - not expired
      expect(await ticket.isExpired(0)).to.be.false;
      
      // After setting expired
      await ticket.setExpired(0);
      expect(await ticket.isExpired(0)).to.be.true;
      
      // Test with limit date
      await ticket.createTicket(userAccount1.address, "PRODUCT2", ethers.parseEther("0.1"));
      const timestamp = await ethers.provider.getBlock("latest").then(b => b.timestamp);
      await ticket.setLimitDate(1, timestamp + 100);
      expect(await ticket.isExpired(1)).to.be.false;
      
      // Advance time to test limit date branch
      await ethers.provider.send("evm_increaseTime", [200]);
      await ethers.provider.send("evm_mine");
      expect(await ticket.isExpired(1)).to.be.true;
    });
  });
});
