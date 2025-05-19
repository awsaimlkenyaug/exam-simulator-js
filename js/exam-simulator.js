/**
 * Exam Simulator - Core functionality for the exam simulator
 */
class ExamSimulator {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.timeRemaining = 0;
        this.mode = 'study'; // 'study' or 'exam'
        this.timer = null;
        this.score = 0;
        this.examDuration = 60; // Default 60 minutes
        this.examInProgress = false;
        this.examCompleted = false;
    }

    /**
     * Load exam from a file
     * @param {File} file - The exam file (VCE or PDF)
     * @returns {Promise} - Resolves when the exam is loaded
     */
    async loadExam(file) {
        return new Promise(async (resolve, reject) => {
            try {
                // Determine file type and parse accordingly
                if (file.name.toLowerCase().endsWith('.vce')) {
                    this.questions = await VCEParser.parse(file);
                } else if (file.name.toLowerCase().endsWith('.pdf')) {
                    this.questions = await PDFParser.parse(file);
                } else {
                    throw new Error('Unsupported file format. Please use VCE or PDF files.');
                }

                if (!this.questions || this.questions.length === 0) {
                    throw new Error('No questions found in the file.');
                }

                // Reset exam state
                this.currentQuestionIndex = 0;
                this.score = 0;
                this.examCompleted = false;

                resolve({
                    questionCount: this.questions.length
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Start the exam
     * @param {string} mode - 'study' or 'exam'
     * @param {number} duration - Duration in minutes (for exam mode)
     */
    startExam(mode, duration) {
        this.mode = mode;
        this.examDuration = duration;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.examInProgress = true;
        this.examCompleted = false;

        // Reset user answers
        this.questions.forEach(question => {
            question.userAnswer = null;
        });

        // Start timer for exam mode
        if (mode === 'exam') {
            this.timeRemaining = duration * 60; // Convert to seconds
            this.startTimer();
        }

        return this.getCurrentQuestion();
    }

    /**
     * Start the exam timer
     */
    startTimer() {
        // Clear any existing timer
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            this.timeRemaining--;
            
            // Check if time is up
            if (this.timeRemaining <= 0) {
                this.endExam();
            }
        }, 1000);
    }

    /**
     * Get the current timer value formatted as MM:SS
     * @returns {string} - Formatted time
     */
    getFormattedTime() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get the current question
     * @returns {Object} - The current question object
     */
    getCurrentQuestion() {
        return {
            questionIndex: this.currentQuestionIndex,
            totalQuestions: this.questions.length,
            question: this.questions[this.currentQuestionIndex],
            userAnswer: this.questions[this.currentQuestionIndex].userAnswer
        };
    }

    /**
     * Answer the current question
     * @param {number} answerIndex - The index of the selected answer
     * @returns {Object} - Result object with feedback
     */
    answerQuestion(answerIndex) {
        const question = this.questions[this.currentQuestionIndex];
        question.userAnswer = answerIndex;

        const isCorrect = answerIndex === question.correctAnswer;
        
        // In study mode, we can provide immediate feedback
        if (this.mode === 'study') {
            return {
                isCorrect,
                correctAnswer: question.correctAnswer,
                explanation: question.explanation || 'No explanation available.'
            };
        }

        // In exam mode, just record the answer without feedback
        return { recorded: true };
    }

    /**
     * Move to the next question
     * @returns {Object|null} - The next question or null if at the end
     */
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            return this.getCurrentQuestion();
        }
        return null;
    }

    /**
     * Move to the previous question
     * @returns {Object|null} - The previous question or null if at the beginning
     */
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            return this.getCurrentQuestion();
        }
        return null;
    }

    /**
     * Jump to a specific question
     * @param {number} index - The question index to jump to
     * @returns {Object} - The question at the specified index
     */
    jumpToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            this.currentQuestionIndex = index;
            return this.getCurrentQuestion();
        }
        throw new Error('Invalid question index');
    }

    /**
     * End the exam and calculate the score
     * @returns {Object} - Exam results
     */
    endExam() {
        // Stop the timer
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.examInProgress = false;
        this.examCompleted = true;

        // Calculate score
        this.score = 0;
        let answeredQuestions = 0;

        this.questions.forEach(question => {
            if (question.userAnswer !== null && question.userAnswer !== undefined) {
                answeredQuestions++;
                if (question.userAnswer === question.correctAnswer) {
                    this.score++;
                }
            }
        });

        return {
            score: this.score,
            totalQuestions: this.questions.length,
            answeredQuestions,
            percentage: Math.round((this.score / this.questions.length) * 100)
        };
    }

    /**
     * Get the exam results
     * @returns {Object} - Exam results
     */
    getResults() {
        const answeredQuestions = this.questions.filter(q => 
            q.userAnswer !== null && q.userAnswer !== undefined
        ).length;

        return {
            score: this.score,
            totalQuestions: this.questions.length,
            answeredQuestions,
            percentage: Math.round((this.score / this.questions.length) * 100),
            questions: this.questions.map(q => ({
                text: q.text,
                userAnswer: q.userAnswer,
                correctAnswer: q.correctAnswer,
                isCorrect: q.userAnswer === q.correctAnswer,
                explanation: q.explanation || 'No explanation available.'
            }))
        };
    }

    /**
     * Switch to review mode after exam completion
     */
    switchToReviewMode() {
        this.mode = 'study';
        this.currentQuestionIndex = 0;
        return this.getCurrentQuestion();
    }

    /**
     * Check if the exam is in progress
     * @returns {boolean} - True if exam is in progress
     */
    isExamInProgress() {
        return this.examInProgress;
    }

    /**
     * Check if the exam is completed
     * @returns {boolean} - True if exam is completed
     */
    isExamCompleted() {
        return this.examCompleted;
    }

    /**
     * Reset the exam simulator
     */
    reset() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.timeRemaining = 0;
        this.score = 0;
        this.examInProgress = false;
        this.examCompleted = false;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
