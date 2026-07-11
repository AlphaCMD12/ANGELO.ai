require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Readable } = require('stream');
const Parser = require('rss-parser');
const parser = new Parser();

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

        let finalPreamble = SYSTEM_PROMPT;

        // Free real-time web search via Google News RSS
        if (message && message.match(/\b(today|now|latest|news|match|matches|score|won|lost|recently|who is|what is|when|how)\b/i)) {
            try {
                const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(message)}`);
                if (feed && feed.items && feed.items.length > 0) {
                    const topNews = feed.items.slice(0, 5).map(item => `- ${item.title}`).join('\n');
                    finalPreamble += `\n\n[LATEST LIVE INTERNET SEARCH RESULTS FOR THIS QUERY]:\n${topNews}\n\nUse this real-time information to answer the user if applicable.`;
                }
            } catch (searchErr) {
                console.error("Search error:", searchErr.message);
            }
        }

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
                preamble: finalPreamble,
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
