document.addEventListener('DOMContentLoaded', function() {
    // Define base URL for API
    const baseUrl = 'http://localhost:8080';

    // Define getResults function
    function getResults() {
        console.log("getResults function called");

        const tableBody = document.getElementById('scoreTableBody');
        if (!tableBody) {
            console.error("Element with id 'scoreTableBody' not found");
            return;
        }

        // Fetch the scores from the backend using baseUrl
        console.log("Fetching scores from the backend...");
        fetch(`${baseUrl}/get_results`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            console.log("Response received from backend");
            return response.json();
        })
        .then(scores => {
            console.log("Scores received:", scores);
            for (const [playerId, score] of Object.entries(scores)) {
                const row = document.createElement('tr');
                const playerIdCell = document.createElement('td');
                playerIdCell.textContent = playerId;
                const scoreCell = document.createElement('td');
                scoreCell.textContent = score;
                row.appendChild(playerIdCell);
                row.appendChild(scoreCell);
                tableBody.appendChild(row);
            }
            console.log("Scores added to table");
        })
        .catch(error => console.error('Error fetching scores:', error));
    }

    // Call getResults to fetch and display scores
    console.log("Calling getResults from DOMContentLoaded event listener");
    getResults();
});
