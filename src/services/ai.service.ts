import OpenAI from 'openai';
import { logger } from '@middleware/logger';

class AIService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      console.warn('⚠️  OpenAI not configured - OPENAI_API_KEY missing. AI generation will return mock content.');
      return;
    }

    const isOpenRouter = apiKey.startsWith('sk-or-');

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
    });
  }

  async generateText(prompt: string, systemPrompt: string = 'You are a helpful AI assistant for a blog platform.'): Promise<string> {
    // Return mock content if OpenAI is not configured
    if (!this.openai) {
      logger.info('Returning mock AI content - OPENAI_API_KEY not configured');
      return this.generateMockContent(prompt);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        model: 'gpt-3.5-turbo', // Standard model, widely supported
      });

      return completion.choices[0].message.content || '';
    } catch (error: any) {
      logger.error('AI Service Error:', error);
      
      // Provide specific error messages based on error type
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service is currently unavailable. Please try again later.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to OpenAI API. Please check your internet connection.');
      } else if (error.message?.includes('model')) {
        throw new Error('The requested AI model is not available. Please contact support.');
      }
      
      throw new Error('Failed to generate AI content: ' + (error.message || 'Unknown error'));
    }
  }

  private generateMockContent(prompt: string): string {
    return `# ${prompt}

## Introduction

This is AI-generated content based on your prompt: "${prompt}". 

## Main Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Key Points

- Point 1: Comprehensive analysis of the topic
- Point 2: Practical insights and best practices
- Point 3: Real-world applications and examples

## Conclusion

In conclusion, this blog post provides valuable insights into ${prompt}. The concepts discussed can be applied to real-world scenarios.

---

**Note:** This is mock content generated because OPENAI_API_KEY is not configured. To enable real AI generation, please add your OpenAI API key to the .env file.`;
  }

  async generateBlogIdeas(topic: string): Promise<string[]> {
    const prompt = `Generate 5 creative blog post titles about "${topic}". Return only the titles as a JSON array string.`;
    const response = await this.generateText(prompt, 'You are a creative blog assistant. Output JSON only.');
    
    try {
        // Attempt to parse just in case, though we return string primarily
        // This is just a helper method example
        return JSON.parse(response);
    } catch (e) {
        return response.split('\n').filter(line => line.trim().length > 0);
    }
  }
  async searchImage(query: string, count: number = 1): Promise<string[]> {
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    const fallbackImage = `https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80`;

    if (!unsplashKey) {
      logger.info('Returning placeholder image - Unsplash Access Key not configured');
      return Array(count).fill(fallbackImage);
    }

    try {
      const axios = (await import('axios')).default;
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        headers: {
          Authorization: `Client-ID ${unsplashKey}`
        },
        params: {
          query: query,
          per_page: count,
          orientation: 'landscape'
        }
      });

      const items = response.data.results;
      if (items && items.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return items.map((item: any) => item.urls.regular);
      }

      return Array(count).fill(fallbackImage);
    } catch (error) {
      logger.error('Unsplash Image Search Error:', error);
      return Array(count).fill(fallbackImage);
    }
  }
}

export const aiService = new AIService();
