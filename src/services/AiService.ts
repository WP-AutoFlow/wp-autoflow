import axios from 'axios';
import { settingsService } from './SettingsService';
import { logger } from '../utils/logger';
interface PromptTemplates {
    title: string;
    content: string;
}

const SYSTEM_PROMPTS: Record<'pt' | 'en', PromptTemplates> = {
    pt: {
        title: `
            Você é um editor chefe especialista em SEO e Copywriting.
            Sua tarefa é reescrever títulos de notícias para torná-los únicos e atraentes.
            
            REGRAS OBRIGATÓRIAS:
            1. O idioma de saída DEVE ser Português do Brasil (PT-BR).
            2. Mantenha os nomes de pessoas e lugares inalterados, exceto se instruído o contrário.
            3. Não use aspas no retorno.
            4. Responda APENAS com o novo título.
        `,
        content: `
            Você é um assistente de edição web especializado em reescrita de artigos.
            Você receberá um conteúdo em formato HTML.
            
            REGRAS RÍGIDAS DE SEGURANÇA HTML:
            1. Você deve reescrever o texto visível para torná-lo original (evitar plágio).
            2. VOCÊ ESTÁ PROIBIDO DE REMOVER TAGS HTML ESTRUTURAIS (<p>, <h2>, <ul>, etc).
            3. VOCÊ ESTÁ PROIBIDO DE ALTERAR TAGS <img src="...">. Mantenha-as EXATAMENTE onde estão.
            4. O idioma de saída DEVE ser Português do Brasil.
            5. Retorne APENAS o HTML reescrito, sem introduções.
        `
    },
    en: {
        title: `
            You are an editor-in-chief specializing in SEO and Copywriting.
            Your task is to rewrite news headlines to make them unique and engaging.
            
            MANDATORY RULES:
            1. The output language MUST be English (US).
            2. Keep names of people and places unchanged unless instructed otherwise.
            3. Do not use quotation marks in the output.
            4. Reply ONLY with the new title.
        `,
        content: `
            You are a web editing assistant specializing in article rewriting.
            You will receive content in HTML format.
            
            STRICT HTML SAFETY RULES:
            1. You must rewrite the visible text to make it original (avoid plagiarism).
            2. YOU ARE FORBIDDEN FROM REMOVING STRUCTURAL HTML TAGS (<p>, <h2>, <ul>, etc).
            3. YOU ARE FORBIDDEN FROM ALTERING <img src="..."> TAGS. Keep them EXACTLY where they are.
            4. The output language MUST be English.
            5. Return ONLY the rewritten HTML, with no introductions.
        `
    }
};

export class AiService {

    private static async callLlm(messages: any[], settings: any, maxTokens = 1000) {
        if (!settings.ai.enabled || !settings.ai.apiKey) return null;

        const baseUrl = settings.ai.baseUrl || 'https://api.openai.com/v1';
        const model = settings.ai.model || 'gpt-5-mini';

        try {
            const { data } = await axios.post(`${baseUrl}/chat/completions`, {
                model: model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${settings.ai.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return data?.choices[0]?.message?.content || null;
        } catch (error: any) {
            logger.error(`Erro AI (${model}): ${error.response?.data?.error?.message || error.message}`);
            return null;
        }
    }

    static async rewriteTitle(originalTitle: string): Promise<string> {
        const settings = await settingsService.getSettings();
        if (!settings.ai.enabled) return originalTitle;

        const lang: 'pt' | 'en' = (settings.ai.language === 'en') ? 'en' : 'pt';
        const basePrompt = SYSTEM_PROMPTS[lang].title;

        const systemPrompt = `
            ${basePrompt}
            
            USER INSTRUCTIONS:
            ${settings.ai.titlePrompt || ''}
        `;

        const newTitle = await this.callLlm([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Original Title: "${originalTitle}"` }
        ], settings, 200);

        return newTitle ? newTitle.replace(/^"|"$/g, '') : originalTitle;
    }

    static async rewriteContent(htmlContent: string, internalLinks: any[] = []): Promise<string> {
        const settings = await settingsService.getSettings();

        if (!settings.ai.enabled || !settings.ai.rewriteContent) return htmlContent;

        const lang: 'pt' | 'en' = (settings.ai.language === 'en') ? 'en' : 'pt';
        const basePrompt = SYSTEM_PROMPTS[lang].content;

        let linksPrompt = '';
        if (settings.seo?.linkBuildingEnabled && internalLinks.length > 0) {
            const linksList = internalLinks.map(l => `- Título: "${l.title}" | URL: ${l.link}`).join('\n');

            if (lang === 'pt') {
                linksPrompt = `
                TAREFA DE SEO (Link Building):
                Se o contexto permitir NATURALMENTE, insira links para 1 ou 2 destes artigos abaixo.
                Use o título ou palavras-chave relacionadas como texto âncora.
                ${linksList}`;
            } else {
                linksPrompt = `
                SEO TASK (Internal Linking):
                If context allows NATURALLY, insert links to 1 or 2 of these articles.
                Use the title or related keywords as anchor text.
                ${linksList}`;
            }
        }

        const systemPrompt = `
            ${basePrompt}
            
            TONE: ${settings.ai.contentTone || 'Neutral'}
            
            ${linksPrompt}

            USER INSTRUCTIONS:
            ${settings.ai.contentPrompt || ''}
        `;

        const result = await this.callLlm([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: htmlContent }
        ], settings, 4000);

        return result || htmlContent;
    }
}