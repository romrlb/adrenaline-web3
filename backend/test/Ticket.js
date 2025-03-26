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
        ticket.connect(userAccount1).createTicket(userAccount1.address, "PRODUCT1", "Test Activity")
      ).to.be.revertedWithCustomError(ticket, "NotAuthorized");
      
      await expect(
        ticket.createTicket(userAccount1.address, "PRODUCT1", "Test Activity")
      ).not.to.be.reverted;
    });

    it("Should lock a ticket correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(1); // LOCKED
      expect(ticketData.centerCode).to.equal("CENTER1");
    });

    it("Should unlock a ticket correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      await ticket.unlockTicket(0, "CENTER1");
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(0); // AVAILABLE
      expect(ticketData.centerCode).to.equal("000000"); // Default code
    });

    it("Should use a ticket correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      await ticket.useTicket(0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(3); // COLLECTOR
    });

    it("Should reject creating ticket with zero address", async function () {
      const { ticket } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(ethers.ZeroAddress, "PRODUCT1", "Activity")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject creating ticket with empty product code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(userAccount1.address, "", "Activity")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject creating ticket with empty activity description", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(userAccount1.address, "PRODUCT1", "")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });
  });

  describe("Expiration and Date Management", function () {
    it("Should prevent marking an already expired ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.setExpired(0);
      
      await expect(
        ticket.setExpired(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should auto-expire a ticket when limit date is reached", async function() {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity1");
      
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
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      
      const now = Math.floor(Date.now() / 1000);
      const pastDate = now - 3600; // -1 hour
      
      await expect(
        ticket.setReservationDate(0, pastDate)
      ).to.be.revertedWithCustomError(ticket, "DateError");
    });
  });

  describe("Marketplace Functionality", function () {
    it("Should reject putting non-existent ticket for sale", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.connect(userAccount1).putForSale(99)
      ).to.be.reverted;
    });

    it("Should reject putting ticket for sale by non-owner", async function () {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      
      await expect(
        ticket.connect(userAccount2).putForSale(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject buying non-existent ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.connect(userAccount1).buyTicket(99)
      ).to.be.reverted;
    });
  });

  describe("State Validation and Error Cases", function () {
    it("Should reject locking with an empty center code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      
      await expect(
        ticket.lockTicket(0, "")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject locking a non-AVAILABLE ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.lockTicket(0, "CENTER1")
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should reject unlocking with an empty center code", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.unlockTicket(0, "")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput");
    });

    it("Should reject unlocking with a different center", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.unlockTicket(0, "CENTER2")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Center not matching");
    });

    it("Should reject unlocking a non-LOCKED ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      
      await expect(
        ticket.unlockTicket(0, "CENTER1")
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should reject using a non-LOCKED ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      
      await expect(
        ticket.useTicket(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should reject operations on expired tickets", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      
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
      
      await expect(
        ticket.connect(userAccount1).putForSale(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
      
      await expect(
        ticket.buyTicket(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });
  });

  describe("Additional Test Cases", function () {
    it("Should cover reservation date after limit date case", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
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
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
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
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      
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
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      
      const past = Math.floor(Date.now() / 1000) - 100;
      await expect(
        ticket.setLimitDate(0, past)
      ).to.be.revertedWithCustomError(ticket, "DateError")
       .withArgs(past, "In past");
    });
    
    it("Should test all branches of buyTicket function", async function () {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity1");
      await ticket.connect(userAccount1).putForSale(0);
      
      await expect(ticket.connect(userAccount1).buyTicket(0))
        .to.be.revertedWithCustomError(ticket, "InvalidInput");
      
      await ticket.connect(userAccount2).buyTicket(0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(0); // AVAILABLE
      
      await expect(ticket.connect(userAccount1).buyTicket(0))
        .to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should cover checkAndUpdateExpiration branches", async function() {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity1");
      await ticket.setExpired(0);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT2", "Activity2");
      
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

    it("Should test putForSale for an AVAILABLE ticket", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.connect(userAccount1).putForSale(0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(2); // ON_SALE
    });

    it("Should test putForSale for a COLLECTOR ticket", async function () {
      const { ticket, userAccount1, owner } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      await ticket.useTicket(0);
      
      await ticket.connect(userAccount1).putForSale(0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(2); // ON_SALE
    });

    it("Should test putForSale for a LOCKED ticket (should fail)", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.lockTicket(0, "CENTER1");
      
      await expect(
        ticket.connect(userAccount1).putForSale(0)
      ).to.be.revertedWithCustomError(ticket, "InvalidState");
    });

    it("Should transfer ownership correctly through buying a ticket", async function () {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.connect(userAccount1).putForSale(0);
      
      await ticket.connect(userAccount2).buyTicket(0);
      
      expect(await ticket.ownerOf(0)).to.equal(userAccount2.address);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.wallet).to.equal(userAccount2.address);
      expect(ticketData.status).to.equal(0); // AVAILABLE
      expect(ticketData.centerCode).to.equal("000000"); // Default center code
    });

    it("Should check approval mechanisms for ticket operations", async function () {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.connect(userAccount1).approve(userAccount2.address, 0);
      
      await ticket.connect(userAccount2).putForSale(0);
      
      const ticketData = await ticket.tickets(0);
      expect(ticketData.status).to.equal(2); // ON_SALE
    });

    it("Should test _isApprovedOrOwner internal function branches", async function () {
      const { ticket, userAccount1, userAccount2, userAccount3 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      await ticket.connect(userAccount1).approve(userAccount2.address, 0);
      
      await ticket.connect(userAccount2).putForSale(0);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT2", "Activity2");
      await ticket.connect(userAccount1).setApprovalForAll(userAccount3.address, true);
      
      await ticket.connect(userAccount3).putForSale(1);
    });

    it("Should test ERC721 functionalities", async function () {
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity");
      
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
        ticket.createTicket(ethers.ZeroAddress, "PRODUCT1", "Activity")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Invalid address");
      
      await expect(
        ticket.createTicket(userAccount1.address, "", "Activity")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Product missing");
      
      await expect(
        ticket.createTicket(userAccount1.address, "PRODUCT1", "")
      ).to.be.revertedWithCustomError(ticket, "InvalidInput").withArgs("Activity missing");
    });

    it("Should verify the ticket token counter increments correctly", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity1");
      await ticket.createTicket(userAccount1.address, "PRODUCT2", "Activity2");
      await ticket.createTicket(userAccount1.address, "PRODUCT3", "Activity3");
      
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
      const { ticket, userAccount1, userAccount2 } = await loadFixture(deployTicketFixture);
      
      await expect(
        ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity")
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
      
      await ticket.createTicket(userAccount1.address, "PRODUCT2", "Activity");
      
      await expect(
        ticket.connect(userAccount1).putForSale(1)
      ).to.emit(ticket, "TicketForSale")
        .withArgs(1);
      
      await expect(
        ticket.connect(userAccount2).buyTicket(1)
      ).to.emit(ticket, "TicketSold")
        .withArgs(1, userAccount2.address);
      
      await expect(
        ticket.setExpired(1)
      ).to.emit(ticket, "TicketExpired")
        .withArgs(1);
    });

    it("Should test all status branches in lockTicket function", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      // Create tickets for different tests
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity1"); // tokenId 0
      await ticket.createTicket(userAccount1.address, "PRODUCT2", "Activity2"); // tokenId 1
      await ticket.createTicket(userAccount1.address, "PRODUCT3", "Activity3"); // tokenId 2
      await ticket.createTicket(userAccount1.address, "PRODUCT4", "Activity4"); // tokenId 3
      
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
      
      // Test with ON_SALE status (NFTStatus.ON_SALE = 2)
      await ticket.connect(userAccount1).putForSale(2);
      await expect(ticket.lockTicket(2, "CENTER1")).to.be.revertedWithCustomError(
        ticket,
        "InvalidState"
      ).withArgs(2, 2);
      
      // Test with EXPIRED status (NFTStatus.EXPIRED = 4)
      await ticket.setExpired(3);
      await expect(ticket.lockTicket(3, "CENTER1")).to.be.revertedWithCustomError(
        ticket,
        "InvalidState"
      ).withArgs(3, 4);
    });

    it("Should exhaustively test checkAndUpdateExpiration", async function () {
      const { ticket, userAccount1 } = await loadFixture(deployTicketFixture);
      
      await ticket.createTicket(userAccount1.address, "PRODUCT1", "Activity1");
      
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
      await ticket.createTicket(userAccount1.address, "PRODUCT2", "Activity2");
      
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestampBefore = blockBefore.timestamp;
      
      await ticket.setLimitDate(1, timestampBefore + 100);
      
      await ethers.provider.send('evm_increaseTime', [200]);
      await ethers.provider.send('evm_mine');
      
      const tx3 = await ticket.checkAndUpdateExpiration(1);
      const receipt3 = await tx3.wait();
      
      expect(receipt3.logs.length).to.be.greaterThan(0);
      
      const updatedTicketInfo = await ticket.getTicketInfo(1);
      expect(updatedTicketInfo.status).to.equal(4); // EXPIRED status
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
        ticket.connect(userAccount1).createTicket(userAccount2.address, "PRODUCT1", "Activity")
      ).not.to.be.reverted;
      
      // Verify the ticket was created
      expect(await ticket.ownerOf(0)).to.equal(userAccount2.address);
    });
  });
});
