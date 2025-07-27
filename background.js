// Background script for Irys Typing Bot
// Coordinates communication between popup and content script

class BackgroundController {
  constructor() {
    this.state = {
      isRunning: false,
      currentGame: 0,
      totalGames: 0,
      settings: null,
      processingGameEnd: false
    };

    this.initializeListeners();
  }

  initializeListeners() {
    // Listen for messages from popup and content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle extension icon click - ensure we're on the right site
    chrome.action.onClicked.addListener(async (tab) => {
      if (!tab.url.includes('spritetype.irys.xyz')) {
        console.log('Background: Автоматический переход на spritetype.irys.xyz при клике на иконку');
        await chrome.tabs.update(tab.id, { url: 'https://spritetype.irys.xyz/' });
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_STATE':
        sendResponse(this.state);
        break;

      case 'START_AUTOMATION':
        await this.startAutomation(message.settings);
        sendResponse({ success: true });
        break;

      case 'STOP_AUTOMATION':
        await this.stopAutomation();
        sendResponse({ success: true });
        break;

      case 'CONTENT_READY':
        console.log('Background: Content script is ready');

        // Проверяем, есть ли сохраненное состояние игры
        const savedState = await chrome.storage.local.get('gameState');

        if (savedState.gameState && savedState.gameState.isRunning) {
          console.log('Background: Найдено сохраненное состояние, восстанавливаем игру:', savedState.gameState);

          // Восстанавливаем состояние background
          this.state.isRunning = savedState.gameState.isRunning;
          this.state.currentGame = savedState.gameState.currentGame;
          this.state.totalGames = savedState.gameState.totalGames;
          this.state.settings = savedState.gameState.settings;
          this.state.automationStarted = true; // Важно! Помечаем как уже запущенную

          // Отправляем команду восстановления в content script
          setTimeout(() => {
            this.sendToContentScript({
              type: 'RESTORE_AUTOMATION',
              gameState: savedState.gameState
            });
          }, 1000); // Даем больше времени на загрузку

        } else if (this.state.isRunning && this.state.settings && !this.state.automationStarted) {
          // Обычный запуск новой автоматизации
          console.log('Background: Starting automation after content script ready');
          this.state.automationStarted = true; // Prevent multiple starts
          setTimeout(() => {
            this.sendToContentScript({
              type: 'START_AUTOMATION',
              settings: this.state.settings
            });
          }, 500);
        }

        sendResponse({ success: true });
        break;

      case 'TYPE_CHARACTER':
        // ИСПОЛЬЗУЕМ DEBUGGER API ДЛЯ ОТПРАВКИ РЕАЛЬНЫХ СОБЫТИЙ
        await this.handleTypeCharacter(message.character, sender.tab.id);
        sendResponse({ success: true });
        break;

      case 'TYPE_BACKSPACE':
        // ИСПОЛЬЗУЕМ DEBUGGER API ДЛЯ ОТПРАВКИ BACKSPACE
        await this.handleTypeBackspace(sender.tab.id);
        sendResponse({ success: true });
        break;

      case 'PROGRESS_UPDATE':
        this.updateProgress(message);
        break;

      case 'AUTOMATION_COMPLETE':
        this.handleAutomationComplete();
        break;

      case 'ERROR_NOTIFICATION':
        this.handleErrorNotification(message.errorInfo);
        break;

      case 'GAME_ENDED':
        this.handleGameEnded(message);
        sendResponse({ success: true });
        break;

      case 'NEXT_GAME_STARTED':
        this.handleNextGameStarted();
        sendResponse({ success: true });
        break;

      case 'AUTOMATION_RESTORE_READY':
        this.handleAutomationRestoreReady(message);
        sendResponse({ success: true });
        break;

      case 'AUTOMATION_ERROR':
        this.handleAutomationError(message);
        sendResponse({ success: true });
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  async startAutomation(settings) {
    console.log('Background: Starting automation with settings:', settings);

    // ПРИНУДИТЕЛЬНО ОЧИЩАЕМ СТАРЫЕ ДАННЫЕ ПЕРЕД ЗАПУСКОМ
    console.log('🧹 ОЧИСТКА старого состояния перед запуском...');
    await chrome.storage.local.clear();
    console.log('✅ Storage очищен, начинаем с чистого листа');

    // Reset automation state flags
    this.state.automationStarted = false;

    this.state.isRunning = true;
    this.state.currentGame = 1;
    this.state.totalGames = settings.gameCount;
    this.state.settings = settings;

    console.log(`🎮 НОВАЯ АВТОМАТИЗАЦИЯ: игра ${this.state.currentGame} из ${this.state.totalGames}`);

    // Ensure we're on the correct site
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    // Store the tab ID for later use
    this.state.targetTabId = currentTab.id;

    // Проверяем, находимся ли мы на правильном сайте
    const targetUrl = 'https://spritetype.irys.xyz/';
    const isOnTargetSite = currentTab.url && currentTab.url.includes('spritetype.irys.xyz');

    if (!isOnTargetSite) {
      console.log('Background: Автоматический переход на целевой сайт:', targetUrl);

      // Уведомляем popup о переходе на нужную страницу
      this.sendToPopup({
        type: 'PROGRESS_UPDATE',
        currentGame: this.state.currentGame,
        totalGames: this.state.totalGames,
        status: 'Переход на spritetype.irys.xyz...'
      });

      // Переходим на целевой сайт
      await chrome.tabs.update(currentTab.id, { url: targetUrl });

      // Ждем загрузки страницы
      await this.waitForPageLoad(currentTab.id);

    } else {
      // Always refresh the page before starting automation to ensure clean state
      console.log('Background: Обновление страницы для чистого состояния');

      this.sendToPopup({
        type: 'PROGRESS_UPDATE',
        currentGame: this.state.currentGame,
        totalGames: this.state.totalGames,
        status: 'Подготовка к игре...'
      });

      await chrome.tabs.reload(currentTab.id);
      await this.waitForPageLoad(currentTab.id);
    }

    // Notify popup
    this.sendToPopup({
      type: 'PROGRESS_UPDATE',
      currentGame: this.state.currentGame,
      totalGames: this.state.totalGames,
      status: 'Ожидание загрузки игры...'
    });

    // Note: We now wait for CONTENT_READY message instead of using setTimeout
    console.log('Background: Waiting for content script to be ready...');
  }

  async stopAutomation() {
    console.log('Background: Stopping automation, current state:', this.state);
    this.state.isRunning = false;
    this.state.automationStarted = false; // Reset flag for next start
    this.state.processingGameEnd = false; // Reset game end processing flag

    // ПРИНУДИТЕЛЬНО ОЧИЩАЕМ ВСЕ СОХРАНЕННЫЕ ДАННЫЕ
    console.log('🧹 ПРИНУДИТЕЛЬНАЯ ОЧИСТКА chrome.storage.local...');
    await chrome.storage.local.clear();
    console.log('✅ Storage полностью очищен');

    // Сбрасываем состояние
    this.state.currentGame = 0;
    this.state.totalGames = 0;
    this.state.settings = null;

    // Send stop message to content script
    this.sendToContentScript({ type: 'STOP_AUTOMATION' });

    // Notify popup
    this.sendToPopup({ type: 'AUTOMATION_STOPPED' });
  }

  updateProgress(message) {
    // НЕ перезаписываем this.state.currentGame из сообщений!
    // Счетчик управляется только в handleGameCompleted

    // Forward to popup
    this.sendToPopup({
      type: 'PROGRESS_UPDATE',
      currentGame: this.state.currentGame, // Используем НАШЕ значение счетчика
      totalGames: this.state.totalGames,
      status: message.status
    });
  }

  handleAutomationComplete() {
    this.state.isRunning = false;
    this.sendToPopup({ type: 'AUTOMATION_COMPLETE' });
  }

  /**
   * Обрабатывает окончание игры
   */
  handleGameEnded(message) {
    console.log('🎯 Background: handleGameEnded ВЫЗВАН - игра закончена, получено сообщение:', message.message);
    console.log(`🎯 Background: Состояние перед обработкой - currentGame: ${this.state.currentGame}, isRunning: ${this.state.isRunning}, processingGameEnd: ${this.state.processingGameEnd}`);

    if (!this.state.isRunning) {
      console.log('❌ Background: Автоматизация не активна, игнорируем завершение игры');
      return;
    }

    // Обрабатываем завершение игры и переход к следующей
    console.log('▶️ Background: Вызываем handleGameCompleted...');
    this.handleGameCompleted();
  }

  /**
   * Обрабатывает завершение одной игры и переход к следующей
   */
  async handleGameCompleted() {
    console.log('🔍 Background: handleGameCompleted НАЧАЛО - проверяем нужно ли продолжать...');
    console.log(`🔍 Background: Текущее состояние - currentGame: ${this.state.currentGame}, totalGames: ${this.state.totalGames}, isRunning: ${this.state.isRunning}, processingGameEnd: ${this.state.processingGameEnd}`);

    if (!this.state.isRunning) {
      console.log('❌ Background: Автоматизация не активна, игнорируем');
      return;
    }

    // Защита от двойного вызова - проверяем, не обрабатываем ли уже завершение
    if (this.state.processingGameEnd) {
      console.log('⚠️ Background: Завершение игры уже обрабатывается, игнорируем повторный вызов');
      return;
    }

    this.state.processingGameEnd = true;
    console.log('🔒 Background: Установили блокировку processingGameEnd = true');

    try {
      console.log(`📊 Background: Завершена игра ${this.state.currentGame} из ${this.state.totalGames}`);

      // Проверяем, достигли ли целевого количества игр (БЕЗ увеличения счетчика)
      if (this.state.currentGame >= this.state.totalGames) {
        console.log('🏁 Background: Все игры завершены!');
        this.state.isRunning = false;

        // Очищаем сохраненное состояние
        await chrome.storage.local.remove('gameState');

        // Уведомляем popup о завершении всех игр
        this.sendToPopup({
          type: 'AUTOMATION_COMPLETE',
          message: `Завершены все ${this.state.totalGames} игр(ы)`
        });

        // Сброс состояния
        this.state.currentGame = 0;
        this.state.totalGames = 0;
        this.state.settings = null;

        return;
      }

      // Увеличиваем счетчик только сейчас, перед переходом к следующей игре
      const oldGame = this.state.currentGame;
      this.state.currentGame++;
      console.log(`➡️ Background: УВЕЛИЧИЛИ счетчик с ${oldGame} на ${this.state.currentGame}`);
      console.log(`🎮 Background: Переходим к игре ${this.state.currentGame} из ${this.state.totalGames}`);

      // Обновляем прогресс
      this.sendToPopup({
        type: 'PROGRESS_UPDATE',
        currentGame: this.state.currentGame,
        totalGames: this.state.totalGames,
        status: `Ожидание новой игры ${this.state.currentGame} из ${this.state.totalGames}`
      });

      // Сохраняем состояние для восстановления после перезагрузки страницы
      await chrome.storage.local.set({
        gameState: {
          isRunning: true,
          currentGame: this.state.currentGame,
          totalGames: this.state.totalGames,
          settings: this.state.settings
        }
      });

      console.log('💾 Background: Состояние сохранено, content script запустит следующую игру...');

    } finally {
      // Снимаем блокировку через небольшую задержку
      setTimeout(() => {
        console.log('🔓 Background: Снимаем блокировку processingGameEnd через 2 секунды');
        this.state.processingGameEnd = false;
      }, 2000);
    }
  }

  /**
   * Handle error notifications from content script
   * Requirements: 5.4 - Centralized error notifications to popup
   * @param {Object} errorInfo - Error information object
   */
  handleErrorNotification(errorInfo) {
    console.log('Background: Error notification received:', errorInfo);

    // Forward error notification to popup
    this.sendToPopup({
      type: 'ERROR_NOTIFICATION',
      errorInfo: errorInfo
    });

    // If error is critical and not recoverable, stop automation
    if (!errorInfo.recoverable && this.state.isRunning) {
      console.warn('Background: Critical error detected, stopping automation due to:', errorInfo.message);
      this.handleAutomationError({
        error: errorInfo.message,
        currentGame: this.state.currentGame
      });
    }
  }

  /**
   * Ожидает полной загрузки страницы
   */
  async waitForPageLoad(tabId) {
    return new Promise((resolve) => {
      const checkComplete = () => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            console.warn('Background: Ошибка получения информации о вкладке:', chrome.runtime.lastError);
            resolve();
            return;
          }

          if (tab.status === 'complete') {
            console.log('Background: Страница полностью загружена');
            // Дополнительная задержка для загрузки скриптов
            setTimeout(resolve, 1500);
          } else {
            console.log('Background: Ожидание загрузки страницы...');
            setTimeout(checkComplete, 500);
          }
        });
      };

      checkComplete();
    });
  }

