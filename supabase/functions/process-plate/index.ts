import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers are CRITICAL so your React frontend doesn't get blocked
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight request from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Grab the payload sent from your React app
    const { imageUrl, availableMenu } = await req.json()

    if (!imageUrl || !availableMenu) {
      throw new Error("Missing imageUrl or availableMenu")
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

    // 3. The highly-constrained AI Prompt
    const systemPrompt = `
      You are an expert sports nutritionist and vision AI. Look at the image of the Indian hostel mess food plate.
      You must identify the items on the plate ONLY from this allowed list of today's menu: ${availableMenu.join(", ")}.
      Estimate the serving size (e.g., 1 for a standard bowl/piece, 0.5 for a half portion, 2 for a double portion).
      Output STRICTLY valid JSON with no markdown formatting.
      Schema: {"logged_items": [{"item": "Exact Name from Menu", "servings": number}]}
    `

    // 4. Hit Groq's Vision Model (llama-3.2-11b-vision-preview)
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", "content": systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", "text": "Analyze this plate and return the JSON." },
              { type: "image_url", "image_url": { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.1, // Keep it low for robotic accuracy
        response_format: { type: "json_object" }
      })
    })

    const groqData = await groqResponse.json()
    const aiResult = JSON.parse(groqData.choices[0].message.content)

    // 5. Send the clean JSON back to React
    return new Response(JSON.stringify(aiResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})