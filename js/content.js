/**
 * Chat With Cat Content Script
 * 
 * This script is injected into web pages and handles:
 * - Creating and styling the floating response UI
 * - Making the response container draggable
 * - Handling messages from the background script
 * - Rendering AI responses with formatting
 * - Supporting light/dark mode themes
 */

// Reference to the floating response container
let responseContainer = null;

/**
 * Creates and initializes the floating response container
 * Sets up styling, header, content area, and controls
 * @returns {HTMLElement} The created container
 */
function createResponseContainer() {
  if (responseContainer && document.body.contains(responseContainer)) {
    document.body.removeChild(responseContainer);
  }

  responseContainer = document.createElement('div');
  responseContainer.id = 'gemini-response-container';

  const style = document.createElement('style');
  style.textContent = `
    :root {
      --gemini-primary: #4285F4;
      --gemini-bg: #ffffff;
      --gemini-text: #202124;
      --gemini-border: #dadce0;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --gemini-primary: #8ab4f8;
        --gemini-bg: #202124;
        --gemini-text: #e8eaed;
        --gemini-border: #3c4043;
      }
    }

    .loading-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
    }

    .loading-dots .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--gemini-primary);
    }
  `;
  document.head.appendChild(style);

  responseContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    background-color: var(--gemini-bg);
    color: var(--gemini-text);
    border: 1px solid var(--gemini-border);
    border-radius: 16px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    overflow: hidden;
    display: none;
    font-family: 'Google Sans', sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    padding: 14px;
    background: var(--gemini-primary);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const title = document.createElement('div');
  title.textContent = 'AI Assistant';
  header.appendChild(title);

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.onclick = closeContainer;
  header.appendChild(closeButton);

  responseContainer.appendChild(header);

  const content = document.createElement('div');
  content.id = 'gemini-response-content';
  content.style.cssText = `
    padding: 18px;
    overflow-y: auto;
    max-height: 400px;
  `;
  responseContainer.appendChild(content);

  document.body.appendChild(responseContainer);
  return responseContainer;
}

/**
 * Creates a control button with hover effects
 * @param {string} text - Button text
 * @param {Function} clickHandler - Click event handler
 * @returns {HTMLElement} - Button element
 */
function createControlButton(text, clickHandler) {
  const button = document.createElement('button');
  button.innerHTML = text;
  button.style.cssText = `
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
    padding: 0;
  `;
  
  // Add hover effects
  button.onmouseover = () => {
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    button.style.transform = 'scale(1.05)';
  };
  
  button.onmouseout = () => {
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    button.style.transform = 'scale(1)';
  };
  
  button.onclick = clickHandler;
  return button;
}

/**
 * Toggles content visibility when minimize button is clicked
 */
function toggleMinimize() {
  const content = document.getElementById('gemini-response-content');
  const minimizeButton = this;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    content.style.animation = 'fadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    minimizeButton.innerHTML = '−';
  } else {
    content.style.animation = 'fadeIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) reverse';
    setTimeout(() => {
      content.style.display = 'none';
    }, 200);
    minimizeButton.innerHTML = '+';
  }
}

/**
 * Closes the response container with animation
 */
function closeContainer() {
  if (responseContainer) {
    responseContainer.style.display = 'none';
  }
}

/**
 * Makes an element draggable by dragging its handle
 * @param {HTMLElement} element - Element to make draggable
 * @param {HTMLElement} dragHandle - Element to use as drag handle
 */
function makeDraggable(element, dragHandle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  dragHandle.onmousedown = dragMouseDown;

  /**
   * Start dragging on mouse down
   * @param {MouseEvent} e - Mouse event
   */
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // Get mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call function whenever cursor moves
    document.onmousemove = elementDrag;
    // Add active state
    element.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)';
  }

  /**
   * Handle dragging movement
   * @param {MouseEvent} e - Mouse event
   */
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // Calculate new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    // Ensure it stays on screen
    element.style.top = Math.max(0, Math.min(window.innerHeight - 100, element.offsetTop)) + "px";
    element.style.left = Math.max(0, Math.min(window.innerWidth - 100, element.offsetLeft)) + "px";
  }

  /**
   * Stop dragging on mouse up
   */
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
    // Remove active state
    element.style.boxShadow = 'var(--gemini-card-shadow)';
  }
}

