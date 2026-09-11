document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const scanningOverlay = document.getElementById('scanning-overlay');
    const scanStatus = document.getElementById('scan-status');
    const resultsSection = document.getElementById('results-section');
    const errorBanner = document.getElementById('error-banner');
    const btnReset = document.getElementById('btn-reset');

    // UI Elements for Results
    const resFirstName = document.getElementById('res-first-name');
    const resLastName = document.getElementById('res-last-name');
    const resSex = document.getElementById('res-sex');
    const resNationality = document.getElementById('res-nationality');
    const resDob = document.getElementById('res-dob');
    const resPassportNo = document.getElementById('res-passport-no');
    const resExpiry = document.getElementById('res-expiry');

    // Zoom Controls
    let currentZoom = 1;
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomReset = document.getElementById('btn-zoom-reset');
    const imgWrapper = document.getElementById('img-wrapper');

    function updateZoom() {
        imagePreview.style.transform = `scale(${currentZoom})`;
    }

    btnZoomIn.addEventListener('click', () => {
        currentZoom += 0.25;
        updateZoom();
    });

    btnZoomOut.addEventListener('click', () => {
        currentZoom = Math.max(0.25, currentZoom - 0.25);
        updateZoom();
    });

    btnZoomReset.addEventListener('click', () => {
        currentZoom = 1;
        updateZoom();
        if(imgWrapper) {
            imgWrapper.scrollTop = 0;
            imgWrapper.scrollLeft = 0;
        }
    });

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
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    btnReset.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        previewContainer.classList.add('hidden');
        dropZone.classList.remove('hidden');
        errorBanner.classList.add('hidden');
        fileInput.value = '';
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showError("Please upload a valid image file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            imagePreview.src = imageUrl;
            
            // Reset zoom
            currentZoom = 1;
            updateZoom();
            if(imgWrapper) {
                imgWrapper.scrollTop = 0;
                imgWrapper.scrollLeft = 0;
            }

            // Update UI
            dropZone.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            scanningOverlay.classList.remove('hidden');
            resultsSection.classList.add('hidden');
            errorBanner.classList.add('hidden');
            
            scanStatus.innerText = "Initializing OCR Engine...";

            // Start OCR
            processImage(imageUrl);
        };
        reader.readAsDataURL(file);
    }

    function showError(message) {
        errorBanner.classList.remove('hidden');
        document.getElementById('error-message').innerText = message;
        scanningOverlay.classList.add('hidden');
    }

    async function processImage(imageUrl) {
        try {
            scanStatus.innerText = "Reading Passport MRZ Data...";
            
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if(m.status === 'recognizing text') {
                        scanStatus.innerText = `Scanning: ${Math.round(m.progress * 100)}%`;
                    }
                }
            });
            
            const { data: { text } } = await worker.recognize(imageUrl);
            await worker.terminate();
            
            console.log("Raw OCR Text:\n", text);
            parseMRZ(text);

        } catch (error) {
            console.error("OCR Error:", error);
            showError("An error occurred while analyzing the image.");
        }
    }

    function cleanString(str) {
        return str.replace(/[^A-Z0-9<]/g, '').toUpperCase();
    }

    function parseMRZ(rawText) {
        scanningOverlay.classList.add('hidden');
        
        // Clean the text to handle common OCR mistakes on standard MRZ fonts
        // Replace common misreadings of '<'
        let cleanedText = rawText.replace(/[\(\[\{\©\«\<]/g, '<').toUpperCase();
        
        // Split into lines and filter empty ones
        const lines = cleanedText.split('\n').map(l => l.trim().replace(/\s+/g, '')).filter(l => l.length > 20);
        
        // Find the 2 consecutive lines that look most like MRZ (often at the end)
        let mrzLine1 = null;
        let mrzLine2 = null;

        for (let i = 0; i < lines.length - 1; i++) {
            const l1 = cleanString(lines[i]);
            const l2 = cleanString(lines[i+1]);
            
            // Basic MRZ checks: Line 1 usually starts with P, Type (P<), Country code
            // Length should be around 44 for passports
            if (l1.startsWith('P') && l1.length >= 40 && l2.length >= 40 && l1.includes('<') && l2.includes('<')) {
                mrzLine1 = l1.padEnd(44, '<').substring(0, 44);
                mrzLine2 = l2.padEnd(44, '<').substring(0, 44);
                break;
            }
        }

        if (!mrzLine1 || !mrzLine2) {
            // Fallback: Just grab the last two long lines and hope for the best
            if (lines.length >= 2) {
                mrzLine1 = cleanString(lines[lines.length - 2]).padEnd(44, '<').substring(0, 44);
                mrzLine2 = cleanString(lines[lines.length - 1]).padEnd(44, '<').substring(0, 44);
            } else {
                showError("Could not detect Machine Readable Zone (MRZ). Please ensure the bottom two lines are clearly visible.");
                return;
            }
        }

        console.log("Parsed Line 1:", mrzLine1);
        console.log("Parsed Line 2:", mrzLine2);

        try {
            // Extract Line 1 Data (P<LKA<SURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<)
            // Fix OCR issues: Country code is exactly 3 letters
            const countryCode = mrzLine1.substring(2, 5).replace(/</g, '');
            
            const nameParts = mrzLine1.substring(5).split('<<');
            let lastName = nameParts[0].replace(/</g, ' ').trim();
            let firstName = (nameParts[1] || '').replace(/</g, ' ').trim();

            // Extract Line 2 Data (P0458549<8LKA7811296M3506042783340461V<<<<30)
            let passportNo = mrzLine2.substring(0, 9).replace(/</g, '');
            let nationality = mrzLine2.substring(10, 13).replace(/</g, '');
            
            let dobRaw = mrzLine2.substring(13, 19);
            let sex = mrzLine2.substring(20, 21);
            if(sex !== 'M' && sex !== 'F') sex = (sex === 'P' || sex === 'H' ? 'M' : 'F'); // OCR corrections
            
            let expiryRaw = mrzLine2.substring(21, 27);

            // Format Dates
            const formatDob = (yymmdd) => {
                if(!/^\d{6}$/.test(yymmdd)) return yymmdd;
                let year = parseInt(yymmdd.substring(0,2));
                // Assume past century for DOB
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
            resFirstName.value = firstName || "";
            resLastName.value = lastName || "";
            resSex.value = sex === 'M' ? 'Male' : (sex === 'F' ? 'Female' : sex);
            resNationality.value = nationality || countryCode || "";
            resDob.value = formatDob(dobRaw) || "";
            resPassportNo.value = passportNo || "";
            resExpiry.value = formatExpiry(expiryRaw) || "";

            resultsSection.classList.remove('hidden');
        } catch (err) {
            console.error("Parsing error:", err);
            showError("Failed to parse passport details. The image might be blurry.");
        }
    }

    // Global copy function for the inline onclick handlers
    window.copyText = function(elementId) {
        const el = document.getElementById(elementId);
        const text = el.value !== undefined ? el.value : el.innerText;
        if (text && text !== '-') {
            navigator.clipboard.writeText(text).then(() => {
                // Find the icon that was clicked
                const icon = document.querySelector(`[onclick="copyText('${elementId}')"]`);
                if (icon) {
                    const originalText = icon.innerText;
                    icon.innerText = 'check';
                    icon.style.color = 'var(--success-color)';
                    setTimeout(() => {
                        icon.innerText = originalText;
                        icon.style.color = '';
                    }, 1500);
                }
            }).catch(err => console.error("Failed to copy:", err));
        }
    };
});
