// script.js
document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('input-area');
    const outputBox = document.getElementById('output-box');
    const copyButton = document.getElementById('copy-button');
    const historyContainer = document.getElementById('history-container');
    const clearHistoryButton = document.getElementById('clear-history-button');
    const exampleQrCodeImages = document.querySelectorAll('.qrcode-images img');
    const pastePrompt = document.getElementById('paste-prompt');
    const placeholderTextElement = inputArea.querySelector('.placeholder-text');
    const copyButtonIcon = copyButton.querySelector('i');
    const copyButtonText = copyButton.querySelector('span');
    const openLinkButton = document.getElementById('open-link-button');

    let history = loadHistory();
    renderHistory();

    // Drag and drop handling
    inputArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        inputArea.classList.add('active', 'dragging');
        placeholderTextElement.textContent = 'Drop image here';
    });

    inputArea.addEventListener('dragleave', () => {
        inputArea.classList.remove('dragging');
        placeholderTextElement.textContent = 'Click here to paste image to decode QR code';
    });

    inputArea.addEventListener('drop', (e) => {
        e.preventDefault();
        inputArea.classList.remove('dragging');
        placeholderTextElement.textContent = 'Processing...';

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            decodeImage(file);
        } else {
            showToast('Please drop an image file', 'error');
            placeholderTextElement.textContent = 'Click here to paste image to decode QR code';
        }
    });

    // Visual indication for input area
    inputArea.addEventListener('focus', () => {
        inputArea.classList.add('active');
        pastePrompt.style.display = 'block';
    });

    inputArea.addEventListener('blur', () => {
        if (!inputArea.classList.contains('dragging')) {
            inputArea.classList.remove('active');
            pastePrompt.style.display = 'none';
        }
    });

    inputArea.addEventListener('click', () => {
        inputArea.classList.add('active');
        pastePrompt.style.display = 'block';
    });

    // Paste handling
    inputArea.addEventListener('paste', handlePaste);

    // Copy to clipboard
    copyButton.addEventListener('click', copyToClipboard);

    // Open URL
    openLinkButton.addEventListener('click', openDecodedUrl);

    // Clear history with custom modal
    clearHistoryButton.addEventListener('click', () => {
        showModal('Clear History', 
                 'Are you sure you want to clear all history items?', 
                 clearHistory);
    });

    // Example QR code click handling
    exampleQrCodeImages.forEach(img => {
        img.addEventListener('click', (event) => {
            const img = event.target;
            showToast('Loading example QR code...', 'info');
            fetch(img.src)
                .then(res => res.blob())
                .then(blob => decodeImage(blob))
                .catch(() => showToast('Failed to load example QR code', 'error'));
        });
    });

    // Toggle functionality for History Sidebar
    const historyToggleButton = document.getElementById('history-toggle');
    const historySidebar = document.querySelector('.history-sidebar');

    historyToggleButton.addEventListener('click', () => {
        historySidebar.classList.toggle('open');
    });

    function handlePaste(event) {
        event.preventDefault();
        inputArea.classList.add('active');
        pastePrompt.style.display = 'block';
        placeholderTextElement.textContent = 'Processing...';

        const items = (event.clipboardData || event.clipboardData).items;
        let hasImage = false;

        for (const item of items) {
            if (item.type.indexOf('image') === 0) {
                hasImage = true;
                const blob = item.getAsFile();
                decodeImage(blob);
                break;
            }
        }

        if (!hasImage) {
            showToast('No image found in clipboard', 'error');
            placeholderTextElement.textContent = 'Click here to paste image to decode QR code';
        }
    }

    function decodeImage(imageFileOrBlob) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, canvas.width, canvas.height);
                
                if (code) {
                    const decodedText = code.data;
                    outputBox.textContent = decodedText;
                    copyButton.disabled = false;
                    
                    // Enable/disable open URL button based on whether the decoded text is a valid URL
                    const isUrl = decodedText.toLowerCase().startsWith('http://') || 
                                decodedText.toLowerCase().startsWith('https://');
                    openLinkButton.disabled = !isUrl;
                    
                    addToHistory(decodedText);
                    showToast('QR code decoded successfully!');
                } else {
                    outputBox.textContent = '';
                    copyButton.disabled = true;
                    openLinkButton.disabled = true;
                    showToast('No QR code found in image', 'error');
                }
                placeholderTextElement.textContent = 'Click here to paste image to decode QR code';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(imageFileOrBlob);
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = toast.querySelector('i');
        const text = toast.querySelector('span');
        
        // Update icon based on type
        icon.className = 'fas';
        switch(type) {
            case 'success':
                icon.classList.add('fa-check-circle');
                toast.style.backgroundColor = 'var(--success-color)';
                break;
            case 'error':
                icon.classList.add('fa-exclamation-circle');
                toast.style.backgroundColor = 'var(--secondary-color)';
                break;
            case 'info':
                icon.classList.add('fa-info-circle');
                toast.style.backgroundColor = 'var(--primary-color)';
                break;
        }
        
        text.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    function copyToClipboard() {
        const text = outputBox.textContent;
        if (text && text !== 'No QR code detected in the image.' && text !== 'Error processing QR code.') {
            navigator.clipboard.writeText(text).then(() => {
                // Change icon to checkmark temporarily
                copyButtonIcon.className = 'fas fa-check';
                copyButtonText.textContent = 'Copied!';
                showToast('Text copied to clipboard!', 'success');
                
                setTimeout(() => {
                    copyButtonIcon.className = 'fas fa-copy';
                    copyButtonText.textContent = 'Copy';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showToast('Failed to copy text to clipboard', 'error');
            });
        } else {
            showToast('No text to copy', 'error');
        }
    }

    function addToHistory(decodedText) {
        // Don't add if it's the same as the most recent item
        if (history.length > 0 && history[0] === decodedText) {
            return;
        }
        
        history.unshift(decodedText);
        if (history.length > 10) {
            history.pop();
        }
        saveHistory();
        renderHistory();
    }

    function renderHistory() {
        historyContainer.innerHTML = '';
        if (history.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'history-empty-state';
            emptyState.innerHTML = `
                <i class="fas fa-history"></i>
                <p>No history yet</p>
            `;
            historyContainer.appendChild(emptyState);
            return;
        }

        history.forEach((item, index) => {
            const historyItemDiv = document.createElement('div');
            historyItemDiv.classList.add('history-item');
            historyItemDiv.setAttribute('role', 'listitem');

            const textDiv = document.createElement('div');
            textDiv.classList.add('history-item-text');
            textDiv.textContent = item;
            textDiv.setAttribute('title', item);
            historyItemDiv.appendChild(textDiv);

            const copyButton = document.createElement('button');
            copyButton.classList.add('history-item-copy-button');
            copyButton.setAttribute('aria-label', 'Copy this item');
            copyButton.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i>';
            
            copyButton.addEventListener('click', (e) => {
                e.stopPropagation();
                copyHistoryItemToClipboard(item, copyButton);
            });
            
            historyItemDiv.appendChild(copyButton);
            historyContainer.appendChild(historyItemDiv);

            // Add animation delay based on index
            setTimeout(() => {
                historyItemDiv.style.opacity = '1';
                historyItemDiv.style.transform = 'translateX(0)';
            }, index * 50);
        });
    }

    function copyHistoryItemToClipboard(textToCopy, button) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            const icon = button.querySelector('i');
            icon.className = 'fas fa-check';
            showToast('History item copied!', 'success');
            
            setTimeout(() => {
                icon.className = 'fas fa-copy';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy history item: ', err);
            showToast('Failed to copy history item', 'error');
        });
    }
    
    function clearHistory() {
        history = [];
        saveHistory();
        renderHistory();
        outputBox.textContent = '';
        copyButton.disabled = true;
        showToast('History cleared', 'info');
    }

    function showModal(title, message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-buttons">
                    <button class="button cancel-button">Cancel</button>
                    <button class="button confirm-button">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add show class after a small delay to trigger animation
        setTimeout(() => modal.classList.add('show'), 10);
        
        const confirmButton = modal.querySelector('.confirm-button');
        const cancelButton = modal.querySelector('.cancel-button');
        
        confirmButton.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
                onConfirm();
            }, 300);
        });
        
        cancelButton.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        });
    }

    function loadHistory() {
        const storedHistory = localStorage.getItem('qrCodeHistory');
        return storedHistory ? JSON.parse(storedHistory) : [];
    }

    function saveHistory() {
        localStorage.setItem('qrCodeHistory', JSON.stringify(history));
    }

    // Add this to your existing JavaScript
    const historyToggle = document.getElementById('history-toggle');
    const historySection = document.querySelector('.history-section');
    
    // Load the saved state from localStorage
    const isCollapsed = localStorage.getItem('historyCollapsed') === 'true';
    if (isCollapsed) {
        historySection.classList.add('collapsed');
    }
    
    historyToggle.addEventListener('click', () => {
        historySection.classList.toggle('collapsed');
        // Save the state to localStorage
        localStorage.setItem('historyCollapsed', historySection.classList.contains('collapsed'));
    });

    function openDecodedUrl() {
        const decodedText = outputBox.textContent;
        if (decodedText && (decodedText.toLowerCase().startsWith('http://') || 
                           decodedText.toLowerCase().startsWith('https://'))) {
            window.open(decodedText, '_blank', 'noopener,noreferrer');
        } else {
            showToast('Invalid URL', 'error');
        }
    }
});