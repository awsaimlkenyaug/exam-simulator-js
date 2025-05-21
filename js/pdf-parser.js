/**
 * Enhanced PDF Parser - Extracts questions from PDF files with improved pattern recognition
 */
const PDFParser = {
    /**
     * Parse a PDF file and extract questions
     * @param {File} file - The PDF file to parse
     * @returns {Promise<Array>} - Array of question objects
     */
    async parse(file) {
        try {
            console.log('Starting to parse PDF file:', file.name);
            
            // Set up PDF.js worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
            
            // Load the PDF file
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            // Extract text from all pages with better formatting preservation
            const numPages = pdf.numPages;
            let fullText = '';
            let pageTexts = [];
            
            console.log(`PDF has ${numPages} pages`);
            
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // Preserve more formatting by considering item positions
                let lastY = null;
                let pageText = '';
                
                for (const item of textContent.items) {
                    if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                        // New line if Y position changes significantly
                        pageText += '\n';
                    }
                    pageText += item.str;
                    lastY = item.transform[5];
                }
                
                pageTexts.push(pageText);
                fullText += pageText + '\n\n';
            }
            
            console.log('Text extraction complete');
            
            // Try multiple parsing strategies
            let questions = [];
            
            // Strategy 1: Try to parse using standard question patterns
            questions = this.extractQuestionsFromText(fullText);
            
            // If that didn't work, try page-by-page parsing
            if (questions.length === 0) {
                console.log('Standard parsing failed, trying page-by-page parsing');
                for (const pageText of pageTexts) {
                    const pageQuestions = this.extractQuestionsFromText(pageText);
                    questions = questions.concat(pageQuestions);
                }
            }
            
            // If still no questions, try more lenient parsing
            if (questions.length === 0) {
                console.log('Trying lenient parsing');
                questions = this.extractQuestionsLenient(fullText);
            }
            
            console.log(`Found ${questions.length} questions`);
            
            if (questions.length === 0) {
                // If all parsing strategies fail, create a sample question with debugging info
                questions = [{
                    text: "Could not parse questions from this PDF. Please check the format.",
                    options: [
                        "The PDF might have a non-standard format",
                        "Text extraction might be incomplete",
                        "Try a different PDF or format",
                        "Contact support for assistance"
                    ],
                    correctAnswer: 0,
                    explanation: "PDF parsing failed. Please check the console for more details.",
                    userAnswer: null
                }];
                
                // Log a sample of the extracted text for debugging
                console.log('Sample of extracted text:', fullText.substring(0, 500));
            }
            
            return questions;
        } catch (error) {
            console.error('Error parsing PDF:', error);
            throw new Error(`Failed to parse PDF: ${error.message}`);
        }
    },
    
    /**
     * Extract questions from text content using multiple patterns
     * @param {string} text - The text content from the PDF
     * @returns {Array} - Array of question objects
     */
    extractQuestionsFromText(text) {
        const questions = [];
        
        // Try multiple patterns to identify questions
        
        // Pattern 1: Question number followed by text, then options A, B, C, D
        const questionPattern1 = /(\d+)[\.)\s]+([^\n]+)(?:\n|\r\n?)+(?:[Aa][\.)\s]+)([^\n]+)(?:\n|\r\n?)+(?:[Bb][\.)\s]+)([^\n]+)(?:\n|\r\n?)+(?:[Cc][\.)\s]+)([^\n]+)(?:\n|\r\n?)+(?:[Dd][\.)\s]+)([^\n]+)/g;
        
        // Pattern 2: More flexible pattern with options that might span multiple lines
        const questionPattern2 = /(?:Question|Q)[\s\.:]?(\d+)[\.\s:]+([\s\S]+?)(?=(?:[Aa][\.\s:]+))([\s\S]+?)(?=(?:[Bb][\.\s:]+))([\s\S]+?)(?=(?:[Cc][\.\s:]+))([\s\S]+?)(?=(?:[Dd][\.\s:]+))([\s\S]+?)(?=(?:(?:Question|Q)[\s\.:]?\d+|Answer|Correct|$))/gi;
        
        // Try first pattern
        let match;
        while ((match = questionPattern1.exec(text)) !== null) {
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
        
        // If no questions found with first pattern, try second pattern
        if (questions.length === 0) {
            while ((match = questionPattern2.exec(text)) !== null) {
                const [, num, questionText, optionA, optionB, optionC, optionD] = match;
                
                // Clean up options (remove A., B., etc.)
                const cleanOptionA = optionA.replace(/^[Aa][\.\s:]+/, '').trim();
                const cleanOptionB = optionB.replace(/^[Bb][\.\s:]+/, '').trim();
                const cleanOptionC = optionC.replace(/^[Cc][\.\s:]+/, '').trim();
                const cleanOptionD = optionD.replace(/^[Dd][\.\s:]+/, '').trim();
                
                // Look for answer indication
                const answerPattern = new RegExp(`(?:Answer|Correct)(?:\\s*for)?\\s*(?:question)?\\s*${num}[\.:\\s]+([A-Da-d])`, 'i');
                const answerMatch = text.match(answerPattern);
                
                let correctAnswer = 0;
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
                        cleanOptionA,
                        cleanOptionB,
                        cleanOptionC,
                        cleanOptionD
                    ],
                    correctAnswer,
                    explanation: '',
                    userAnswer: null
                });
            }
        }
        
        return questions;
    },
    
    /**
     * Extract questions using a more lenient approach
     * @param {string} text - The text content from the PDF
     * @returns {Array} - Array of question objects
     */
    extractQuestionsLenient(text) {
        const questions = [];
        
        // Split by potential question indicators
        const sections = text.split(/(?:\n|\r\n?)+(?:\d+\.|\(?[0-9]+\)|\bQuestion\s+\d+:)/i).filter(Boolean);
        
        for (const section of sections) {
            // Look for option patterns
            const optionMatches = section.match(/(?:[A-D][\.\s:)]|\([A-D]\))\s+[^\n]+/gi);
            
            if (optionMatches && optionMatches.length >= 3) { // At least 3 options to be a valid question
                // Extract question text (everything before first option)
                const firstOptionIndex = section.indexOf(optionMatches[0]);
                const questionText = section.substring(0, firstOptionIndex).trim();
                
                if (questionText.length > 10) { // Ensure we have a substantial question
                    // Extract options
                    const options = optionMatches.slice(0, 4).map(opt => 
                        opt.replace(/^(?:[A-D][\.\s:)]|\([A-D]\))\s+/i, '').trim()
                    );
                    
                    // Pad with empty options if we have fewer than 4
                    while (options.length < 4) {
                        options.push("(No option provided)");
                    }
                    
                    // Look for answer indication
                    const answerMatch = section.match(/(?:answer|correct)[^A-D]*(A|B|C|D)/i);
                    let correctAnswer = 0;
                    
                    if (answerMatch) {
                        const answerLetter = answerMatch[1].toUpperCase();
                        correctAnswer = 'ABCD'.indexOf(answerLetter);
                    }
                    
                    questions.push({
                        text: questionText,
                        options,
                        correctAnswer,
                        explanation: '',
                        userAnswer: null
                    });
                }
            }
        }
        
        return questions;
    }
};
