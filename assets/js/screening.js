// assets/js/screening.js
(function(){
  // Keyboard shortcuts on the viewer route
  function onKeydown(e){
    if (!location.hash.startsWith('#/viewer')) return;
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    const pick = document.getElementById('selectBestBtn');
    const back = document.getElementById('backToDesignation');
    if (!prev || !next || !pick) return;

    if (e.key === 'ArrowLeft'){ e.preventDefault(); prev.click(); }
    else if (e.key === 'ArrowRight'){ e.preventDefault(); next.click(); }
    else if (e.key === 'Enter' || e.code === 'Space'){ e.preventDefault(); pick.click(); }
    else if (e.key === 'Escape'){ e.preventDefault(); back?.click(); }
  }

  // Add a glint sweep whenever the image src changes
  const imgObserver = new MutationObserver(()=>{
    const stage = document.querySelector('.viewer-stage');
    if (!stage) return;
    const sweep = document.createElement('div');
    sweep.className = 'hud-glint';
    stage.appendChild(sweep);
    setTimeout(()=> sweep.remove(), 1200);
  });

  function attachObserver(){
    const img = document.getElementById('resumeImage');
    if (img) imgObserver.observe(img, { attributes:true, attributeFilter:['src'] });
  }

  window.addEventListener('keydown', onKeydown);
  window.addEventListener('hashchange', attachObserver);
  window.addEventListener('load', attachObserver);
})();
