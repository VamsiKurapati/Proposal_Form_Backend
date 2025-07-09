require('dotenv').config();

const MatchedRFP = require('../models/MatchedRFP');

exports.getUserandRFPData = async (req, res) => {
    try {
        const email = "vamsi@draconx.com";

        // Step 1: Fetch all proposals and limit to 1
        const RFP = await MatchedRFP.find({ email: email }).sort({ createdAt: -1 });
        if (!RFP || RFP.length === 0) {
            return res.status(404).json({ message: "No proposals found for this user." });
        }

        const data = {
            user: {
                email: email,
                // Include any other user-related data you need
            },
            rfp: RFP[0] // Get the first proposal
        };

    } catch (error) {
        console.error("Error fetching user and RFP data:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

// exports.getGeneratedProposal = async (req, res) => {
//     try {
//         const email = "vamsi@draconx.com";

//         // Step 1: Fetch user and RFP data
//         const userAndRFPData = await exports.getUserandRFPData(req, res);
//         if (!userAndRFPData) {
//             return res.status(404).json({ message: "User or RFP not found." });
//         }

//         // Step 2: Generate proposal using ML model
//         const generatedProposal = await generateProposal(userAndRFPData);
//         if (!generatedProposal) {
//             return res.status(500).json({ message: "Failed to generate proposal." });
//         }

//         // Step 3: Return the generated proposal
//         return res.status(200).json({ proposal: generatedProposal });

//     } catch (error) {
//         console.error("Error generating proposal:", error);
//         return res.status(500).json({ message: "Internal server error." });
//     }
// };