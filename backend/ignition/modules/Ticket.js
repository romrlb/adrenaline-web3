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

  return { ticket };
});