  async sendToContentScript(message) {
    try {
      // Use stored tab ID if available
      if (this.state.targetTabId) {
        console.log('Background: Sending message to content script:', message.type, 'Tab ID:', this.state.targetTabId);
        try {
          const response = await chrome.tabs.sendMessage(this.state.targetTabId, message);
          console.log('Background: Content script response:', response);
          return;
        } catch (error) {
          console.warn('Background: Failed to send to stored tab ID, trying fallback:', error.message);
        }
      }

      // Fallback: First try to find the spritetype.irys.xyz tab specifically
      const spriteTabs = await chrome.tabs.query({ url: 'https://spritetype.irys.xyz/*' });

      if (spriteTabs.length > 0) {
        const targetTab = spriteTabs[0];
        console.log('Background: Sending message to content script:', message.type, 'Tab:', targetTab.url);
        const response = await chrome.tabs.sendMessage(targetTab.id, message);
        console.log('Background: Content script response:', response);
      } else {
        // Final fallback to active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('Background: No spritetype tab found, using active tab:', tabs[0]?.url);
        if (tabs[0]) {
          const response = await chrome.tabs.sendMessage(tabs[0].id, message);
          console.log('Background: Content script response:', response);
        } else {
          console.error('Background: No active tab found');
        }
      }
    } catch (error) {
      console.error('Failed to send message to content script:', error);
    }
  }

