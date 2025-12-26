

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export async function generateTitleForImage(data: string, effect: string = 'none'): Promise<string> {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        console.warn("API_KEY environment variable not set. Skipping title generation.");
        return "クリエイティブな作品";
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        let response: GenerateContentResponse;
        if (effect === 'ascii') {
            const systemInstruction = "あなたはアスキーアートアニメーションのための短くて印象的なタイトルを考える詩人です。タイトルのみを日本語で答えてください。引用符は使用しないでください。";
            // Send a snippet of the ASCII art to the AI
            const textPart = { text: `このアスキーアートアニメーションに良いタイトルをつけてください。 \n\n${data.substring(0, 800)}` };
            
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
                text: `この画像に良いタイトルをつけてください。 '${effect}' というエフェクトが適用されています。`
            };
            
            let systemInstruction = "あなたは画像に対して短くてエレガントなタイトルをつける創造的な詩人です。タイトルはパラパラ漫画に適したものにしてください。タイトルのみを日本語で答えてください。引用符は使用しないでください。";
            
            if(effect === 'ukiyo-e') {
                systemInstruction = "あなたは日本美術の専門家です。この浮世絵風の画像に、短くて詩的なタイトルをつけてください。タイトルのみを日本語で答えてください。引用符は使用しないでください。";
            } else if (effect === 'genga' || effect === 'cel' || effect === 'pencil') {
                systemInstruction = "あなたはアニメーションスタジオのクリエイティブディレクターです。このラフスケッチ風のアニメーションに、短くて印象的なタイトルをつけてください。タイトルのみを日本語で答えてください。引用符は使用しないでください。";
            } else if (effect === '8bit') {
                systemInstruction = "あなたはレトロゲームのデザイナーです。このピクセルアート風のアニメーションに、8ビットゲームのような短くてレトロなタイトルをつけてください。タイトルのみを日本語で答えてください。引用符は使用しないでください。";
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
        return effect === 'ascii' ? "アスキーアートアニメーション" : "動きのある瞬間";
    }
}