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
Be friendly, encouraging, and student-focused.

CRITICAL RULE: Your training data is outdated. Whenever you are given [LIVE INTERNET SEARCH RESULTS] below, you MUST use ONLY those results to answer questions about current events, sports, news, or anything happening in the real world. NEVER say your knowledge has a cutoff. NEVER mention January 2023. The current date will always be provided to you.`;

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

        // Always inject today's date so the model knows what time it is
        const today = new Date().toLocaleDateString('en-GB', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        let finalPreamble = SYSTEM_PROMPT + `\n\nTODAY'S DATE: ${today}.`;

        // Free real-time web search via Google News RSS — trigger on ALL messages
        // so the model always has fresh context
        try {
            const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(message)}&hl=en-IN&gl=IN&ceid=IN:en`);
            if (feed && feed.items && feed.items.length > 0) {
                const topNews = feed.items.slice(0, 8).map(item => {
                    const date = item.pubDate ? new Date(item.pubDate).toDateString() : '';
                    return `- [${date}] ${item.title}`;
                }).join('\n');
                finalPreamble += `\n\n[LIVE INTERNET SEARCH RESULTS — THESE ARE MORE ACCURATE THAN YOUR TRAINING DATA. USE THESE TO ANSWER THE USER]:\n${topNews}\n\nBase your answer on the above live results. Do NOT fall back to your old training data for current events.`;
            }
        } catch (searchErr) {
            console.error("Search error:", searchErr.message);
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
