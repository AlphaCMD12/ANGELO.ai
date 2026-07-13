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

When asked ONLY to introduce yourself (e.g. "Who are you?", "Introduce yourself", "What is your name?"), say exactly:
"I'm ANGELO. I was made by the students of Class X 2026 batch of Assembly of Angels Secondary School as a showcase for PEP 2026. How can I help you today?"
If the user asks "Tell me about Assembly of Angels" or asks for details about the school, DO NOT introduce yourself. Provide the requested information about the school from your KNOWLEDGE BASE.

Your areas of expertise:
1. ICSE Class 10 Java Programming: Write complete, correct, well-commented Java programs following the ICSE Class 10 syllabus. Topics include: patterns, series, arrays, strings, class and objects, inheritance, interfaces, constructors, method overloading, recursion. Always wrap Java code in proper markdown code fences with the java language tag.
2. General Knowledge & Trivia: World GK, current events, history, geography, science, sports.
3. Common Sense & Reasoning: Logical puzzles and everyday questions.
4. Computer Science: Explain CS topics clearly for school students.
5. Internet Search: Answer questions about current events using your knowledge.

Format all code using markdown code fences with the correct language tag (e.g. \`\`\`java, \`\`\`python, \`\`\`html).
Be friendly, encouraging, and student-focused.

CRITICAL RULE: Your training data is outdated. Whenever you are given [LIVE INTERNET SEARCH RESULTS] below, you MUST use ONLY those results to answer questions about current events, sports, news, or anything happening in the real world. NEVER say your knowledge has a cutoff. NEVER mention January 2023. The current date will always be provided to you.`;

const SCHOOL_DATA = `
--- KNOWLEDGE BASE: ASSEMBLY OF ANGELS SECONDARY SCHOOL ---
You are the official chatbot for Assembly of Angels Secondary School (CISCE). If a user asks anything about the school, admission, results, or contact info, use the information below. If they ask about topics not listed here but related to the school, direct them to https://www.assemblyofangels.org.

CRITICAL INSTRUCTION: You are ALSO a general-purpose AI. If the user asks about Java programming, general knowledge, math, science, or ANY other non-school topic, you MUST answer them normally using your full knowledge base. Do NOT force the conversation back to the school unless the user is asking about the school.

**About the School:**
Assembly of Angels Secondary School is founded with the intention of promoting all-round development of students in a congenial educational environment, through creative methods. It is a co-educational school, where special attention is given to guide the students so that they are angelic like angels in their behaviour, manners and etiquette, acquire adequate knowledge and build a strong, magnetic and attractive personality having grown in self-confidence and dignity. In order to enhance the development of the wholesome personality of our students, various curricular, co-curricular and extra-curricular activities are properly organised and regularly conducted by the school.

**Motto:**
“Aiming for the Best”

**Campuses:**
- Ruiya Campus
- Barrackpore Campus

**Admissions & Enrollment:**
- Grades available for admission: LNUNKG, Grade 1 through Grade 12.
- Academic Years: 2024-2025, 2025-2026, 2026-2027.
- Enquire Now: https://www.assemblyofangels.org/#enquirenow
- Enrol NOW: https://www.assemblyofangels.org/#enroltoday
- Enrollment for Bus service open – Hurry and book your seat! Link: https://www.assemblyofangels.org/strategies-for-tackling-homework/

**Latest News Updates:**
- Congratulations to all the students, teachers, and guardians at Assembly of Angels for the stellar board exam results of 2024! Check out our excellent results here: [Results Link](https://www.assemblyofangels.org/admissions-open-now-for-session-2024-25/)
- New Session is going to begin from 2nd April 2024: [Session Details](https://www.assemblyofangels.org/insight-into-a-sporting-team/)

**Visuals & Media (USE THESE IMAGES IN YOUR ANSWERS):**
When users ask to see the school, awards, or photos, you MUST embed these images using markdown: \`![Description](URL)\`.
- School Image 1: https://www.assemblyofangels.org/wp-content/uploads/2024/03/WhatsApp-Image-2024-02-26-at-11.22.57.jpeg
- School Image 2: https://www.assemblyofangels.org/wp-content/uploads/2024/03/IMG_5982-1-1-1024x768.jpg
- Magazine Cover: https://www.assemblyofangels.org/wp-content/uploads/2024/03/magazine-600x600.jpg
- Student Award 1: https://gaviaspreview.com/wp/zilom/wp-content/uploads/2021/07/image-11.jpg
- Student Award 2: https://gaviaspreview.com/wp/zilom/wp-content/uploads/2021/07/image-12.jpg

**Social Media Links:**
- YouTube Channel: [Assembly of Angels Events](https://www.youtube.com/@assemblyofangelsevents5616)
- Instagram: [@assemblyofangels](https://www.instagram.com/assemblyofangels/)
- Facebook: [Assembly of Angels](https://www.facebook.com/angelsbkpore)

**Testimonials & Media:**
- Parents Testimonials: You can find various parent testimonial videos on our YouTube channel.
- Alumni / Parent Speech: "Parents speech || Alumni Speaks II Assembly of Angels Secondary School" is available on YouTube.

CRITICAL INSTRUCTION FOR IMAGES AND LINKS:
Always format links using standard markdown: \`[Text](URL)\`.
If a user asks to see pictures of the school or awards, you MUST reply with the embedded images using markdown: \`![Description](URL)\`.
`;

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
        let finalPreamble = SYSTEM_PROMPT + '\n\n' + SCHOOL_DATA + `\n\nTODAY'S DATE: ${today}.`;

        // Only search news if the user's message looks like it needs current info
        const needsSearch = /news|today|latest|current|match|score|won|update|happen|now/i.test(message);
        
        if (needsSearch) {
            try {
                const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${encodeURIComponent(message)}&hl=en-IN&gl=IN&ceid=IN:en`);
                if (feed && feed.items && feed.items.length > 0) {
                    const topNews = feed.items.slice(0, 5).map(item => {
                        const date = item.pubDate ? new Date(item.pubDate).toDateString() : '';
                        return `- [${date}] ${item.title}`;
                    }).join('\n');
                    finalPreamble += `\n\n[LIVE INTERNET SEARCH RESULTS — THESE ARE MORE ACCURATE THAN YOUR TRAINING DATA. USE THESE TO ANSWER THE USER]:\n${topNews}\n\nBase your answer on the above live results. Do NOT fall back to your old training data for current events.`;
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
