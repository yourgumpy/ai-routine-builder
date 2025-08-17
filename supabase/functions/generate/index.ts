import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, image } = await req.json();
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Prepare the messages for Gemini API
    const messages = [
      {
        role: "system",
        content: `You are an expert routine designer and wellness coach. Create comprehensive, practical routines based on user requests. Always respond with a valid JSON object in this exact format:

{
  "title": "A compelling title for the routine",
  "description": "A brief description of what this routine achieves",
  "steps": [
    {
      "step": 1,
      "action": "Specific action to take",
      "duration": "Time estimate (optional)",
      "notes": "Additional tips or context (optional)"
    }
  ]
}

Make routines practical, achievable, and tailored to the user's needs. Include realistic time estimates and helpful tips.`
      },
      {
        role: "user",
        content: image ? 
          `Create a routine based on this description: "${prompt}". I've also included an image for additional context.` :
          `Create a routine based on this description: "${prompt}"`
      }
    ];

    // If image is provided, we'll include it in the content (Gemini supports vision)
    if (image) {
      // For simplicity, we'll just include the text description for now
      // In a full implementation, you'd convert the base64 image and send it to Gemini's vision model
      messages[1].content += "\n\nNote: Image context has been provided for additional guidance.";
    }

    // Call Gemini API using OpenAI-compatible endpoint
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${geminiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash-exp',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from Gemini API');
    }

    // Parse the JSON response from Gemini
    let routineData;
    try {
      // Extract JSON from the response (handle potential markdown formatting)
      const jsonMatch = generatedContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       generatedContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        routineData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        routineData = JSON.parse(generatedContent);
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Generated Content:', generatedContent);
      
      // Fallback routine if parsing fails
      routineData = {
        title: "Custom Routine",
        description: "A personalized routine based on your request",
        steps: [
          {
            step: 1,
            action: "Start with the basics outlined in your request",
            duration: "Variable",
            notes: "Generated content could not be parsed properly"
          }
        ]
      };
    }

    return new Response(
      JSON.stringify({ routine: routineData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in generate function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate routine',
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});