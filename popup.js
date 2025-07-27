// Popup script for Irys Typing Bot
// Handles user interface interactions and communication with background script

class PopupController {
  constructor() {
    this.initializeElements();
    this.attachEventListeners();
    this.loadState();
  }

  initializeElements() {
    this.settingsPanel = document.getElementById('settings-panel');
    this.progressPanel = document.getElementById('progress-panel');
    this.gameCountInput = document.getElementById('gameCount');
    this.speedModeSelect = document.getElementById('speedMode');
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.currentGameSpan = document.getElementById('currentGame');
    this.totalGamesSpan = document.getElementById('totalGames');
    this.gameStatusDiv = document.getElementById('gameStatus');
    this.statusDiv = document.getElementById('status');
  }

  attachEventListeners() {
    this.startBtn.addEventListener('click', () => this.handleStart());
    this.stopBtn.addEventListener('click', () => this.handleStop());
    
    // Обработчик изменения режима скорости
    this.speedModeSelect.addEventListener('change', () => this.handleSpeedModeChange());
  }

  handleSpeedModeChange() {
    const speedMode = this.speedModeSelect.value;
    
    if (speedMode === 'pro') {
      this.speedModeSelect.classList.add('speed-mode-pro');
      this.startBtn.textContent = '⚡ Запустить в режиме "Хочу быть лучшим"';
    } else {
      this.speedModeSelect.classList.remove('speed-mode-pro');
      this.startBtn.textContent = '🚀 Запустить автоматизацию';
    }
  }

  async loadState() {
    // Load current state from background script
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (response && response.isRunning) {
        this.showProgress(response.currentGame, response.totalGames, response.status);
      }
    } catch (error) {
      console.log('No active state found');
    }
  }

  async handleStart() {
    const gameCount = parseInt(this.gameCountInput.value);
    
    if (!gameCount || gameCount < 1) {
      this.showError('Пожалуйста, введите корректное количество игр (минимум 1)');
      return;
    }

    const speedMode = this.speedModeSelect.value;
    
    const settings = {
      gameCount: gameCount,
      speedMode: speedMode
    };

    console.log('Popup: Sending START_AUTOMATION message with settings:', settings);

    // Send start message to background script
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_AUTOMATION',
        settings: settings
      });
      console.log('Popup: Background script response:', response);
    } catch (error) {
      console.error('Popup: Error sending message to background:', error);
      this.showError('Ошибка связи с background script');
      return;
    }

    const modeText = speedMode === 'pro' ? 'Режим "Хочу быть лучшим"' : 'Инициализация...';
    this.showProgress(1, gameCount, modeText);
  }

  handleStop() {
    // Send stop message to background script
    chrome.runtime.sendMessage({ type: 'STOP_AUTOMATION' });
    
    // Immediately show settings panel
    this.showSettings();
    
    // Show confirmation message
    this.showSuccess('Автоматизация остановлена');
    setTimeout(() => {
      this.statusDiv.classList.add('hidden');
    }, 2000);
  }

  showSettings() {
    this.settingsPanel.classList.remove('hidden');
    this.progressPanel.classList.add('hidden');
    this.statusDiv.classList.add('hidden');
  }

  showProgress(current, total, status) {
    this.settingsPanel.classList.add('hidden');
    this.progressPanel.classList.remove('hidden');
    this.statusDiv.classList.add('hidden');
    
    this.currentGameSpan.textContent = current;
    this.totalGamesSpan.textContent = total;
    this.gameStatusDiv.textContent = status;
  }

  showError(message) {
    this.statusDiv.className = 'status error';
    this.statusDiv.textContent = message;
    this.statusDiv.classList.remove('hidden');
  }

  showSuccess(message) {
    this.statusDiv.className = 'status success';
    this.statusDiv.textContent = message;
    this.statusDiv.classList.remove('hidden');
  }

  /**
   * Handle error notifications from ErrorHandler
   * Requirements: 5.4 - Display error notifications in popup
   * @param {Object} errorInfo - Error information object
   */
  handleErrorNotification(errorInfo) {
    console.log('Popup: Error notification received:', errorInfo);
    
    // Show error message to user
    const errorMessage = `${errorInfo.message} (${errorInfo.context})`;
    
    if (errorInfo.recoverable) {
      // For recoverable errors, show warning but don't stop automation
      this.showWarning(errorMessage);
      // Auto-hide warning after 5 seconds
      setTimeout(() => {
        if (this.statusDiv.classList.contains('warning')) {
          this.statusDiv.classList.add('hidden');
        }
      }, 5000);
    } else {
      // For non-recoverable errors, show error and stop
      this.showError(errorMessage);
      setTimeout(() => this.showSettings(), 3000);
    }
  }

  showWarning(message) {
    this.statusDiv.className = 'status warning';
    this.statusDiv.textContent = message;
    this.statusDiv.classList.remove('hidden');
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const popup = window.popupController;
  
  switch (message.type) {
    case 'PROGRESS_UPDATE':
      popup.showProgress(message.currentGame, message.totalGames, message.status);
      break;
    case 'AUTOMATION_COMPLETE':
      popup.showSuccess(message.message || 'Все игры завершены!');
      setTimeout(() => popup.showSettings(), 3000);
      break;
    case 'AUTOMATION_ERROR':
      popup.showError(message.error || 'Произошла ошибка автоматизации');
      setTimeout(() => popup.showSettings(), 3000);
      break;
    case 'ERROR_NOTIFICATION':
      popup.handleErrorNotification(message.errorInfo);
      break;
    case 'AUTOMATION_STOPPED':
      popup.showSettings();
      break;
    case 'GAME_ENDED':
      // Не переходим сразу к настройкам, если играем несколько игр
      popup.showSuccess(message.message || 'Игра завершена');
      // Переход к настройкам только если автоматизация полностью завершена
      break;
  }
});

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.popupController = new PopupController();
});