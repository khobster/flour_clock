document.addEventListener('DOMContentLoaded', function () {
    const batches = [];
    const bellSound = new Audio('bell.mp3'); // optional, reuse Palooka bell

    const batchInputsContainer = document.getElementById('batchInputs');
    const addBatchBtn = document.getElementById('addBatch');
    const batchesForm = document.getElementById('batchesForm');
    const batchList = document.getElementById('batchList');
    const timerDisplay = document.getElementById('timerDisplay');

    let globalInterval = null;

    function addBatchInput() {
        const index = batchInputsContainer.children.length;
        const inputHTML = `
            <div class="batchInput" data-batch-index="${index}">
                <input
                    type="text"
                    class="batchName"
                    name="batchName[]"
                    placeholder="Batch name (e.g. Friday pies)"
                    required
                />
                <input
                    type="number"
                    class="batchHours"
                    name="batchHours[]"
                    placeholder="Hours (48 or 72)"
                    min="1"
                    max="240"
                    required
                />
            </div>
        `;
        batchInputsContainer.insertAdjacentHTML('beforeend', inputHTML);
    }

    // Add first row on load
    addBatchInput();

    addBatchBtn.addEventListener('click', addBatchInput);

    batchesForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Reset any previous state
        batches.length = 0;
        batchList.innerHTML = '';

        const nameInputs = document.querySelectorAll('.batchName');
        const hourInputs = document.querySelectorAll('.batchHours');
        const now = Date.now();

        nameInputs.forEach(function (nameInput, idx) {
            const hours = parseFloat(hourInputs[idx].value);

            if (isNaN(hours) || hours <= 0) return;

            const durationMs = hours * 60 * 60 * 1000; // hours → ms
            const endTime = now + durationMs;
            const id = `batch-${idx}-${endTime}`;

            const li = document.createElement('li');
            li.className = 'batchItem';
            li.dataset.batchId = id;
            li.innerHTML = `
                <div class="batchCard">
                    <div class="batchTitle">${nameInput.value}</div>
                    <div class="batchCountdown">--:--:--</div>
                    <div class="batchReadyAt">ready: ${formatReadyTime(endTime)}</div>
                </div>
            `;
            batchList.appendChild(li);

            batches.push({
                id,
                name: nameInput.value,
                endTime,
                done: false
            });
        });

        // Lock the form so you don't accidentally change hours mid-ferment
        nameInputs.forEach(input => input.disabled = true);
        hourInputs.forEach(input => input.disabled = true);
        addBatchBtn.disabled = true;
        batchesForm.querySelector('button[type="submit"]').disabled = true;

        if (batches.length === 0) return;

        // Clear any old interval
        if (globalInterval) {
            clearInterval(globalInterval);
        }

        // Immediate tick, then every second
        tick();
        globalInterval = setInterval(tick, 1000);
    });

    function tick() {
        const now = Date.now();
        let allDone = true;
        let nextRemaining = null;

        batches.forEach(function (batch) {
            const li = batchList.querySelector(
                `li[data-batch-id="${batch.id}"]`
            );
            if (!li) return;

            const countdownEl = li.querySelector('.batchCountdown');
            const remainingMs = batch.endTime - now;

            if (remainingMs <= 0) {
                countdownEl.textContent = 'READY';
                li.classList.add('batchReady');

                if (!batch.done) {
                    batch.done = true;
                    // play bell once when it flips to READY
                    bellSound.play().catch(() => {});
                }
            } else {
                allDone = false;
                countdownEl.textContent = formatDuration(remainingMs);
                li.classList.remove('batchReady');

                if (nextRemaining === null || remainingMs < nextRemaining) {
                    nextRemaining = remainingMs;
                }
            }
        });

        if (nextRemaining !== null) {
            timerDisplay.textContent =
                'Next batch in ' + formatDuration(nextRemaining);
        } else if (batches.length > 0) {
            timerDisplay.textContent = 'All batches are ready';
        }

        if (allDone && globalInterval) {
            clearInterval(globalInterval);
            globalInterval = null;
        }
    }

    function formatDuration(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return (
            pad(hours) + ':' + pad(minutes) + ':' + pad(seconds)
        );
    }

    function pad(num) {
        return num.toString().padStart(2, '0');
    }

    function formatReadyTime(timestamp) {
        const d = new Date(timestamp);
        // e.g. "Fri 7:30 PM"
        return d.toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit'
        });
    }
});
