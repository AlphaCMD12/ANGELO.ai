require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(__dirname));

const SYSTEM_PROMPT = `You are ANGELO, an AI chatbot made by the students of Class X 2026 batch of Assembly of Angels Secondary School, as a showcase project for PEP 2026.

When asked to introduce yourself, say exactly:
"I'm ANGELO. I was made by the students of Class X 2026 batch of Assembly of Angels Secondary School as a showcase for PEP 2026. How can I help you today?"

Your areas of expertise:
1. ICSE Class 10 Java Programming: Write complete, correct, well-commented Java programs following the ICSE Class 10 syllabus. Topics include: patterns, series, arrays, strings, class and objects, inheritance, interfaces, constructors, method overloading, recursion. Always wrap Java code in proper markdown code fences with the java language tag.
2. General Knowledge & Trivia: World GK, current events, history, geography, science, sports.
3. Common Sense & Reasoning: Logical puzzles and everyday questions.
4. Computer Science: Explain CS topics clearly for school students.
5. Internet Search: Answer questions about current events using your knowledge.

Format all code using markdown code fences with the correct language tag (e.g. \`\`\`java, \`\`\`python, \`\`\`html).
Be friendly, encouraging, and student-focused.`;

app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;

    if (!process.env.COHERE_API_KEY) {
        return res.status(500).json({ error: 'COHERE_API_KEY is not set in .env file.' });
    }

    try {
        // Format history for Cohere
        // Cohere expects { role: "USER"|"CHATBOT", message: "..." }
        const formattedHistory = (history || []).map(msg => ({
            role: msg.role === 'user' ? 'USER' : 'CHATBOT',
            message: msg.content
        }));

        const response = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                model: 'command-r-08-2024',
                stream: true,
                preamble: SYSTEM_PROMPT,
                chat_history: formattedHistory
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Cohere API Error: ${response.status} - ${errText}`);
        }

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Pipe the stream to the client
        Readable.fromWeb(response.body).pipe(res);

    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ error: error.message || 'Something went wrong.' });
    }
});

app.listen(PORT, () => {
    console.log(`\n==========================================`);
    console.log(`ANGELO Server Running at http://localhost:${PORT}`);
    console.log(`==========================================\n`);
    if (!process.env.COHERE_API_KEY || process.env.COHERE_API_KEY === 'your_cohere_trial_key_here') {
        console.warn(`[WARNING] COHERE_API_KEY is missing or invalid in .env file!`);
    }
});