  async sendToPopup(message) {
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      // Popup might be closed, that's okay
      console.log('Popup not available for message:', message.type);
    }
  }

  /**
   * ОТПРАВЛЯЕТ РЕАЛЬНЫЕ СОБЫТИЯ КЛАВИАТУРЫ ЧЕРЕЗ DEBUGGER API
   */
  async handleTypeCharacter(character, tabId) {
    try {
      console.log(`🔥 DEBUGGER API: отправляем символ "${character}" (код: ${character.charCodeAt(0)}) на tab ${tabId}`);

      // Подключаемся к debugger
      await new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, '1.3', () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      console.log('✅ Debugger подключен');

      // Отправляем ТОЛЬКО keyDown и keyUp (БЕЗ char!)
      await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyDown',
          text: character,
          key: character,
          code: `Key${character.toUpperCase()}`,
          windowsVirtualKeyCode: character.toUpperCase().charCodeAt(0),
          nativeVirtualKeyCode: character.toUpperCase().charCodeAt(0),
          isKeypad: false
        }, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log(`📤 keyDown отправлен для "${character}"`);
            resolve(result);
          }
        });
      });

      // Отправляем keyUp
      await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyUp',
          text: character,
          key: character,
          code: `Key${character.toUpperCase()}`,
          windowsVirtualKeyCode: character.toUpperCase().charCodeAt(0),
          nativeVirtualKeyCode: character.toUpperCase().charCodeAt(0),
          isKeypad: false
        }, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log(`📤 keyUp отправлен для "${character}"`);
            resolve(result);
          }
        });
      });

      // Отключаемся от debugger
      chrome.debugger.detach({ tabId }, () => {
        console.log('✅ Debugger отключен');
      });

      console.log(`🔥 СИМВОЛ "${character}" ПОЛНОСТЬЮ ОТПРАВЛЕН!`);

    } catch (error) {
      console.error('❌ Ошибка Debugger API:', error);

      // Отключаемся в случае ошибки
      chrome.debugger.detach({ tabId }, () => { });

      throw error;
    }
  }

  /**
   * Обрабатывает уведомление о запуске следующей игры
   */
  handleNextGameStarted() {
    console.log('Background: Получено уведомление о запуске следующей игры');

    if (this.state.isRunning) {
      // Обновляем прогресс в popup
      this.sendToPopup({
        type: 'PROGRESS_UPDATE',
        currentGame: this.state.currentGame,
        totalGames: this.state.totalGames,
        status: `Переход к игре ${this.state.currentGame} из ${this.state.totalGames}`
      });
    }
  }

  /**
   * Обрабатывает уведомление о готовности к восстановлению автоматизации
   */
  handleAutomationRestoreReady(message) {
    console.log('Background: Content script готов к восстановлению автоматизации');

    this.state.currentGame = message.currentGame;
    this.state.totalGames = message.totalGames;

    // Обновляем прогресс в popup
    this.sendToPopup({
      type: 'PROGRESS_UPDATE',
      currentGame: this.state.currentGame,
      totalGames: this.state.totalGames,
      status: `Начали игру ${this.state.currentGame} из ${this.state.totalGames}`
    });
  }

  /**
   * Обрабатывает ошибки автоматизации
   */
  handleAutomationError(message) {
    console.error('Background: Ошибка автоматизации:', message.error);

    // Останавливаем автоматизацию при ошибке
    this.state.isRunning = false;

    // Уведомляем popup об ошибке
    this.sendToPopup({
      type: 'AUTOMATION_ERROR',
      error: message.error,
      currentGame: message.currentGame || this.state.currentGame
    });

    // Очищаем сохраненное состояние
    chrome.storage.local.remove('gameState');
  }

  /**
   * ОТПРАВЛЯЕТ BACKSPACE ЧЕРЕЗ DEBUGGER API
   */
  async handleTypeBackspace(tabId) {
    try {
      console.log(`🔙 DEBUGGER API: отправляем Backspace на tab ${tabId}`);

      // Подключаемся к debugger
      await new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, '1.3', () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      console.log('✅ Debugger подключен для Backspace');

      // Отправляем keyDown для Backspace
      await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: 'Backspace',
          code: 'Backspace',
          windowsVirtualKeyCode: 8,
          nativeVirtualKeyCode: 8,
          isKeypad: false
        }, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('📤 Backspace keyDown отправлен');
            resolve(result);
          }
        });
      });

      // Отправляем keyUp для Backspace
      await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: 'Backspace',
          code: 'Backspace',
          windowsVirtualKeyCode: 8,
          nativeVirtualKeyCode: 8,
          isKeypad: false
        }, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('📤 Backspace keyUp отправлен');
            resolve(result);
          }
        });
      });

      // Отключаемся от debugger
      chrome.debugger.detach({ tabId }, () => {
        console.log('✅ Debugger отключен после Backspace');
      });

      console.log('🔙 BACKSPACE успешно отправлен!');

    } catch (error) {
      console.error('❌ Ошибка Backspace Debugger API:', error);

      // Отключаемся в случае ошибки
      chrome.debugger.detach({ tabId }, () => { });

      throw error;
    }
  }
}

// Initialize background controller
const backgroundController = new BackgroundController();