

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export async function generateTitleForImage(data: string, effect: string = 'none'): Promise<string> {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        console.warn("API_KEY environment variable not set. Skipping title generation.");
        return "A Creative Flipbook";
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        let response: GenerateContentResponse;
        if (effect === 'ascii') {
            const systemInstruction = "You are a tech-savvy poet who creates short, evocative titles for ASCII art animations. Respond with only the title, nothing else. Do not use quotation marks.";
            // Send a snippet of the ASCII art to the AI
            const textPart = { text: `What is a good title for this ASCII art animation? \n\n${data.substring(0, 800)}` };
            
            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [textPart] },
                config: { systemInstruction }
            });

        } else {
            const imagePart = {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: data,
                },
            };
            const textPart = {
                text: `What is a good title for this image? It has a '${effect}' effect applied.`
            };
            
            let systemInstruction = "You are a creative poet who creates short, elegant titles for images. The titles should be suitable for a flipbook. Respond with only the title, nothing else. Do not use quotation marks.";
            
            if(effect === 'ukiyo-e') {
                systemInstruction = "You are an expert in Japanese art. Create a short, poetic title for this image, which is in the style of Ukiyo-e. Respond with only the title, nothing else. Do not use quotation marks.";
            } else if (effect === 'genga' || effect === 'cel' || effect === 'pencil') {
                systemInstruction = "You are a creative director for an animation studio. Create a short, evocative title for this animated sketch. Respond with only the title, nothing else. Do not use quotation marks.";
            } else if (effect === '8bit') {
                systemInstruction = "You are a classic video game designer. Create a short, retro-style title for this pixelated animation, like for an 8-bit game. Respond with only the title, nothing else. Do not use quotation marks.";
            }

            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
                config: { systemInstruction }
            });
        }
        
        const title = response.text.trim();
        return title.replace(/["'*]/g, '');

    } catch (error) {
        console.error("Error generating title with Gemini:", error);
        return effect === 'ascii' ? "An ASCII Animation" : "A Moment in Motion";
    }
}