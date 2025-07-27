/**
 * ГЛАВНЫЙ КООРДИНАТОР ДЛЯ SPRITETYPE.IRYS.XYZ
 * Объединяет парсер слов и движок печати
 */

console.log('🎯 SpriteType Parser загружен');

class SpriteTypeParser {
    constructor() {
        // Инициализируем модули
        this.wordParser = new WordParser();
        this.typingEngine = new TypingEngine();
        
        this.initialize();
    }

    initialize() {
        console.log('🎯 Инициализация SpriteTypeParser');
        
        if (!window.location.href.includes('spritetype.irys.xyz')) {
            console.log('❌ Неправильный сайт, ожидаем автоматического перехода...');
            // Не возвращаемся сразу, даем возможность background script перенаправить
            setTimeout(() => {
                if (!window.location.href.includes('spritetype.irys.xyz')) {
                    console.log('❌ Все еще не на правильном сайте после ожидания');
                    return;
                }
            }, 3000);
        }

        // Тестируем парсер через 2 секунды
        setTimeout(() => {
            if (window.location.href.includes('spritetype.irys.xyz') && this.wordParser) {
                this.wordParser.testParser();
            }
        }, 2000);
        
        // Настраиваем обработчики сообщений
        this.setupMessageHandlers();
        
        // Отправляем сигнал готовности в background
        this.sendMessage('CONTENT_READY');
        
        console.log('✅ SpriteTypeParser готов');
    }

