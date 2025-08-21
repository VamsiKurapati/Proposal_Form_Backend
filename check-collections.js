require('dotenv').config();
const mongoose = require('mongoose');

const checkCollections = async () => {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to database!");

        const db = mongoose.connection.db;

        // Get all collection names
        const collections = await db.listCollections().toArray();
        console.log("\n=== All Collections in Database ===");
        collections.forEach(col => {
            console.log(`- ${col.name}`);
        });

        // Check specific GridFS buckets
        console.log("\n=== GridFS Buckets ===");

        // Check uploads bucket
        try {
            const uploadsFiles = await db.collection('uploads.files').countDocuments();
            const uploadsChunks = await db.collection('uploads.chunks').countDocuments();
            console.log(`uploads bucket: ${uploadsFiles} files, ${uploadsChunks} chunks`);
        } catch (e) {
            console.log("uploads bucket: Not found");
        }

        // Check template_images bucket
        try {
            const templateFiles = await db.collection('template_images.files').countDocuments();
            const templateChunks = await db.collection('template_images.chunks').countDocuments();
            console.log(`template_images bucket: ${templateFiles} files, ${templateChunks} chunks`);

            // Show details of template files if they exist
            if (templateFiles > 0) {
                console.log("\n=== Template Images Files ===");
                const files = await db.collection('template_images.files').find({}).toArray();
                files.forEach((file, index) => {
                    console.log(`${index + 1}. Filename: ${file.filename}`);
                    console.log(`   Original Name: ${file.metadata?.originalname || 'N/A'}`);
                    console.log(`   Upload Date: ${file.uploadDate}`);
                    console.log(`   File ID: ${file._id}`);
                    console.log(`   Size: ${file.length} bytes`);
                    console.log(`   Content Type: ${file.contentType || 'N/A'}`);
                    console.log('   ---');
                });
            }
        } catch (e) {
            console.log("template_images bucket: Not found");
        }

        // Check cloud_images bucket
        try {
            const cloudFiles = await db.collection('cloud_images.files').countDocuments();
            const cloudChunks = await db.collection('cloud_images.chunks').countDocuments();
            console.log(`cloud_images bucket: ${cloudFiles} files, ${cloudChunks} chunks`);
        } catch (e) {
            console.log("cloud_images bucket: Not found");
        }

        // Check regular collections
        console.log("\n=== Regular Collections ===");
        const regularCollections = collections.filter(col => !col.name.includes('.'));
        regularCollections.forEach(col => {
            console.log(`- ${col.name}`);
        });

        await mongoose.disconnect();
        console.log("\nDisconnected from database");

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkCollections();
