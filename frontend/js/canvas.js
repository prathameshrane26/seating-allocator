class VenueCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.lastResult = null;
        
        // Click-to-Swap state variables
        this.selectedGuestIndex = null;
        this.tablePositions = [];
        this.guestTokenPositions = [];

        this.drawEmptyState();
        this.initInteractiveClickToSwap();
    }

    drawEmptyState() {
        this.ctx.fillStyle = '#020617';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '15px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Calculate seating plan to unlock interactive venue floor plan', this.width / 2, this.height / 2);
    }

    renderLayout(resultData) {
        this.lastResult = resultData;
        this.ctx.fillStyle = '#020617';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw header info & harmony score
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = 'bold 14px Segoe UI';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Optimized Floor Plan | Harmony Score: ${resultData.harmony_score.toFixed(1)}%`, 20, 30);

        // Group guests by assigned table IDs
        const tables = {};
        if (resultData.assignments) {
            resultData.assignments.forEach((tableId, guestIdx) => {
                if (!tables[tableId]) tables[tableId] = [];
                tables[tableId].push(guestIdx);
            });
        }

        const tableKeys = Object.keys(tables);
        this.tablePositions = [];
        this.guestTokenPositions = [];

        tableKeys.forEach((tId, idx) => {
            const x = 160 + (idx % 3) * 200;
            const y = 170 + Math.floor(idx / 3) * 160;
            const tableIdInt = parseInt(tId);

            this.tablePositions.push({ id: tableIdInt, x, y, radius: 50 });

            // Draw Table Node Circle
            this.ctx.fillStyle = '#1e293b';
            this.ctx.strokeStyle = (this.selectedGuestIndex !== null && tables[tId].includes(this.selectedGuestIndex)) ? '#f59e0b' : '#38bdf8';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 50, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Table Title
            this.ctx.fillStyle = '#f8fafc';
            this.ctx.font = 'bold 13px Segoe UI';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Table ${tableIdInt + 1}`, x, y - 10);

            // Table Occupancy Badge
            const guestCountAtTable = tables[tId].length;
            this.ctx.fillStyle = '#38bdf8';
            this.ctx.font = '11px Segoe UI';
            this.ctx.fillText(`(${guestCountAtTable} Seats)`, x, y + 10);

            // Draw Seated Guest Tokens
            tables[tId].forEach((gIdx, gPos) => {
                const angle = (gPos / guestCountAtTable) * Math.PI * 2;
                const gx = x + Math.cos(angle) * 75;
                const gy = y + Math.sin(angle) * 75;

                this.guestTokenPositions.push({ guestIndex: gIdx, x: gx, y: gy, radius: 16, tableId: tableIdInt });

                const guestName = resultData.guests ? resultData.guests[gIdx] : `G${gIdx + 1}`;
                const isSelected = (this.selectedGuestIndex === gIdx);
                
                this.ctx.fillStyle = isSelected ? '#f59e0b' : '#38bdf8';
                this.ctx.beginPath();
                this.ctx.arc(gx, gy, isSelected ? 19 : 16, 0, Math.PI * 2);
                this.ctx.fill();

                if (isSelected) {
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }

                this.ctx.fillStyle = '#0f172a';
                this.ctx.font = 'bold 10px Segoe UI';
                this.ctx.fillText(guestName.substring(0, 3).toUpperCase(), gx, gy + 4);
            });
        });

        // Update Sidebar Inspector UI Roster
        this.renderInspector(tables, tableKeys.length);
    }

    renderInspector(tables, totalTables) {
        const inspectorContainer = document.getElementById('seating-inspector-container');
        if (!inspectorContainer) return;

        inspectorContainer.innerHTML = '';

        Object.keys(tables).forEach(tId => {
            const tableIdInt = parseInt(tId);
            const guestIndices = tables[tId];

            const card = document.createElement('div');
            card.className = 'inspector-table-card';
            
            let html = `<h4>Table ${tableIdInt + 1}</h4>`;
            
            guestIndices.forEach(gIdx => {
                const guestName = this.lastResult.guests[gIdx];
                html += `
                    <div class="inspector-guest-row">
                        <span>👤 ${guestName}</span>
                        <select data-guest-idx="${gIdx}" class="inspector-table-select">
                `;

                for (let t = 0; t < totalTables; t++) {
                    const selectedAttr = (t === tableIdInt) ? 'selected' : '';
                    html += `<option value="${t}" ${selectedAttr}>Table ${t + 1}</option>`;
                }

                html += `</select></div>`;
            });

            card.innerHTML = html;
            inspectorContainer.appendChild(card);
        });

        // Bind change listeners to sidebar dropdowns
        inspectorContainer.querySelectorAll('.inspector-table-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const gIdx = parseInt(e.target.getAttribute('data-guest-idx'));
                const newTableId = parseInt(e.target.value);

                this.lastResult.assignments[gIdx] = newTableId;
                this.evaluateNewAssignmentsLocally();
            });
        });
    }

    initInteractiveClickToSwap() {
        this.canvas.addEventListener('click', (e) => {
            if (!this.lastResult || !this.lastResult.assignments) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let clickedGuestIndex = null;
            for (const token of this.guestTokenPositions) {
                const dx = mouseX - token.x;
                const dy = mouseY - token.y;
                if (Math.sqrt(dx * dx + dy * dy) <= token.radius + 6) {
                    clickedGuestIndex = token.guestIndex;
                    break;
                }
            }

            if (clickedGuestIndex !== null) {
                if (this.selectedGuestIndex === null) {
                    this.selectedGuestIndex = clickedGuestIndex;
                    this.renderLayout(this.lastResult);
                } else if (this.selectedGuestIndex === clickedGuestIndex) {
                    this.selectedGuestIndex = null;
                    this.renderLayout(this.lastResult);
                } else {
                    const tempTable = this.lastResult.assignments[this.selectedGuestIndex];
                    this.lastResult.assignments[this.selectedGuestIndex] = this.lastResult.assignments[clickedGuestIndex];
                    this.lastResult.assignments[clickedGuestIndex] = tempTable;

                    this.selectedGuestIndex = null;
                    this.evaluateNewAssignmentsLocally();
                }
                return;
            }

            if (this.selectedGuestIndex !== null) {
                for (const table of this.tablePositions) {
                    const dx = mouseX - table.x;
                    const dy = mouseY - table.y;
                    if (Math.sqrt(dx * dx + dy * dy) <= table.radius) {
                        this.lastResult.assignments[this.selectedGuestIndex] = table.id;
                        this.selectedGuestIndex = null;
                        this.evaluateNewAssignmentsLocally();
                        return;
                    }
                }
            }

            if (this.selectedGuestIndex !== null) {
                this.selectedGuestIndex = null;
                this.renderLayout(this.lastResult);
            }
        });
    }

    async evaluateNewAssignmentsLocally() {
        try {
            const payload = window.matrixEditor.getData();
            payload.assignments = this.lastResult.assignments;

            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                const res = await response.json();
                this.lastResult.harmony_score = res.current_score;
                document.getElementById('score-val').innerText = Math.min(Math.max((res.current_score + 50) * 1.2, 10), 100).toFixed(1);
            }
        } catch (err) {
            console.error('Failed to re-evaluate score:', err);
        } finally {
            this.renderLayout(this.lastResult);
        }
    }
}