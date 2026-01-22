const fetch = require('node-fetch');

async function seed() {
    const msgs = [
        {
            name: "Alice Johnson",
            email: "alice@example.com",
            subject: "Late Check-in Request",
            content: "Hi, I will be arriving around midnight. Is the reception open?",
            status: "unread"
        },
        {
            name: "Bob Smith",
            email: "bob@test.com",
            subject: "Breakfast Inquiry",
            content: "Does the standard room include breakfast for two?",
            status: "read"
        },
        {
            name: "Charlie Brown",
            email: "charlie@domain.com",
            subject: "Parking Availability",
            content: "Do you have secured parking for motorcycles?",
            status: "replied"
        }
    ];

    for (const m of msgs) {
        try {
            const res = await fetch('http://localhost:3001/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(m)
            });
            console.log(`Seeded ${m.subject}: ${res.status}`);
        } catch (e) {
            console.error(e);
        }
    }
}
seed();