/**
 * Process markdown-like formatting in AI responses
 * @param {string} text - Raw response text
 * @returns {string} - HTML-formatted response
 */
function formatResponseText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\n\n/g, '</p><p>')  // Proper paragraph breaks
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')  // Italic text
    .replace(/`([^`]+)`/g, '<code>$1</code>')  // Inline code
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')  // Code blocks
    .replace(/(?:^|\n)- (.*?)(?=\n|$)/g, '\n<li>$1</li>')  // List items
    .replace(/<li>.*?<\/li>/gs, match => `<ul>${match}</ul>`)  // Wrap list items
    .replace(/(?:^|\n)(\d+)\. (.*?)(?=\n|$)/g, '\n<li>$2</li>')  // Numbered list items
    .replace(/<li>.*?<\/li>/gs, match => match.includes('<ul>') ? match : `<ol>${match}</ol>`);  // Wrap numbered list items
}

// ===== MESSAGE HANDLING =====

// Queue for storing messages received before container initialization
const messageQueue = [];

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  // Set up a response to let background script know message was received
  sendResponse({ received: true });

  if (!message.action) {
    console.warn('Unrecognized message action:', message);
    return false;
  }

  // Ensure container exists and create it if it doesn't
  if (!responseContainer || !document.body.contains(responseContainer)) {
    console.log('Container not ready, creating now...');
    responseContainer = createResponseContainer();
    
    // If document isn't ready yet, wait for DOM to be ready
    if (!document.body) {
      console.log('DOM not ready, queuing message for later processing');
      messageQueue.push(message);
      document.addEventListener('DOMContentLoaded', processQueuedMessages);
      return true;
    }
  }
  
  // Process the message
  processMessage(message);
  return true; // Important: indicates async response
});

/**
 * Process queued messages when DOM is ready
 */
function processQueuedMessages() {
  console.log(`Processing ${messageQueue.length} queued messages`);
  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    processMessage(message);
  }
}

/**
 * Process a message from the background script
 * @param {Object} message - Message object from background script
 */
function processMessage(message) {
  // Handle processing selection - show loading state
  if (message.action === "processSelection") {
    showContainerWithLoading();
  }
  
  // Handle displaying response from AI
  if (message.action === "displayResponse") {
    displayResponse(message.response);
  }
}

/**
 * Show container with loading animation
 */
function showContainerWithLoading() {
  // Ensure container exists
  if (!responseContainer || !document.body.contains(responseContainer)) {
    responseContainer = createResponseContainer();
  }

  // Show container with animation
  responseContainer.style.display = 'block';
  setTimeout(() => {
    responseContainer.style.opacity = '1';
    responseContainer.style.transform = 'scale(1)';
  }, 10);

  // Update model info with loading animation
  const modelInfo = document.getElementById('model-info');
  if (modelInfo) {
    const originalText = modelInfo.textContent;
    let dots = 0;
    modelInfo.dataset.originalText = originalText;
    
    // Animate the model info text
    const modelLoadingAnimation = setInterval(() => {
      dots = (dots + 1) % 4;
      modelInfo.textContent = 'Processing' + '.'.repeat(dots);
    }, 300);
    
    // Store the interval ID to clear it later
    modelInfo.dataset.animationId = modelLoadingAnimation;
  }

  // Show modern loading animation
  const contentDiv = document.getElementById('gemini-response-content');
  if (contentDiv) {
    contentDiv.innerHTML = `
      <div style="animation: fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)">
        <p style="color: var(--gemini-text); margin: 10px 0 20px; font-size: 15px; text-align: center;">
          Processing your request
        </p>
        
        <!-- Modern pulse loader -->
        <div class="loading-pulse"></div>
        
        <!-- Bouncing dots loader -->
        <div class="loading-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>`;
  }
}

/**
 * Display formatted AI response in the container
 * @param {string} response - Raw response text
 */
