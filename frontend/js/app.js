document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core UI Controllers
    window.matrixEditor = new MatrixEditor('guest-list-container', 'relationship-rules-container');
    window.venueCanvas = new VenueCanvas('venue-canvas');

    window.matrixEditor.render();

    // 2. Guest Addition Event Listeners
    const addGuestBtn = document.getElementById('add-guest-btn');
    const guestNameInput = document.getElementById('guest-name-input');
    const guestEmailInput = document.getElementById('guest-email-input');

    const handleAddGuest = () => {
        const name = guestNameInput.value.trim();
        const email = guestEmailInput.value.trim();
        if (!name) {
            alert('Please enter a valid guest name.');
            return;
        }
        window.matrixEditor.addGuest(name, email);
        guestNameInput.value = '';
        guestEmailInput.value = '';
        guestNameInput.focus();
    };

    addGuestBtn.addEventListener('click', handleAddGuest);
    guestNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddGuest();
    });

    // 3. Optimization API Trigger (Calls C Backend Solver)
    const solveBtn = document.getElementById('solve-btn');
    const scoreVal = document.getElementById('score-val');

    solveBtn.addEventListener('click', async () => {
        solveBtn.innerText = 'Calculating Optimal Seating...';
        solveBtn.disabled = true;

        const payload = window.matrixEditor.getData();

        try {
            const response = await fetch('/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to compute seating layout from server.');
            }

            const result = await response.json();
            
            // Attach guest names and emails to the result payload for canvas rendering
            result.guests = payload.guests;
            result.guest_emails = payload.guest_emails;

            // Update Score Display
            const scorePercentage = Math.min(Math.max((result.harmony_score + 50) * 1.2, 10), 100);
            scoreVal.innerText = scorePercentage.toFixed(1);

            // Render Floor Plan on Canvas
            window.venueCanvas.renderLayout(result);

        } catch (err) {
            console.error('API Error:', err);
            alert('Could not connect to the C backend optimization engine. Ensure server.exe is running.');
        } finally {
            solveBtn.innerText = 'Calculate Perfect Seating Plan';
            solveBtn.disabled = false;
        }
    });

    // 4. Professional Export & Actions
document.getElementById('export-csv-btn').addEventListener('click', () => {
    // 1. Retrieve data securely from your matrix editor/state
    const data = window.matrixEditor ? window.matrixEditor.getData() : null;
    
    if (!data || !data.guests || data.guests.length === 0) {
        alert('No guest records found to export. Please add guests to your roster first.');
        return;
    }

    // 2. Define CSV Header columns
    let csvRows = ['Guest Name,Email Address,Assigned Table'];

    // 3. Helper to properly wrap and escape fields containing commas or quotes
    const escapeCsvField = (field) => {
        if (field === null || field === undefined) return '""';
        const stringField = String(field);
        return `"${stringField.replace(/"/g, '""')}"`;
    };

    // 4. Loop through guests and format each row
    data.guests.forEach((name, i) => {
        const email = data.guest_emails && data.guest_emails[i] ? data.guest_emails[i] : 'No email provided';
        const hasAssignment = window.venueCanvas && window.venueCanvas.lastResult && window.venueCanvas.lastResult.assignments;
        
        const table = hasAssignment 
            ? `Table ${window.venueCanvas.lastResult.assignments[i] + 1}` 
            : 'Unassigned';

        const row = [
            escapeCsvField(name),
            escapeCsvField(email),
            escapeCsvField(table)
        ];
        
        csvRows.push(row.join(','));
    });

    // 5. Create Blob with UTF-8 encoding support
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    // 6. Generate dynamic filename with current date stamp
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `event_seating_roster_${currentDate}.csv`;

    // 7. Trigger secure browser download
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
});
    document.getElementById('print-cards-btn').addEventListener('click', () => {
        const lastRes = window.venueCanvas.lastResult;
        if (!lastRes || !lastRes.assignments) {
            alert('Please calculate the seating plan first before generating place cards.');
            return;
        }

        const printWindow = window.open('', '_blank');
        let html = `<html><head><title>Guest Place Cards</title><style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .card { border: 2px dashed #0f172a; padding: 30px; text-align: center; border-radius: 12px; background: #f8fafc; }
            h2 { margin: 0 0 10px 0; color: #0f172a; font-size: 24px; }
            p { margin: 0; color: #475569; font-size: 16px; font-weight: bold; }
        </style></head><body>`;

        lastRes.guests.forEach((guest, i) => {
            const tableNum = lastRes.assignments[i] + 1;
            html += `<div class="card"><h2>${guest}</h2><p>Table ${tableNum}</p></div>`;
        });

        html += `</body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    });

    document.getElementById('email-guests-btn').addEventListener('click', () => {
        const lastRes = window.venueCanvas.lastResult;
        if (!lastRes || !lastRes.assignments) {
            alert('Please calculate the seating plan before dispatching email seat tickets.');
            return;
        }

        alert('Simulated dispatch: Individual seat assignment emails with custom place cards have been successfully queued for all registered guest email addresses!');
    });
    document.getElementById('email-guests-btn').addEventListener('click', async () => {
    const lastRes = window.venueCanvas.lastResult;
    if (!lastRes || !lastRes.assignments) {
        alert('Please calculate the seating plan before dispatching email seat tickets.');
        return;
    }

    const btn = document.getElementById('email-guests-btn');
    btn.innerText = 'Sending Seat Tickets...';
    btn.disabled = true;

    try {
        for (let i = 0; i < lastRes.guests.length; i++) {
            const guestName = lastRes.guests[i];
            const guestEmail = lastRes.guest_emails[i];
            const tableNum = lastRes.assignments[i] + 1;

            if (!guestEmail || guestEmail === 'No email provided') continue;

            const templateParams = {
                to_name: guestName,
                to_email: guestEmail,
                table_number: `Table ${tableNum}`
            };

            await emailjs.send('service_ef62gtt', 'template_k1ymb7j', templateParams);
        }

        alert('Success! Seat assignment tickets have been emailed to all registered guests.');
    } catch (err) {
        console.error('Email dispatch error:', err);
        alert('Failed to send emails. Check console for details.');
    } finally {
        btn.innerText = '✉️ Email Seat Details';
        btn.disabled = false;
    }
});
});