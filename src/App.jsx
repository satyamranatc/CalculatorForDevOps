import { useState, useEffect, useRef, useCallback } from 'react';

function App() {
  // State Variables
  const [expression, setExpression] = useState('');
  const [currentInput, setCurrentInput] = useState('0');
  const [isResultDisplayed, setIsResultDisplayed] = useState(false);
  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem('calc-history');
    if (savedHistory) {
      try {
        return JSON.parse(savedHistory);
      } catch (err) {
        return [];
      }
    }
    return [];
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark-theme';
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [pressedButtonId, setPressedButtonId] = useState(null);

  // Refs for display auto-scrolling
  const expressionRef = useRef(null);
  const displayParentRef = useRef(null);

  // Trigger toast notification
  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setShowToast(true);
  }, []);

  // Sync theme with body class and local storage
  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Dismiss toast after delay
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Auto-scroll input displays when content changes
  useEffect(() => {
    if (expressionRef.current) {
      expressionRef.current.scrollLeft = expressionRef.current.scrollWidth;
    }
    if (displayParentRef.current) {
      displayParentRef.current.scrollLeft = displayParentRef.current.scrollWidth;
    }
  }, [expression, currentInput]);

  // Highlight buttons on keyboard input
  const triggerPressEffect = useCallback((id) => {
    setPressedButtonId(id);
    setTimeout(() => {
      setPressedButtonId((prev) => (prev === id ? null : prev));
    }, 100);
  }, []);

  // Save history item
  const saveHistoryItem = useCallback((exp, res) => {
    setHistory((prevHistory) => {
      const newHistory = [{ expression: exp, result: String(res) }, ...prevHistory];
      if (newHistory.length > 30) {
        newHistory.pop();
      }
      localStorage.setItem('calc-history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Clean up float errors (e.g. 0.1 + 0.2)
  const formatResult = useCallback((value) => {
    if (typeof value !== 'number') return value;
    
    if (value % 1 !== 0) {
      // Round to 10 decimal places to eliminate common JS float inaccuracies
      const roundedVal = Number(Math.round(value + 'e10') + 'e-10');
      if (String(roundedVal).length > 12) {
        return roundedVal.toExponential(6);
      }
      return roundedVal;
    }
    return value;
  }, []);

  // Evaluate Expression
  const evaluateExpression = useCallback((currentExpr, currentInp) => {
    let fullExpression = currentExpr;
    if (currentInp !== '0' || !currentExpr.endsWith(')')) {
      fullExpression += currentInp;
    }

    if (fullExpression.trim() === '') return;

    // Balance parentheses if needed
    const openBrackets = (fullExpression.match(/\(/g) || []).length;
    const closeBrackets = (fullExpression.match(/\)/g) || []).length;
    if (openBrackets > closeBrackets) {
      fullExpression += ')'.repeat(openBrackets - closeBrackets);
    }

    // Prepare for JS evaluation
    const jsExpression = fullExpression
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
        triggerToast('Cannot divide by zero');
        setCurrentInput('Error');
        setIsResultDisplayed(true);
        return;
      }

      if (isNaN(evalResult)) {
        triggerToast('Invalid mathematical statement');
        setCurrentInput('Error');
        setIsResultDisplayed(true);
        return;
      }

      const finalResult = formatResult(evalResult);
      saveHistoryItem(fullExpression, finalResult);

      setExpression(fullExpression);
      setCurrentInput(String(finalResult));
      setIsResultDisplayed(true);
    } catch (error) {
      triggerToast('Error in expression');
      setCurrentInput('Error');
      setIsResultDisplayed(true);
    }
  }, [formatResult, saveHistoryItem, triggerToast]);

  // Number Handler
  const handleNumber = useCallback((num) => {
    setIsResultDisplayed((prevIsResult) => {
      if (prevIsResult) {
        setCurrentInput(num);
        return false;
      } else {
        setCurrentInput((prevInput) => {
          if (prevInput === '0') {
            return num;
          } else {
            return prevInput + num;
          }
        });
        return false;
      }
    });
  }, []);

  // Action Handler
  const handleAction = useCallback((action, label = '') => {
    switch (action) {
      case 'clear':
        setExpression('');
        setCurrentInput('0');
        setIsResultDisplayed(false);
        break;

      case 'backspace':
        setIsResultDisplayed((prevIsResult) => {
          if (prevIsResult) {
            setExpression('');
            return false;
          } else {
            setCurrentInput((prevInput) => {
              if (prevInput.length > 1) {
                return prevInput.slice(0, -1);
              }
              return '0';
            });
            return false;
          }
        });
        break;

      case 'decimal':
        setIsResultDisplayed((prevIsResult) => {
          if (prevIsResult) {
            setCurrentInput('0.');
            return false;
          } else {
            setCurrentInput((prevInput) => {
              if (!prevInput.includes('.')) {
                return prevInput + '.';
              }
              return prevInput;
            });
            return false;
          }
        });
        break;

      case 'operator':
        const opMap = {
          '+': '+',
          '-': '−',
          '*': '×',
          '/': '÷'
        };
        const displayOp = opMap[label] || label;

        setIsResultDisplayed((prevIsResult) => {
          if (prevIsResult) {
            setCurrentInput((prevInput) => {
              setExpression(prevInput + ' ' + displayOp + ' ');
              return '0';
            });
            return false;
          } else {
            setCurrentInput((prevInput) => {
              setExpression((prevExpr) => {
                if (prevInput !== '0' || prevExpr === '') {
                  return prevExpr + prevInput + ' ' + displayOp + ' ';
                } else if (prevExpr !== '') {
                  return prevExpr.trim().replace(/[+\−×÷]$/, displayOp) + ' ';
                }
                return prevExpr;
              });
              return '0';
            });
            return false;
          }
        });
        break;

      case 'parentheses':
        setIsResultDisplayed((prevIsResult) => {
          if (prevIsResult) {
            setExpression('(');
            setCurrentInput('0');
            return false;
          } else {
            setExpression((prevExpr) => {
              let nextExpr = prevExpr;
              setCurrentInput((prevInput) => {
                const openBrackets = (prevExpr.match(/\(/g) || []).length;
                const closeBrackets = (prevExpr.match(/\)/g) || []).length;
                const lastChar = prevExpr.trim().slice(-1);

                if (openBrackets > closeBrackets && 
                    (prevInput !== '0' || lastChar === ')' || !isNaN(lastChar))) {
                  if (prevInput !== '0') {
                    nextExpr = prevExpr + prevInput + ')';
                  } else {
                    nextExpr = prevExpr + ')';
                  }
                  setExpression(nextExpr);
                  return '0';
                } else {
                  if (prevExpr === '') {
                    nextExpr = '(';
                  } else if (/[+\−×÷(]$/.test(prevExpr.trim())) {
                    nextExpr = prevExpr + '(';
                  } else {
                    nextExpr = prevExpr + ' × (';
                  }
                  setExpression(nextExpr);
                  return prevInput;
                }
              });
              return prevExpr;
            });
            return false;
          }
        });
        break;

      case 'percent':
        setCurrentInput((prevInput) => {
          if (prevInput !== '0') {
            const val = parseFloat(prevInput);
            return String(val / 100);
          }
          return prevInput;
        });
        break;

      case 'calculate':
        // We use state functional approach to get latest expression/currentInput
        setIsResultDisplayed((prevIsResult) => {
          setCurrentInput((prevInput) => {
            setExpression((prevExpr) => {
              evaluateExpression(prevExpr, prevInput);
              return prevExpr;
            });
            return prevInput;
          });
          return prevIsResult;
        });
        break;
    }
  }, [evaluateExpression]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      let buttonId = null;

      if (!isNaN(key) && key !== ' ') {
        handleNumber(key);
        buttonId = `key-${key}`;
      } else if (key === '.') {
        handleAction('decimal');
        buttonId = 'key-decimal';
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        handleAction('operator', key);
        if (key === '+') buttonId = 'key-add';
        if (key === '-') buttonId = 'key-subtract';
        if (key === '*') buttonId = 'key-multiply';
        if (key === '/') buttonId = 'key-divide';
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
        triggerPressEffect(buttonId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNumber, handleAction, triggerPressEffect]);

  // Adjust display text size based on character length to avoid clipping
  const getDisplayFontSize = () => {
    if (currentInput.length > 10) return '1.6rem';
    if (currentInput.length > 8) return '1.9rem';
    return '2.2rem';
  };

  // Toggle light/dark themes
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark-theme' ? 'light-theme' : 'dark-theme'));
  };

  // Clear memory history list
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('calc-history');
    triggerToast('History cleared');
  };

  return (
    <>
      {/* Background glowing shapes for glassmorphism effect */}
      <div className="glow-bg">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="calculator-container">
        {/* Theme & Utility Header */}
        <header className="calc-header">
          <button 
            id="theme-toggle" 
            className="icon-btn" 
            aria-label="Toggle Theme" 
            title="Toggle Theme"
            onClick={toggleTheme}
          >
            <i className="fa-solid fa-sun light-icon"></i>
            <i className="fa-solid fa-moon dark-icon"></i>
          </button>
          <div className="logo">Nice Calculator</div>
          <button 
            id="history-toggle" 
            className="icon-btn" 
            aria-label="View History" 
            title="View History"
            onClick={() => setIsHistoryOpen(true)}
          >
            <i className="fa-solid fa-history"></i>
          </button>
        </header>

        {/* Calculator Screen */}
        <div className="calc-screen">
          <div className="expression-container" id="expression-container" ref={expressionRef}>
            <span id="expression">{expression}</span>
          </div>
          <div className="display-container" ref={displayParentRef}>
            <span 
              className={`equals-sign ${isResultDisplayed && currentInput !== 'Error' ? 'visible' : ''}`} 
              id="equals-sign"
            >
              =
            </span>
            <span 
              id="display" 
              className="display-value"
              style={{ fontSize: getDisplayFontSize() }}
            >
              {currentInput}
            </span>
          </div>
        </div>

        {/* Calculator Keypad */}
        <div className="calc-keypad">
          {/* Row 1: Actions */}
          <button 
            className={`btn action-btn ${pressedButtonId === 'key-clear' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('clear'); triggerPressEffect('key-clear'); }} 
            id="key-clear"
          >
            AC
          </button>
          <button 
            className={`btn action-btn ${pressedButtonId === 'key-backspace' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('backspace'); triggerPressEffect('key-backspace'); }} 
            id="key-backspace" 
            aria-label="Backspace"
          >
            <i className="fa-solid fa-backspace"></i>
          </button>
          <button 
            className={`btn action-btn ${pressedButtonId === 'key-parentheses' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('parentheses'); triggerPressEffect('key-parentheses'); }} 
            id="key-parentheses"
          >
            ( )
          </button>
          <button 
            className={`btn operator-btn ${pressedButtonId === 'key-divide' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('operator', '/'); triggerPressEffect('key-divide'); }} 
            id="key-divide"
          >
            ÷
          </button>

          {/* Row 2: 7, 8, 9, * */}
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-7' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('7'); triggerPressEffect('key-7'); }}
            id="key-7"
          >
            7
          </button>
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-8' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('8'); triggerPressEffect('key-8'); }}
            id="key-8"
          >
            8
          </button>
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-9' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('9'); triggerPressEffect('key-9'); }}
            id="key-9"
          >
            9
          </button>
          <button 
            className={`btn operator-btn ${pressedButtonId === 'key-multiply' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('operator', '*'); triggerPressEffect('key-multiply'); }} 
            id="key-multiply"
          >
            ×
          </button>

          {/* Row 3: 4, 5, 6, - */}
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-4' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('4'); triggerPressEffect('key-4'); }}
            id="key-4"
          >
            4
          </button>
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-5' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('5'); triggerPressEffect('key-5'); }}
            id="key-5"
          >
            5
          </button>
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-6' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('6'); triggerPressEffect('key-6'); }}
            id="key-6"
          >
            6
          </button>
          <button 
            className={`btn operator-btn ${pressedButtonId === 'key-subtract' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('operator', '-'); triggerPressEffect('key-subtract'); }} 
            id="key-subtract"
          >
            −
          </button>

          {/* Row 4: 1, 2, 3, + */}
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-1' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('1'); triggerPressEffect('key-1'); }}
            id="key-1"
          >
            1
          </button>
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-2' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('2'); triggerPressEffect('key-2'); }}
            id="key-2"
          >
            2
          </button>
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-3' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('3'); triggerPressEffect('key-3'); }}
            id="key-3"
          >
            3
          </button>
          <button 
            className={`btn operator-btn ${pressedButtonId === 'key-add' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('operator', '+'); triggerPressEffect('key-add'); }} 
            id="key-add"
          >
            +
          </button>

          {/* Row 5: %, 0, ., = */}
          <button 
            className={`btn action-btn ${pressedButtonId === 'key-percent' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('percent'); triggerPressEffect('key-percent'); }} 
            id="key-percent"
          >
            %
          </button>
          <button 
            className={`btn num-btn ${pressedButtonId === 'key-0' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleNumber('0'); triggerPressEffect('key-0'); }}
            id="key-0"
          >
            0
          </button>
          <button 
            className={`btn action-btn ${pressedButtonId === 'key-decimal' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('decimal'); triggerPressEffect('key-decimal'); }} 
            id="key-decimal"
          >
            .
          </button>
          <button 
            className={`btn equals-btn ${pressedButtonId === 'key-equals' ? 'btn-pressed' : ''}`} 
            onClick={() => { handleAction('calculate'); triggerPressEffect('key-equals'); }} 
            id="key-equals"
          >
            =
          </button>
        </div>

        {/* History Sliding Panel */}
        <div className={`history-panel ${isHistoryOpen ? 'active' : ''}`} id="history-panel">
          <div className="history-header">
            <h3>Calculation History</h3>
            <div className="history-actions">
              <button 
                id="clear-history" 
                className="text-btn" 
                title="Clear History"
                onClick={clearHistory}
              >
                Clear All
              </button>
              <button 
                id="close-history" 
                className="icon-btn" 
                aria-label="Close History"
                onClick={() => setIsHistoryOpen(false)}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
          </div>
          <div className="history-list-container">
            <ul id="history-list" class="history-list">
              {history.length === 0 ? (
                <li className="history-empty">No history yet</li>
              ) : (
                history.map((item, idx) => (
                  <li 
                    key={idx} 
                    className="history-item"
                    onClick={() => {
                      setExpression(item.expression);
                      setCurrentInput(item.result);
                      setIsResultDisplayed(true);
                      setIsHistoryOpen(false);
                      triggerToast('Recalled calculation');
                    }}
                  >
                    <span className="history-item-exp">{item.expression}</span>
                    <span className="history-item-res">{item.result}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Notification Toast for errors or info */}
      <div id="toast" className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </>
  );
}

export default App;
