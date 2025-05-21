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
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Extract text from all pages with better formatting preservation
      const numPages = pdfDoc.numPages;
      let fullText = '';
      let pageTexts = [];
      
      console.log(`PDF has ${numPages} pages`);
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
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
      console.log(`Strategy 1 found ${questions.length} questions`);
      
      // If that didn't work well, try page-by-page parsing
      if (questions.length <= 1) {
        console.log('Standard parsing found only one or zero questions, trying page-by-page parsing');
        let pageQuestions = [];
        for (const pageText of pageTexts) {
          const foundQuestions = this.extractQuestionsFromText(pageText);
          pageQuestions = pageQuestions.concat(foundQuestions);
        }
        
        if (pageQuestions.length > questions.length) {
          console.log(`Page-by-page parsing found ${pageQuestions.length} questions, using these results`);
          questions = pageQuestions;
        }
      }
      
      // If still no questions or just one, try more lenient parsing
      if (questions.length <= 1) {
        console.log('Trying lenient parsing');
        const lenientQuestions = this.extractQuestionsLenient(fullText);
        
        if (lenientQuestions.length > questions.length) {
          console.log(`Lenient parsing found ${lenientQuestions.length} questions, using these results`);
          questions = lenientQuestions;
        }
      }
      
      console.log(`Found ${questions.length} questions in total`);
      
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
    
    // Pattern 1: Question number followed by text, then options A., B., C., D.
    // Strictly using capital letters followed by a period for options
    const questionPattern1 = /(?:Question|Q)?[\s\.:]?(\d+)[\.\s:]+([\s\S]+?)(?=(?:A\.[\s]+))([\s\S]+?)(?=(?:B\.[\s]+))([\s\S]+?)(?=(?:C\.[\s]+))([\s\S]+?)(?=(?:D\.[\s]+))([\s\S]+?)(?=(?:(?:Question|Q)?[\s\.:]?\d+|Answer|Correct|$))/gi;
    
    // Try first pattern
    let match;
    while ((match = questionPattern1.exec(text)) !== null) {
      const [, num, questionText, optionA, optionB, optionC, optionD] = match;
      
      // Look for the answer and explanation after this question
      const answerPattern = new RegExp(`Answer(?:\\s*for)?\\s*(?:question)?\\s*${num}?[\.:\\s]+([A-D])`, 'i');
      const answerMatch = text.substring(match.index + match[0].length, match.index + match[0].length + 200).match(answerPattern);
      
      const explanationPattern = new RegExp(`Explanation(?:\\s*for)?\\s*(?:question)?\\s*${num}?[\.:\\s]+([^\\n]+)`, 'i');
      const explanationMatch = text.substring(match.index + match[0].length, match.index + match[0].length + 500).match(explanationPattern);
      
      // Clean up options (remove A., B., etc.)
      const cleanOptionA = optionA.replace(/^A\.[\s]+/, '').trim();
      const cleanOptionB = optionB.replace(/^B\.[\s]+/, '').trim();
      const cleanOptionC = optionC.replace(/^C\.[\s]+/, '').trim();
      const cleanOptionD = optionD.replace(/^D\.[\s]+/, '').trim();
      
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
          cleanOptionA,
          cleanOptionB,
          cleanOptionC,
          cleanOptionD
        ],
        correctAnswer,
        explanation: explanationMatch ? explanationMatch[1].trim() : '',
        userAnswer: null
      });
    }
    
    // If no questions found with first pattern, try another pattern
    if (questions.length === 0) {
      // Pattern 2: Look for numbered questions with options
      const sections = text.split(/(?:\n|\r\n?)+(?:\d+\.|\(?[0-9]+\))/i).filter(Boolean);
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        
        // Skip short sections that are unlikely to be questions
        if (section.length < 20) continue;
        
        // Look for option patterns - strictly capital letters followed by period
        const optionMatches = section.match(/A\.\s+[^\n]+(?:\n|\r\n?)+B\.\s+[^\n]+(?:\n|\r\n?)+C\.\s+[^\n]+(?:\n|\r\n?)+D\.\s+[^\n]+/g);
        
        if (optionMatches && optionMatches.length > 0) {
          // Extract question text (everything before first option)
          const firstOptionIndex = section.indexOf('A.');
          if (firstOptionIndex <= 0) continue;
          
          const questionText = section.substring(0, firstOptionIndex).trim();
          
          if (questionText.length > 10) { // Ensure we have a substantial question
            // Extract individual options
            const optionA = section.match(/A\.\s+([^\n]+)/);
            const optionB = section.match(/B\.\s+([^\n]+)/);
            const optionC = section.match(/C\.\s+([^\n]+)/);
            const optionD = section.match(/D\.\s+([^\n]+)/);
            
            if (optionA && optionB && optionC && optionD) {
              const options = [
                optionA[1].trim(),
                optionB[1].trim(),
                optionC[1].trim(),
                optionD[1].trim()
              ];
              
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
    
    // Split text into potential question blocks
    // Look for patterns like "1.", "Question 1:", etc.
    const questionBlocks = text.split(/(?:\n|\r\n?)+(?:\d+\.|\(?[0-9]+\)|Question\s+\d+:)/i).filter(Boolean);
    
    for (const block of questionBlocks) {
      // Skip very short blocks
      if (block.length < 50) continue;
      
      // Look for options - strictly capital letters followed by period
      const optionAMatch = block.match(/A\.\s+([^\n]+)/);
      const optionBMatch = block.match(/B\.\s+([^\n]+)/);
      const optionCMatch = block.match(/C\.\s+([^\n]+)/);
      const optionDMatch = block.match(/D\.\s+([^\n]+)/);
      
      // If we found all four options, consider it a question
      if (optionAMatch && optionBMatch && optionCMatch && optionDMatch) {
        // Extract question text (everything before the first option)
        let questionText = "";
        const optionIndices = [
          block.indexOf('A.'),
          block.indexOf('B.'),
          block.indexOf('C.'),
          block.indexOf('D.')
        ].filter(idx => idx >= 0);
        
        const firstOptionIndex = Math.min(...optionIndices);
        if (firstOptionIndex > 0) {
          questionText = block.substring(0, firstOptionIndex).trim();
        }
        
        // If question text is too short, try to find it another way
        if (questionText.length < 10) {
          // Look for the first substantial line
          const lines = block.split(/\n|\r\n?/).filter(line => line.trim().length > 0);
          if (lines.length > 0) {
            questionText = lines[0].trim();
          }
        }
        
        // Only proceed if we have a valid question text
        if (questionText.length >= 10) {
          // Extract options
          const options = [
            optionAMatch[1].trim(),
            optionBMatch[1].trim(),
            optionCMatch[1].trim(),
            optionDMatch[1].trim()
          ];
          
          // Look for answer indication
          const answerMatch = block.match(/(?:answer|correct)[^A-D]*(A|B|C|D)/i);
          let correctAnswer = 0;
          
          if (answerMatch) {
            const answerLetter = answerMatch[1].toUpperCase();
            correctAnswer = 'ABCD'.indexOf(answerLetter);
          }
          
          // Look for explanation
          let explanation = "";
          const explanationMatch = block.match(/(?:explanation|reason)[\s:]*([^\n]+)/i);
          if (explanationMatch) {
            explanation = explanationMatch[1].trim();
          }
          
          questions.push({
            text: questionText,
            options,
            correctAnswer,
            explanation,
            userAnswer: null
          });
        }
      }
    }
    
    // If we still don't have questions, try an even more aggressive approach
    if (questions.length === 0) {
      // Look for any text that might be a question (ending with ?)
      const possibleQuestions = text.match(/[^\.\?!]+\?/g);
      
      if (possibleQuestions) {
        for (const questionText of possibleQuestions) {
          // Look for options after this question
          const questionIndex = text.indexOf(questionText);
          const textAfterQuestion = text.substring(questionIndex + questionText.length, questionIndex + questionText.length + 500);
          
          const optionAMatch = textAfterQuestion.match(/A\.\s+([^\n]+)/);
          const optionBMatch = textAfterQuestion.match(/B\.\s+([^\n]+)/);
          const optionCMatch = textAfterQuestion.match(/C\.\s+([^\n]+)/);
          const optionDMatch = textAfterQuestion.match(/D\.\s+([^\n]+)/);
          
          if (optionAMatch && optionBMatch && optionCMatch && optionDMatch) {
            const options = [
              optionAMatch[1].trim(),
              optionBMatch[1].trim(),
              optionCMatch[1].trim(),
              optionDMatch[1].trim()
            ];
            
            questions.push({
              text: questionText.trim(),
              options,
              correctAnswer: 0, // Default to A since we can't reliably determine
              explanation: '',
              userAnswer: null
            });
          }
        }
      }
    }
    
    return questions;
  }
};
