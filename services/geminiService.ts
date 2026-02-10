
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

/**
 * Utility to convert YYYY-MM-DD to DD-MMM-YYYY (e.g., 10-Feb-2026)
 */
const formatAppDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(month, 10) - 1;
  return `${day}-${months[mIdx]}-${year}`;
};

export const generateDailySummary = async (tasks: Task[]): Promise<string> => {
  if (tasks.length === 0) return "No tasks logged for this date.";

  // Initialize AI client inside the function using process.env.API_KEY directly as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const logDateFormatted = formatAppDate(tasks[0].logDate);
  const taskListString = tasks.map(t => {
    let taskStr = `- [${t.status}] ${t.title} (${t.priority} Priority)`;
    if (t.dueDate) taskStr += ` | Completion Target: ${formatAppDate(t.dueDate)}`;
    if (t.blocker) taskStr += ` | BLOCKED BY: ${t.blocker}`;
    if (t.description) taskStr += ` | Details: ${t.description}`;
    return taskStr;
  }).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze the following daily work tasks for the date: ${logDateFormatted}. 
        Provide a professional summary suitable for a manager's end-of-day report or a stand-up meeting.
        
        Logged Tasks:
        ${taskListString}
        
        The summary MUST use the date format DD-MMM-YYYY (e.g. 10-Feb-2026) whenever referencing dates.
        The summary should be structured as follows:
        1. **Daily Overview**: A concise summary of overall progress for ${logDateFormatted}.
        2. **Key Accomplishments**: Highlight specific tasks marked 'DONE'.
        3. **Blocked Items & Dependencies**: List anything marked as 'BLOCKED BY' and suggest who needs to follow up.
        4. **Upcoming Deadlines**: Note tasks with completion targets (Due dates) that are approaching.
        5. **Plan for Next Day**: Suggest the most logical next steps based on 'TODO' or 'IN_PROGRESS' items.
        
        Maintain a professional, proactive, and clear tone.
      `,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Failed to generate summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Error occurred while generating the AI summary. Please check your API configuration.";
  }
};
