const fs = require("fs");
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
require("dotenv").config();

async function extractPdfText(filePathOrBuffer) {
    let buffer;

    // Check if it's a file path (string) or buffer
    if (typeof filePathOrBuffer === 'string') {
        // It's a file path, read from filesystem
        buffer = fs.readFileSync(filePathOrBuffer);
    } else if (Buffer.isBuffer(filePathOrBuffer)) {
        // It's already a buffer
        buffer = filePathOrBuffer;
    } else {
        throw new Error('Invalid input: expected file path (string) or buffer');
    }

    const data = await pdfParse(buffer);
    return data.text;
}

async function convertPdfToJson(text) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = "You are a helpful assistant that extracts text from a pdf and converts it to json. Do not hallucinate any information. Do not include any other information in the json. Extract only the text that is present in the pdf. The json should be using the following keys: summary, objectives, proposed_solution, deliverables, project_plan_tech_stack, timeline, risk_assessment, budget_estimate, team_details, certifications_awards, case_studies, past_projects, partnership_overview, references_proven_results, why_us, terms_conditions, cover_letter. If a section is not found in the document, use 'Text not found' as the value. Return ONLY a valid JSON object with no other text, no markdown formatting, no code blocks, and no additional explanation.";

    const completion = await openai.chat.completions.create({
        model: "gpt-5o",
        messages: [
            { role: "system", content: prompt },
            { role: "user", content: text }
        ],
        temperature: 0.0,
        max_tokens: 4096
    });

    let jsonResponse = completion.choices[0].message.content;

    // Clean up the response - remove markdown formatting if present
    jsonResponse = jsonResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Attempt to parse the JSON to ensure it's valid
    try {
        const parsedJson = JSON.parse(jsonResponse);
        return JSON.stringify(parsedJson, null, 2); // Return formatted JSON string
    } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        console.error("Raw response:", jsonResponse);
        throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}`);
    }
}

//Function to accept the pdf buffer and return the json
exports.convertPdfToJsonBuffer = async (pdfBuffer) => {
    try {
        const pdfText = await extractPdfText(pdfBuffer);
        const json = await convertPdfToJson(pdfText);
        return json;
    } catch (err) {
        console.error("Error:", err);
        throw err;
    }
};

exports.convertPdfToJsonFile = async (pdfFile) => {
    try {
        const pdfText = await extractPdfText(pdfFile);
        const json = await convertPdfToJson(pdfText);
        return json;
    } catch (err) {
        console.error("Error:", err);
        throw err;
    }
};