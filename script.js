document.addEventListener('DOMContentLoaded', () => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    // Trial logic constants
    const TRIAL_START_DATE = new Date('2026-09-15T00:00:00');
    const TRIAL_DAYS = 14;

    function checkTrialStatus() {
        const now = new Date();
        const diffTime = now.getTime() - TRIAL_START_DATE.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysRemaining = TRIAL_DAYS - diffDays;
        return daysRemaining;
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        loginError.classList.add('hidden');

        if (username === 'BPsanju' && password === 'Sanju@2027') {
            // Admin login
            loginSuccess({
                username: 'BPsanju',
                pic: null
            });
        } else if ((username === 'Kamesh' && password === 'K@2027') || (username === 'Piumal' && password === 'P@2027')) {
            // Trial user login
            const daysRemaining = checkTrialStatus();
            if (daysRemaining <= 0) {
                loginError.textContent = 'Your 14-day trial has expired. You can no longer log in.';
                loginError.classList.remove('hidden');
            } else {
                const picPath = username === 'Kamesh' ? 'Kamesh/Kamesh Pic.jpg' : 'Piumal/Piumal Pic.jpg';
                loginSuccess({
                    username: username,
                    pic: picPath,
                    trialMessage: `Welcome ${username}! You have ${daysRemaining} days remaining in your trial.`
                });
            }
        } else {
            loginError.textContent = 'Invalid username or password.';
            loginError.classList.remove('hidden');
        }
    });

    function loginSuccess(user) {
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        const profileName = document.getElementById('profile-name');
        const profilePic = document.getElementById('profile-pic');
        const userProfile = document.getElementById('user-profile');
        
        profileName.textContent = user.username;
        if (user.pic) {
            profilePic.src = user.pic;
            profilePic.classList.remove('hidden');
        } else {
            profilePic.classList.add('hidden');
        }
        userProfile.classList.remove('hidden');
        
        // Remove existing banner if any
        const existingBanner = mainApp.querySelector('.trial-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        if (user.trialMessage) {
            const banner = document.createElement('div');
            banner.className = 'trial-banner';
            banner.textContent = user.trialMessage;
            mainApp.insertBefore(banner, mainApp.firstChild);
        }
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        mainApp.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        document.getElementById('login-form').reset();
        loginError.classList.add('hidden');
    });

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const cardsContainer = document.getElementById('cards-container');
    const template = document.getElementById('passport-card-template');
    const globalActions = document.getElementById('global-actions');
    const uploadSection = document.getElementById('upload-section');
    
    // Global Action Buttons
    document.getElementById('btn-add-more').addEventListener('click', () => fileInput.click());
    document.getElementById('btn-reset-all').addEventListener('click', () => {
        cardsContainer.innerHTML = '';
        cardsData = [];
        uploadSection.classList.remove('hidden');
        globalActions.classList.add('hidden');
        fileInput.value = '';
    });
    document.getElementById('btn-copy-all-global').addEventListener('click', (e) => {
        let allDataText = '';
        cardsData.forEach((card, index) => {
            if (card.status === 'success') {
                allDataText += `--- Passport ${index + 1} ---\n`;
                allDataText += getCardDataText(card) + '\n\n';
            }
        });
        if (allDataText) {
            copyToClipboard(allDataText.trim(), e.target);
        } else {
            alert('No successful scans to copy.');
        }
    });

    let cardsData = [];
    let isProcessing = false;
    let scanQueue = [];

    // Drag and Drop Events
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });

    function handleFiles(files) {
        uploadSection.classList.add('hidden');
        globalActions.classList.remove('hidden');

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                createPassportCard(file);
            }
        });
        
        processQueue();
    }

    function createPassportCard(file) {
        const cardClone = template.content.cloneNode(true);
        const cardElement = cardClone.querySelector('.passport-card');
        
        const card = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            file: file,
            originalImageSrc: '',
            rotation: 0,
            zoom: 1,
            status: 'pending', // pending, scanning, success, error
            ui: {
                cardElement: cardElement,
                imagePreview: cardElement.querySelector('.image-preview'),
                imgWrapper: cardElement.querySelector('.img-wrapper'),
                scanningOverlay: cardElement.querySelector('.scanning-overlay'),
                scanStatus: cardElement.querySelector('.scan-status'),
                resultsSection: cardElement.querySelector('.results-section'),
                errorBanner: cardElement.querySelector('.error-banner'),
                errorMessage: cardElement.querySelector('.error-message'),
                inputs: {
                    firstName: cardElement.querySelector('.res-first-name'),
                    lastName: cardElement.querySelector('.res-last-name'),
                    sex: cardElement.querySelector('.res-sex'),
                    nationality: cardElement.querySelector('.res-nationality'),
                    dob: cardElement.querySelector('.res-dob'),
                    type: cardElement.querySelector('.res-type'),
                    passportNo: cardElement.querySelector('.res-passport-no'),
                    expiry: cardElement.querySelector('.res-expiry')
                }
            }
        };

        // Initialize Pan State
        card.panX = 0;
        card.panY = 0;

        // Attach Zoom and Rotate Event Listeners
        cardElement.querySelector('.btn-rotate-left').addEventListener('click', () => updateTransform(card, -90, 0));
        cardElement.querySelector('.btn-rotate-right').addEventListener('click', () => updateTransform(card, 90, 0));
        cardElement.querySelector('.btn-zoom-in').addEventListener('click', () => updateTransform(card, 0, 0.25));
        cardElement.querySelector('.btn-zoom-out').addEventListener('click', () => updateTransform(card, 0, -0.25));
        cardElement.querySelector('.btn-zoom-reset').addEventListener('click', () => {
            card.rotation = 0;
            card.zoom = 1;
            card.panX = 0;
            card.panY = 0;
            updateTransform(card, 0, 0);
        });

        // Mouse Drag to Pan
        let isDragging = false;
        let startX, startY, initialPanX, initialPanY;

        card.ui.imgWrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialPanX = card.panX;
            initialPanY = card.panY;
            e.preventDefault(); // Prevent default image drag
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            card.panX = initialPanX + dx;
            card.panY = initialPanY + dy;
            updateTransform(card, 0, 0);
        });

        // Mouse Wheel to Zoom
        card.ui.imgWrapper.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault(); // Prevent page zooming
                if (e.deltaY < 0) {
                    updateTransform(card, 0, 0.15); // zoom in
                } else {
                    updateTransform(card, 0, -0.15); // zoom out
                }
            }
        });

        // Copy buttons per field
        cardElement.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = e.target.previousElementSibling;
                copyToClipboard(input.value, e.target);
            });
        });

        // Copy all details
        cardElement.querySelector('.btn-copy-card').addEventListener('click', (e) => {
            const text = getCardDataText(card);
            copyToClipboard(text, e.target);
        });

        // Re-scan logic
        cardElement.querySelector('.btn-rescan').addEventListener('click', () => {
            if(isProcessing) {
                alert("Please wait for current scans to finish before re-scanning.");
                return;
            }
            rescanCard(card);
        });

        // Load Image
        const reader = new FileReader();
        reader.onload = (e) => {
            card.originalImageSrc = e.target.result;
            card.ui.imagePreview.src = card.originalImageSrc;
            
            cardsData.push(card);
            cardsContainer.appendChild(cardElement);
            scanQueue.push(card);
            
            // Check if queue needs to start
            processQueue();
        };
        reader.readAsDataURL(file);
    }

    function updateTransform(card, rotChange, zoomChange) {
        card.rotation = (card.rotation + rotChange) % 360;
        card.zoom = Math.max(0.25, card.zoom + zoomChange);
        
        card.panX = card.panX || 0;
        card.panY = card.panY || 0;
        
        // Remove CSS transition while dragging to ensure smooth movement
        if (rotChange === 0 && zoomChange === 0) {
            card.ui.imagePreview.style.transition = 'none';
        } else {
            card.ui.imagePreview.style.transition = 'transform 0.1s ease-out';
        }
        
        card.ui.imagePreview.style.transform = `translate(${card.panX}px, ${card.panY}px) scale(${card.zoom}) rotate(${card.rotation}deg)`;
    }

    function showError(card, message) {
        card.ui.errorBanner.classList.remove('hidden');
        card.ui.errorMessage.innerText = message;
        card.ui.scanningOverlay.classList.add('hidden');
        card.status = 'error';
    }

    async function processQueue() {
        if (isProcessing || scanQueue.length === 0) return;
        
        isProcessing = true;
        const currentCard = scanQueue.shift();
        
        await runOCR(currentCard, currentCard.originalImageSrc);
        
        isProcessing = false;
        processQueue(); // Process next in queue
    }

    async function rescanCard(card) {
        card.ui.resultsSection.classList.add('hidden');
        card.ui.errorBanner.classList.add('hidden');
        
        // If image was rotated, we need to create a new rotated canvas image for Tesseract
        let targetSrc = card.originalImageSrc;
        
        if (card.rotation !== 0) {
            targetSrc = await getRotatedImageBase64(card.originalImageSrc, card.rotation);
        }

        scanQueue.push({ ...card, isRescan: true, targetSrc: targetSrc, originalCardRef: card });
        processQueue();
    }
    
    function getRotatedImageBase64(src, rotation) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new canvas size
                if (rotation === 90 || rotation === -270 || rotation === -90 || rotation === 270) {
                    canvas.width = img.height;
                    canvas.height = img.width;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.src = src;
        });
    }

    async function runOCR(queueItem, defaultSrc) {
        const card = queueItem.isRescan ? queueItem.originalCardRef : queueItem;
        const targetSrc = queueItem.isRescan ? queueItem.targetSrc : defaultSrc;

        card.status = 'scanning';
        card.ui.scanningOverlay.classList.remove('hidden');
        card.ui.scanStatus.innerText = "Initializing OCR Engine...";

        try {
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if(m.status === 'recognizing text') {
                        card.ui.scanStatus.innerText = `Scanning: ${Math.round(m.progress * 100)}%`;
                    }
                }
            });
            
            card.ui.scanStatus.innerText = "Reading Passport MRZ Data...";
            const { data: { text } } = await worker.recognize(targetSrc);
            await worker.terminate();
            
            console.log(`Raw OCR Text (Card ID: ${card.id}):\n`, text);
            parseMRZ(text, card);

        } catch (error) {
            console.error("OCR Error:", error);
            showError(card, "An error occurred while analyzing the image.");
        }
    }

    function cleanString(str) {
        return str.replace(/[^A-Z0-9<]/g, '').toUpperCase();
    }

    function parseMRZ(rawText, card) {
        card.ui.scanningOverlay.classList.add('hidden');
        
        let cleanedText = rawText.replace(/[\(\[\{\©\«\<]/g, '<').toUpperCase();
        const lines = cleanedText.split('\n').map(l => l.trim().replace(/\s+/g, '')).filter(l => l.length > 20);
        
        let mrzLine1 = null;
        let mrzLine2 = null;

        for (let i = 0; i < lines.length - 1; i++) {
            const l1 = cleanString(lines[i]);
            const l2 = cleanString(lines[i+1]);
            
            if (l1.startsWith('P') && l1.length >= 40 && l2.length >= 40 && l1.includes('<') && l2.includes('<')) {
                mrzLine1 = l1.padEnd(44, '<').substring(0, 44);
                mrzLine2 = l2.padEnd(44, '<').substring(0, 44);
                break;
            }
        }

        if (!mrzLine1 || !mrzLine2) {
            if (lines.length >= 2) {
                mrzLine1 = cleanString(lines[lines.length - 2]).padEnd(44, '<').substring(0, 44);
                mrzLine2 = cleanString(lines[lines.length - 1]).padEnd(44, '<').substring(0, 44);
            } else {
                showError(card, "Could not detect MRZ. Try rotating the image or ensuring the bottom lines are visible.");
                return;
            }
        }

        try {
            const countryCode = mrzLine1.substring(2, 5).replace(/</g, '');
            const nameParts = mrzLine1.substring(5).split('<<');
            let lastName = nameParts[0].replace(/</g, ' ').trim();
            let firstName = (nameParts[1] || '').replace(/</g, ' ').trim();

            let passportNo = mrzLine2.substring(0, 9).replace(/</g, '');
            let nationality = mrzLine2.substring(10, 13).replace(/</g, '');
            
            let dobRaw = mrzLine2.substring(13, 19);
            let sex = mrzLine2.substring(20, 21);
            if(sex !== 'M' && sex !== 'F') sex = (sex === 'P' || sex === 'H' ? 'M' : 'F'); 
            
            let expiryRaw = mrzLine2.substring(21, 27);

            const formatDob = (yymmdd) => {
                if(!/^\d{6}$/.test(yymmdd)) return yymmdd;
                let year = parseInt(yymmdd.substring(0,2));
                year = year > new Date().getFullYear() % 100 ? 1900 + year : 2000 + year;
                let month = yymmdd.substring(2,4);
                let day = yymmdd.substring(4,6);
                return `${day}/${month}/${year}`;
            };

            const formatExpiry = (yymmdd) => {
                if(!/^\d{6}$/.test(yymmdd)) return yymmdd;
                let year = parseInt(yymmdd.substring(0,2)) + 2000;
                let month = yymmdd.substring(2,4);
                let day = yymmdd.substring(4,6);
                return `${day}/${month}/${year}`;
            };

            // Update UI
            card.ui.inputs.firstName.value = firstName || "";
            card.ui.inputs.lastName.value = lastName || "";
            card.ui.inputs.sex.value = sex === 'M' ? 'Male' : (sex === 'F' ? 'Female' : sex);
            card.ui.inputs.nationality.value = nationality || countryCode || "";
            card.ui.inputs.dob.value = formatDob(dobRaw) || "";
            card.ui.inputs.passportNo.value = passportNo || "";
            card.ui.inputs.expiry.value = formatExpiry(expiryRaw) || "";

            card.ui.resultsSection.classList.remove('hidden');
            card.status = 'success';
        } catch (err) {
            console.error("Parsing error:", err);
            showError(card, "Failed to parse passport details. The image might be blurry.");
        }
    }

    function getCardDataText(card) {
        let text = [];
        for (const [key, input] of Object.entries(card.ui.inputs)) {
            text.push(`${input.dataset.field}: ${input.value}`);
        }
        return text.join('\n');
    }

    function copyToClipboard(text, iconElement) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = iconElement.innerHTML;
            
            // Check if iconElement is the button or the span inside it
            let targetIcon = iconElement;
            if(iconElement.tagName === 'BUTTON') {
                targetIcon = iconElement.querySelector('.material-icons');
            }
            
            if(targetIcon) {
                 const originalIconHTML = targetIcon.innerHTML;
                 targetIcon.innerText = 'check';
                 targetIcon.style.color = 'var(--success-color)';
                 setTimeout(() => {
                     targetIcon.innerHTML = originalIconHTML;
                     targetIcon.style.color = '';
                 }, 1500);
            }
        }).catch(err => console.error("Failed to copy:", err));
    }
});
