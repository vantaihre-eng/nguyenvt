/* ═══════════════════════════════════════════
   Taipulme — Security & Anti-F12 Measures
   Deters unauthorized inspection and copying
═══════════════════════════════════════════ */

export function initSecurity() {
  // Prevent right-click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  }, false);

  // Prevent F12, Ctrl+U, Ctrl+Shift+I
  document.onkeydown = function (e) {
    if (e.keyCode === 123) return false; // F12
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) return false; // Ctrl+Shift+I
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) return false; // Ctrl+Shift+J
    if (e.ctrlKey && e.keyCode === 85) return false; // Ctrl+U
    if (e.ctrlKey && e.keyCode === 83) return false; // Ctrl+S
  };

  // Debugger loop (Deters basic DevTools usage)
  (function() {
    const devtools = {
      isOpen: false,
      orientation: undefined
    };
    const threshold = 160;
    const emitEvent = (isOpen, orientation) => {
      window.dispatchEvent(new CustomEvent('devtoolschange', {
        detail: { isOpen, orientation }
      }));
    };

    setInterval(() => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      const orientation = widthThreshold ? 'vertical' : 'horizontal';

      if (
        !(heightThreshold && widthThreshold) &&
        ((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)
      ) {
        if (!devtools.isOpen || devtools.orientation !== orientation) {
          emitEvent(true, orientation);
        }
        devtools.isOpen = true;
        devtools.orientation = orientation;
        
        // Anti-F12: Block content or redirect if DevTools found
        // document.body.innerHTML = "<h1>Unauthorized Access</h1>";
        // window.location.href = "about:blank";
      } else {
        if (devtools.isOpen) {
          emitEvent(false, undefined);
        }
        devtools.isOpen = false;
        devtools.orientation = undefined;
      }
    }, 500);
  })();

  // Clear console spam
  setInterval(() => {
    // console.clear();
  }, 1000);
}
