// assets/js/dashboard.js
window.renderDashboardCharts = function(cfg){
  const pipelineEl = document.getElementById('pipelineChart');
  const stageEl = document.getElementById('stageChart');
  if (!pipelineEl || !stageEl || typeof Chart === 'undefined') return;

  new Chart(pipelineEl, {
    type:'bar',
    data: {
      labels:['Sourced','Applied','Screen','Interview','Offer','Hired'],
      datasets:[{label:'Pipeline', data: cfg.widgets.pipeline, backgroundColor:'#16a6ff88'}]
    },
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  const stageData = cfg.widgets.stages;
  new Chart(stageEl, {
    type:'doughnut',
    data:{
      labels:Object.keys(stageData),
      datasets:[{data:Object.values(stageData), backgroundColor:['#00e5c388','#16a6ff88','#a66bff88','#ffcb1f88','#ff6b6b88']}]
    },
    options:{plugins:{legend:{position:'bottom'}}}
  });
};
