# Exam Simulator (JavaScript)

A lightweight web-based exam simulator that can parse and display questions from VCE files and PDFs. Perfect for studying and practicing for certification exams.

![Exam Simulator Screenshot](screenshot.png)

## Features

- **Multiple Exam Modes**:
  - Study Mode: Get immediate feedback and explanations
  - Exam Mode: Timed environment simulating real exam conditions

- **File Support**:
  - VCE files (Visual CertExam format)
  - PDF files with exam questions

- **VCE to PDF Conversion**:
  - Convert VCE files to downloadable PDF format
  - Preserve questions, options, answers, and explanations
  - Formatted for easy reading and printing

- **Enhanced PDF Parsing**:
  - Improved text extraction from PDF files
  - Multiple parsing strategies for different PDF formats
  - Better handling of question and answer patterns

- **User-Friendly Interface**:
  - Clean, responsive design
  - Works on desktop and mobile devices
  - Progress tracking
  - Timer for exam mode

- **Learning Tools**:
  - Question explanations
  - Review mode after exam completion
  - Score and performance statistics
  - Download exam results as PDF

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- VCE or PDF files containing exam questions

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/exam-simulator-js.git
   ```

2. Open `index.html` in your web browser

Alternatively, you can host the files on any web server.

## Usage

### Taking an Exam

1. Open the application in your web browser
2. Select either "Study Mode" or "Exam Mode"
3. Upload a VCE or PDF file containing exam questions
4. Set the exam duration (for Exam Mode)
5. Click "Start Exam" to begin
6. Answer questions by clicking on the options
7. Navigate between questions using the Previous/Next buttons
8. Click "Finish Exam" when you're done or when time expires
9. Review your results and optionally review your answers

### Converting VCE to PDF

1. Upload a VCE file
2. Click the "Convert to PDF" button
3. The PDF will be generated and downloaded automatically
4. Open the PDF in any PDF reader

## File Format Support

### VCE Files

The application attempts to parse VCE files in various formats:
- JSON-based VCE files
- Text-based VCE files with common question patterns
- Binary VCE files (limited support)

### PDF Files

The enhanced PDF parser extracts questions using multiple strategies:
- Pattern-based extraction for standard formats
- Page-by-page analysis for complex layouts
- Lenient parsing for non-standard formats

## Limitations

- PDF parsing relies on text extraction and pattern matching, which may not work perfectly with all PDF formats
- VCE parsing is limited to common formats and may not support all proprietary VCE variations
- Complex formatting or images in questions may not be properly displayed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PDF.js for PDF parsing capabilities
- jsPDF for PDF generation
- The open-source community for inspiration and support
