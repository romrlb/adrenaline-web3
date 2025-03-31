require('dotenv').config();
const key = process.env.PINATA_KEY;
const secret = process.env.PINATA_SECRET;
const fs = require('fs');
const path = require('path');
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK({ pinataApiKey: key, pinataSecretApiKey: secret });

// Global collection metadata configuration
const collectionMetadata = {
    name: "Adrenaline Ticket Collection",
    description: "Collection de tickets pour activités à sensations fortes",
    image: "",
};

// Metadata configuration by productCode
const productMetadata = {
    "P01T01": {
        name: "Saut en parachute tandem",
        description: "Ticket pour un saut en parachute tandem",
        image: "", 
    },
    "P01T02": {
        name: "Saut en parachute tandem + vidéo",
        description: "Ticket pour un saut en parachute tandem avec vidéo souvenir",
        image: "",
    },
    "P01T03": {
        name: "Saut en parachute tandem VIP",
        description: "Ticket VIP pour un saut en parachute tandem avec prestations premium",
        image: "",
    }
};

// Token-specific metadata configuration by tokenId
const tokenMetadata = {
};

// Function to find an image file with any extension
function findImageFile(basePath, baseName) {
    const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    
    for (const ext of supportedExtensions) {
        const filePath = `${basePath}/${baseName}.${ext}`;
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    
    return null;
}

async function uploadImage(filePath, name) {
    try {
        const readableStreamForFile = fs.createReadStream(filePath);
        const options = {
            pinataMetadata: {
                name: name
            }
        };
        const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
        console.log(`Uploaded ${name}: ${result.IpfsHash}`);
        return `ipfs://${result.IpfsHash}`;
    } catch (error) {
        console.error(`Error uploading ${name}:`, error);
        throw error;
    }
}

async function uploadImages() {
    const imagesDir = path.join(__dirname, 'images');
    const imageHashes = {};

    // Check if images directory exists
    if (!fs.existsSync(imagesDir)) {
        console.warn(`Images directory ${imagesDir} does not exist. Creating directory...`);
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Upload collection image
    const collectionImagePath = findImageFile(imagesDir, 'collection');
    if (collectionImagePath) {
        collectionMetadata.image = await uploadImage(collectionImagePath, 'collection-image');
    } else {
        console.warn("Collection image not found. Image URI will remain empty.");
    }

    // Upload images by productCode
    for (const productCode of Object.keys(productMetadata)) {
        const imagePath = findImageFile(imagesDir, productCode);
        if (imagePath) {
            imageHashes[productCode] = await uploadImage(imagePath, `${productCode}-image`);
            productMetadata[productCode].image = imageHashes[productCode];
        } else {
            console.warn(`Image for ${productCode} not found. Image URI will remain empty.`);
        }
    }

    // Upload token-specific images
    for (const tokenId of Object.keys(tokenMetadata)) {
        const imagePath = findImageFile(imagesDir, `token-${tokenId}`);
        if (imagePath) {
            imageHashes[`token-${tokenId}`] = await uploadImage(imagePath, `token-${tokenId}-image`);
            tokenMetadata[tokenId].image = imageHashes[`token-${tokenId}`];
        } else {
            console.warn(`Image for token ${tokenId} not found. Image URI will remain empty.`);
        }
    }

    return imageHashes;
}

async function uploadMetadata() {
    try {
        // 1. Upload all images
        await uploadImages();

        // 2. Upload metadata by productCode
        const productURIs = {};
        for (const [productCode, metadata] of Object.entries(productMetadata)) {
            const result = await pinata.pinJSONToIPFS(metadata, {
                pinataMetadata: { name: `${productCode}-metadata` }
            });
            productURIs[productCode] = `ipfs://${result.IpfsHash}`;
            console.log(`Uploaded metadata for ${productCode}: ${result.IpfsHash}`);
        }

        // 3. Upload token-specific metadata
        const tokenURIs = {};
        for (const [tokenId, metadata] of Object.entries(tokenMetadata)) {
            const result = await pinata.pinJSONToIPFS(metadata, {
                pinataMetadata: { name: `token-${tokenId}-metadata` }
            });
            tokenURIs[tokenId] = `ipfs://${result.IpfsHash}`;
            console.log(`Uploaded metadata for token ${tokenId}: ${result.IpfsHash}`);
        }

        // 4. Upload collection metadata
        const collectionResult = await pinata.pinJSONToIPFS(collectionMetadata, {
            pinataMetadata: { name: "collection-metadata" }
        });
        console.log(`Collection metadata uploaded: ${collectionResult.IpfsHash}`);

        // 5. Create a mapping file for future reference
        const mapping = {
            collection: `ipfs://${collectionResult.IpfsHash}`,
            products: productURIs,
            tokens: tokenURIs
        };

        // Save mapping to a local file
        fs.writeFileSync(
            path.join(__dirname, 'metadata-mapping.json'),
            JSON.stringify(mapping, null, 2)
        );

        return mapping;
    } catch (error) {
        console.error("Error in uploadMetadata:", error);
        throw error;
    }
}

// Execute the script
uploadMetadata()
    .then(mapping => {
        console.log("\nDeployment completed successfully!");
        console.log("\nURIs to use in the contract:");
        console.log("Collection URI:", mapping.collection);
        console.log("\nProduct URIs:");
        Object.entries(mapping.products).forEach(([productCode, uri]) => {
            console.log(`${productCode}:`, uri);
        });
        console.log("\nToken-specific URIs:");
        Object.entries(mapping.tokens).forEach(([tokenId, uri]) => {
            console.log(`Token ${tokenId}:`, uri);
        });
    })
    .catch(error => {
        console.error("Error during deployment:", error);
    });