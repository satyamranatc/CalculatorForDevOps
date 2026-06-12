document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let expression = '';
    let currentInput = '0';
    let isResultDisplayed = false;
    let history = [];

    // DOM Elements
    const displayEl = document.getElementById('display');
    const expressionEl = document.getElementById('expression');
    const equalsSignEl = document.getElementById('equals-sign');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const historyToggleBtn = document.getElementById('history-toggle');
    const closeHistoryBtn = document.getElementById('close-history');
    const clearHistoryBtn = document.getElementById('clear-history');
    const historyPanel = document.getElementById('history-panel');
    const historyList = document.getElementById('history-list');
    const toastEl = document.getElementById('toast');
    const body = document.body;

    // Load theme and history from localStorage
    init();

    // Event Listeners for Keypad Buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.val;
            const action = btn.dataset.action;

            if (val) {
                handleNumber(val);
            } else if (action) {
                handleAction(action, btn.dataset.val || btn.innerText);
            }
            updateDisplay();
        });
    });

    // Theme Toggle Handler
    themeToggleBtn.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.replace('dark-theme', 'light-theme');
            localStorage.setItem('theme', 'light-theme');
        } else {
            body.classList.replace('light-theme', 'dark-theme');
            localStorage.setItem('theme', 'dark-theme');
        }
    });

    // History Toggle Handlers
    historyToggleBtn.addEventListener('click', () => {
        renderHistory();
        historyPanel.classList.add('active');
    });

    closeHistoryBtn.addEventListener('click', () => {
        historyPanel.classList.remove('active');
    });

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.setItem('calc-history', JSON.stringify(history));
        renderHistory();
        showToast('History cleared');
    });

    // Keyboard Input Handler
    document.addEventListener('keydown', (e) => {
        let key = e.key;
        let buttonId = null;

        // Map keys to actions
        if (!isNaN(key)) {
            handleNumber(key);
            // Visual feedback
            highlightButtonByValue(key);
        } else if (key === '.') {
            handleAction('decimal');
            buttonId = 'key-decimal';
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
            let op = key;
            handleAction('operator', op);
            if (op === '+') buttonId = 'key-add';
            if (op === '-') buttonId = 'key-subtract';
            if (op === '*') buttonId = 'key-multiply';
            if (op === '/') buttonId = 'key-divide';
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleAction('calculate');
            buttonId = 'key-equals';
        } else if (key === 'Backspace') {
            handleAction('backspace');
            buttonId = 'key-backspace';
        } else if (key === 'Escape') {
            handleAction('clear');
            buttonId = 'key-clear';
        } else if (key === '%') {
            handleAction('percent');
            buttonId = 'key-percent';
        } else if (key === '(' || key === ')') {
            handleAction('parentheses');
            buttonId = 'key-parentheses';
        }

        if (buttonId) {
            const btn = document.getElementById(buttonId);
            if (btn) {
                btn.classList.add('btn-pressed');
                setTimeout(() => btn.classList.remove('btn-pressed'), 100);
            }
        }
        updateDisplay();
    });

    // State Initialization
    function init() {
        // Theme
        const savedTheme = localStorage.getItem('theme') || 'dark-theme';
        body.className = savedTheme;

        // History
        const savedHistory = localStorage.getItem('calc-history');
        if (savedHistory) {
            try {
                history = JSON.parse(savedHistory);
            } catch (err) {
                history = [];
            }
        }
    }

    // Number Handler
    function handleNumber(num) {
        if (isResultDisplayed) {
            currentInput = num;
            isResultDisplayed = false;
        } else {
            if (currentInput === '0') {
                currentInput = num;
            } else {
                currentInput += num;
            }
        }
    }

    // Action Handler
    function handleAction(action, label = '') {
        switch (action) {
            case 'clear':
                expression = '';
                currentInput = '0';
                isResultDisplayed = false;
                break;

            case 'backspace':
                if (isResultDisplayed) {
                    expression = '';
                    isResultDisplayed = false;
                } else if (currentInput.length > 1) {
                    currentInput = currentInput.slice(0, -1);
                } else {
                    currentInput = '0';
                }
                break;

            case 'decimal':
                if (isResultDisplayed) {
                    currentInput = '0.';
                    isResultDisplayed = false;
                } else if (!currentInput.includes('.')) {
                    currentInput += '.';
                }
                break;

            case 'operator':
                const opMap = {
                    '+': '+',
                    '-': '−',
                    '*': '×',
                    '/': '÷'
                };
                const displayOp = opMap[label] || label;
                const standardOp = label;

                if (isResultDisplayed) {
                    expression = currentInput + ' ' + displayOp + ' ';
                    isResultDisplayed = false;
                } else {
                    if (currentInput !== '0' || expression === '') {
                        expression += currentInput + ' ' + displayOp + ' ';
                    } else if (expression !== '') {
                        // Replace last operator if already present
                        expression = expression.trim().replace(/[+\−×÷]$/, displayOp) + ' ';
                    }
                }
                currentInput = '0';
                break;

            case 'parentheses':
                if (isResultDisplayed) {
                    expression = '(';
                    currentInput = '0';
                    isResultDisplayed = false;
                } else {
                    const openBrackets = (expression.match(/\(/g) || []).length;
                    const closeBrackets = (expression.match(/\)/g) || []).length;
                    const lastChar = expression.trim().slice(-1);

                    // Logic to insert open or close parenthesis
                    if (openBrackets > closeBrackets && 
                        (currentInput !== '0' || lastChar === ')' || !isNaN(lastChar))) {
                        // Close parenthesis
                        if (currentInput !== '0') {
                            expression += currentInput + ')';
                            currentInput = '0';
                        } else {
                            expression += ')';
                        }
                    } else {
                        // Open parenthesis
                        if (expression === '') {
                            expression = '(';
                        } else if (/[+\−×÷(]$/.test(expression.trim())) {
                            expression += '(';
                        } else {
                            expression += ' × (';
                        }
                    }
                }
                break;

            case 'percent':
                if (currentInput !== '0') {
                    const val = parseFloat(currentInput);
                    currentInput = String(val / 100);
                }
                break;

            case 'calculate':
                evaluateExpression();
                break;
        }
    }

    // Evaluate Expression
    function evaluateExpression() {
        let fullExpression = expression;
        if (currentInput !== '0' || !expression.endsWith(')')) {
            fullExpression += currentInput;
        }

        if (fullExpression.trim() === '') return;

        // Balance parentheses if needed
        const openBrackets = (fullExpression.match(/\(/g) || []).length;
        const closeBrackets = (fullExpression.match(/\)/g) || []).length;
        if (openBrackets > closeBrackets) {
            fullExpression += ')'.repeat(openBrackets - closeBrackets);
        }

        // Prepare for JS evaluation
        let jsExpression = fullExpression
            .replace(/÷/g, '/')
            .replace(/×/g, '*')
            .replace(/−/g, '-');

        try {
            // Validate expression characters (allow digits, decimals, operators, spaces, parentheses)
            if (!/^[0-9.+\-*/()\s]+$/.test(jsExpression)) {
                throw new Error('Invalid characters');
            }

            // Safe calculation evaluation using Function
            const evalResult = new Function(`return (${jsExpression})`)();
            
            if (evalResult === Infinity || evalResult === -Infinity) {
                showToast('Cannot divide by zero');
                currentInput = 'Error';
                isResultDisplayed = true;
                return;
            }

            if (isNaN(evalResult)) {
                showToast('Invalid mathematical statement');
                currentInput = 'Error';
                isResultDisplayed = true;
                return;
            }

            // Avoid long floating point representation errors
            const finalResult = formatResult(evalResult);

            // Save calculation to history
            saveHistoryItem(fullExpression, finalResult);

            expression = fullExpression;
            currentInput = String(finalResult);
            isResultDisplayed = true;

        } catch (error) {
            showToast('Error in expression');
            currentInput = 'Error';
            isResultDisplayed = true;
        }
    }

    // Clean up float errors (e.g. 0.1 + 0.2)
    function formatResult(value) {
        if (typeof value !== 'number') return value;
        
        // Check if value has decimal parts
        if (value % 1 !== 0) {
            // Round to 10 decimal places to eliminate common JS float inaccuracies
            const roundedVal = Number(Math.round(value + 'e10') + 'e-10');
            // If the output fits under a reasonable scientific notation, return normal
            if (String(roundedVal).length > 12) {
                return roundedVal.toExponential(6);
            }
            return roundedVal;
        }
        return value;
    }

    // Update Layout Elements
    function updateDisplay() {
        expressionEl.textContent = expression;
        displayEl.textContent = currentInput;

        // Auto-scroll input displays to the right so user sees recent values
        expressionEl.scrollLeft = expressionEl.scrollWidth;
        displayEl.parentElement.scrollLeft = displayEl.parentElement.scrollWidth;

        // Adjust text size based on character length to avoid clipping
        if (currentInput.length > 10) {
            displayEl.style.fontSize = '1.6rem';
        } else if (currentInput.length > 8) {
            displayEl.style.fontSize = '1.9rem';
        } else {
            displayEl.style.fontSize = '2.2rem';
        }

        // Handle Equals Symbol visibility on Screen
        if (isResultDisplayed && currentInput !== 'Error') {
            equalsSignEl.classList.add('visible');
        } else {
            equalsSignEl.classList.remove('visible');
        }
    }

    // Save and Sync History
    function saveHistoryItem(exp, res) {
        history.unshift({ expression: exp, result: String(res) });
        // Cap history at 30 items
        if (history.length > 30) {
            history.pop();
        }
        localStorage.setItem('calc-history', JSON.stringify(history));
    }

    // Render Calculation History Panel Items
    function renderHistory() {
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            const emptyEl = document.createElement('li');
            emptyEl.className = 'history-empty';
            emptyEl.textContent = 'No history yet';
            historyList.appendChild(emptyEl);
            return;
        }

        history.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.setAttribute('data-index', index);
            
            const expSpan = document.createElement('span');
            expSpan.className = 'history-item-exp';
            expSpan.textContent = item.expression;

            const resSpan = document.createElement('span');
            resSpan.className = 'history-item-res';
            resSpan.textContent = item.result;

            li.appendChild(expSpan);
            li.appendChild(resSpan);

            // Click history item to recall calculation
            li.addEventListener('click', () => {
                expression = item.expression;
                currentInput = item.result;
                isResultDisplayed = true;
                historyPanel.classList.remove('active');
                updateDisplay();
                showToast('Recalled calculation');
            });

            historyList.appendChild(li);
        });
    }

    // Show Notification Toast
    function showToast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, 2500);
    }

    // Helper to highlight buttons on keyboard input
    function highlightButtonByValue(num) {
        // Query btn by checking data-val
        const btn = Array.from(buttons).find(b => b.dataset.val === num);
        if (btn) {
            btn.classList.add('btn-pressed');
            setTimeout(() => btn.classList.remove('btn-pressed'), 100);
        }
    }
});
