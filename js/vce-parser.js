/**
 * VCE Parser - Extracts questions from VCE files
 * 
 * Note: VCE is a proprietary format used by VCE exam simulators.
 * This is a simplified parser that attempts to extract questions from VCE files.
 * It may not work with all VCE file formats or versions.
 */
const VCEParser = {
    /**
     * Parse a VCE file and extract questions
     * @param {File} file - The VCE file to parse
     * @returns {Promise<Array>} - Array of question objects
     */
    async parse(file) {
        try {
            // Read the file as text
            const text = await this.readFileAsText(file);
            
            // Try to parse as JSON first (some VCE files are JSON-based)
            try {
                const jsonData = JSON.parse(text);
                return this.parseFromJSON(jsonData);
            } catch (jsonError) {
                // If JSON parsing fails, try to parse as text
                return this.parseFromText(text);
            }
        } catch (error) {
            console.error('Error parsing VCE file:', error);
            throw new Error(`Failed to parse VCE file: ${error.message}`);
        }
    },
    
    /**
     * Read a file as text
     * @param {File} file - The file to read
     * @returns {Promise<string>} - The file contents as text
     */
    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },
    
    /**
     * Parse questions from JSON format
     * @param {Object} jsonData - The parsed JSON data
     * @returns {Array} - Array of question objects
     */
    parseFromJSON(jsonData) {
        const questions = [];
        
        // Check for common JSON structures in VCE files
        if (jsonData.questions) {
            // Direct questions array
            return jsonData.questions.map(q => ({
                text: q.text || q.question || '',
                options: q.options || q.answers || [],
                correctAnswer: q.correctAnswer || q.correct || 0,
                explanation: q.explanation || '',
                userAnswer: null
            }));
        } else if (jsonData.exam && jsonData.exam.questions) {
            // Nested under exam object
            return jsonData.exam.questions.map(q => ({
                text: q.text || q.question || '',
                options: q.options || q.answers || [],
                correctAnswer: q.correctAnswer || q.correct || 0,
                explanation: q.explanation || '',
                userAnswer: null
            }));
        } else {
            // Try to find questions in the structure
            const possibleQuestions = this.findQuestionsInObject(jsonData);
            if (possibleQuestions.length > 0) {
                return possibleQuestions;
            }
            
            throw new Error('Could not identify questions in JSON structure');
        }
    },
    
    /**
     * Recursively search for question objects in a JSON structure
     * @param {Object} obj - The object to search
     * @returns {Array} - Array of question objects
     */
    findQuestionsInObject(obj) {
        const questions = [];
        
        // If it's an array, check each item
        if (Array.isArray(obj)) {
            for (const item of obj) {
                if (typeof item === 'object' && item !== null) {
                    // Check if this looks like a question
                    if (this.looksLikeQuestion(item)) {
                        questions.push({
                            text: item.text || item.question || item.stem || '',
                            options: item.options || item.answers || item.choices || [],
                            correctAnswer: item.correctAnswer || item.correct || item.answer || 0,
                            explanation: item.explanation || item.rationale || '',
                            userAnswer: null
                        });
                    } else {
                        // Recursively search this object
                        questions.push(...this.findQuestionsInObject(item));
                    }
                }
            }
        } 
        // If it's an object, check its properties
        else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    questions.push(...this.findQuestionsInObject(obj[key]));
                }
            }
        }
        
        return questions;
    },
    
    /**
     * Check if an object looks like a question
     * @param {Object} obj - The object to check
     * @returns {boolean} - True if the object looks like a question
     */
    looksLikeQuestion(obj) {
        // Check for common question properties
        const hasQuestionText = obj.text || obj.question || obj.stem;
        const hasOptions = obj.options || obj.answers || obj.choices;
        const hasCorrectAnswer = 'correctAnswer' in obj || 'correct' in obj || 'answer' in obj;
        
        return hasQuestionText && hasOptions && hasCorrectAnswer;
    },
    
    /**
     * Parse questions from text format
     * @param {string} text - The text content from the VCE file
     * @returns {Array} - Array of question objects
     */
    parseFromText(text) {
        const questions = [];
        
        // Try to identify question blocks
        // This is a simplified approach and may need adjustment based on actual VCE format
        const questionBlocks = text.split(/QUESTION\s+\d+/i).filter(Boolean);
        
        questionBlocks.forEach(block => {
            try {
                // Extract question text (everything before the first option)
                const optionStartMatch = block.match(/[A-D]\.\s+/);
                if (!optionStartMatch) return;
                
                const questionText = block.substring(0, optionStartMatch.index).trim();
                
                // Extract options
                const optionMatches = block.match(/[A-D]\.\s+([^\n]+)/g);
                if (!optionMatches || optionMatches.length < 2) return;
                
                const options = optionMatches.map(opt => 
                    opt.replace(/^[A-D]\.\s+/, '').trim()
                );
                
                // Look for answer indication
                const answerMatch = block.match(/(?:Answer|Correct)[^A-D]*(A|B|C|D)/i);
                let correctAnswer = 0;
                
                if (answerMatch) {
                    const answerLetter = answerMatch[1].toUpperCase();
                    correctAnswer = 'ABCD'.indexOf(answerLetter);
                }
                
                // Look for explanation
                const explanationMatch = block.match(/(?:Explanation|Correct Answer)[^:]*:([^$]+)/i);
                const explanation = explanationMatch ? explanationMatch[1].trim() : '';
                
                questions.push({
                    text: questionText,
                    options,
                    correctAnswer,
                    explanation,
                    userAnswer: null
                });
            } catch (error) {
                console.warn('Failed to parse question block:', error);
            }
        });
        
        // If no questions found with the above approach, try another pattern
        if (questions.length === 0) {
            // Look for numbered questions
            const questionMatches = text.match(/\d+\.\s+([^\n]+)(?:\n|\r\n?)+(?:[A-D]\.[\s\S]*?){2,}/g);
            
            if (questionMatches) {
                questionMatches.forEach(match => {
                    try {
                        const lines = match.split(/\n|\r\n?/).filter(Boolean);
                        
                        // First line should be the question
                        const questionText = lines[0].replace(/^\d+\.\s+/, '').trim();
                        
                        // Look for options
                        const options = [];
                        for (let i = 1; i < lines.length; i++) {
                            const optionMatch = lines[i].match(/^([A-D])\.\s+(.+)$/);
                            if (optionMatch) {
                                options[optionMatch[1].charCodeAt(0) - 65] = optionMatch[2].trim();
                            }
                        }
                        
                        // If we found at least 2 options, consider it a valid question
                        if (options.length >= 2) {
                            // Look for answer in the following lines
                            const answerLine = lines.find(line => /Answer|Correct/i.test(line));
                            let correctAnswer = 0;
                            
                            if (answerLine) {
                                const answerMatch = answerLine.match(/[A-D]/);
                                if (answerMatch) {
                                    correctAnswer = answerMatch[0].charCodeAt(0) - 65;
                                }
                            }
                            
                            questions.push({
                                text: questionText,
                                options,
                                correctAnswer,
                                explanation: '',
                                userAnswer: null
                            });
                        }
                    } catch (error) {
                        console.warn('Failed to parse question match:', error);
                    }
                });
            }
        }
        
        return questions;
    }
};
