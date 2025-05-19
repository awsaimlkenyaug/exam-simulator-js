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

- **User-Friendly Interface**:
  - Clean, responsive design
  - Works on desktop and mobile devices
  - Progress tracking
  - Timer for exam mode

- **Learning Tools**:
  - Question explanations
  - Review mode after exam completion
  - Score and performance statistics

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

1. Open the application in your web browser
2. Select either "Study Mode" or "Exam Mode"
3. Upload a VCE or PDF file containing exam questions
4. Set the exam duration (for Exam Mode)
5. Click "Start Exam" to begin
6. Answer questions by clicking on the options
7. Navigate between questions using the Previous/Next buttons
8. Click "Finish Exam" when you're done or when time expires
9. Review your results and optionally review your answers

## File Format Support

### VCE Files

The application attempts to parse VCE files in various formats:
- JSON-based VCE files
- Text-based VCE files with common question patterns

### PDF Files

The PDF parser extracts questions using pattern recognition:
- Numbered questions with lettered options (A, B, C, D)
- Answer indicators and explanations

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
- The open-source community for inspiration and support
