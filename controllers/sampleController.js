const sampleJson = require('../models/sampleJson');

// Helper function to validate 'name' parameter
function isValidName(name) {
    return typeof name === 'string' && name.trim().length > 0;
}

// GET: Fetch the latest data for a given name
exports.getData = async (req, res) => {
    const { name } = req.params;
    if (!isValidName(name)) {
        return res.status(400).json({ message: 'Invalid or missing name parameter' });
    }
    try {
        const data = await sampleJson.find({ name }).sort({ createdAt: -1 });
        if (!data.length) {
            return res.status(404).json({ message: 'No data found for this name' });
        }
        res.status(200).json(data[0].data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST: Save new data for a given name
exports.setData = async (req, res) => {
    const { name } = req.params;
    if (!isValidName(name)) {
        return res.status(400).json({ message: 'Invalid or missing name parameter' });
    }
    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ message: 'Request body cannot be empty' });
    }
    try {
        const newData = new sampleJson({ name, data });
        await newData.save();
        res.status(200).json({ message: 'Data saved successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteData = async (req, res) => {
    const { name } = req.params;
    if (!isValidName(name)) {
        return res.status(400).json({ message: 'Invalid or missing name parameter' });
    }
    try {
        const deletedData = await sampleJson.deleteMany({ name });
        res.status(200).json({ message: 'Data deleted successfully', deletedData });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};