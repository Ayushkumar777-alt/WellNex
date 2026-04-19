import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in .env! Backend AI will throw errors if used.");
}
const genAI = new GoogleGenerativeAI(apiKey || 'dummy_key_to_prevent_crash');

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    try {
        const { message, context, userProfile } = req.body;
        
        if (!apiKey || apiKey === 'dummy_key_to_prevent_crash') {
            return res.json({ reply: "Please add your GEMINI_API_KEY to the .env file in your project folder to activate your consultant. Don't forget to restart the server afterward!" });
        }
        
        let instructions = "You are an expert AI Men's Health Consultant named WellNex. Your expertise covers fitness workouts, nutrition and diet planning, and mental well-being for men. Be professional, motivating, encouraging, and provide scientifically sound, actionable advice. Format your output strictly in markdown.";
        
        // Append user specific data if present
        if (userProfile) {
            instructions += `\n\n--- User Profile Data ---\n`;
            if (userProfile.age) instructions += `- Age: ${userProfile.age}\n`;
            if (userProfile.weight) instructions += `- Weight: ${userProfile.weight}\n`;
            if (userProfile.height) instructions += `- Height: ${userProfile.height}\n`;
            if (userProfile.goal) instructions += `- Primary Goal: ${userProfile.goal}\n`;
            if (userProfile.activity) instructions += `- Activity Level: ${userProfile.activity}\n`;
            instructions += `\nCRITICAL: Personalize all your following responses specifically to these metrics and goals.\n`;
        }
        
        if (context === 'fitness') {
            instructions += " The user is currently asking for FITNESS/WORKOUT specific advice.";
        } else if (context === 'nutrition') {
            instructions += " The user is currently asking for NUTRITION/DIET specific advice.";
        } else if (context === 'mental_health') {
            instructions += " The user is currently asking for MENTAL HEALTH/WELLNESS specific advice. Be empathetic, grounded, and supportive.";
        }
        
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: instructions,
        });

        const result = await model.generateContent(message);
        const response = await result.response;
        const text = response.text();
        
        res.json({ reply: text });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to fetch response from AI." });
    }
});

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

export default app;
