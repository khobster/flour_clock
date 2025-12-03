document.addEventListener('DOMContentLoaded', function () {
    const STORAGE_KEY = 'doughTimerBatches';

    const batches = [];
    const bellSound = new Audio('bell.mp3'); // optional

    const batchInputsContainer = document.getElementById('batchInputs');
    const addBatchBtn = document.getElementById('addBatch');
    const batchesForm = document.getElementById('batchesForm');
    const batchList = document.getElementById('batchList');
    const timerDisplay = document.getElementById('timerDisplay');

    let globalInterval = null;

    /* ===== storage helpers ===== */

    function saveBatches() {
        try {
            const simplified = batches.map(b => ({
                id: b.id,
                name: b.name,
                endTime: b.endTime
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(simplified));
        } catch (e) {
            console.error('Failed to save batches', e);
        }
    }

    function renderBatch(batch) {
        const li = document.createElement('li');
        li.className = 'batchItem';
        li.dataset.batchId = batch.id;
        li.innerHTML = `
            <div class="batchCard">
                <button class="deleteBtn" type="button" aria-label="Delete batch">&times;</button>
                <div class="batchTitle">${batch.name}</div>
                <div class="batchCountdown">--:--:--</div>
                <div class="batchReadyAt">ready: ${formatReadyTime(batch.endTime)}</div>
            </div>
        `;

        li.querySelector('.deleteBtn').addEventListener('click', function () {
            deleteBatch(batch.id);
        });

        batchList.appendChild(li);
    }

    function deleteBatch(id) {
        const idx = batches.findIndex(b => b.id === id);
        if (idx !== -1) {
            batches.splice(idx, 1);
        }

        const li = batchList.querySelector(`li[data-batch-id="${id}"]`);
        if (li) {
            li.remove();
        }

        saveBatches();
        tick();
    }

    function loadBatches() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;

            parsed.forEach(b => {
                if (!b || typeof b.endTime !== 'number') return;

                const batch = {
                    id: b.id || `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    name: b.name || 'batch',
                    endTime: b.endTime,
                    done: false
                };
                batches.push(batch);
                renderBatch(batch);
            });
        } catch (e) {
            console.error('Failed to load batches', e);
        }
    }

    /* ===== UI helpers ===== */

    function addBatchInput() {
        const inputHTML = `
            <div class="batchInput">
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

        const lastRow = batchInputsContainer.lastElementChild;
        const nameInput = lastRow.querySelector('.batchName');
        if (nameInput) nameInput.focus();
    }

    addBatchBtn.addEventListener('click', addBatchInput);

    /* ===== main submit (start / add batches) ===== */

    batchesForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const now = Date.now();
        const inputRows = Array.from(
            batchInputsContainer.querySelectorAll('.batchInput')
        );
        let newBatchesAdded = false;

        inputRows.forEach(function (row) {
            const nameInput = row.querySelector('.batchName');
            const hourInput = row.querySelector('.batchHours');

            const name = (nameInput.value || '').trim();
            const hours = parseFloat(hourInput.value);

            if (!name || isNaN(hours) || hours <= 0) {
                return;
            }

            const durationMs = hours * 60 * 60 * 1000;
            const endTime = now + durationMs;

            const id = `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`;

            const batch = {
                id,
                name,
                endTime,
                done: false
            };
            batches.push(batch);
            renderBatch(batch);

            // remove the input row now that it's a live timer
            row.remove();

            newBatchesAdded = true;
        });

        if (!newBatchesAdded) return;

        // always leave at least one blank row for the next batch
        if (batchInputsContainer.children.length === 0) {
            addBatchInput();
        }

        saveBatches();
        tick();
        if (!globalInterval) {
            globalInterval = setInterval(tick, 1000);
        }
    });

    /* ===== ticking ===== */

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
            timerDisplay.textContent = 'Next batch in --:--:--';
        }

        if (allDone && globalInterval) {
            clearInterval(globalInterval);
            globalInterval = null;
        }
    }

    /* ===== formatting helpers ===== */

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
        return d.toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    /* ===== init on page load ===== */

    loadBatches();

    if (batches.length > 0) {
        tick();
        globalInterval = setInterval(tick, 1000);
    }

    // ensure at least one blank row exists
    if (batchInputsContainer.children.length === 0) {
        addBatchInput();
    }
});
