import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import adminRouter from "./routes/adminRoute.js";
import axios from "axios"; // For Gemini API calls

// App config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// Middlewares
app.use(express.json());
app.use(cors());

// API Endpoints
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);

// AI Chatbot Route using Gemini
app.post("/api/chat", async (req, res) => {
    try {
        const { message } = req.body;

        const prompt = `
You are a helpful AI health assistant.
Respond in clear and concise bullet points, not long paragraphs.
Use simple language that's easy to understand.
Avoid lengthy descriptions.
Use emojis where appropriate for friendliness.

User: ${message}
`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        res.json({ reply });
    } catch (error) {
        console.error("Error fetching Gemini AI response:", error.response?.data || error);
        res.status(500).json({ error: "Failed to fetch AI response" });
    }
});


// Default Route
app.get("/", (req, res) => {
    res.send("API Working");
});

// Start Server
app.listen(port, () => console.log(`Server started on PORT:${port}`));
