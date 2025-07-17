const express = require('express');
const sampleJson = require('../models/sampleJson');

exports.getData = async (req, res) => {
    try {
        const data = await sampleJson.find({ name: req.params.name }).sort({ createdAt: -1 });
        res.status(200).json(data[0].data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.setData = async (req, res) => {
    try {
        const data = req.body;
        const newData = new sampleJson({ name: req.params.name, data: data });
        await newData.save();
        res.status(200).json({ message: 'Data saved successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};