function displayResponse(response) {
  // Ensure container exists
  if (!responseContainer || !document.body.contains(responseContainer)) {
    responseContainer = createResponseContainer();
  }

  // Reset the model info text if it was animating
  const modelInfo = document.getElementById('model-info');
  if (modelInfo && modelInfo.dataset.originalText) {
    clearInterval(modelInfo.dataset.animationId);
    modelInfo.textContent = modelInfo.dataset.originalText;
  }

  // Validate response
  if (!response || typeof response !== 'string' || response.trim() === '') {
    console.error('Invalid or empty response:', response);
    const contentDiv = document.getElementById('gemini-response-content');
    if (contentDiv) {
      contentDiv.innerHTML = `<div style="color: red; padding: 10px;">Error: Received an invalid or empty response from the AI provider. Please try again.</div>`;
    }
    return;
  }

  // Format response with markdown processing
  const formattedResponse = formatResponseText(response);

  const contentDiv = document.getElementById('gemini-response-content');
  if (!contentDiv) {
    console.error('Content div not found, recreating container');
    responseContainer = createResponseContainer();
    setTimeout(() => displayResponse(response), 100);
    return;
  }

  // Show container if not visible
  if (responseContainer.style.display !== 'block') {
    responseContainer.style.display = 'block';
    setTimeout(() => {
      responseContainer.style.opacity = '1';
      responseContainer.style.transform = 'scale(1)';
    }, 10);
  }

  // Add response with animation
  contentDiv.innerHTML = `
    <div style="animation: fadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)">
      <p>${formattedResponse}</p>
    </div>`;

  // Scroll to top smoothly
  contentDiv.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== INITIALIZATION =====

// Create container immediately when script runs
createResponseContainer();

// Also create on DOMContentLoaded (as a backup)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!responseContainer) {
      createResponseContainer();
    }
  });
}

// Listen for system color scheme changes to update UI
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (responseContainer) {
    document.body.removeChild(responseContainer);
    responseContainer = null;
    createResponseContainer();
  }
});

// Log initialization
console.log('Chat With Cat content script loaded');

// Add Google Forms specific styles
const formStyles = document.createElement('style');
formStyles.textContent = `
  .form-question-answer {
    position: fixed;
    background: white;
    border: 1px solid #dadce0;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    z-index: 999999;
    max-width: 300px;
    min-width: 100px;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
    color: #202124;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  }

  .form-question-answer.visible {
    opacity: 1;
  }

  .form-question-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px;
  }

  .form-question-loading .dot {
    width: 6px;
    height: 6px;
    background: #4285f4;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
  }

  .form-question-loading .dot:nth-child(1) { animation-delay: -0.32s; }
  .form-question-loading .dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
`;
document.head.appendChild(formStyles);

// Track active answer elements
let activeAnswerElement = null;
let answerTimeout = null;
let isAnswerVisible = false;

// Enhanced cache management for Google Forms
// Global question cache for the extension
const questionCache = new Map();
let cacheLastCleared = Date.now();

/**
 * Clears the question cache and returns verification
 * @param {string} reason - The reason for clearing the cache
 * @returns {boolean} - Success status of cache clearing operation
 */
function clearQuestionCache(reason = 'manual') {
  try {
    const cacheSize = questionCache.size;
    questionCache.clear();
    cacheLastCleared = Date.now();
    console.log(`Cache cleared (${reason}): Removed ${cacheSize} items at ${new Date(cacheLastCleared).toLocaleTimeString()}`);
    
    // Verify cache is actually empty
    if (questionCache.size === 0) {
      return true;
    } else {
      console.error('Failed to clear cache. Items remaining:', questionCache.size);
      return false;
    }
  } catch (error) {
    console.error('Error while clearing cache:', error);
    return false;
  }
}

// Clear cache on page reload - enhanced with verification
window.addEventListener('beforeunload', () => {
  clearQuestionCache('page reload');
});

// Additional trigger: Clear cache when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  clearQuestionCache('page initialization');
});

// Clear cache when the extension script loads/reloads
clearQuestionCache('script initialization');

// Add reload detection through visibility changes - useful for SPAs
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Only clear if we've been hidden for a while (page likely reloaded)
    const timeSinceLastClear = Date.now() - cacheLastCleared;
    if (timeSinceLastClear > 5000) { // 5 seconds threshold
      clearQuestionCache('visibility change');
    }
  }
});

