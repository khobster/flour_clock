document.addEventListener('DOMContentLoaded', function () {
    const batches = [];
    const bellSound = new Audio('bell.mp3'); // optional sound, can remove if you want

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

    // Start / add batches
    batchesForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const inputRows = document.querySelectorAll('.batchInput');
        const now = Date.now();
        let newBatchesAdded = false;

        inputRows.forEach(function (row) {
            // Skip rows we've already started
            if (row.dataset.started === 'true') return;

            const nameInput = row.querySelector('.batchName');
            const hourInput = row.querySelector('.batchHours');

            const name = (nameInput.value || '').trim();
            const hours = parseFloat(hourInput.value);

            if (!name || isNaN(hours) || hours <= 0) {
                // Incomplete row? Skip it, don't crash
                return;
            }

            const durationMs = hours * 60 * 60 * 1000; // hours → ms
            const endTime = now + durationMs;

            // Unique-ish ID
            const id = `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`;

            const li = document.createElement('li');
            li.className = 'batchItem';
            li.dataset.batchId = id;
            li.innerHTML = `
                <div class="batchCard">
                    <div class="batchTitle">${name}</div>
                    <div class="batchCountdown">--:--:--</div>
                    <div class="batchReadyAt">ready: ${formatReadyTime(endTime)}</div>
                </div>
            `;
            batchList.appendChild(li);

            batches.push({
                id,
                name,
                endTime,
                done: false
            });

            // Lock this row so you don't edit it mid-ferment
            row.dataset.started = 'true';
            nameInput.disabled = true;
            hourInput.disabled = true;

            newBatchesAdded = true;
        });

        // If nothing new was added, don't do anything
        if (!newBatchesAdded) return;

        // Kick the timer loop
        tick();
        if (!globalInterval) {
            globalInterval = setInterval(tick, 1000);
        }
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
        } else {
            timerDisplay.textContent = 'Dough Timer';
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

        return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
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
