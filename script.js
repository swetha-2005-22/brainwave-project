// BCI Emotion Detection - Main JavaScript
class NeuroSenseApp {
    constructor() {
        this.currentData = null;
        this.init();
    }

    init() {
        console.log('NeuroSense AI Initialized');
        this.setupEventListeners();
        this.updateWaveValueDisplays();
        this.loadInitialState();
    }

    setupEventListeners() {
        // Input field listeners
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', (e) => this.updateWaveValue(e.target.id));
            input.addEventListener('blur', (e) => this.validateInput(e.target));
        });

        // Button listeners
        document.getElementById('analyze-btn').addEventListener('click', () => this.predictEmotion());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetForm());
        
        // Sample buttons
        document.querySelectorAll('.sample-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emotion = e.target.dataset.emotion;
                this.loadSample(emotion);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.predictEmotion();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.resetForm();
                        break;
                }
            }
        });
    }

    updateWaveValue(waveType) {
        const value = document.getElementById(waveType).value;
        const valueDiv = document.getElementById(`${waveType}-value`);
        
        if (value && !isNaN(value)) {
            valueDiv.textContent = parseFloat(value).toFixed(2);
            valueDiv.style.display = 'block';
            
            // Update visual indicator
            this.updateWaveVisualization(waveType, value);
        } else {
            valueDiv.style.display = 'none';
        }
    }

    updateWaveVisualization(waveType, value) {
        const waveBars = document.getElementById(`${waveType}-bars`);
        if (!waveBars) return;

        const bars = waveBars.querySelectorAll('.wave-bar');
        const numBars = bars.length;
        const activeBars = Math.min(numBars, Math.floor((value / 30) * numBars));
        
        bars.forEach((bar, index) => {
            if (index < activeBars) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        if (isNaN(value)) {
            input.classList.add('error');
            this.showToast('Please enter a valid number', 'error');
            return false;
        }
        
        input.classList.remove('error');
        return true;
    }

    async loadSample(emotion) {
        try {
            this.showLoading('Loading sample data...');
            
            const response = await fetch('/sample_data');
            const data = await response.json();
            
            if (data.samples && data.samples[emotion]) {
                const sample = data.samples[emotion];
                
                // Set input values
                document.getElementById('alpha').value = sample.alpha;
                document.getElementById('beta').value = sample.beta;
                document.getElementById('gamma').value = sample.gamma;
                document.getElementById('theta').value = sample.theta;
                
                // Update displays
                this.updateWaveValueDisplays();
                this.showToast(`${emotion} sample loaded`, 'success');
            }
        } catch (error) {
            console.error('Error loading sample:', error);
            this.showToast('Error loading sample data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateWaveValueDisplays() {
        ['alpha', 'beta', 'gamma', 'theta'].forEach(wave => {
            this.updateWaveValue(wave);
        });
    }

    async predictEmotion() {
        // Validate all inputs first
        const inputs = document.querySelectorAll('input[type="number"]');
        let valid = true;
        
        inputs.forEach(input => {
            if (!this.validateInput(input)) {
                valid = false;
            }
        });
        
        if (!valid) {
            this.showToast('Please check your input values', 'error');
            return;
        }

        const brainwaves = {
            alpha: parseFloat(document.getElementById('alpha').value),
            beta: parseFloat(document.getElementById('beta').value),
            gamma: parseFloat(document.getElementById('gamma').value),
            theta: parseFloat(document.getElementById('theta').value)
        };

        try {
            this.showLoading('Analyzing brainwaves...');
            this.disableUI(true);

            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(brainwaves)
            });

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }

            this.displayResults(result);
            this.showToast('Analysis complete!', 'success');
            
        } catch (error) {
            console.error('Prediction error:', error);
            this.showToast(error.message || 'Error analyzing emotions', 'error');
            this.displayError();
        } finally {
            this.hideLoading();
            this.disableUI(false);
        }
    }

    displayResults(result) {
        const resultDiv = document.getElementById('predictionResult');
        const probBars = document.getElementById('probabilityBars');
        const brainwaveDiv = document.getElementById('brainwaveValues');

        // Update prediction result
        resultDiv.innerHTML = `
            <div class="result-content">
                <h3 class="prediction ${result.prediction.toLowerCase()}">
                    <i class="fas fa-${this.getEmotionIcon(result.prediction)}"></i>
                    ${result.prediction}
                </h3>
                <p class="description">${result.description}</p>
                <p class="confidence">
                    <strong>Confidence: ${(result.confidence * 100).toFixed(1)}%</strong>
                </p>
                <div class="result-actions">
                    <button onclick="app.saveResult()" class="save-btn">
                        <i class="fas fa-save"></i> Save Result
                    </button>
                </div>
            </div>
        `;

        // Update probability bars
        probBars.innerHTML = '';
        Object.entries(result.probabilities).forEach(([emotion, probability]) => {
            const percentage = (probability * 100).toFixed(1);
            const bar = this.createProbabilityBar(emotion, percentage);
            probBars.appendChild(bar);
        });

        // Update brainwave values
        brainwaveDiv.innerHTML = this.createBrainwaveDisplay(result.brainwaves);
        
        // Add animation
        this.animateResults();
    }

    createProbabilityBar(emotion, percentage) {
        const bar = document.createElement('div');
        bar.className = 'bar-container';
        bar.innerHTML = `
            <div class="bar-label">
                <span class="emotion-name">${emotion}</span>
                <span class="percentage">${percentage}%</span>
            </div>
            <div class="bar">
                <div class="bar-fill ${emotion.toLowerCase()}" 
                     style="width: ${percentage}%">
                    <span class="bar-value">${percentage}%</span>
                </div>
            </div>
        `;
        return bar;
    }

    createBrainwaveDisplay(brainwaves) {
        return `
            <div class="brainwave-grid">
                <div class="brainwave-item">
                    <i class="fas fa-brain"></i>
                    <span class="label">Alpha</span>
                    <span class="value">${brainwaves.alpha.toFixed(2)}</span>
                </div>
                <div class="brainwave-item">
                    <i class="fas fa-bolt"></i>
                    <span class="label">Beta</span>
                    <span class="value">${brainwaves.beta.toFixed(2)}</span>
                </div>
                <div class="brainwave-item">
                    <i class="fas fa-star"></i>
                    <span class="label">Gamma</span>
                    <span class="value">${brainwaves.gamma.toFixed(2)}</span>
                </div>
                <div class="brainwave-item">
                    <i class="fas fa-moon"></i>
                    <span class="label">Theta</span>
                    <span class="value">${brainwaves.theta.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    getEmotionIcon(emotion) {
        const icons = {
            'Happy': 'smile',
            'Relaxed': 'couch', 
            'Sad': 'sad-tear'
        };
        return icons[emotion] || 'brain';
    }

    animateResults() {
        const elements = document.querySelectorAll('.prediction, .bar-fill, .brainwave-item');
        elements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.1}s`;
            el.classList.add('animate-in');
        });
    }

    displayError() {
        const resultDiv = document.getElementById('predictionResult');
        resultDiv.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Analysis Failed</h3>
                <p>Please check your connection and try again</p>
            </div>
        `;
    }

    resetForm() {
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.value = '';
            input.classList.remove('error');
        });

        document.querySelectorAll('.wave-value').forEach(el => {
            el.style.display = 'none';
        });

        document.getElementById('predictionResult').innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-brain"></i>
                <h3>Welcome to NeuroSense AI</h3>
                <p>Enter brainwave values or use sample data to detect emotions</p>
            </div>
        `;

        document.getElementById('probabilityBars').innerHTML = '';
        document.getElementById('brainwaveValues').innerHTML = '';

        this.showToast('Form reset', 'info');
    }

    disableUI(disabled) {
        const buttons = document.querySelectorAll('button');
        const inputs = document.querySelectorAll('input');
        
        buttons.forEach(btn => btn.disabled = disabled);
        inputs.forEach(input => input.disabled = disabled);
    }

    showLoading(message = 'Processing...') {
        // Create or show loading overlay
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    saveResult() {
        // Implement save functionality
        this.showToast('Save feature coming soon!', 'info');
    }

    loadInitialState() {
        // Load any saved preferences or initial state
        console.log('Loading initial state...');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new NeuroSenseApp();
    
    // Add service worker for offline functionality (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
});

// Utility functions
function formatBrainwaveValue(value) {
    return parseFloat(value).toFixed(2);
}

function validateBrainwaveRange(value, min, max) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
}

// Export for global access
window.NeuroSenseApp = NeuroSenseApp;