// Initialize Google Forms functionality
function initializeGoogleForms() {
  console.log('Initializing Google Forms functionality');
  
  // Optimized mutation observer to debounce handling of new nodes
  let mutationTimeout;
  const MUTATION_DEBOUNCE_DELAY = 300; // 300ms debounce delay

  const observer = new MutationObserver((mutations) => {
    if (mutationTimeout) {
      clearTimeout(mutationTimeout);
    }

    mutationTimeout = setTimeout(() => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          console.log('New nodes added to form');
          // Existing logic for handling new nodes
        }
      });
    }, MUTATION_DEBOUNCE_DELAY);
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, { childList: true, subtree: true });

  // Function to check if element is a Google Forms question
  function isGoogleFormQuestion(element) {
    // Check for the main question container class
    const questionBox = element.closest('.Qr7Oae');
    if (!questionBox) return false;

    // Log for debugging
    console.log('Found question box:', questionBox);
    return true;
  }

  // Function to get question text from Google Forms element
  function getQuestionText(element) {
    // Get the question box
    const questionBox = element.closest('.Qr7Oae');
    if (!questionBox) return null;

    // Find the question title element
    const titleElement = questionBox.querySelector('.M7eMe');
    if (!titleElement) return null;

    const text = titleElement.textContent.trim();
    console.log('Found question text:', text);
    return text;
  }

  // Function to get multiple choice options
  function getMCQOptions(element) {
    const questionBox = element.closest('.Qr7Oae');
    if (!questionBox) return null;

    const options = Array.from(questionBox.querySelectorAll('.aDTYNe'));
    return options.map(option => option.textContent.trim());
  }

  // New function to detect if a question is a checkbox type question
  function isCheckboxQuestion(element) {
    const questionBox = element.closest('.Qr7Oae');
    if (!questionBox) return false;
    
    // In Google Forms, checkbox questions use a different icon class
    // Check for the presence of the checkbox icon
    const checkboxIcon = questionBox.querySelector('div[role="checkbox"]');
    if (checkboxIcon) return true;
    
    // Alternative detection: check for the checkbox description text
    const requiredQuestion = questionBox.querySelector('.T5pZmf');
    return requiredQuestion && requiredQuestion.textContent.includes('(check all that apply)');
  }

  // Track hover state and timeout
  let hoverTimeout = null;
  let hoverStartTime = null;
  const HOVER_DELAY = 0; // Immediate trigger for answer generation
  
  // Implement throttling for hover events
  let lastHoverTime = 0;
  const THROTTLE_DELAY = 500; // Reduced throttle delay for immediate answer generation
  
  // Add cache information to the answer display and ensure it disappears after 1000ms
  function showAnswer(answerElement, answer, isCheckbox = false) {
    if (!answerElement) {
      console.error('Answer element is not initialized. Cannot display the answer.');
      return;
    }

    if (!answer || typeof answer !== 'string' || answer.trim() === '') {
      console.error('Invalid answer provided. Cannot display the answer.');
      answerElement.innerHTML = '<div style="padding: 4px; color: red;">Error: Unable to display the answer.</div>';
      showElement(answerElement);
      return;
    }

    // For checkbox questions, we may have multiple answers, each on a separate line
    let formattedAnswer;
    
    if (isCheckbox) {
      // Split multiple answers by line and format each
      const answerLines = answer.split('\n').filter(line => line.trim() !== '');
      
      if (answerLines.length > 1) {
        formattedAnswer = `<div style="font-weight: bold; margin-bottom: 4px;">Selected answers:</div><ul style="margin: 0; padding-left: 20px;">`;
        answerLines.forEach(line => {
          formattedAnswer += `<li>${formatResponseText(line.trim())}</li>`;
        });
        formattedAnswer += '</ul>';
      } else {
        // Single answer for a checkbox question
        formattedAnswer = formatResponseText(answer);
      }
    } else {
      // Regular formatting for non-checkbox questions
      formattedAnswer = formatResponseText(answer);
    }

    if (!formattedAnswer || formattedAnswer.trim() === '') {
      console.error('Formatted answer is empty. Cannot display the answer.');
      answerElement.innerHTML = '<div style="padding: 4px; color: red;">Error: Unable to display the formatted answer.</div>';
      showElement(answerElement);
      return;
    }

    // Add cache status indicator in the UI (keeping this for information purposes)
    const cacheTimestamp = new Date(cacheLastCleared).toLocaleTimeString();
    const cacheIndicator = `<div style="font-size: 10px; color: #888; text-align: right; margin-top: 8px;">Cache last cleared: ${cacheTimestamp}</div>`;

    answerElement.innerHTML = `<div style="padding: 4px;">
      ${formattedAnswer}
      ${cacheIndicator}
    </div>`;
    
    showElement(answerElement);

    // Automatically copy the answer to the clipboard if it's new
    if (answer !== lastCopiedAnswer) {
      try {
        if (document.hasFocus()) {
          navigator.clipboard.writeText(answer).then(() => {
            console.log('Answer copied to clipboard:', answer);
            lastCopiedAnswer = answer; // Update the last copied answer
          }).catch(err => {
            console.error('Failed to copy answer to clipboard:', err);
            // Fallback: Notify the user about the failure
            alert('Failed to copy the answer to the clipboard. Please copy it manually.');
          });
        } else {
          console.warn('Document is not focused. Clipboard write operation skipped.');
          // Fallback: Notify the user about the skipped operation
          alert('Unable to copy the answer to the clipboard because the document is not focused. Please try again.');
        }
      } catch (error) {
        console.error('Unexpected error during clipboard operation:', error);
      }
    } else {
      console.log('Answer not copied to clipboard as it is the same as the last copied answer.');
    }

    // Set timeout to hide the cached answer
    if (answerTimeout) {
      clearTimeout(answerTimeout);
    }
    answerTimeout = setTimeout(() => {
      if (!isAnswerVisible) {
        hideAnswer(answerElement);
      }
    }, 1000);
  }

  // Added functionality to detect media content in questions or options and skip processing

  /**
   * Checks if a question or its options contain media content (images or videos)
   * @param {HTMLElement} questionBox - The question container element
   * @returns {boolean} - True if media content is found, otherwise false
   */
  function containsMediaContent(questionBox) {
    const hasImages = questionBox.querySelectorAll('img').length > 0;
    const hasVideos = questionBox.querySelectorAll('video').length > 0;
    return hasImages || hasVideos;
  }

  // Updated the hover event listener to skip questions with media content
  document.addEventListener('mouseover', async (e) => {
    const questionBox = e.target.closest('.Qr7Oae');
    if (!questionBox) return;

    // Check if the question contains media content
    if (containsMediaContent(questionBox)) {
      console.log('Question contains media content and cannot be processed.');

      // Create or reuse answer element
      if (!activeAnswerElement) {
        activeAnswerElement = createAnswerElement();
      }

      // Display a message to the user
      activeAnswerElement.innerHTML = `<div style="padding: 8px; color: red;">This question contains media content and cannot be processed.</div>`;
      positionAnswerElement(activeAnswerElement, questionBox);
      showElement(activeAnswerElement);
      return;
    }

    // Record hover start time
    hoverStartTime = Date.now();
  
    // Clear any existing hover timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
  
    // Get question text
    const questionText = getQuestionText(questionBox);
    if (!questionText) {
      console.log('No question text found');
      return;
    }
  
    // Get MCQ options if they exist
    const options = getMCQOptions(questionBox);
    
    // Check if this is a checkbox question
    const isCheckbox = isCheckboxQuestion(questionBox);
  
    // Create or reuse answer element
    if (!activeAnswerElement) {
      activeAnswerElement = createAnswerElement();
    }
  
    // Position the answer element
    positionAnswerElement(activeAnswerElement, questionBox);
  
    // Set hover timeout to prevent unnecessary API calls
    hoverTimeout = setTimeout(async () => {
      try {
        // Check if the cache might be stale (over 30 minutes old)
        const timeSinceCacheCleared = Date.now() - cacheLastCleared;
        if (timeSinceCacheCleared > 30 * 60 * 1000) { // 30 minutes
          console.log('Cache might be stale, clearing as precaution.');
          clearQuestionCache('cache age threshold');
        }
        
        // Check if answer is in cache first - with enhanced cache key
        const cacheKey = JSON.stringify({ 
          question: questionText, 
          options, 
          isCheckbox,
          timestamp: Math.floor(Date.now() / (15 * 60 * 1000)) // Changes every 15 minutes
        });
        
        const cachedResult = questionCache.get(cacheKey);
        
        if (cachedResult) {
          console.log('Using cached answer from', new Date(cachedResult.timestamp).toLocaleTimeString());
          showAnswer(activeAnswerElement, cachedResult.answer, isCheckbox);
          return;
        }
  
        // Show loading state
        showLoadingState(activeAnswerElement);
  
        // Prepare prompt with specific formatting instructions
        let prompt;
        if (options && options.length > 0) {
          if (isCheckbox) {
            // Checkbox Format - multiple answers allowed
            prompt = `Answer this checkbox question (multiple answers allowed):
Question: "${questionText}"
Options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Important Instructions:
1. ONLY provide the answers in this EXACT format: "(number) complete option text" - one answer per line
2. If multiple options are correct, list each on a separate line
3. Example format: 
   "(1) First correct option"
   "(3) Third correct option"
4. Do not add any explanation or additional text
5. Only the answer(s) in specified format, nothing else`;
          } else {
            // MCQ Format - single answer only
            prompt = `Answer this multiple choice question:
Question: "${questionText}"
Options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Important Instructions:
1. ONLY provide the answer in this EXACT format: "(number) complete option text"
2. Example format: "(1) Breadth-First Search"
3. Do not add any explanation or additional text
4. Only the answer in specified format, nothing else`;
          }
        } else {
          // Text Question Format
          const questionLength = questionText.length;
          prompt = `Answer this question: "${questionText}"

Important Instructions:
1. Only provide the direct answer, no explanations
2. ${questionLength > 100 ?
    'Since this is a detailed question, answer in 4-8 lines' :
    'Since this is a short question, answer in 1-3 lines'}
3. Be concise and to the point
4. No introductory phrases or conclusions`;
        }
  
        // Process question and cache result with timestamp
        const answer = await processQuestion(prompt);
        questionCache.set(cacheKey, {
          answer,
          timestamp: Date.now()
        });
        lastHoverTime = Date.now();
  
        // Only show answer if still hovering
        if (Date.now() - hoverStartTime >= HOVER_DELAY) {
          showAnswer(activeAnswerElement, answer, isCheckbox);
        }
  
        // Set timeout to hide answer
        if (answerTimeout) {
          clearTimeout(answerTimeout);
        }
        answerTimeout = setTimeout(() => {
          if (!isAnswerVisible) {
            hideAnswer(activeAnswerElement);
          }
        }, 1000);
  
      } catch (error) {
        console.error('Error processing question:', error);
        showProcessingError(activeAnswerElement, error, questionText);
      }
    }, HOVER_DELAY);
  });
}

