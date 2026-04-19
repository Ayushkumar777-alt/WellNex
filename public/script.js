document.addEventListener('DOMContentLoaded', () => {
    // Nav & Tabs
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Chat UI elements
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Track conversation context based on tab
    let currentContext = 'dashboard';
    
    // Config marked.js
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    // Switch Tabs visually and conceptually
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.style.display = 'none');
            
            item.classList.add('active');
            const target = item.getAttribute('data-tab');
            currentContext = target;
            
            const targetSection = document.getElementById(target);
            if(targetSection) {
                targetSection.style.display = 'block';
            }
        });
    });

    // Helper functions for Chat Interface
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }

    function createMessageElement(content, isAI = false) {
        const div = document.createElement('div');
        div.className = `message ${isAI ? 'ai-message' : 'user-message'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isAI && typeof marked !== 'undefined') {
            contentDiv.innerHTML = marked.parse(content);
        } else if (isAI) {
            contentDiv.innerHTML = content.replace(/\n/g, '<br>');
        } else {
            contentDiv.textContent = content;
        }
        
        div.appendChild(contentDiv);
        return div;
    }

    function createTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'message ai-message typing-container';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content typing-indicator';
        contentDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        div.appendChild(contentDiv);
        return div;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Add user prompt to screen
        const userMsgEl = createMessageElement(message, false);
        chatMessages.appendChild(userMsgEl);
        userInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add AI typing dots
        const typingEl = createTypingIndicator();
        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Lock UI briefly
        userInput.disabled = true;
        sendBtn.disabled = true;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // Send context so AI knows what tab user is looking at
                // Combine it with user profile if it exists
                body: JSON.stringify({ message, context: currentContext, userProfile: window.userProfile })
            });

            const data = await response.json();
            
            typingEl.remove();

            if (data.error) {
                const errorEl = createMessageElement("Connection glitch. Your AI consultant is temporarily unavailable. Check your API Key or Network.", true);
                chatMessages.appendChild(errorEl);
            } else {
                const aiMsgEl = createMessageElement(data.reply, true);
                chatMessages.appendChild(aiMsgEl);
            }

        } catch (error) {
            console.error("Communication error:", error);
            typingEl.remove();
            const errorMsg = error.message || String(error);
            const isJsonFailed = errorMsg.includes('JSON');
            const explanation = isJsonFailed ? 
                "\n\n(Tip: If you opened this file directly, try using http://localhost:3000 in your browser instead!)" : "";
            const errorEl = createMessageElement("Failed to connect to the backend server. Error: " + errorMsg + explanation, true);
            chatMessages.appendChild(errorEl);
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Action Cards Logic
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(card => {
        card.addEventListener('click', () => {
            const targetTabId = card.getAttribute('data-target');
            const promptText = card.getAttribute('data-prompt');
            
            // Switch to the relevant tab
            const tabButton = document.querySelector(`.nav-item[data-tab="${targetTabId}"]`);
            if (tabButton) {
                tabButton.click();
            }
            
            // Pre-fill input and send to AI
            userInput.value = promptText;
            sendMessage();
        });
    });

    // Profile Modal Logic
    const profileModalWrapper = document.getElementById('profileModalWrapper');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');

    const inputAge = document.getElementById('inputAge');
    const inputWeight = document.getElementById('inputWeight');
    const inputHeight = document.getElementById('inputHeight');
    const inputGoal = document.getElementById('inputGoal');
    const inputActivity = document.getElementById('inputActivity');

    // Global profile accessible by sendMessage
    window.userProfile = JSON.parse(localStorage.getItem('apexUserProfile')) || null;
    
    if (window.userProfile) {
        inputAge.value = window.userProfile.age || '';
        inputWeight.value = window.userProfile.weight || '';
        inputHeight.value = window.userProfile.height || '';
        inputGoal.value = window.userProfile.goal || '';
        inputActivity.value = window.userProfile.activity || '';
    }

    userProfileBtn.addEventListener('click', () => {
        profileModalWrapper.style.display = 'flex';
    });

    closeModalBtn.addEventListener('click', () => {
        profileModalWrapper.style.display = 'none';
    });

    saveProfileBtn.addEventListener('click', () => {
        window.userProfile = {
            age: inputAge.value,
            weight: inputWeight.value,
            height: inputHeight.value,
            goal: inputGoal.value,
            activity: inputActivity.value
        };
        localStorage.setItem('apexUserProfile', JSON.stringify(window.userProfile));
        profileModalWrapper.style.display = 'none';
        
        const aiMsgEl = createMessageElement("Your profile has been saved. My advice will now be completely personalized to your stats and goals!", true);
        chatMessages.appendChild(aiMsgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

});
