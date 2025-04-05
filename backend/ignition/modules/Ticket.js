// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const fs = require('fs');
const path = require('path');

module.exports = buildModule("TicketModule", (m) => {
  // Deploy the Ticket contract
  const ticket = m.contract("Ticket");

  // Function to load metadata mapping
  function loadMetadataMapping() {
    try {
      const metadataPath = path.join(__dirname, '../../../pinata/metadata-mapping.json');
      if (fs.existsSync(metadataPath)) {
        return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } else {
        console.warn("metadata-mapping.json file not found. Metadata will not be configured.");
        return null;
      }
    } catch (error) {
      console.error("Error loading metadata mapping:", error);
      return null;
    }
  }

  // Load metadata
  const metadata = loadMetadataMapping();
  
  // Configure global collection URI if available
  if (metadata && metadata.collection) {
    m.call(ticket, "setGlobalMetadataURI", [metadata.collection], { id: "setGlobalMetadataURI" });
  }
  
  // Configure product code URIs if available
  if (metadata && metadata.products && Object.keys(metadata.products).length > 0) {
    for (const [productCode, uri] of Object.entries(metadata.products)) {
      m.call(ticket, "setProductCodeURI", [productCode, uri], { id: `setProductCodeURI_${productCode}` });
    }
  }

  // Add admin wallets to deployment
  const adminWallets = [
    "0xE00D2d335DC4108e3C05181d9aD0Ee1c52f11a43", //C
    "0x386DCEF30EF8037b5576269C59A290c100CdE64d", //T
    "0x2FD28518e52CF0Fd7b81c8841677606a83dd0A19", //A
  ];
  
  // Add each admin to the contract
  for (const [index, adminWallet] of adminWallets.entries()) {
    m.call(ticket, "addAdmin", [adminWallet], { id: `addAdmin_${index}` });
    console.log(`Admin wallet added: ${adminWallet}`);
  }

  return { ticket };
});