// Function to create answer element
function createAnswerElement() {
  const answerElement = document.createElement('div');
  answerElement.className = 'form-question-answer';
  answerElement.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #dadce0;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    z-index: 999999;
    max-width: 300px;
    min-width: 100px;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
    color: #202124;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  `;
  document.body.appendChild(answerElement);
  return answerElement;
}

// Function to show loading state
function showLoadingState(answerElement) {
  answerElement.innerHTML = `
    <div class="form-question-loading">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
  showElement(answerElement);
}

// Add a flag to track initialization state
let backgroundServiceReady = false;
let pageFullyLoaded = false;

// Function to check if background service is ready
function checkBackgroundServiceReady() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({action: 'ping'}, response => {
      if (response && response.status === 'ok') {
        backgroundServiceReady = true;
        console.log('Background service is ready');
        resolve(true);
      } else {
        console.log('Background service not ready yet');
        resolve(false);
      }
    });
  });
}

// Wait for page load and check background service
window.addEventListener('load', () => {
  pageFullyLoaded = true;
  console.log('Page fully loaded');
  
  // Check if background service is ready
  checkBackgroundServiceReady().then(ready => {
    if (!ready) {
      // Schedule periodic checks
      const checkInterval = setInterval(() => {
        checkBackgroundServiceReady().then(ready => {
          if (ready) {
            clearInterval(checkInterval);
          }
        });
      }, 2000); // Check every 2 seconds
    }
  });
});

// Improved process question function with enhanced error handling
async function processQuestion(prompt) {
  // Get API configuration from storage
  const data = await chrome.storage.local.get(['apiConfig', 'activeProvider']);
  const provider = data.activeProvider || 'gemini';
  const config = data.apiConfig?.[provider];

  if (!config) {
    throw new Error('No API configuration found');
  }

  // Add retry logic
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError = null;

  // Ensure the background service is ready before proceeding
  if (!backgroundServiceReady) {
    const isReady = await checkBackgroundServiceReady();
    if (!isReady && pageFullyLoaded) {
      console.log('Waiting for background service to be ready...');
      // Add a longer delay to give background service more time to initialize
      await new Promise(resolve => setTimeout(resolve, 2500));
      // Try checking if it's ready again
      await checkBackgroundServiceReady();
    }
  }

  // First, clear any existing cache for this specific prompt
  try {
    chrome.runtime.sendMessage({ action: 'clearResponseCache' });
  } catch (e) {
    console.log('Cache clear attempt (non-critical):', e);
  }

  while (retryCount < MAX_RETRIES) {
    try {
      // Add a progressively longer delay between retries
      if (retryCount > 0) {
        const delayTime = 1500 * Math.pow(1.5, retryCount);
        console.log(`Retry attempt ${retryCount}/${MAX_RETRIES} with delay ${delayTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }

      return await new Promise((resolve, reject) => {
        const messageTimeout = setTimeout(() => {
          reject(new Error('Request timed out after 20 seconds. Please try again.'));
        }, 20000); // 20 second timeout
        
        try {
          chrome.runtime.sendMessage({
            action: 'processQuestion',
            provider,
            prompt,
            config
          }, response => {
            clearTimeout(messageTimeout);
            
            // Check for runtime errors first
            if (chrome.runtime.lastError) {
              console.error('Runtime error:', chrome.runtime.lastError);
              reject(new Error(`Communication error: ${chrome.runtime.lastError.message}`));
              return;
            }
            
            console.log('Received response from background:', response);
            
            if (!response) {
              console.error('Empty response received');
              reject(new Error('No response received from the AI service. Please reload the page and try again.'));
              return;
            }
            
            if (response.error) {
              // Log detailed error information if available
              if (response.errorDetails) {
                console.error('Error details:', response.errorDetails);
              }
              reject(new Error(response.error));
            } else if (response.answer && typeof response.answer === 'string' && response.answer.trim() !== '') {
              console.log('Successfully received answer:', response.answer.substring(0, 50) + '...');
              resolve(response.answer);
            } else {
              console.error('Invalid or empty response:', response);
              reject(new Error('Invalid response format from the AI provider. Please reload the page.'));
            }
          });
        } catch (error) {
          clearTimeout(messageTimeout);
          console.error('Error sending message:', error);
          reject(new Error('Failed to communicate with the AI service: ' + error.message));
        }
      });
    } catch (error) {
      lastError = error;
      retryCount++;
      
      // If we've reached max retries, throw the last error
      if (retryCount >= MAX_RETRIES) {
        console.error(`Failed after ${MAX_RETRIES} attempts:`, lastError);
        throw lastError;
      }
    }
  }
}

