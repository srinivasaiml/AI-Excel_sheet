import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessRequest {
  type: 'generate' | 'transform';
  description?: string;
  columnCount?: number;
  columnNames?: string[];
  operation?: string;
  headers?: string[];
  rows?: (string | number | null)[][];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: ProcessRequest = await req.json();
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: "Groq API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let prompt = '';

    if (body.type === 'generate') {
      prompt = `You are an Excel data generator.

Column names: ${body.columnNames?.join(", ") || "N/A"}
Number of columns: ${body.columnCount || 0}

User's request: "${body.description}"

Your task:
1. If the user pasted data, parse it and return it as a JSON array of rows
2. If the user described a task, generate realistic sample data based on the description
3. Ensure each row has exactly ${body.columnCount} columns
4. Return ONLY valid JSON in this format:
{
  "rows": [["value1", "value2", ...], ["value1", "value2", ...]],
  "isData": true/false,
  "message": "Brief explanation"
}

IMPORTANT: Return ONLY the JSON, no other text.`;
    } else if (body.type === 'transform') {
      let currentData = '';
      if (body.rows && body.headers) {
        currentData = body.rows.map((r, idx) => {
          const rowStr = body.headers?.map((h, i) => `${h}=${r[i]}`).join(', ');
          return `Row ${idx + 1}: ${rowStr}`;
        }).join('\n');
      }

      prompt = `You are an Excel data transformation assistant.

Current data structure:
Headers: ${body.headers?.join(", ")}

Current rows:
\`\`\`
${currentData}
\`\`\`

User's instruction: "${body.operation}"

Your task:
1. Parse the instruction and apply the transformation
2. Return modified rows with any new columns added
3. For formulas like "Price × 0.10", calculate actual values
4. For conditions like "where Age > 18", evaluate and fill appropriately
5. Return ONLY valid JSON in this format:
{
  "headers": ["Header1", "Header2", ..., "NewHeader"],
  "rows": [["val1", "val2", ..., "newVal"], ...],
  "newColumns": ["NewHeader"],
  "message": "Description of changes made"
}

IMPORTANT: Return ONLY the JSON, no other text.`;
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
       model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.text();
      return new Response(
        JSON.stringify({ error: "Groq API error", details: error }),
        {
          status: groqResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices[0].message.content;

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Could not parse AI response" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
