/**
 * Main application script for the Exam Simulator
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the exam simulator
    const examSimulator = new ExamSimulator();
    
    // DOM elements
    const fileInput = document.getElementById('exam-file');
    const fileInfo = document.querySelector('.file-info');
    const startExamButton = document.getElementById('start-exam');
    const loadingIndicator = document.getElementById('loading-indicator');
    const examContainer = document.getElementById('exam-container');
    const resultsContainer = document.getElementById('results-container');
    
    const currentQuestionElement = document.getElementById('current-question');
    const totalQuestionsElement = document.getElementById('total-questions');
    const timerElement = document.getElementById('timer');
    const questionTextElement = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const explanationContainer = document.getElementById('explanation-container');
    const explanationTextElement = document.getElementById('explanation-text');
    const answerResultElement = document.getElementById('answer-result');
    
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const finishButton = document.getElementById('finish-button');
    
    const scoreElement = document.getElementById('score');
    const totalScoreElement = document.getElementById('total-score');
    const percentageElement = document.getElementById('percentage');
    const reviewExamButton = document.getElementById('review-exam');
    const newExamButton = document.getElementById('new-exam');
    
    // Mode selection
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    let selectedMode = 'study';
    
    modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            selectedMode = radio.value;
        });
    });
    
    // File input change handler
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileInfo.textContent = `Selected file: ${file.name}`;
        } else {
            fileInfo.textContent = 'No file selected';
        }
    });
    
    // Start exam button click handler
    startExamButton.addEventListener('click', async () => {
        if (!fileInput.files.length) {
            alert('Please select an exam file first.');
            return;
        }
        
        const file = fileInput.files[0];
        const durationInput = document.getElementById('exam-duration');
        const duration = parseInt(durationInput.value, 10) || 60;
        
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        
        try {
            // Load the exam
            await examSimulator.loadExam(file);
            
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            
            // Start the exam
            const examData = examSimulator.startExam(selectedMode, duration);
            
            // Update UI
            updateQuestionDisplay(examData);
            
            // Show exam container
            document.querySelector('.file-upload-section').classList.add('hidden');
            examContainer.classList.remove('hidden');
            
            // Start timer updates if in exam mode
            if (selectedMode === 'exam') {
                updateTimer();
            }
        } catch (error) {
            loadingIndicator.classList.add('hidden');
            alert(`Error: ${error.message}`);
        }
    });
    
    // Previous button click handler
    prevButton.addEventListener('click', () => {
        const prevQuestion = examSimulator.previousQuestion();
        if (prevQuestion) {
            updateQuestionDisplay(prevQuestion);
        }
    });
    
    // Next button click handler
    nextButton.addEventListener('click', () => {
        const nextQuestion = examSimulator.nextQuestion();
        if (nextQuestion) {
            updateQuestionDisplay(nextQuestion);
        } else {
            // If we're at the last question, show finish button
            finishButton.classList.remove('hidden');
        }
    });
    
    // Finish button click handler
    finishButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to finish the exam?')) {
            endExam();
        }
    });
    
    // Review exam button click handler
    reviewExamButton.addEventListener('click', () => {
        const reviewData = examSimulator.switchToReviewMode();
        
        // Update UI for review mode
        updateQuestionDisplay(reviewData);
        
        // Show exam container, hide results
        resultsContainer.classList.add('hidden');
        examContainer.classList.remove('hidden');
    });
    
    // New exam button click handler
    newExamButton.addEventListener('click', () => {
        // Reset the simulator
        examSimulator.reset();
        
        // Reset UI
        fileInput.value = '';
        fileInfo.textContent = 'No file selected';
        
        // Show file upload section
        document.querySelector('.file-upload-section').classList.remove('hidden');
        examContainer.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        finishButton.classList.add('hidden');
    });
    
    // Start screen button handler
    document.getElementById('startGameButton').addEventListener('click', () => {
        document.getElementById('startScreen').classList.add('hidden');
    });
    
    // Play again button handler
    document.getElementById('playAgainButton').addEventListener('click', () => {
        document.getElementById('gameOverScreen').classList.add('hidden');
        newExamButton.click();
    });
    
    // Settings button handler
    document.getElementById('settingsButton').addEventListener('click', () => {
        document.getElementById('settingsPanel').classList.remove('hidden');
    });
    
    // Save settings button handler
    document.getElementById('saveSettingsButton').addEventListener('click', () => {
        document.getElementById('settingsPanel').classList.add('hidden');
    });
    
    // Cancel settings button handler
    document.getElementById('cancelSettingsButton').addEventListener('click', () => {
        document.getElementById('settingsPanel').classList.add('hidden');
    });
    
    /**
     * Update the question display
     * @param {Object} questionData - The question data
     */
    function updateQuestionDisplay(questionData) {
        const { questionIndex, totalQuestions, question, userAnswer } = questionData;
        
        // Update question number
        currentQuestionElement.textContent = questionIndex + 1;
        totalQuestionsElement.textContent = totalQuestions;
        
        // Update question text
        questionTextElement.textContent = question.text;
        
        // Clear options container
        optionsContainer.innerHTML = '';
        
        // Add options
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option;
            
            // If this option was previously selected
            if (userAnswer === index) {
                optionElement.classList.add('selected');
                
                // In study mode, show if it was correct or incorrect
                if (examSimulator.mode === 'study') {
                    if (index === question.correctAnswer) {
                        optionElement.classList.add('correct');
                    } else {
                        optionElement.classList.add('incorrect');
                    }
                }
            }
            
            // Add click handler
            optionElement.addEventListener('click', () => {
                // If already answered in study mode, don't allow changing
                if (examSimulator.mode === 'study' && userAnswer !== null) {
                    return;
                }
                
                // Remove selected class from all options
                document.querySelectorAll('.option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to this option
                optionElement.classList.add('selected');
                
                // Answer the question
                const result = examSimulator.answerQuestion(index);
                
                // In study mode, show feedback
                if (examSimulator.mode === 'study') {
                    showFeedback(result, index);
                }
            });
            
            optionsContainer.appendChild(optionElement);
        });
        
        // Show explanation if in study mode and question was answered
        explanationContainer.classList.add('hidden');
        if (examSimulator.mode === 'study' && userAnswer !== null) {
            showFeedback({
                isCorrect: userAnswer === question.correctAnswer,
                correctAnswer: question.correctAnswer,
                explanation: question.explanation
            }, userAnswer);
        }
        
        // Update navigation buttons
        prevButton.disabled = questionIndex === 0;
        nextButton.disabled = questionIndex === totalQuestions - 1;
        
        // Show/hide finish button
        if (questionIndex === totalQuestions - 1) {
            finishButton.classList.remove('hidden');
        } else {
            finishButton.classList.add('hidden');
        }
    }
    
    /**
     * Show feedback for an answer
     * @param {Object} result - The answer result
     * @param {number} selectedIndex - The selected option index
     */
    function showFeedback(result, selectedIndex) {
        const { isCorrect, correctAnswer, explanation } = result;
        
        // Update option styling
        document.querySelectorAll('.option').forEach((opt, index) => {
            if (index === selectedIndex) {
                opt.classList.add('selected');
                if (isCorrect) {
                    opt.classList.add('correct');
                } else {
                    opt.classList.add('incorrect');
                }
            } else if (index === correctAnswer) {
                opt.classList.add('correct');
            }
        });
        
        // Show explanation
        explanationTextElement.textContent = explanation;
        answerResultElement.textContent = isCorrect ? 'Correct!' : 'Incorrect';
        answerResultElement.className = isCorrect ? 'correct-result' : 'incorrect-result';
        explanationContainer.classList.remove('hidden');
    }
    
    /**
     * Update the timer display
     */
    function updateTimer() {
        if (!examSimulator.isExamInProgress()) {
            return;
        }
        
        timerElement.textContent = examSimulator.getFormattedTime();
        
        // Add warning class when time is running low
        if (examSimulator.timeRemaining <= 60) {
            timerElement.classList.add('warning');
        }
        
        // Schedule next update
        setTimeout(updateTimer, 1000);
    }
    
    /**
     * End the exam and show results
     */
    function endExam() {
        const results = examSimulator.endExam();
        
        // Update results display
        scoreElement.textContent = results.score;
        totalScoreElement.textContent = results.totalQuestions;
        percentageElement.textContent = `${results.percentage}%`;
        
        // Show results container
        examContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
    }
    
    // Hide the start screen after a short delay
    setTimeout(() => {
        document.getElementById('startScreen').classList.add('hidden');
    }, 1000);
});
