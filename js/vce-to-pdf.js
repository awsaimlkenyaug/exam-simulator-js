/**
 * VCE to PDF Converter - Converts VCE files to downloadable PDF format
 * Requires jsPDF library: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
 */
const VCEToPDFConverter = {
    /**
     * Convert questions to a PDF file
     * @param {Array} questions - Array of question objects
     * @param {string} examTitle - Title of the exam
     * @returns {Blob} - PDF file as a Blob
     */
    convertToPDF(questions, examTitle = 'Exam Questions') {
        // Create a new jsPDF instance
        const doc = new jspdf.jsPDF();
        
        // Set document properties
        doc.setProperties({
            title: examTitle,
            subject: 'Exam Questions',
            creator: 'Exam Simulator',
            author: 'Exam Simulator'
        });
        
        // Set initial position
        let y = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const textWidth = pageWidth - (margin * 2);
        
        // Add title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(examTitle, pageWidth / 2, y, { align: 'center' });
        y += 15;
        
        // Add date
        const today = new Date();
        const dateStr = today.toLocaleDateString();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${dateStr}`, pageWidth / 2, y, { align: 'center' });
        y += 15;
        
        // Add questions
        doc.setFontSize(12);
        
        questions.forEach((question, index) => {
            // Check if we need a new page
            if (y > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                y = 20;
            }
            
            // Question number and text
            doc.setFont('helvetica', 'bold');
            const questionNumber = `Question ${index + 1}:`;
            doc.text(questionNumber, margin, y);
            y += 7;
            
            // Question text with word wrap
            doc.setFont('helvetica', 'normal');
            const questionLines = doc.splitTextToSize(question.text, textWidth);
            doc.text(questionLines, margin, y);
            y += questionLines.length * 7 + 5;
            
            // Options
            const optionLabels = ['A', 'B', 'C', 'D'];
            question.options.forEach((option, optIndex) => {
                // Check if we need a new page
                if (y > doc.internal.pageSize.getHeight() - 30) {
                    doc.addPage();
                    y = 20;
                }
                
                const optionText = `${optionLabels[optIndex]}. ${option}`;
                const optionLines = doc.splitTextToSize(optionText, textWidth - 5);
                doc.text(optionLines, margin + 5, y);
                y += optionLines.length * 7 + 3;
            });
            
            // Correct answer
            if (y > doc.internal.pageSize.getHeight() - 30) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFont('helvetica', 'bold');
            const correctAnswer = `Answer: ${optionLabels[question.correctAnswer]}`;
            doc.text(correctAnswer, margin, y);
            y += 7;
            
            // Explanation (if available)
            if (question.explanation) {
                if (y > doc.internal.pageSize.getHeight() - 40) {
                    doc.addPage();
                    y = 20;
                }
                
                doc.setFont('helvetica', 'italic');
                doc.text('Explanation:', margin, y);
                y += 7;
                
                doc.setFont('helvetica', 'normal');
                const explanationLines = doc.splitTextToSize(question.explanation, textWidth);
                doc.text(explanationLines, margin, y);
                y += explanationLines.length * 7 + 10;
            } else {
                y += 10;
            }
        });
        
        // Return the PDF as a blob
        return doc.output('blob');
    },
    
    /**
     * Generate a PDF from VCE file
     * @param {File} file - The VCE file
     * @returns {Promise<Blob>} - Promise resolving to PDF blob
     */
    async generatePDFFromVCE(file) {
        try {
            // Parse the VCE file
            const questions = await VCEParser.parse(file);
            
            if (!questions || questions.length === 0) {
                throw new Error('No questions found in the VCE file');
            }
            
            // Generate a title from the file name
            const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            const examTitle = `${fileName} - Exam Questions`;
            
            // Convert to PDF
            return this.convertToPDF(questions, examTitle);
        } catch (error) {
            console.error('Error generating PDF from VCE:', error);
            throw error;
        }
    },
    
    /**
     * Download the generated PDF
     * @param {Blob} pdfBlob - The PDF as a Blob
     * @param {string} fileName - The file name for the download
     */
    downloadPDF(pdfBlob, fileName) {
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(pdfBlob);
        downloadLink.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(downloadLink.href);
        }, 100);
    }
};
