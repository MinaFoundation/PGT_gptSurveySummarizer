import { apikey } from "@config";
import { responseMeaningfullnessPrompt } from "src/prompts";

export async function isMeaningful(response) {
    if (!response || !response.trim()) {
        return false;
    }

    const trimmedResponse = response.trim();
    const lowerResponse = trimmedResponse.toLowerCase();

    const singleWordUnqualified = [
        'maybe', 'no comment', 'no answer', 'i don’t know', 'i don\'t know', 'not sure',
        'good', 'fine', 'yes', 'no', 'n/a', 'whatever', 'nothing', 'okay', 'interesting'
    ];

    const placeholderTexts = ['lorem ipsum', 'test', 'testing', '123', 'abc'];

    const irrelevantAnswers = ['n/a', 'don\'t know', 'no comment', 'whatever', 'not applicable', 'nothing'];

    const unrelatedTopics = ['pizza', 'holiday', 'car'];

    const jokesSarcasm = ['who cares?', 'ask someone else', 'only if pigs fly'];

    const incompleteAnswers = ['because', 'i think', 'depends'];

    const repetitiveLettersPattern = /(.)\1{3,}/i; // Repeated letters
    const repetitiveWordsPattern = /\b(\w+)\b(?:.*\b\1\b)+/i; // Repeated words

    if (singleWordUnqualified.includes(lowerResponse)) {
        return false;
    }

    for (const placeholder of placeholderTexts) {
        if (lowerResponse.includes(placeholder)) {
            return false;
        }
    }

    if (irrelevantAnswers.includes(lowerResponse)) {
        return false;
    }

    for (const topic of unrelatedTopics) {
        if (lowerResponse.includes(topic)) {
            return false;
        }
    }

    for (const joke of jokesSarcasm) {
        if (lowerResponse.includes(joke)) {
            return false;
        }
    }

    if (incompleteAnswers.includes(lowerResponse)) {
        return false;
    }

    if (repetitiveLettersPattern.test(response)) {
        return false;
    }

    if (repetitiveWordsPattern.test(lowerResponse)) {
        return false;
    }


    
}
