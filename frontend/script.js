let chart;

function analyzeData() {
    const fileInput = document.getElementById('csv-upload');
    const file = fileInput.files[0];
    if (!file) { alert("Select a CSV file first."); return; }

    document.getElementById('grid-status-val').innerText = "ANALYZING...";
    const formData = new FormData();
    formData.append('file', file);

    fetch('http://127.0.0.1:8000/predict-and-advise', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        updateUI(data);
        renderChart(data.prediction_next_hour_kw);
    });
}

function updateUI(data) {
    const statusVal = document.getElementById('grid-status-val');
    const statusCard = document.getElementById('status-card');
    
    statusVal.innerText = data.grid_status;
    document.getElementById('advisory-text').innerText = data.advisory;
    document.getElementById('ai-reason-text').innerText = data.ai_reason;
    document.getElementById('co2-value').innerText = data.sustainability_impact.split('approx')[1];

    if (data.grid_status === "CRITICAL STRESS") {
        statusCard.classList.add('bg-danger');
        statusCard.classList.remove('bg-success');
    } else {
        statusCard.classList.add('bg-success');
        statusCard.classList.remove('bg-danger');
    }
}

function renderChart(prediction) {
    const ctx = document.getElementById('predictionChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ["T-30", "T-20", "T-10", "NOW", "PREDICTION (T+60)"],
            datasets: [{
                label: 'Grid Load Forecast (KW)',
                data: [25100, 27200, 28100, 29000, prediction],
                borderColor: '#3b82f6',
                borderWidth: 4,
                pointRadius: 6,
                pointBackgroundColor: (c) => c.dataIndex === 4 ? '#ef4444' : '#3b82f6',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}