// Add error recovery UI for when processing fails - removed retry button
function showProcessingError(answerElement, error, questionText) {
  const errorMessage = error.message || 'An unknown error occurred';
  
  answerElement.innerHTML = `
    <div style="padding: 8px;">
      <div style="color: red; margin-bottom: 8px;">Error: ${errorMessage}</div>
      <div style="font-size: 12px; color: #666;">
        <p>This may happen after page reload. Please try:</p>
        <ol style="margin-top: 4px; padding-left: 20px;">
          <li>Wait a few seconds</li>
          <li>Reload the page and hover over the question again</li>
        </ol>
      </div>
    </div>
  `;
  
  showElement(answerElement);
}

// Track the last copied answer
let lastCopiedAnswer = null;

// Function to show element with opacity transition
function showElement(element) {
  element.style.opacity = '0';
  element.style.display = 'block';
  // Force a reflow to ensure the transition works
  element.offsetHeight;
  element.style.opacity = '1';
}

// Function to hide answer
function hideAnswer(answerElement) {
  if (!answerElement) return;
  answerElement.style.opacity = '0';
  setTimeout(() => {
    answerElement.style.display = 'none';
  }, 200);
}

// Function to position answer element
function positionAnswerElement(answerElement, questionElement) {
  const rect = questionElement.getBoundingClientRect();
  
  // First try positioning to the right
  let left = rect.right + 10;
  let top = rect.top;

  // Check if it would go off-screen to the right
  if (left + 300 > window.innerWidth) {
    // Position to the left instead
    left = rect.left - 310;
  }

  // Ensure it doesn't go off-screen to the left
  left = Math.max(10, left);

  // Ensure it doesn't go off-screen at the top or bottom
  top = Math.max(10, Math.min(window.innerHeight - 100, top));

  answerElement.style.left = `${left}px`;
  answerElement.style.top = `${top}px`;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Google Forms functionality');
    initializeGoogleForms();
  });
} else {
  console.log('DOM already loaded, initializing Google Forms functionality');
  initializeGoogleForms();
}