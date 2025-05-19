/**
 * PDF Parser - Extracts questions from PDF files
 */
const PDFParser = {
    /**
     * Parse a PDF file and extract questions
     * @param {File} file - The PDF file to parse
     * @returns {Promise<Array>} - Array of question objects
     */
    async parse(file) {
        try {
            // Set up PDF.js worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
            
            // Load the PDF file
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // Extract text from all pages
            const numPages = pdf.numPages;
            let fullText = '';
            
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            // Parse the text to extract questions
            return this.extractQuestionsFromText(fullText);
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw new Error(`Failed to parse PDF: ${error.message}`);
        }
    },
    
    /**
     * Extract questions from text content
     * @param {string} text - The text content from the PDF
     * @returns {Array} - Array of question objects
     */
    extractQuestionsFromText(text) {
        const questions = [];
        
        // Try different patterns to identify questions
        
        // Pattern 1: Question number followed by text, then options A, B, C, D
        // This is a simplified pattern and may need adjustment based on actual PDF format
        const questionPattern = /(\d+)[\.)\s]+([^\n]+)(?:\n|\r\n?)+(?:[Aa][\.)\s]+)([^\n]+)(?:\n|\r\n?)+(?:[Bb][\.)\s]+)([^\n]+)(?:\n|\r\n?)+(?:[Cc][\.)\s]+)([^\n]+)(?:\n|\r\n?)+(?:[Dd][\.)\s]+)([^\n]+)/g;
        
        let match;
        while ((match = questionPattern.exec(text)) !== null) {
            const [, num, questionText, optionA, optionB, optionC, optionD] = match;
            
            // Look for the answer and explanation after this question
            const answerPattern = new RegExp(`Answer(?:\\s*for)?\\s*(?:question)?\\s*${num}[\.:\\s]+([A-Da-d])`, 'i');
            const answerMatch = text.substring(match.index + match[0].length).match(answerPattern);
            
            const explanationPattern = new RegExp(`Explanation(?:\\s*for)?\\s*(?:question)?\\s*${num}[\.:\\s]+([^\\n]+)`, 'i');
            const explanationMatch = text.substring(match.index + match[0].length).match(explanationPattern);
            
            // Map the answer letter to index
            let correctAnswer = 0; // Default to A if not found
            if (answerMatch) {
                const answerLetter = answerMatch[1].toUpperCase();
                if (answerLetter === 'A') correctAnswer = 0;
                else if (answerLetter === 'B') correctAnswer = 1;
                else if (answerLetter === 'C') correctAnswer = 2;
                else if (answerLetter === 'D') correctAnswer = 3;
            }
            
            questions.push({
                text: questionText.trim(),
                options: [
                    optionA.trim(),
                    optionB.trim(),
                    optionC.trim(),
                    optionD.trim()
                ],
                correctAnswer,
                explanation: explanationMatch ? explanationMatch[1].trim() : '',
                userAnswer: null
            });
        }
        
        // If no questions found with the first pattern, try a more lenient pattern
        if (questions.length === 0) {
            // Look for numbered questions
            const sections = text.split(/\s*\d+\.\s+/).filter(Boolean);
            
            sections.forEach((section, index) => {
                // Try to identify options with A., B., C., D. pattern
                const optionMatches = section.match(/[A-D]\.\s+([^\n]+)/g);
                
                if (optionMatches && optionMatches.length >= 4) {
                    const questionText = section.substring(0, section.indexOf(optionMatches[0])).trim();
                    
                    const options = optionMatches.slice(0, 4).map(opt => 
                        opt.replace(/^[A-D]\.\s+/, '').trim()
                    );
                    
                    // Look for answer indication
                    const answerMatch = section.match(/(?:answer|correct)[^A-D]*(A|B|C|D)/i);
                    let correctAnswer = 0;
                    
                    if (answerMatch) {
                        const answerLetter = answerMatch[1].toUpperCase();
                        correctAnswer = 'ABCD'.indexOf(answerLetter);
                    }
                    
                    // Look for explanation
                    const explanationMatch = section.match(/explanation[^:]*:([^$]+)/i);
                    const explanation = explanationMatch ? explanationMatch[1].trim() : '';
                    
                    questions.push({
                        text: questionText,
                        options,
                        correctAnswer,
                        explanation,
                        userAnswer: null
                    });
                }
            });
        }
        
        return questions;
    }
};
