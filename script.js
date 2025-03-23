// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js')
    .then(function(registration) {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(function(error) {
      console.error('Service Worker registration failed:', error);
    });
  });
}

// iOS detection helper
const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone || 
                     document.referrer.includes('android-app://');

console.log('[PWA] Environment detection:', {
  iOS: iOS,
  isSafari: isSafari,
  isStandalone: isStandalone
});

// --- IndexedDB Helpers ---
function openDatabase() {
  return new Promise(function(resolve, reject) {
    const request = indexedDB.open('pwaGenerator', 2);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('app')) {
        const store = db.createObjectStore('app', { keyPath: 'id' });
      }
    };
    request.onsuccess = function(event) {
      resolve(event.target.result);
    };
    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

function getCustomHTML() {
  // Use hostname as the unique key for the app
  const appKey = window.location.hostname;
  
  return openDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      const transaction = db.transaction('app', 'readonly');
      const store = transaction.objectStore('app');
      const getRequest = store.get(appKey);
      getRequest.onsuccess = function() {
        if (getRequest.result) {
          if (getRequest.result.html && 'gistUrl' in getRequest.result) {
            resolve({
              html: getRequest.result.html,
              gistUrl: getRequest.result.gistUrl
            });
          } else if (typeof getRequest.result.html === 'string') {
            resolve({
              html: getRequest.result.html,
              gistUrl: null
            });
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = function() {
        resolve(null);
      };
    });
  });
}

function saveCustomHTML(html, gistUrl) {
  // Use hostname as the unique key for the app
  const appKey = window.location.hostname;
  
  return openDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      const transaction = db.transaction('app', 'readwrite');
      const store = transaction.objectStore('app');
      const putRequest = store.put({ 
        id: appKey, 
        html: html,
        gistUrl: gistUrl || null
      });
      putRequest.onsuccess = function() {
        resolve();
      };
      putRequest.onerror = function() {
        reject(putRequest.error);
      };
    });
  });
}

// Function to save query parameters to localStorage
function saveQueryParamsToLocalStorage() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('gistUrl')) {
    console.log('[DEBUG] Saving gistUrl from URL params:', urlParams.get('gistUrl'));
    localStorage.setItem('gistUrl', urlParams.get('gistUrl'));
    return urlParams.get('gistUrl');
  }
  return null;
}

// Save query parameters on page load
const urlGistParam = saveQueryParamsToLocalStorage();

// iOS detection
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Add PWA install guidance for iOS - REMOVED this function's auto-popup functionality
function addIOSInstallGuide() {
  // Now returns immediately - we'll handle this via the button click instead
  return;
}

// Show a more detailed iOS install popup
function showIOSInstallPopup() {
  const popup = document.createElement('div');
  popup.style.position = 'fixed';
  popup.style.top = '50%';
  popup.style.left = '50%';
  popup.style.transform = 'translate(-50%, -50%)';
  popup.style.background = 'white';
  popup.style.borderRadius = '12px';
  popup.style.boxShadow = '0 5px 30px rgba(0, 0, 0, 0.3)';
  popup.style.padding = '20px';
  popup.style.zIndex = '10000';
  popup.style.maxWidth = '90%';
  popup.style.width = '320px';
  popup.style.textAlign = 'center';
  
  popup.innerHTML = `
    <img src="icons/icon-192.png" style="width: 70px; height: 70px; margin: 0 auto 15px; display: block; border-radius: 15px;">
    <h3 style="margin-top: 0; color: #333; font-size: 18px;">Install PWAH App</h3>
    <p style="color: #666; margin-bottom: 20px;">Install this app on your home screen for the best experience.</p>
    <div style="text-align: left; margin-bottom: 20px;">
      <p style="margin: 5px 0; color: #333;"><b>1.</b> Tap the share icon <span style="font-size: 20px;">⎙</span></p>
      <p style="margin: 5px 0; color: #333;"><b>2.</b> Select "Add to Home Screen"</p>
      <p style="margin: 5px 0; color: #333;"><b>3.</b> Tap "Add" to confirm</p>
    </div>
    <button id="close-popup" style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; width: 100%;">Got it</button>
  `;
  
  document.body.appendChild(popup);
  
  // Animate in
  popup.animate([
    { transform: 'translate(-50%, -40%)', opacity: 0 },
    { transform: 'translate(-50%, -50%)', opacity: 1 }
  ], {
    duration: 300,
    easing: 'ease-out'
  });
  
  // Add overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '9999';
  document.body.appendChild(overlay);
  
  // Handle close button
  document.getElementById('close-popup').addEventListener('click', () => {
    popup.animate([
      { transform: 'translate(-50%, -50%)', opacity: 1 },
      { transform: 'translate(-50%, -40%)', opacity: 0 }
    ], {
      duration: 200,
      easing: 'ease-in'
    }).onfinish = () => {
      popup.remove();
      overlay.remove();
    };
  });
}

