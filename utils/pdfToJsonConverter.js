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

    const prompt = "You are a helpful assistant that extracts text from a pdf and converts it to json. Do not hallucinate any information. Do not include any other information in the json. Extract only the text that is present in the pdf. The json should be using the following keys: summary, objectives, proposed_solution, deliverables, project_plan_tech_stack, timeline, risk_assessment, budget_estimate, team_details, certifications_awards, case_studies, past_projects, partnership_overview, references_proven_results, why_us, terms_conditions, cover_letter";

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: prompt },
            { role: "user", content: text }
        ],
        temperature: 0.0,
        max_tokens: 1024
    });

    return completion.choices[0].message.content;
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