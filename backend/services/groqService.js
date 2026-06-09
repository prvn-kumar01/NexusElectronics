const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' }); // Fallback to avoid crash if env is missing during init
const MODEL = 'llama3-8b-8192';

async function generateSeoDescription(productName, originalDescription, category) {
    if (!process.env.GROQ_API_KEY) return null;
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert e-commerce SEO copywriter. Write a short, engaging, 2-sentence marketing blurb for the given product. Make it punchy and highlight its value proposition.'
                },
                {
                    role: 'user',
                    content: `Product Name: ${productName}\nCategory: ${category}\nDescription: ${originalDescription}`
                }
            ],
            model: MODEL,
            temperature: 0.7,
            max_tokens: 150,
        });
        return completion.choices[0]?.message?.content?.trim();
    } catch (error) {
        console.error('Groq generateSeoDescription failed:', error);
        return null;
    }
}

async function summarizeReviews(reviews) {
    if (!process.env.GROQ_API_KEY || !reviews || reviews.length === 0) return null;
    
    const reviewTexts = reviews.map(r => `Rating: ${r.rating}/5 - ${r.comment}`).join('\n');
    
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are an AI that summarizes customer reviews. Read the following reviews and provide a concise summary with a bulleted list of "Pros" and "Cons". Keep it very short.'
                },
                {
                    role: 'user',
                    content: `Here are the reviews:\n${reviewTexts}`
                }
            ],
            model: MODEL,
            temperature: 0.5,
            max_tokens: 300,
        });
        return completion.choices[0]?.message?.content?.trim();
    } catch (error) {
        console.error('Groq summarizeReviews failed:', error);
        return null;
    }
}

async function recommendBundleCategories(productName, category) {
    if (!process.env.GROQ_API_KEY) return [];
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are an e-commerce bundling expert. Given a product name and its category, output a comma-separated list of exactly 3 other product categories or keywords that would perfectly complement it as accessories. Do NOT include the original category. Output ONLY the comma-separated categories, nothing else.'
                },
                {
                    role: 'user',
                    content: `Product Name: ${productName}\nCategory: ${category}`
                }
            ],
            model: MODEL,
            temperature: 0.3,
            max_tokens: 50,
        });
        const categoriesText = completion.choices[0]?.message?.content?.trim();
        if (!categoriesText) return [];
        return categoriesText.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    } catch (error) {
        console.error('Groq recommendBundleCategories failed:', error);
        return [];
    }
}

module.exports = {
    generateSeoDescription,
    summarizeReviews,
    recommendBundleCategories
};