// Add iOS install guide when DOM is loaded - keeping this but the function now returns immediately
document.addEventListener('DOMContentLoaded', addIOSInstallGuide);

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
  // Enhance iOS install experience with better guidance
  if (iOS && !isStandalone) {
    enhanceiOSInstallExperience();
  }

  // Show loading indicator initially
  document.getElementById('loadingUI').style.display = 'flex';
  document.getElementById('editorUI').style.display = 'none';
  document.getElementById('appView').style.display = 'none';
  
  // Get DOM elements
  const htmlInput = document.getElementById('htmlInput');
  const startBtn = document.getElementById('startBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const shareBtn = document.getElementById('shareBtn');
  const gistUrlInput = document.getElementById('gistUrl');
  const fetchBtn = document.getElementById('fetchBtn');
  const fetchStatus = document.getElementById('fetchStatus');
  const toast = document.getElementById('toast');
  
  // Gist info elements
  const gistInfoContainer = document.getElementById('gistInfoContainer');
  const authorAvatar = document.getElementById('authorAvatar');
  const gistTitle = document.getElementById('gistTitle');
  const gistAuthor = document.getElementById('gistAuthor');
  const gistDescription = document.getElementById('gistDescription');
  
  // Function to show/hide buttons based on whether there's code
  function updateButtonVisibility(hasContent) {
    startBtn.style.display = hasContent ? 'block' : 'none';
    deleteBtn.style.display = hasContent ? 'block' : 'none';
    
    // Show share button only if both gist URL and HTML content exist
    const hasGistUrl = gistUrlInput.value.trim().length > 0;
    shareBtn.style.display = (hasContent && hasGistUrl) ? 'block' : 'none';
  }
  
  // Function to enhance iOS installation experience
  function enhanceiOSInstallExperience() {
    console.log('Enhancing iOS installation experience');
    
    // Only enhance if we're not already in standalone mode
    if (isStandalone) return;
    
    // Create a hint that shows only once per session - REMOVED, no more automatic hint
    
    // Make the installation guide more prominent for iOS
    const installBtn = document.getElementById('startBtn');
    if (installBtn) {
      // Make button more prominent
      installBtn.textContent = 'Add to Home Screen';
      installBtn.style.backgroundColor = '#ff5722';
      installBtn.style.boxShadow = '0 4px 10px rgba(255, 87, 34, 0.3)';
      installBtn.style.animation = 'pulse 2s infinite';
      
      // Add pulse animation
      if (!document.getElementById('pulse-animation')) {
        const style = document.createElement('style');
        style.id = 'pulse-animation';
        style.textContent = `
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Create detailed iOS install guide when tapping the button
      installBtn.addEventListener('click', function(event) {
        // Prevent default action if it's the install button
        if (installBtn.textContent === 'Add to Home Screen') {
          event.preventDefault();
          
          // Create overlay with detailed iOS install instructions
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          overlay.style.zIndex = '10000';
          overlay.style.display = 'flex';
          overlay.style.flexDirection = 'column';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.padding = '20px';
          overlay.style.color = 'white';
          overlay.style.textAlign = 'center';
          
          // Different instructions for iPhone vs iPad
          const isIPad = /iPad/.test(navigator.userAgent);
          
          // Create content
          overlay.innerHTML = `
            <h2 style="margin-bottom: 20px; font-size: 24px;">Add to Home Screen</h2>
            <div style="background-color: white; border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: left; max-width: 400px;">
              <img src="icons/icon-192.png" alt="App Icon" style="width: 60px; height: 60px; display: block; margin: 0 auto 15px auto; border-radius: 12px;">
              <p style="color: #333; margin-bottom: 5px; font-weight: bold;">PWAH</p>
              <p style="color: #666; font-size: 14px; margin-top: 0;">pwah.io</p>
            </div>
            <p style="margin-bottom: 30px; font-size: 16px;">Follow these steps to install:</p>
            <ol style="text-align: left; max-width: 400px; margin-bottom: 30px;">
              ${isIPad ? 
                `<li style="margin-bottom: 15px;">Tap the <strong>Share</strong> button <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9ImZlYXRoZXIgZmVhdGhlci1zaGFyZSI+PHBhdGggZD0iTTQgMTJ2OGEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJ2LTgiPjwvcGF0aD48cG9seWxpbmUgcG9pbnRzPSIxNiA2IDEyIDIgOCA2Ij48L3BvbHlsaW5lPjxsaW5lIHgxPSIxMiIgeTE9IjIiIHgyPSIxMiIgeTI9IjE1Ij48L2xpbmU+PC9zdmc+" style="width: 20px; vertical-align: middle;"> in the toolbar at the top right of Safari</li>` 
                : 
                `<li style="margin-bottom: 15px;">Tap the <strong>Share</strong> button <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgY2xhc3M9ImZlYXRoZXIgZmVhdGhlci1zaGFyZSI+PHBhdGggZD0iTTQgMTJ2OGEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJ2LTgiPjwvcGF0aD48cG9seWxpbmUgcG9pbnRzPSIxNiA2IDEyIDIgOCA2Ij48L3BvbHlsaW5lPjxsaW5lIHgxPSIxMiIgeTE9IjIiIHgyPSIxMiIgeTI9IjE1Ij48L2xpbmU+PC9zdmc+" style="width: 20px; vertical-align: middle;"> at the bottom of Safari</li>`
              }
              <li style="margin-bottom: 15px;">Scroll down and tap <strong>Add to Home Screen</strong></li>
              <li style="margin-bottom: 15px;">Tap <strong>Add</strong> in the top right corner</li>
              <li>The app will appear on your home screen!</li>
            </ol>
            <button id="close-overlay" style="background-color: #3498db; color: white; border: none; padding: 12px 24px; border-radius: 5px; font-size: 16px; cursor: pointer;">Got it</button>
          `;
          
          document.body.appendChild(overlay);
          
          // Add event listener to close button
          document.getElementById('close-overlay').addEventListener('click', function() {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
              document.body.removeChild(overlay);
            }, 300);
          });
          
          return;
        }
      });
    }
  }
  
  // Function to fetch content from GitHub Gist
  function fetchGistContent(url) {
    fetchStatus.textContent = "Fetching gist...";
    
    // Hide the gist info container while fetching
    gistInfoContainer.style.display = "none";
    
    // Extract the gist ID from URL
    let gistId = null;
    const gistRegex = /gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i;
    const match = url.match(gistRegex);
    
    if (match && match[1]) {
      gistId = match[1];
    } else {
      fetchStatus.textContent = "Error: Invalid Gist URL format";
      return;
    }
    
    // Fetch the gist using the GitHub API
    fetch(`https://api.github.com/gists/${gistId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Get the first file from the gist
        const files = Object.values(data.files);
        if (files.length === 0) {
          throw new Error("No files found in this gist");
        }
        
        const fileContent = files[0].content;
        
        // Check if the content looks like HTML
        const isHtml = fileContent.trim().toLowerCase().startsWith('<!doctype html>') || 
                      fileContent.trim().toLowerCase().startsWith('<html') ||
                      (fileContent.includes('<body') && fileContent.includes('</body>'));
        
        if (isHtml) {
          htmlInput.value = fileContent;
          updateButtonVisibility(true);
          fetchStatus.textContent = "HTML content loaded successfully!";
        } else {
          htmlInput.value = fileContent;
          updateButtonVisibility(true);
          fetchStatus.textContent = "Warning: Content loaded but may not be valid HTML.";
        }
        
        // Update share button visibility since gist URL is now filled
        updateButtonVisibility(htmlInput.value.trim().length > 0);
        
        // Try to store the gistUrl
        try {
          localStorage.setItem('savedGistUrl', url);
        } catch (e) {
          console.warn('Failed to save gistUrl to localStorage:', e);
        }
        
        // Save to cookies (for iOS PWA compatibility)
        try {
          document.cookie = `gistUrlCookie=${encodeURIComponent(url)};path=/;max-age=31536000`;
        } catch (e) {
          console.warn('Failed to save to cookies:', e);
        }
        
        // Display gist information if we have author data
        if (data.owner) {
          displayGistInfo(data, files[0].filename);
        }
      })
      .catch(error => {
        console.error("Error fetching gist:", error);
        fetchStatus.textContent = `Error: ${error.message || "Failed to fetch gist content"}`;
      });
  }
  
  // Wait for service worker registration and data retrieval
  Promise.all([getCustomHTML()])
    .then(function(results) {
      const savedData = results[0]; // This contains {html, gistUrl}
      
      // Hide loading UI
      document.getElementById('loadingUI').style.display = 'none';
      
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlGistUrl = urlParams.get('gistUrl');
      const isPwaSource = urlParams.get('source') === 'pwa';
      
      // Check if we have a gistUrl in URL
      if (urlGistUrl) {
        // Show the editor UI
        document.getElementById('editorUI').style.display = 'block';
        document.getElementById('gistUrl').value = urlGistUrl;
        fetchGistContent(urlGistUrl);
        
        // Save this to cookies for future use
        try {
          document.cookie = `gistUrlCookie=${encodeURIComponent(urlGistUrl)};path=/;max-age=31536000`;
        } catch (e) {
          console.warn('Failed to save to cookies:', e);
        }
        
        return; // Exit early
      }
      
      // If we have saved HTML, display the app (unless this is a direct edit request)
      if (savedData && savedData.html && !window.location.pathname.includes('/edit')) {
        // Display the custom app view
        document.getElementById('editorUI').style.display = 'none';
        document.getElementById('appView').style.display = 'block';
        document.title = "Your Custom App";
        document.getElementById('appFrame').srcdoc = savedData.html;
        
        // Also save the gistUrl to cookies if available
        if (savedData.gistUrl) {
          try {
            document.cookie = `gistUrlCookie=${encodeURIComponent(savedData.gistUrl)};path=/;max-age=31536000`;
          } catch (e) {
            console.warn('Failed to save to cookies:', e);
          }
        }
      } else {
        // Show the editor UI
        document.getElementById('editorUI').style.display = 'block';
        
        // If there's saved HTML, populate the editor
        if (savedData && savedData.html) {
          document.getElementById('htmlInput').value = savedData.html;
        }
        
        // Check if we have a saved gistUrl
        if (savedData && savedData.gistUrl) {
          document.getElementById('gistUrl').value = savedData.gistUrl;
          fetchGistContent(savedData.gistUrl);
        } else {
          // Try to get from cookies
          try {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i].trim();
              if (cookie.startsWith('gistUrlCookie=')) {
                const cookieGistUrl = decodeURIComponent(cookie.substring('gistUrlCookie='.length));
                if (cookieGistUrl) {
                  document.getElementById('gistUrl').value = cookieGistUrl;
                  fetchGistContent(cookieGistUrl);
                  break;
                }
              }
            }
          } catch (e) {
            console.warn('Failed to read from cookies:', e);
          }
        }
        
        // Update button visibility based on content
        updateButtonVisibility(document.getElementById('htmlInput').value.trim().length > 0);
      }
    });

  // Handle fetch button click
  fetchBtn.addEventListener('click', function() {
    const url = gistUrlInput.value.trim();
    if (url) {
      fetchGistContent(url);
    } else {
      fetchStatus.textContent = "Please enter a valid GitHub Gist URL";
      // Hide gist info if URL is empty
      gistInfoContainer.style.display = 'none';
    }
  });

  // Monitor textarea for content to show/hide buttons
  htmlInput.addEventListener('input', function() {
    const hasContent = htmlInput.value.trim().length > 0;
    updateButtonVisibility(hasContent);
  });
  
  // "Launch App": Save to IndexedDB then navigate to the root
  startBtn.addEventListener('click', function() {
    // Special handling for iOS install experience
    if (iOS && !isStandalone && startBtn.textContent === 'Add to Home Screen') {
      // This is handled by the enhanceiOSInstallExperience function
      return;
    }
    
    const htmlCode = htmlInput.value;
    
    // Get the current gistUrl
    const currentGistUrl = gistUrlInput.value.trim();
    
    // For iOS in standalone mode (PWA), we need a different approach
    if (isStandalone) {
      // Save both HTML and gistUrl to IndexedDB
      saveCustomHTML(htmlCode, currentGistUrl).then(function() {
        // In standalone mode (PWA), we'll show the app directly in the current view
        document.getElementById('editorUI').style.display = 'none';
        document.getElementById('appView').style.display = 'block';
        document.title = "Your Custom App";
        document.getElementById('appFrame').srcdoc = htmlCode;
        
        // Update the URL to reflect we're in app view, but without forcing a page reload
        try {
          window.history.replaceState({}, '', './');
        } catch(e) {
          console.warn('Failed to update history state:', e);
        }
        
        console.log('Switched to app view directly');
      });
    } else {
      // Save both HTML and gistUrl to IndexedDB
      saveCustomHTML(htmlCode, currentGistUrl).then(function() {
        // For non-PWA contexts, use standard navigation
        window.location.href = './';
      });
    }
  });

  // "Clear Code": Clear the textarea and hide buttons
  deleteBtn.addEventListener('click', function() {
    htmlInput.value = '';
    updateButtonVisibility(false);
    
    // Hide gist info container but keep the URL
    gistInfoContainer.style.display = 'none';
    
    // Clear the fetch status text
    fetchStatus.textContent = '';
  });
  
  // "Share App": Copy shareable URL to clipboard
  shareBtn.addEventListener('click', function() {
    const gistUrl = gistUrlInput.value.trim();
    if (gistUrl) {
      // Save to IndexedDB with the current HTML
      const htmlCode = htmlInput.value;
      saveCustomHTML(htmlCode, gistUrl);
      
      // Create the shareable URL with the gistUrl parameter
      const shareableUrl = `${window.location.origin}?gistUrl=${encodeURIComponent(gistUrl)}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareableUrl)
        .then(function() {
          // Show success toast
          toast.style.opacity = '1';
          setTimeout(function() {
            toast.style.opacity = '0';
          }, 3000);
        })
        .catch(function(err) {
          console.error('Could not copy text: ', err);
          alert('Failed to copy link to clipboard. Please try again.');
        });
    }
  });
  
  // Function to display gist information
  function displayGistInfo(gistData, filename) {
    // Make sure we have owner information
    if (!gistData.owner || !gistData.owner.avatar_url) {
      console.warn('Missing owner information in gist data');
      return;
    }
    
    // Set the author information
    authorAvatar.src = gistData.owner.avatar_url;
    authorAvatar.alt = `${gistData.owner.login}'s avatar`;
    gistAuthor.textContent = `Created by ${gistData.owner.login}`;
    
    // Set the gist title (use filename if description is empty)
    if (gistData.description && gistData.description.trim() !== "") {
      gistTitle.textContent = gistData.description;
      gistDescription.textContent = `File: ${filename}`;
    } else {
      gistTitle.textContent = filename;
      gistDescription.textContent = "No description provided";
    }
    
    // Show the gist info container
    gistInfoContainer.style.display = "block";
  }
}); 