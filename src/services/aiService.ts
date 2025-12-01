import Groq from "groq-sdk";

export interface AIProcessRequest {
  description: string;
  columnCount: number;
  columnNames: string[];
}

export interface AIProcessResponse {
  rows: (string | number)[][];
  isData: boolean;
  message: string;
}

export interface AITransformRequest {
  operation: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export interface AITransformResponse {
  headers: string[];
  rows: (string | number | null)[][];
  newColumns: string[];
  message: string;
}

// Initialize Groq Client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true, // Required for localhost usage
});

export class AIService {
  static async processDescription(request: AIProcessRequest): Promise<AIProcessResponse> {
    try {
      const prompt = `
        You are an AI Excel generator. 
        Generate ${request.columnCount} columns of data based on this description: "${request.description}".
        The columns should correspond to: ${request.columnNames.join(", ")}.
        
        Return ONLY valid JSON with this structure:
        {
          "rows": [["value1", "value2"], ["value3", "value4"]],
          "isData": true,
          "message": "Brief description of what was generated"
        }
        Do not include markdown formatting like \`\`\`json. Just the raw JSON string.
      `;

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile", // Updated model
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No content received from AI");

      return JSON.parse(content);
    } catch (error) {
      console.error("AI Error:", error);
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  static async transformData(request: AITransformRequest): Promise<AITransformResponse> {
    try {
      // Limit rows to prevent token overflow if the sheet is huge
      const dataContext = JSON.stringify({
        headers: request.headers,
        rows: request.rows.slice(0, 50) // Send first 50 rows for context
      });

      const prompt = `
        You are an AI Excel editor. 
        Current Data (First 50 rows): ${dataContext}
        
        Instruction: "${request.operation}"
        
        Apply the instruction to the data. If a formula is needed, calculate the result directly.
        If adding a column, include the new header in "headers" and values in "rows".
        
        Return ONLY valid JSON with this structure:
        {
          "headers": ["Col1", "Col2"],
          "rows": [["val1", "val2"], ["val3", "val4"]],
          "newColumns": ["NameOfNewColumnIfAny"],
          "message": "Brief description of what was done"
        }
        Ensure "rows" contains ALL the rows provided in the input, updated accordingly.
      `;

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile", // Updated model
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("No content received from AI");

      return JSON.parse(content);
    } catch (error) {
      console.error("AI Error:", error);
      throw new Error(`AI transformation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}