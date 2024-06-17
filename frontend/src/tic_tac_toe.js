//<reference types="aws-sdk" />
document.addEventListener('DOMContentLoaded', function() {
    const boardElement = document.getElementById('board');
    const addButton = document.getElementById('add-player-btn');
    const resetButton = document.getElementById('reset-game-btn');
    const newGameButton = document.getElementById('new-game-btn');
    const joinGameButton = document.getElementById('join-game-btn');
    const joinRandomButton = document.getElementById('join-random-btn');
    const baseUrl = 'http://localhost:8080';
    // Define getResults function
    function getResults() {
        console.log("getResults function called");

        const tableBody = document.getElementById('scoreTableBody');
        if (!tableBody) {
            console.error("Element with id 'scoreTableBody' not found");
            return;
        }

        // Fetch the scores from the backend
        console.log("Fetching scores from the backend...");
        fetch(`${baseUrl}/get_results`)
            .then(response => {
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

    const verifyButton = document.getElementById('verify')

        if (verifyButton) { // Check if the button exists before adding the event listener
            verifyButton.addEventListener('click', verifyCode);
        } else {
            console.error("Element with ID 'verify' not found.");
        }

    let socket = null;

    const poolData = {
        UserPoolId: 'us-east-1_s7dGZtBVP', // Your user pool id here
        ClientId: '494q30133etbs537mdrr6a267b'// Your client id here
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    const signupButton = document.getElementById('signup')

    if (signupButton) { // Check if the button exists before adding the event listener
        signupButton.addEventListener('click', signup);
    } else {
        console.error("Element with ID 'signup' not found.");
    }

    const loginButton = document.getElementById('login')
    
    if (loginButton) { // Check if the button exists before adding the event listener
        loginButton.addEventListener('click', login);
    } else {
        console.error("Element with ID 'login' not found.");
    }
        

    async function signup(event) {
        event.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const name = document.getElementById('signupName').value;
        const password = document.getElementById('signupPassword').value;
    
        const fileInput = document.getElementById('profilePicture');
        const file = fileInput.files[0];
    
        const randomNumbers = Math.floor(Math.random() * 1000000);
        // Create the photo name using the email and random numbers
        const photoName = `${name}-${randomNumbers}`;

        // Create a FormData object and append the form fields
        const formData = new FormData();
        formData.append('email', email);
        formData.append('name', name);
        formData.append('password', password);
        formData.append('photo', file);
        formData.append('photoName', photoName); // Append the photo name
    
        // Send the FormData object to the backend using fetch
        try {
            const response = await fetch(`${baseUrl}/upload`, { // Constructing the URL using the base URL
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) {
                throw new Error('Failed to upload photo');
            }
    
            signupWithCognito(photoName);
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
    
    function signupWithCognito(photoName){
        const email = document.getElementById('signupEmail').value;
        const name = document.getElementById('signupName').value;
        const password = document.getElementById('signupPassword').value;
    
        const attributeList = [];
        const dataEmail = {
            Name: 'email',
            Value: email,
        };
        const dataName = {
            Name: 'name',
            Value: name,
        };
        const attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
        const attributeName = new AmazonCognitoIdentity.CognitoUserAttribute(dataName);

        const attributePhotoName = new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'custom:photoName',
            Value: photoName
        });

        attributeList.push(attributePhotoName);
    
        attributeList.push(attributeEmail);
        attributeList.push(attributeName);
    
        userPool.signUp(email, password, attributeList, null, function (err, result) {
            if (err) {
                alert('Error signing up: ' + err.message);
                return;
            }
            const cognitoUser = result.user;
            // Redirect to verification page with username as query parameter
            window.location.href = 'verify.html?username=' + encodeURIComponent(email);
        });
    }

    //socket.on('connect', function() {
      //  console.log('Connected to server');
    //});

    let playerIds = [];
    let currentPlayerIndex = 0;

    let gameOver = false;


    async function addPlayer() {
        const id_token = localStorage.getItem('idToken');
        const name = localStorage.getItem('name')
        const photoName = localStorage.getItem('photoName')
        const id = localStorage.getItem('id')
        if (name) {
            const url = `${baseUrl}/add_player`;
            const data = {
                playerId: '',  // Let backend generate player ID
                symbol: '',  // Let backend assign symbol (X or O)
                name: name,
                photoName: photoName,
                id: id,
                game_id: localStorage.getItem('gameId')
            };
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${id_token}`
                    },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    throw new Error('Failed to add player');
                }
                const responseData = await response.json();
                if(responseData.success){
                    localStorage.setItem('playerId', responseData.player_id);
                    playerIds.push(responseData.player_id);
                    console.log('Player added successfully:', responseData);
                    console.log('Player IDs:', playerIds);

                    const player = document.getElementById('player');
                    player.textContent = "Player:" + name;
                    player.style.display = 'block'
                }else{
                    console.log('Error:', responseData);
                }
            } catch (error) {
                console.error('Error adding player:', error);
            }
        }
    }

    async function startNewGame() {
        gameOver = false;
        const url = `${baseUrl}/new_game`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to start new game');
            }
            const responseData = await response.json();
            if(responseData.success){
                console.log('Started new game:', responseData);
                console.log(responseData.game_id);
                localStorage.setItem('gameId', responseData.game_id);

                const gameId = localStorage.getItem('gameId');
                const gameIdContainer = document.getElementById('gameIdContainer');
                gameIdContainer.textContent = `Game ID: ${gameId}`;
                
                socket = io(baseUrl);

                socket.on('connect', () => {
                    console.log('Before emitting join event');
                    socket.emit("join", { room: gameId });
                    console.log('After emitting join event');


                    socket.on('update_board', function(data) {
                        console.log('Received update from server:', data);
                        renderBoard()
                        // Update the board based on the data received
                    });
                
                    socket.on('players', function(data) {
                        console.log('Received update from server:', data);
                        showPlayers(data.players_info)
                    });
                
                    socket.on('game_status', function(data) {
                        console.log('Received update from server:', data);
                        showMessage(data.message)
                        // Update the board based on the data received
                    });
                
                })
                

                renderBoard()
            }else{
                console.log('Error:', responseData);
            }
        } catch (error) {
            console.error('Error starting new game:', error);
        }
    }
    
    
    // Function to fetch board matrix from backend
    async function fetchBoardMatrix() {
        const url = `${baseUrl}/get_board_matrix`;
        const data = {
            game_id: localStorage.getItem('gameId')
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to fetch board matrix');
            }
            return await response.json();  // Convert response to JSON format
        } catch (error) {
            console.error('Error fetching board matrix:', error);
        }
    }

    async function resetBoard() {
        try {
            gameOver = false;
            const response = await fetch(`${baseUrl}/reset_board`);// Fetch data from backend endpoint
            if (!response.ok) {
                throw new Error('Failed to reset board matrix');
            }
            showMessage("")
            renderBoard()
            return await response.json();  // Convert response to JSON format
        } catch (error) {
            console.error('Error resetin board matrix:', error);
        }
    }
    // Function to check for a winner
    function checkWinner() {
        // Logic to check for a winner (not implemented in this example)
        // You can implement your own logic to check for a winning condition
    }

    // Function to handle cell click event
    async function handleCellClick(row, col) {
        const id_token = localStorage.getItem('idToken');
        const playerId = playerIds[currentPlayerIndex];
        const url = `${baseUrl}/make_move`;
        console.log(playerId)
        console.log(playerIds)

        if (gameOver == true) {
            console.log('Game is over. Cannot make a move.');
            return;
        }

        const data = {
            player_id: localStorage.getItem('playerId'), // Assuming currentPlayer is the player ID
            row: row,
            col: col,
            game_id: localStorage.getItem('gameId')
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${id_token}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to make move');
            }
            const responseData = await response.json();
            console.log('Move made successfully:', responseData);
            const status = responseData.status;
            if (status === 0) {
                getResults();
                console.log('Game over! Winner is ' + responseData.winner);
                gameOver = true;
                const gateWayEndpointUrl = 'https://p3fni16x34.execute-api.us-east-1.amazonaws.com/dev/mypath'; // Replace with your actual API Gateway URL

                const requestData = {
                game_id: localStorage.getItem('gameId'),
                player_id: responseData.winnerId,
                score: 1
                };

                fetch(gateWayEndpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // Add other headers if needed (e.g., Authorization)
                },
                body: JSON.stringify(requestData)
                })
                .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
                })
                .then(data => {
                console.log('API Response:', data);
                // Handle the API response data here
                })
                .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
                });

            } else if (status === 1) {
                gameOver = true;
                //showMessage('Game over! No winner!');
                console.log('Game over! No winner.');
            } else if (status === 2) {
                console.log('Game still in progress.');
                // Continue the game
            } else {
                console.error('Invalid status received:', status);
            }
            renderBoard();
            currentPlayerIndex = (currentPlayerIndex + 1) % playerIds.length;
        } catch (error) {
            console.error('Error making move:', error);
        }
    }

    async function joinGame() {
        gameOver = false
        const gameId = prompt('Enter game id:');
        const url = `${baseUrl}/check_game_id`;
        const data = {
            game_id: gameId
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to join');
            }
            const responseData = await response.json();
            if(responseData.success){
                localStorage.setItem('gameId', gameId );
                console.log("Joined new game", responseData)
                
                socket = io(baseUrl);

                socket.on('connect', () => {
                    socket.emit("join", { room: gameId });

                    socket.on('update_board', function(data) {
                        console.log('Received update from server:', data);
                        renderBoard()
                        // Update the board based on the data received
                    });
                
                    socket.on('players', function(data) {
                        console.log('Received update from server:', data);
                        showPlayers(data.players_info)
                    });
                
                    socket.on('game_status', function(data) {
                        console.log('Received update from server:', data);
                        showMessage(data.message)
                        // Update the board based on the data received
                    });
                
                
                })

                const gameIdContainer = document.getElementById('gameIdContainer');
                gameIdContainer.textContent = `Game ID: ${gameId}`;

                renderBoard()
        }else{
            console.log("Error joining new game", responseData)
        }
        } catch (error) {
            console.error('Error joining new game:', error);
        }
    }


    async function joinRandomGame() {
        gameOver = false
        const url = `${baseUrl}/random_game_id`;
    
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to join');
            }
            const responseData = await response.json();
            if (responseData.success) {
                const gameId = responseData.game_id;
                localStorage.setItem('gameId', gameId);
                console.log("Joined new game", responseData);
                
                socket = io(baseUrl);

                socket.on('connect', () => {
                    socket.emit("join", { room: gameId });

                    socket.on('update_board', function(data) {
                        console.log('Received update from server:', data);
                        renderBoard()
                        // Update the board based on the data received
                    });
                
                    socket.on('players', function(data) {
                        console.log('Received update from server:', data);
                        showPlayers(data.players_info)
                    });
                
                    socket.on('game_status', function(data) {
                        console.log('Received update from server:', data);
                        showMessage(data.message)
                        // Update the board based on the data received
                    });
                
                
                })

                const gameIdContainer = document.getElementById('gameIdContainer');
                gameIdContainer.textContent = `Game ID: ${gameId}`;

                renderBoard()
        }else{
            console.log("Error joining new game", responseData)
        }
        } catch (error) {
            console.error('Error joining new game:', error);
        }
    }

    
    function showMessage(message) {
        const messageElement = document.getElementById('message');
        messageElement.textContent = message;
        messageElement.style.display = 'block';
    }

    function showPlayers(players) {
        console.log(players)
        //const playerNames = players.map(player => player.name).join(', '); // Extracting names from the list
        //const playersElement = document.getElementById('players');
        //playersElement.textContent = "Players: " + playerNames; // Displaying the names
        //playersElement.style.display = 'block';


        try {
    
            // Display players and profile pictures
            const playersContainer = document.getElementById('players-container');
            playersContainer.innerHTML = ''; // Clear previous content
    
            players.forEach(async (player) => {
                const { name, photoName } = player;
            
                // Fetch profile picture
                const photoUrl = `${baseUrl}/photo/${photoName}`;
                const response = await fetch(photoUrl);
                if (!response.ok) {
                    throw new Error('Failed to fetch profile picture');
                }
                const blob = await response.blob();
                const photoUrlObject = URL.createObjectURL(blob);
            
                // Create elements to display player information
                const playerDiv = document.createElement('div');
                playerDiv.classList.add('player');
            
                const imgElement = document.createElement('img');
                imgElement.src = photoUrlObject;
                imgElement.alt = name + "'s profile picture";
                imgElement.style.height = '50px'; // Set height to 50px
            
                const nameElement = document.createElement('p');
                nameElement.textContent = name;
            
                // Append elements to the container
                playerDiv.appendChild(imgElement);
                playerDiv.appendChild(nameElement);
                playersContainer.appendChild(playerDiv);
            });
        } catch (error) {
            console.error('Error fetching and displaying players:', error);
        }
    }

    if (addButton && newGameButton && joinGameButton && joinRandomButton) { // Check if the button exists before adding the event listener
        addButton.addEventListener('click', addPlayer);
        //resetButton.addEventListener('click', resetBoard);
        newGameButton.addEventListener('click', startNewGame);
        joinGameButton.addEventListener('click', joinGame);
        joinRandomButton.addEventListener('click', joinRandomGame);
    } else {
        console.error("Elements not found.");
    }

    // Function to render the Tic Tac Toe board
    async function renderBoard() {
        const boardMatrix = await fetchBoardMatrix();  // Fetch board matrix data
        if (!boardMatrix) {
            console.error('Board matrix data is empty');
            return;
        }
        boardElement.innerHTML = ''; // Clear previous content
        boardMatrix.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = document.createElement('div');
                cellElement.classList.add('cell');
                cellElement.textContent = cell;
                cellElement.addEventListener('click', () => handleCellClick(rowIndex, colIndex));
                boardElement.appendChild(cellElement);
            });
        });
    }


    window.onload = function() {
        // Check if the URL contains the tokens
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
    
            // Get tokens from URL fragments
            const idToken = params.get('idToken');
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const tokenType = params.get('token_type');
            const expiresIn = params.get('expires_in');
    
            // Store tokens in local storage or cookies
            if (idToken) {
                localStorage.setItem('idToken', idToken);
            }
            if (accessToken) {
                localStorage.setItem('access_token', accessToken);
            }
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
            if (tokenType) {
                localStorage.setItem('token_type', tokenType);
            }
            if (expiresIn) {
                localStorage.setItem('expires_in', expiresIn);
            }
    
            // Remove tokens from URL
            window.location.hash = '';

            // Retrieve user's display name from the ID token
            const decodedIdToken = parseJwt(idToken);
            const displayName = decodedIdToken.name || decodedIdToken.email || 'User';

            localStorage.setItem('name', displayName);

            // Redirect to the homepage or another desired page
            window.location.href = 'http://localhost:5500';
            }

            // Update UI on page load
            updateUI();
        };

        // Function to parse JWT token
        function parseJwt(token) {
            if (!token) {
                return {};
            }
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        };

        // Function to update the UI based on login status
        function updateUI() {
            const idToken = localStorage.getItem('idToken');
            const displayName = localStorage.getItem('name');
            const logoutButton = document.getElementById('logout');
            const displayNameElement = document.getElementById('display-name');
            const loginButton = document.getElementById('login-btn');

            if (idToken && displayName) {
                console.log("logged in")
                // User is logged in, display user info and logout button
                displayNameElement.textContent = `Welcome, ${displayName}`;
                logoutButton.style.display = 'inline';
                loginButton.style.display = 'none'; // Hide the login button
                fetchAndDisplayProfilePhoto(localStorage.getItem('photoName'));
            } else {
                // User is not logged in, hide user info and logout button
                displayNameElement.textContent = '';
                logoutButton.style.display = 'none';
                loginButton.style.display = 'block'; // Show the login button
                const profilePhotoElement = document.getElementById('profilePhoto');
                profilePhotoElement.src = ''; // Set the src attribute to an empty string
                profilePhotoElement.style.display = 'none'; // Hide the profile photo
            }
        }

        // Function to log out the user
        function logout() {
            localStorage.removeItem('idToken');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token_type');
            localStorage.removeItem('expires_in');
            localStorage.removeItem('name');
            updateUI();
        }

        document.getElementById('logout').addEventListener('click', logout);


        
        function login() {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
        
            const authenticationData = {
                Username: email,
                Password: password,
            };
            const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
        
            const userData = {
                Username: email,
                Pool: userPool,
            };
            const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function (result) {
                    const idToken = result.getIdToken().getJwtToken(); // Get the ID token
                    // Save the ID token to local storage
                    localStorage.setItem('idToken', idToken);

                    const decodedIdToken = parseJwt(idToken);
                    const displayName = decodedIdToken.name || decodedIdToken.email || 'User';

                    localStorage.setItem('name', displayName);
                    localStorage.setItem('id', decodedIdToken.sub);
        
                    const photoName = decodedIdToken['custom:photoName']; // Get the photo name from the token
                    localStorage.setItem('photoName', photoName);
                    window.location.href = 'index.html';

                    // Wait for the window to finish navigating to the new page
                },
                onFailure: function (err) {
                    alert('Error signing in: ' + err.message);
                },
            });
        }

        function fetchAndDisplayProfilePhoto(photoName) {
            const photoUrl = `${baseUrl}/photo/${photoName}`;
        
            fetch(photoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('idToken')}`
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                console.log("call display photo")
                displayProfilePhoto(url);
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
        }
        

        function displayProfilePhoto(photoUrl) {
            console.log("Displaying profile photo:", photoUrl); // Log the photo URL
            const profilePhotoElement = document.getElementById('profilePhoto');
            if (profilePhotoElement) {
                console.log("Setting profile photo source..");
                profilePhotoElement.src = photoUrl;
                profilePhotoElement.style.display = 'block';
            } else {
                console.error("Profile photo element not found!");
            }
        }
        

        window.onload = function() {
            // Call updateUI() after the page has loaded
            updateUI();
        };


        const scoresButton = document.getElementById('score')

        if (scoresButton) { // Check if the button exists before adding the event listener
            scoresButton.addEventListener('click', getResults);
        } else {
            console.error("Element with ID 'scores' not found.");
        }

        function verifyCode() {
            const urlParams = new URLSearchParams(window.location.search);
            const username = urlParams.get('username');
            const verificationCode = document.getElementById('verificationCode').value;

            const userData = {
                Username: username,
                Pool: userPool
            };

            const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

            cognitoUser.confirmRegistration(verificationCode, true, function (err, result) {
                if (err) {
                    alert('Error verifying account: ' + err.message);
                    return;
                }
                window.location.href = 'login.html';
            });
        }

});
