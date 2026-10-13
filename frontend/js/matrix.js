class MatrixEditor {
    constructor(containerId, rulesContainerId) {
        this.container = document.getElementById(containerId);
        this.rulesContainer = document.getElementById(rulesContainerId);
        
        // Default starting guests for a friendly onboarding experience
        this.guests = [
            { name: "Alice", email: "alice@example.com" },
            { name: "Bob", email: "bob@example.com" },
            { name: "Charlie", email: "charlie@example.com" },
            { name: "Diana", email: "diana@example.com" }
        ];
        
        // Relationships map: key "i-j", value: 0 = Neutral, +3 = Good Friends, -3 = Must Keep Apart
        this.relationships = {}; 
        this.initDefaultRelationships();
    }

    initDefaultRelationships() {
        for (let i = 0; i < this.guests.length; i++) {
            for (let j = 0; j < this.guests.length; j++) {
                if (i !== j) {
                    this.relationships[`${i}-${j}`] = 0;
                }
            }
        }
    }

    addGuest(name, email) {
        if (!name) return;
        this.guests.push({ name, email: email || "No email provided" });
        const newIdx = this.guests.length - 1;
        for (let i = 0; i < newIdx; i++) {
            this.relationships[`${i}-${newIdx}`] = 0;
            this.relationships[`${newIdx}-${i}`] = 0;
        }
        this.render();
    }

    removeGuest(index) {
        if (this.guests.length <= 2) {
            alert("Please keep at least 2 guests for seating allocation.");
            return;
        }
        this.guests.splice(index, 1);
        
        // Rebuild relationships cleanly
        this.relationships = {};
        for (let i = 0; i < this.guests.length; i++) {
            for (let j = 0; j < this.guests.length; j++) {
                if (i !== j) {
                    this.relationships[`${i}-${j}`] = 0;
                }
            }
        }
        this.render();
    }

    render() {
        // 1. Render Guest List Tags
        this.container.innerHTML = '';
        this.guests.forEach((guest, index) => {
            const tag = document.createElement('div');
            tag.className = 'guest-tag';
            tag.innerHTML = `
                <span>👤 ${guest.name} <small>(${guest.email})</small></span>
                <button onclick="window.matrixEditor.removeGuest(${index})" title="Remove">×</button>
            `;
            this.container.appendChild(tag);
        });

        // 2. Render Simple Relationship Selectors
        this.rulesContainer.innerHTML = '';
        if (this.guests.length < 2) {
            this.rulesContainer.innerHTML = '<p class="muted">Add at least 2 guests to set relationships.</p>';
            return;
        }

        const title = document.createElement('p');
        title.className = 'rules-instruction';
        title.innerText = 'Select guest pairings to cluster or separate:';
        this.rulesContainer.appendChild(title);

        for (let i = 0; i < this.guests.length; i++) {
            for (let j = i + 1; j < this.guests.length; j++) {
                const g1 = this.guests[i].name;
                const g2 = this.guests[j].name;
                const key = `${i}-${j}`;
                const currentVal = this.relationships[key] || 0;

                const row = document.createElement('div');
                row.className = 'relationship-row';
                row.innerHTML = `
                    <span>${g1} &amp; ${g2}</span>
                    <select data-key="${key}" class="relation-select">
                        <option value="0" ${currentVal === 0 ? 'selected' : ''}>Neutral (No preference)</option>
                        <option value="3" ${currentVal === 3 ? 'selected' : ''}>💚 Good Friends (Sit together)</option>
                        <option value="-3" ${currentVal === -3 ? 'selected' : ''}>🔴 Must Keep Apart (Separate)</option>
                    </select>
                `;
                
                row.querySelector('select').addEventListener('change', (e) => {
                    const val = parseInt(e.target.value);
                    this.relationships[key] = val;
                    this.relationships[`${j}-${i}`] = val; // Mirror for symmetry
                });

                this.rulesContainer.appendChild(row);
            }
        }
    }

    // Translates friendly UI choices into the exact JSON matrix and arrays the C backend expects
    getData() {
        const n = this.guests.length;
        const matrix = Array.from({ length: n }, () => Array(n).fill(0));

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    matrix[i][j] = this.relationships[`${i}-${j}`] || 0;
                }
            }
        }

        return {
            guest_count: n,
            guests: this.guests.map(g => g.name),
            guest_emails: this.guests.map(g => g.email),
            relationship_matrix: matrix
        };
    }
}