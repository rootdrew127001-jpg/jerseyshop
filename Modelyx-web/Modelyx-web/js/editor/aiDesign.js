


export async function getAISuggestion(teamName) {
    const prompt = `You are a professional sports jersey designer. Generate a creative jersey design for a team called "${teamName}". Respond ONLY with a valid JSON object, no markdown, no backticks, no extra text. Use this exact structure: {"baseColor":"#hexcode","accentColor":"#hexcode","pattern":"none","teamName":"SHORTNAME","number":"23","reasoning":"one sentence"} Pattern must be one of: none, stripes, diagonal, panel, gradient`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Claude API error:', JSON.stringify(data, null, 2));
            return null;
        }

        const text = data.content[0].text.trim();
        console.log('AI raw response:', text);
        return JSON.parse(text);

    } catch (err) {
        console.error('AI suggestion failed:', err);
        return null;
    }
}