    sendMessage(type, data = {}) {
        chrome.runtime.sendMessage({ type, ...data }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('⚠️ Ошибка отправки сообщения:', chrome.runtime.lastError);
            }
        });
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 Получено сообщение:', message.type);
            
            switch (message.type) {
                case 'START_AUTOMATION':
                    this.startAutomation(message.settings);
                    sendResponse({ success: true });
                    break;
                    
                case 'STOP_AUTOMATION':
                    this.stopAutomation();
                    sendResponse({ success: true });
                    break;

                case 'RESTORE_AUTOMATION':
                    this.restoreAutomation(message.gameState);
                    sendResponse({ success: true });
                    break;
                    
                default:
                    console.log('❓ Неизвестный тип сообщения:', message.type);
            }
        });
    }

    /**
     * Запускает автоматическую печать с выбранными настройками
     */
    async startAutomation(settings = {}) {
        // Проверяем, что мы на правильном сайте
        if (!window.location.href.includes('spritetype.irys.xyz')) {
            console.log('❌ Попытка запуска автоматизации не на целевом сайте');
            this.sendMessage('AUTOMATION_ERROR', {
                error: 'Автоматизация может работать только на сайте spritetype.irys.xyz'
            });
            return;
        }

        if (this.typingEngine.isRunning()) {
            console.log('⚠️ Печать уже запущена');
            return;
        }

        const speedMode = settings.speedMode || 'normal';
        const modeText = speedMode === 'pro' ? 'профессиональном режиме "Хочу быть лучшим"' : 'обычном режиме';
        console.log(`🚀 Запуск автоматической печати в ${modeText}`);
        
        try {
            // Парсим слова
            const words = this.wordParser.parseWords();
            if (words.length === 0) {
                throw new Error('Слова для печати не найдены');
            }

            // Берем ВСЕ слова для печати
            const allWordsText = words.map(w => w.text);
            console.log(`📝 Будем печатать ВСЕ слова: ${allWordsText.join(', ')}`);
            console.log(`📊 Общее количество слов: ${allWordsText.length}`);
            
            if (speedMode === 'pro') {
                console.log(`⚡ Режим "Хочу быть лучшим": удвоенная скорость, без ошибок!`);
            } else {
                console.log(`🎯 Обычный режим: натуральная печать с ошибками`);
            }
            
            // Запускаем мониторинг окончания игры
            this.startGameEndMonitoring();
            
            // Даем время на подготовку перед началом печати
            console.log('⏳ Подготовка к печати...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 секунда подготовки
            
            // Запускаем печать через движок с настройками
            await this.typingEngine.startTyping(allWordsText, settings);
            
        } catch (error) {
            console.error('❌ Ошибка автоматической печати:', error);
            this.sendMessage('AUTOMATION_ERROR', {
                error: error.message
            });
            this.stopAutomation();
        }
    }

    /**
     * Останавливает автоматизацию
     */
    stopAutomation() {
        console.log('🛑 Остановка автоматизации');
        this.typingEngine.stopTyping();
        this.stopGameEndMonitoring();
    }

    /**
     * Запускает мониторинг окончания игры
     */
    startGameEndMonitoring() {
        console.log('👀 Запускаем мониторинг окончания игры...');
        
        this.wordParser.startGameEndMonitoring((action) => {
            if (action === 'STOP_TYPING_ONLY') {
                console.log('🏁 ИГРА ЗАКОНЧЕНА! Останавливаем печать...');
                
                // Принудительно останавливаем печать
                this.typingEngine.forceStop();
                
                // НЕ запускаем следующую игру здесь!
                return;
            }
            
            if (action === 'GAME_COMPLETED') {
                console.log('🎯 ИГРА ПОЛНОСТЬЮ ЗАВЕРШЕНА! Переходим к следующей...');
                
                // Уведомляем background script об окончании игры
                this.sendMessage('GAME_ENDED', {
                    message: 'Игра закончена, автоматически нажата кнопка Submit'
                });

                // Запускаем автоматический переход к следующей игре через увеличенную задержку
                setTimeout(() => {
                    this.startNextGame();
                }, 2500); // Увеличено с 1500 до 2500ms для натуральности
                return;
            }
            
            // Резервный вариант для обратной совместимости
            console.log('🎯 ИГРА ЗАВЕРШЕНА! (резервный путь)');
            this.startNextGame();
        });
    }

    /**
     * Останавливает мониторинг окончания игры
     */
    stopGameEndMonitoring() {
        console.log('🛑 Останавливаем мониторинг окончания игры');
        this.wordParser.stopGameEndMonitoring();
    }

    // Делегируем методы парсера
    parseWords() {
        return this.wordParser.parseWords();
    }

    getGameState() {
        return this.wordParser.getGameState();
    }

    getCurrentWord() {
        return this.wordParser.getCurrentWord();
    }

    getWordsToType() {
        return this.wordParser.getWordsToType();
    }

    // Делегируем методы движка печати
    getTypingState() {
        return this.typingEngine.getState();
    }

    isTyping() {
        return this.typingEngine.isRunning();
    }

    /**
     * Восстанавливает автоматизацию после перезагрузки страницы
     * Используется для продолжения игры при многоигровом режиме
     */
    async restoreAutomation(gameState) {
        console.log('🔄 Начали игру:', gameState);
        
        // Проверяем, что мы на правильном сайте
        if (!window.location.href.includes('spritetype.irys.xyz')) {
            console.log('❌ Попытка восстановления автоматизации не на целевом сайте');
            this.sendMessage('AUTOMATION_ERROR', {
                error: 'Автоматизация может работать только на сайте spritetype.irys.xyz',
                currentGame: gameState?.currentGame || 0
            });
            return;
        }
        
        if (!gameState || !gameState.isRunning) {
            console.log('❌ Нет активного состояния для восстановления');
            return;
        }

        // Уведомляем background о готовности к восстановлению
        this.sendMessage('AUTOMATION_RESTORE_READY', {
            currentGame: gameState.currentGame,
            totalGames: gameState.totalGames
        });

        // Ждем загрузки игры перед запуском автоматизации
        await this.waitForGameReady();

        try {
            console.log(`🎮 Запускаем игру ${gameState.currentGame} из ${gameState.totalGames}`);
            
            // Запускаем автоматизацию с сохраненными настройками
            await this.startAutomation(gameState.settings || {});
            
        } catch (error) {
            console.error('❌ Ошибка восстановления автоматизации:', error);
            this.sendMessage('AUTOMATION_ERROR', {
                error: error.message,
                currentGame: gameState.currentGame
            });
        }
    }

    /**
     * Ждет полной загрузки игры перед запуском автоматизации
     */
    async waitForGameReady() {
        console.log('⏳ Ожидание готовности игры...');
        
        let attempts = 0;
        const maxAttempts = 20; // 10 секунд максимум
        
        while (attempts < maxAttempts) {
            try {
                // Проверяем, что игра загружена
                const words = this.wordParser.parseWords();
                if (words && words.length > 0) {
                    console.log('✅ Игра готова, найдено слов:', words.length);
                    return true;
                }
            } catch (error) {
                // Игра еще не готова
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error('Превышено время ожидания загрузки игры');
    }

    /**
     * Автоматически запускает следующую игру
     * Вызывается после завершения текущей игры
     */
    async startNextGame() {
        console.log('🎯 Попытка автоматического запуска следующей игры...');
        
        try {
            // Даем больше времени на обработку результатов текущей игры
            await new Promise(resolve => setTimeout(resolve, 3500)); // Увеличено с 2000 до 3500ms
            
            // ВСЕГДА используем перезагрузку страницы для гарантированного запуска новой игры
            console.log('🔄 Перезагружаем страницу для запуска новой игры...');
            
            // Уведомляем background о переходе к следующей игре
            this.sendMessage('NEXT_GAME_STARTED');
            
            // Перезагружаем страницу через небольшую задержку
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка при запуске следующей игры:', error);
            
            // В случае ошибки все равно перезагружаем страницу
            console.log('🔄 Перезагружаем страницу после ошибки...');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
            return false;
        }
    }

    /**
     * Ищет кнопку для запуска новой игры
     */
    findPlayAgainButton() {
        // Список возможных селекторов для кнопки новой игры
        const buttonSelectors = [
            'button[onclick*="newGame"]',
            'button[onclick*="playAgain"]',
            'button[onclick*="restart"]',
            '.play-again',
            '.new-game',
            '.restart-button',
            'button:contains("Play Again")',
            'button:contains("New Game")',
            'button:contains("Restart")',
            'button:contains("Начать заново")',
            'button:contains("Новая игра")'
        ];

        for (const selector of buttonSelectors) {
            try {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) { // проверяем что кнопка видима
                    return button;
                }
            } catch (e) {
                // Игнорируем ошибки селекторов с :contains (не поддерживается в querySelector)
                continue;
            }
        }

        // Если не нашли по селекторам, ищем по тексту
        const allButtons = document.querySelectorAll('button, input[type="button"], .btn');
        for (const button of allButtons) {
            const text = button.textContent || button.value || '';
            if (text.match(/(play again|new game|restart|начать заново|новая игра)/i)) {
                if (button.offsetParent !== null) { // проверяем что кнопка видима
                    return button;
                }
            }
        }

        return null;
    }
}

// Создаем парсер
const parser = new SpriteTypeParser();

// Экспорт для отладки
window.parser = parser;
window.spriteTypeParser = parser;
